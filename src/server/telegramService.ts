import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { encryptSecret, decryptSecret, OLTServerConfig, queryRealOltOnus } from './oltApi';
import { sanitizeMikrotikHost, fetchMikrotikTraffic, MikrotikConnParams, queryMikrotikSocket } from './mikrotikApi';

export interface TelegramBotSettings {
  enabled: boolean;
  botUsername: string;
  adminChatIds: string[];
  notifyNewClient: boolean;
  notifyNewOrder: boolean;
  notifyPaymentSubmitted: boolean;
  notifyPaymentApproved: boolean;
  notifyPaymentRejected: boolean;
  notifyClientActivated: boolean;
  notifyClientExpired: boolean;
  notifyMikrotikAlerts: boolean;
  notifyOltAlerts: boolean;
  notifyOnuAlerts: boolean;
  notifyLowOpticalPower: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestError?: string;
}

export interface ClientTelegramLink {
  userId: string;
  chatId: string;
  clientName: string;
  phone?: string;
  linkedAt: string;
}

// In-Memory Temporary Pairing Tokens
// Admin pairing token: valid for 15 minutes
const adminPairingTokens = new Map<string, { token: string; expiresAt: number }>();
// Client pairing token: valid for 30 minutes
const clientPairingTokens = new Map<string, { token: string; userId: string; clientName: string; expiresAt: number }>();

// Notification Deduplication Window (10 minutes)
const notificationDeduplicationMap = new Map<string, number>();

let localDbRef: Record<string, { value: any; updatedAt: number }> = {};
let saveDbCallback: () => void = () => {};

export function setTelegramDbReference(
  db: Record<string, { value: any; updatedAt: number }>,
  saveFn: () => void
) {
  localDbRef = db;
  saveDbCallback = saveFn;
}

/**
 * Retrieves the secure Telegram Bot Token.
 * Reads from process.env.TELEGRAM_BOT_TOKEN first, then server encrypted vault.
 */
export function getTelegramBotToken(): string {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim().length > 10) {
    return process.env.TELEGRAM_BOT_TOKEN.trim();
  }
  // Fallback to reading directly from .env if process.env had a short/stale value
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^TELEGRAM_BOT_TOKEN\s*=\s*([^\r\n]+)/m);
      if (match && match[1]?.trim().length > 10) {
        process.env.TELEGRAM_BOT_TOKEN = match[1].trim();
        return match[1].trim();
      }
    }
  } catch (_) {}

  const vaultItem = localDbRef['nexora_telegram_vault']?.value;
  if (vaultItem && vaultItem.encryptedToken) {
    return decryptSecret(vaultItem.encryptedToken);
  }
  return '';
}

/**
 * Saves a new Telegram Bot Token securely into encrypted server storage
 */
export function saveTelegramBotToken(token: string): void {
  if (!token) return;
  const encrypted = encryptSecret(token.trim());
  localDbRef['nexora_telegram_vault'] = {
    value: { encryptedToken: encrypted, updatedAt: Date.now() },
    updatedAt: Date.now(),
  };
  saveDbCallback();
  process.env.TELEGRAM_BOT_TOKEN = token.trim();
}

/**
 * Retrieves the secure Telegram Webhook Secret Token.
 */
export function getTelegramWebhookSecret(): string {
  if (process.env.TELEGRAM_WEBHOOK_SECRET && process.env.TELEGRAM_WEBHOOK_SECRET.trim().length >= 8) {
    return process.env.TELEGRAM_WEBHOOK_SECRET.trim();
  }
  const settings = getTelegramSettings();
  if (settings.webhookSecret && settings.webhookSecret.length >= 8) {
    return settings.webhookSecret;
  }
  return '';
}

/**
 * Validates the incoming X-Telegram-Bot-Api-Secret-Token against server-side secret.
 */
export function validateTelegramWebhookSecret(providedSecret?: string): boolean {
  const expected = getTelegramWebhookSecret();
  if (!expected) {
    // If no webhook secret is set in env or settings, allow local development calls
    return true;
  }
  if (!providedSecret) return false;
  try {
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(providedSecret);
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}

/**
 * Retrieves current Telegram Bot settings
 */
export function getTelegramSettings(): TelegramBotSettings {
  const record = localDbRef['nexora_telegram_settings']?.value;
  const username =
    record?.botUsername && record.botUsername !== 'Isp' && record.botUsername.length > 3
      ? record.botUsername
      : process.env.TELEGRAM_BOT_USERNAME && process.env.TELEGRAM_BOT_USERNAME !== 'Isp' && process.env.TELEGRAM_BOT_USERNAME.length > 3
      ? process.env.TELEGRAM_BOT_USERNAME
      : 'NexoranetworkISPBot';

  const defaults: TelegramBotSettings = {
    enabled: true,
    botUsername: username,
    adminChatIds: [],
    notifyNewClient: true,
    notifyNewOrder: true,
    notifyPaymentSubmitted: true,
    notifyPaymentApproved: true,
    notifyPaymentRejected: true,
    notifyClientActivated: true,
    notifyClientExpired: true,
    notifyMikrotikAlerts: true,
    notifyOltAlerts: true,
    notifyOnuAlerts: true,
    notifyLowOpticalPower: true,
  };

  if (!record) return defaults;
  return {
    ...defaults,
    ...record,
    botUsername: username,
    adminChatIds: Array.isArray(record.adminChatIds) ? record.adminChatIds : [],
  };
}

/**
 * Updates Telegram Bot settings
 */
export function updateTelegramSettings(settings: Partial<TelegramBotSettings>): TelegramBotSettings {
  const current = getTelegramSettings();
  const updated: TelegramBotSettings = {
    ...current,
    ...settings,
    adminChatIds: Array.isArray(settings.adminChatIds)
      ? Array.from(new Set(settings.adminChatIds.map((id) => String(id).trim()).filter(Boolean)))
      : current.adminChatIds,
  };

  localDbRef['nexora_telegram_settings'] = {
    value: updated,
    updatedAt: Date.now(),
  };
  saveDbCallback();
  return updated;
}

/**
 * Calls Telegram Bot HTTP API with timeout and error protection
 */
export async function callTelegramApi(method: string, payload: Record<string, any> = {}): Promise<any> {
  const token = getTelegramBotToken();
  if (!token) {
    throw new Error('Telegram Bot Token is not configured on the server.');
  }

  const url = `https://api.telegram.org/bot${token}/${method}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Telegram API request timed out.');
    }
    throw err;
  }
}

/**
 * Verifies Bot Connection using Telegram getMe
 */
export async function testTelegramBotConnection(): Promise<{
  success: boolean;
  botInfo?: any;
  error?: string;
}> {
  try {
    const res = await callTelegramApi('getMe');
    if (res.ok && res.result) {
      const current = getTelegramSettings();
      updateTelegramSettings({
        botUsername: res.result.username || current.botUsername,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: 'success',
        lastTestError: undefined,
      });
      return { success: true, botInfo: res.result };
    }
    const errMsg = res.description || 'Failed to authenticate Telegram Bot token';
    updateTelegramSettings({
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: 'failed',
      lastTestError: errMsg,
    });
    return { success: false, error: errMsg };
  } catch (err: any) {
    const errMsg = err.message || 'Network connection failed to api.telegram.org';
    updateTelegramSettings({
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: 'failed',
      lastTestError: errMsg,
    });
    return { success: false, error: errMsg };
  }
}

/**
 * Sends a message to a specific Telegram chat ID with Markdown/HTML formatting
 * Automatically catches and falls back to plain text if formatting has syntax issues.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  extra: Record<string, any> = {}
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra,
    };

    const res = await callTelegramApi('sendMessage', payload);
    if (res.ok && res.result) {
      return { success: true, messageId: res.result.message_id };
    }

    // If HTML parsing failed, retry as clean plain text
    if (res.description && res.description.toLowerCase().includes('can\'t parse entities')) {
      const cleanPlain = text.replace(/<[^>]*>?/gm, '');
      const plainRes = await callTelegramApi('sendMessage', {
        chat_id: chatId,
        text: cleanPlain,
        disable_web_page_preview: true,
        ...extra,
        parse_mode: undefined,
      });
      if (plainRes.ok) {
        return { success: true, messageId: plainRes.result.message_id };
      }
    }

    return { success: false, error: res.description || 'Telegram sendMessage failed' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Sends a message to all configured Admin Chat IDs
 */
export async function sendToAllAdmins(text: string, extra: Record<string, any> = {}): Promise<number> {
  const settings = getTelegramSettings();
  if (!settings.enabled || settings.adminChatIds.length === 0) {
    return 0;
  }

  let sentCount = 0;
  for (const chatId of settings.adminChatIds) {
    try {
      const res = await sendTelegramMessage(chatId, text, extra);
      if (res.success) sentCount++;
    } catch (e) {
      // Continue to next admin
    }
  }
  return sentCount;
}

/**
 * Sends a message to a linked Client by their ISP User ID
 */
export async function sendToClient(
  userId: string,
  text: string,
  extra: Record<string, any> = {}
): Promise<boolean> {
  const links = getClientLinks();
  const link = links.find((l) => l.userId.toLowerCase() === userId.toLowerCase());
  if (!link || !link.chatId) return false;

  const res = await sendTelegramMessage(link.chatId, text, extra);
  return res.success;
}

/**
 * Checks whether a notification should be skipped due to recent deduplication
 */
function shouldThrottleNotification(key: string, cooldownMs = 600000): boolean {
  const now = Date.now();
  const lastSent = notificationDeduplicationMap.get(key);
  if (lastSent && now - lastSent < cooldownMs) {
    return true; // Throttle duplicate
  }
  notificationDeduplicationMap.set(key, now);
  // Cleanup old keys
  if (notificationDeduplicationMap.size > 1000) {
    for (const [k, v] of notificationDeduplicationMap.entries()) {
      if (now - v > cooldownMs * 2) notificationDeduplicationMap.delete(k);
    }
  }
  return false;
}

// =========================================================================
// CLIENT & ADMIN ONE-TIME PAIRING TOKEN MANAGEMENT
// =========================================================================

export function generateAdminPairingToken(): { token: string; link: string; expiresAt: number } {
  const token = `adm_${crypto.randomBytes(12).toString('hex')}`;
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
  adminPairingTokens.set(token, { token, expiresAt });

  const settings = getTelegramSettings();
  const botUsername = settings.botUsername || 'NexoranetworkISPBot';
  const link = `https://t.me/${botUsername}?start=${token}`;
  return { token, link, expiresAt };
}

export function generateClientLinkingToken(userId: string, clientName: string): { token: string; link: string; expiresAt: number } {
  const token = `cli_${crypto.randomBytes(10).toString('hex')}`;
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 mins
  clientPairingTokens.set(token, { token, userId, clientName, expiresAt });

  const settings = getTelegramSettings();
  const botUsername = settings.botUsername || 'NexoranetworkISPBot';
  const link = `https://t.me/${botUsername}?start=link_${token}`;
  return { token, link, expiresAt };
}

export function getClientLinks(): ClientTelegramLink[] {
  const record = localDbRef['nexora_telegram_client_links']?.value;
  return Array.isArray(record) ? record : [];
}

export function saveClientLink(userId: string, chatId: string, clientName: string, phone?: string): void {
  const links = getClientLinks().filter((l) => l.userId.toLowerCase() !== userId.toLowerCase() && l.chatId !== chatId);
  links.push({
    userId,
    chatId,
    clientName,
    phone,
    linkedAt: new Date().toISOString(),
  });
  localDbRef['nexora_telegram_client_links'] = {
    value: links,
    updatedAt: Date.now(),
  };
  saveDbCallback();
}

export function removeClientLinkByChatId(chatId: string): boolean {
  const links = getClientLinks();
  const filtered = links.filter((l) => l.chatId !== chatId);
  if (filtered.length !== links.length) {
    localDbRef['nexora_telegram_client_links'] = {
      value: filtered,
      updatedAt: Date.now(),
    };
    saveDbCallback();
    return true;
  }
  return false;
}

// =========================================================================
// REAL SYSTEM NOTIFICATIONS DISPATCHERS
// =========================================================================

/**
 * 1. New Client Registration Notification
 */
export async function notifyNewClientRegistration(client: {
  name: string;
  userId: string;
  phone?: string;
  package: string;
  price?: string | number;
  router?: string;
  ip?: string;
}): Promise<void> {
  const settings = getTelegramSettings();
  if (!settings.enabled || !settings.notifyNewClient) return;

  const dedupKey = `new_client_${client.userId}`;
  if (shouldThrottleNotification(dedupKey, 60000)) return;

  const text =
    `<b>🆕 New Subscriber Registered</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Name:</b> ${escapeHtml(client.name)}\n` +
    `🆔 <b>User ID:</b> <code>${escapeHtml(client.userId)}</code>\n` +
    `📦 <b>Package:</b> ${escapeHtml(client.package)} (৳${client.price || 'N/A'})\n` +
    `📞 <b>Phone:</b> ${escapeHtml(client.phone || 'N/A')}\n` +
    `🌐 <b>Router:</b> ${escapeHtml(client.router || 'Core')}\n` +
    `⏰ <b>Registered:</b> ${new Date().toLocaleString()}`;

  await sendToAllAdmins(text);
}

/**
 * 2. New Package/Order Notification
 */
export async function notifyNewPackageOrder(order: {
  clientName: string;
  phone?: string;
  packageName: string;
  price: number | string;
  gateway?: string;
  transaction?: string;
  userId?: string;
}): Promise<void> {
  const settings = getTelegramSettings();
  if (!settings.enabled || !settings.notifyNewOrder) return;

  const text =
    `<b>📦 New Package Order Submitted</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> ${escapeHtml(order.clientName)}\n` +
    `📦 <b>Package:</b> ${escapeHtml(order.packageName)}\n` +
    `💰 <b>Amount:</b> ৳${order.price}\n` +
    `💳 <b>Gateway:</b> ${escapeHtml(order.gateway || 'Manual/Portal')}\n` +
    (order.transaction ? `🔖 <b>TrxID:</b> <code>${escapeHtml(order.transaction)}</code>\n` : '') +
    `⏰ <b>Order Time:</b> ${new Date().toLocaleString()}\n\n` +
    `<i>⚡ Review and approve from Admin Billing Panel.</i>`;

  await sendToAllAdmins(text);
}

/**
 * 3. Payment Submitted Notification (For Manual Verification)
 */
export async function notifyPaymentSubmitted(payment: {
  clientName: string;
  userId: string;
  amount: number | string;
  package?: string;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
}): Promise<void> {
  const settings = getTelegramSettings();
  if (!settings.enabled || !settings.notifyPaymentSubmitted) return;

  const dedupKey = `pay_sub_${payment.userId}_${payment.transactionId || payment.amount}`;
  if (shouldThrottleNotification(dedupKey, 60000)) return;

  const text =
    `<b>💳 Payment Submitted for Verification</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> ${escapeHtml(payment.clientName)}\n` +
    `🆔 <b>User ID:</b> <code>${escapeHtml(payment.userId)}</code>\n` +
    `💰 <b>Amount:</b> ৳${payment.amount}\n` +
    `🏦 <b>Method:</b> ${escapeHtml(payment.paymentMethod)}\n` +
    `🔖 <b>TrxID:</b> <code>${escapeHtml(payment.transactionId || 'None')}</code>\n` +
    (payment.package ? `📦 <b>Plan:</b> ${escapeHtml(payment.package)}\n` : '') +
    `🕒 <b>Submitted:</b> ${new Date().toLocaleString()}\n` +
    `⚠️ <b>Status:</b> <b>Pending Manual Verification</b>`;

  await sendToAllAdmins(text);
}

/**
 * 4. Payment Approved or Rejected Notification
 */
export async function notifyPaymentDecision(decision: {
  status: 'approved' | 'rejected';
  clientName: string;
  userId: string;
  amount: number | string;
  package?: string;
  transactionId?: string;
  newExpiry?: string;
  reason?: string;
}): Promise<void> {
  const settings = getTelegramSettings();
  if (!settings.enabled) return;

  const isApproved = decision.status === 'approved';
  if (isApproved && !settings.notifyPaymentApproved) return;
  if (!isApproved && !settings.notifyPaymentRejected) return;

  const icon = isApproved ? '✅' : '❌';
  const statusTitle = isApproved ? 'Payment Verified & Approved' : 'Payment Verification Rejected';

  const adminText =
    `<b>${icon} ${statusTitle}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> ${escapeHtml(decision.clientName)}\n` +
    `🆔 <b>User ID:</b> <code>${escapeHtml(decision.userId)}</code>\n` +
    `💰 <b>Amount:</b> ৳${decision.amount}\n` +
    (decision.transactionId ? `🔖 <b>TrxID:</b> <code>${escapeHtml(decision.transactionId)}</code>\n` : '') +
    (isApproved && decision.newExpiry ? `📅 <b>Extended Validity Till:</b> ${escapeHtml(decision.newExpiry)}\n` : '') +
    (!isApproved && decision.reason ? `⚠️ <b>Reason:</b> ${escapeHtml(decision.reason)}\n` : '') +
    `⏰ <b>Decision Time:</b> ${new Date().toLocaleString()}`;

  await sendToAllAdmins(adminText);

  // Send direct message to client if linked on Telegram
  const clientText = isApproved
    ? `<b>🎉 Payment Verified & Service Active!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Dear <b>${escapeHtml(decision.clientName)}</b>, your payment of <b>৳${decision.amount}</b> has been verified.\n` +
      `📦 <b>Package:</b> ${escapeHtml(decision.package || 'Internet')}\n` +
      `📅 <b>Active Validity Till:</b> <b>${escapeHtml(decision.newExpiry || 'Next Month')}</b>\n` +
      `Thank you for staying with Nexora Network ISP!`
    : `<b>⚠️ Payment Verification Notice</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Dear <b>${escapeHtml(decision.clientName)}</b>, your recent payment of <b>৳${decision.amount}</b> could not be verified.\n` +
      `Reason: ${escapeHtml(decision.reason || 'Invalid Transaction ID or Amount')}\n` +
      `Please contact our helpdesk or resubmit valid transaction details.`;

  await sendToClient(decision.userId, clientText);
}

/**
 * 5. Client Activated or Expired Notification
 */
export async function notifyClientStatusChange(client: {
  userId: string;
  name: string;
  status: 'online' | 'expired' | 'offline';
  package?: string;
  expiry?: string;
}): Promise<void> {
  const settings = getTelegramSettings();
  if (!settings.enabled) return;

  const isActivated = client.status === 'online';
  if (isActivated && !settings.notifyClientActivated) return;
  if (!isActivated && !settings.notifyClientExpired) return;

  const dedupKey = `client_status_${client.userId}_${client.status}`;
  if (shouldThrottleNotification(dedupKey, 300000)) return;

  const icon = isActivated ? '⚡' : '⏰';
  const title = isActivated ? 'Client Line Activated (Online)' : 'Client Subscription Expired';

  const adminText =
    `<b>${icon} ${title}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> ${escapeHtml(client.name)}\n` +
    `🆔 <b>User ID:</b> <code>${escapeHtml(client.userId)}</code>\n` +
    `📦 <b>Package:</b> ${escapeHtml(client.package || 'Broadband')}\n` +
    `📅 <b>Expiry:</b> ${escapeHtml(client.expiry || 'N/A')}\n` +
    `⏰ <b>Timestamp:</b> ${new Date().toLocaleString()}`;

  await sendToAllAdmins(adminText);

  // Notify client directly
  if (!isActivated) {
    const clientText =
      `<b>⏰ Internet Subscription Notice</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Dear <b>${escapeHtml(client.name)}</b>, your internet subscription has expired on <b>${escapeHtml(client.expiry || 'Today')}</b>.\n` +
      `Please recharge or submit payment from your Client Portal to restore high-speed internet immediately.`;
    await sendToClient(client.userId, clientText);
  }
}

/**
 * 6. MikroTik Router Online/Offline Alert
 */
export async function notifyMikrotikAlert(router: {
  name: string;
  ip: string;
  status: 'online' | 'offline';
  error?: string;
}): Promise<void> {
  const settings = getTelegramSettings();
  if (!settings.enabled || !settings.notifyMikrotikAlerts) return;

  const dedupKey = `mkt_alert_${router.ip}_${router.status}`;
  if (shouldThrottleNotification(dedupKey, 600000)) return; // 10 min throttle

  const isUp = router.status === 'online';
  const icon = isUp ? '🟢' : '🔴';
  const title = isUp ? 'MikroTik Router Restored Online' : 'MikroTik Router Connection Lost';

  const text =
    `<b>${icon} ${title}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📡 <b>Router Name:</b> ${escapeHtml(router.name)}\n` +
    `🌐 <b>Host IP:</b> <code>${escapeHtml(router.ip)}</code>\n` +
    `📊 <b>Status:</b> <b>${isUp ? 'ONLINE' : 'OFFLINE'}</b>\n` +
    (!isUp && router.error ? `⚠️ <b>Error:</b> ${escapeHtml(router.error)}\n` : '') +
    `⏰ <b>Time:</b> ${new Date().toLocaleString()}`;

  await sendToAllAdmins(text);
}

/**
 * 7. OLT Online/Offline Alert
 */
export async function notifyOltAlert(olt: {
  name: string;
  ip: string;
  brand: string;
  status: 'online' | 'offline';
  error?: string;
}): Promise<void> {
  const settings = getTelegramSettings();
  if (!settings.enabled || !settings.notifyOltAlerts) return;

  const dedupKey = `olt_alert_${olt.ip}_${olt.status}`;
  if (shouldThrottleNotification(dedupKey, 600000)) return;

  const isUp = olt.status === 'online';
  const icon = isUp ? '🟢' : '🚨';
  const title = isUp ? 'OLT Line Terminal Online' : 'OLT Line Terminal OFFLINE / Unreachable';

  const text =
    `<b>${icon} ${title}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🏢 <b>OLT:</b> ${escapeHtml(olt.name)}\n` +
    `🏷️ <b>Brand:</b> ${escapeHtml(olt.brand)}\n` +
    `🌐 <b>IP Address:</b> <code>${escapeHtml(olt.ip)}</code>\n` +
    `📊 <b>Status:</b> <b>${isUp ? 'ONLINE' : 'OFFLINE'}</b>\n` +
    (!isUp && olt.error ? `⚠️ <b>Error:</b> ${escapeHtml(olt.error)}\n` : '') +
    `⏰ <b>Time:</b> ${new Date().toLocaleString()}`;

  await sendToAllAdmins(text);
}

/**
 * 8. ONU Status & Low Optical Power Alert
 */
export async function notifyOnuAlert(onu: {
  serialNumber: string;
  onuId?: string;
  clientName?: string;
  userId?: string;
  oltName?: string;
  alertType: 'los' | 'low_rx_power' | 'offline' | 'online';
  rxPower?: number | null;
  distanceMeters?: number | null;
}): Promise<void> {
  const settings = getTelegramSettings();
  if (!settings.enabled) return;

  if (onu.alertType === 'low_rx_power' && !settings.notifyLowOpticalPower) return;
  if (onu.alertType !== 'low_rx_power' && !settings.notifyOnuAlerts) return;

  const dedupKey = `onu_alert_${onu.serialNumber}_${onu.alertType}`;
  if (shouldThrottleNotification(dedupKey, 600000)) return;

  let icon = '⚠️';
  let title = 'ONU Optical Alert';
  if (onu.alertType === 'los') {
    icon = '🚨';
    title = 'FIBER BREAK / LOS (Loss of Signal)';
  } else if (onu.alertType === 'low_rx_power') {
    icon = '📉';
    title = 'Low Optical RX Power Warning (Below -25 dBm)';
  } else if (onu.alertType === 'online') {
    icon = '🟢';
    title = 'ONU Optical Signal Restored (Online)';
  }

  const text =
    `<b>${icon} ${title}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📟 <b>ONU ID:</b> <code>${escapeHtml(onu.onuId || onu.serialNumber)}</code>\n` +
    `🔖 <b>Serial:</b> <code>${escapeHtml(onu.serialNumber)}</code>\n` +
    (onu.clientName ? `👤 <b>Subscriber:</b> ${escapeHtml(onu.clientName)} (${escapeHtml(onu.userId || '')})\n` : '') +
    (onu.oltName ? `🏢 <b>OLT:</b> ${escapeHtml(onu.oltName)}\n` : '') +
    `📶 <b>RX Power:</b> <b>${onu.rxPower !== null && onu.rxPower !== undefined ? `${onu.rxPower.toFixed(1)} dBm` : 'N/A'}</b>\n` +
    (onu.distanceMeters ? `📏 <b>Distance:</b> ${onu.distanceMeters} meters\n` : '') +
    `⏰ <b>Detected At:</b> ${new Date().toLocaleString()}`;

  await sendToAllAdmins(text);

  // If client is linked and it's a severe fiber LOS, notify subscriber directly
  if (onu.userId && onu.alertType === 'los') {
    const clientText =
      `<b>🚨 Optical Signal Interruption Detected</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Dear <b>${escapeHtml(onu.clientName || 'Subscriber')}</b>,\n` +
      `Our fiber monitoring system detected an optical signal loss (LOS) on your ONU router line.\n` +
      `Our technical field team has been notified to inspect the fiber distribution line.`;
    await sendToClient(onu.userId, clientText);
  }
}

/**
 * 9. Slow Internet / High Bandwidth Saturation Alert
 */
export async function notifySlowInternetAlert(alert: {
  name: string;
  userId: string;
  phone?: string;
  package: string;
  currentSpeed?: string;
  allocatedSpeed?: string;
  utilizationPercent?: number | string;
  opticalRxPower?: number | string;
  reason?: string;
  router?: string;
}): Promise<void> {
  const settings = getTelegramSettings();
  if (!settings.enabled) return;

  const dedupKey = `slow_net_${alert.userId}`;
  if (shouldThrottleNotification(dedupKey, 180000)) return; // 3 min throttle

  const text =
    `<b>🐢 Slow Internet Speed / Congestion Alert</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> ${escapeHtml(alert.name)}\n` +
    `🆔 <b>User ID:</b> <code>${escapeHtml(alert.userId)}</code>\n` +
    `📞 <b>Phone:</b> ${escapeHtml(alert.phone || 'N/A')}\n` +
    `📦 <b>Package Plan:</b> ${escapeHtml(alert.package)}\n` +
    (alert.allocatedSpeed ? `⚡ <b>Allocated Bandwidth:</b> ${escapeHtml(alert.allocatedSpeed)}\n` : '') +
    (alert.currentSpeed ? `📉 <b>Current Usage:</b> <b>${escapeHtml(alert.currentSpeed)}</b>\n` : '') +
    (alert.utilizationPercent ? `📊 <b>Bandwidth Saturation:</b> <b>${alert.utilizationPercent}%</b>\n` : '') +
    (alert.opticalRxPower ? `📶 <b>Optical Signal (RX):</b> <b>${alert.opticalRxPower} dBm</b>\n` : '') +
    `⚠️ <b>Issue:</b> ${escapeHtml(alert.reason || 'High traffic saturation or optical signal degradation detected.')}\n` +
    (alert.router ? `🌐 <b>Router:</b> ${escapeHtml(alert.router)}\n` : '') +
    `⏰ <b>Detected At:</b> ${new Date().toLocaleString()}`;

  await sendToAllAdmins(text);
}

// =========================================================================
// TELEGRAM INCOMING COMMAND PROCESSOR
// =========================================================================

/**
 * Dispatches sample alerts for all 11 system notification triggers
 */
export async function dispatchAllDemoAlertsToAdmins(targetChatId?: string): Promise<{ success: boolean; count: number }> {
  // Clear recent deduplication map for clean demo dispatch
  notificationDeduplicationMap.clear();

  const alerts = [
    // 1. New Client Registration
    `<b>🆕 New Subscriber Registered</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Name:</b> Tanvir Hossain\n` +
    `🆔 <b>User ID:</b> <code>tanvir_fiber20</code>\n` +
    `📦 <b>Package:</b> Fiber 20 (20 Mbps) (৳800)\n` +
    `📞 <b>Phone:</b> 01817681233\n` +
    `🌐 <b>Router:</b> Core MikroTik Gateway\n` +
    `⏰ <b>Registered:</b> ${new Date().toLocaleString()}`,

    // 2. New Package Order
    `<b>📦 New Package Order Submitted</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> Tanvir Hossain\n` +
    `📦 <b>Package:</b> Fiber 20 (20 Mbps)\n` +
    `💰 <b>Amount:</b> ৳800\n` +
    `💳 <b>Gateway:</b> bKash Online\n` +
    `🔖 <b>TrxID:</b> <code>TRX99283719</code>\n` +
    `⏰ <b>Order Time:</b> ${new Date().toLocaleString()}\n\n` +
    `<i>⚡ Review and approve from Admin Billing Panel.</i>`,

    // 3. Payment Submitted (Manual verification)
    `<b>💳 Manual Payment Awaiting Approval</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> Tanvir Hossain (<code>tanvir_fiber20</code>)\n` +
    `💰 <b>Amount:</b> ৳800 (Fiber 20)\n` +
    `💳 <b>Method:</b> bKash Manual\n` +
    `🔖 <b>TrxID:</b> <code>BKSH91823719</code>\n` +
    `⏰ <b>Submitted:</b> ${new Date().toLocaleString()}\n\n` +
    `<i>👉 Action: Open Billing page to match SMS statement & approve.</i>`,

    // 4. Payment Approved
    `<b>✅ Payment Approved & Line Active</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> Tanvir Hossain (<code>tanvir_fiber20</code>)\n` +
    `💰 <b>Amount Paid:</b> ৳800\n` +
    `📦 <b>Package:</b> Fiber 20\n` +
    `🔖 <b>TrxID:</b> <code>BKSH91823719</code>\n` +
    `📅 <b>New Expiry:</b> 2026-11-01\n` +
    `⏰ <b>Approved At:</b> ${new Date().toLocaleString()}`,

    // 5. Payment Rejected
    `<b>❌ Payment Rejected</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> Hasan Ali (<code>hasan_50</code>)\n` +
    `💰 <b>Amount:</b> ৳500\n` +
    `🔖 <b>TrxID:</b> <code>INVALID_TRX</code>\n` +
    `⚠️ <b>Reason:</b> bKash TrxID did not match statement.\n` +
    `⏰ <b>Rejected At:</b> ${new Date().toLocaleString()}`,

    // 6. Line Activated (Online)
    `<b>⚡ Line Activated (Online)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> Tanvir Hossain\n` +
    `🆔 <b>User ID:</b> <code>tanvir_fiber20</code>\n` +
    `📦 <b>Package:</b> Fiber 20\n` +
    `📅 <b>Validity:</b> 2026-11-01\n` +
    `🟢 <b>Status:</b> Active on Core MikroTik Gateway\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleString()}`,

    // 7. Subscription Expired
    `<b>⏰ Subscription Expired (Account Suspended)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> Karim Ullah\n` +
    `🆔 <b>User ID:</b> <code>karim_fiber</code>\n` +
    `📦 <b>Package:</b> Fiber 10\n` +
    `📅 <b>Expired on:</b> 2026-09-30\n` +
    `🔴 <b>Status:</b> Expired / PPPoE Session Terminated\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleString()}`,

    // 8. MikroTik Online / Offline Alert
    `<b>🚨 MikroTik Core Router Disconnect Alert</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📡 <b>Router:</b> Core MikroTik CCR1036\n` +
    `🌐 <b>IP Host:</b> <code>103.145.118.2:8728</code>\n` +
    `🔴 <b>Status:</b> Offline (Connection timed out)\n` +
    `⚠️ <b>Impact:</b> Bandwidth shaping & PPPoE auth may be interrupted\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleString()}`,

    // 9. OLT Online / Offline Alert
    `<b>🚨 OLT Line Terminal Disconnect Alert</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🏢 <b>Device:</b> Mirpur Core Huawei OLT\n` +
    `🌐 <b>IP Address:</b> <code>192.168.10.1:161</code>\n` +
    `🏷️ <b>Brand:</b> Huawei SmartAX EA5800\n` +
    `🔴 <b>Status:</b> Offline (SNMP Port 161 unreachable)\n` +
    `⚠️ <b>Impact:</b> Downlink PON branches optical monitoring paused\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleString()}`,

    // 10. ONU Fiber Break / LOS Alert
    `<b>🚨 ONU Optical Signal Loss (LOS / Fiber Break)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📟 <b>ONU ID:</b> <code>EPON0/1:4</code>\n` +
    `🔖 <b>Serial:</b> <code>HWTC48910231</code>\n` +
    `👤 <b>Subscriber:</b> Tanvir Hossain (<code>tanvir_fiber20</code>)\n` +
    `🏢 <b>OLT:</b> Mirpur Core Huawei OLT\n` +
    `📶 <b>RX Power:</b> <b>-32.5 dBm (LOS)</b>\n` +
    `📏 <b>Distance:</b> 820 meters\n` +
    `⚠️ <b>Diagnosis:</b> Fiber core cable cut or drop wire unplugged\n` +
    `⏰ <b>Detected At:</b> ${new Date().toLocaleString()}`,

    // 11. Low Optical RX Power Warning (Below -25 dBm)
    `<b>📉 Low Optical RX Power Warning</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📟 <b>ONU ID:</b> <code>GPON0/2:8</code>\n` +
    `🔖 <b>Serial:</b> <code>ZTEGC9921442</code>\n` +
    `👤 <b>Subscriber:</b> Rahim Ahmed (<code>rahim_fiber</code>)\n` +
    `🏢 <b>OLT:</b> Dhanmondi BDCOM OLT\n` +
    `📶 <b>RX Power:</b> <b>-27.8 dBm (High Loss)</b>\n` +
    `📏 <b>Distance:</b> 1450 meters\n` +
    `⚠️ <b>Warning:</b> Optical power is below -25 dBm threshold. Check splice trays.\n` +
    `⏰ <b>Detected At:</b> ${new Date().toLocaleString()}`,

    // 12. Slow Internet / High Bandwidth Saturation Alert
    `<b>🐢 Slow Internet Speed / Congestion Alert</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> Tanvir Hossain (<code>tanvir_fiber20</code>)\n` +
    `📞 <b>Phone:</b> 01817681233\n` +
    `📦 <b>Plan:</b> Fiber 20 (20 Mbps)\n` +
    `⚡ <b>Allocated:</b> 20 Mbps\n` +
    `📉 <b>Current Usage:</b> <b>19.8 Mbps (99% Saturation)</b>\n` +
    `⚠️ <b>Issue:</b> Continuous 100% bandwidth choking detected.\n` +
    `🌐 <b>Router:</b> Core MikroTik Gateway\n` +
    `⏰ <b>Detected At:</b> ${new Date().toLocaleString()}`,
  ];

  let sent = 0;
  if (targetChatId) {
    for (const msg of alerts) {
      await sendTelegramMessage(targetChatId, msg);
      sent++;
      await new Promise((r) => setTimeout(r, 150));
    }
  } else {
    for (const msg of alerts) {
      const c = await sendToAllAdmins(msg);
      if (c > 0) sent++;
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return { success: true, count: sent };
}

export async function handleTelegramIncomingUpdate(update: any): Promise<void> {
  if (!update) return;

  // 1. Handle Inline Button Callback Queries
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = String(cb.message?.chat?.id || '');
    const data = String(cb.data || '');
    const queryId = cb.id;

    if (!chatId || !data) return;

    // Acknowledge callback immediately to remove loading spinner in Telegram client
    await callTelegramApi('answerCallbackQuery', { callback_query_id: queryId }).catch(() => {});

    // Client self-care callbacks (available to authenticated linked clients)
    if (data === 'my_bw' || data === 'live_bw' || data.startsWith('client_bw_')) {
      const clientLinks = getClientLinks();
      const linked = clientLinks.find((l) => l.chatId === chatId);
      if (linked) {
        await executeClientLiveBandwidthCheck(chatId, linked.userId);
      } else {
        await sendTelegramMessage(chatId, `⚠️ No linked subscriber account found for this Telegram chat. Use /start to link your account.`);
      }
      return;
    }

    if (data === 'my_onu') {
      const clientLinks = getClientLinks();
      const linked = clientLinks.find((l) => l.chatId === chatId);
      if (linked) {
        const realOnu = getRealOnuByUserId(linked.userId);
        if (!realOnu) {
          await sendTelegramMessage(chatId, `ℹ️ No OLT fiber terminal currently mapped to your line.`);
          return;
        }
        const opticalMsg =
          `<b>📶 Optical Fiber Health (My ONU)</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Status: <b>${realOnu.status === 'online' ? '🟢 Online (Signal Healthy)' : realOnu.status === 'los' ? '🚨 LOS (Fiber Break)' : '⚠️ Signal Weak'}</b>\n` +
          `Optical RX Power: <b>${realOnu.rxPower !== null ? `${realOnu.rxPower.toFixed(1)} dBm` : 'N/A'}</b>\n` +
          (realOnu.txPower ? `Optical TX Power: ${realOnu.txPower.toFixed(1)} dBm\n` : '') +
          (realOnu.distanceMeters ? `Cable Distance: ${realOnu.distanceMeters} meters\n` : '') +
          `Serial Number: <code>${realOnu.serialNumber}</code>`;
        await sendTelegramMessage(chatId, opticalMsg);
      }
      return;
    }

    const settings = getTelegramSettings();
    const isAdmin = settings.adminChatIds.includes(chatId);

    if (!isAdmin) {
      await sendTelegramMessage(chatId, `⛔ <b>Unauthorized:</b> Only authorized administrators can perform subscriber line actions.`);
      return;
    }

    if (data === 'admin_traffic' || data === 'admin_bw') {
      await executeAdminLiveTrafficCheck(chatId);
      return;
    }

    if (data.startsWith('act_')) {
      const targetUserId = data.slice(4);
      await executeAdminActivateClient(chatId, targetUserId);
      return;
    }

    if (data.startsWith('deact_')) {
      const targetUserId = data.slice(6);
      await executeAdminDeactivateClient(chatId, targetUserId);
      return;
    }

    if (data.startsWith('ext_')) {
      const targetUserId = data.slice(4);
      await executeAdminExtendClient(chatId, targetUserId, 30);
      return;
    }

    if (data.startsWith('del_')) {
      const targetUserId = data.slice(4);
      await executeAdminDeleteClient(chatId, targetUserId);
      return;
    }

    return;
  }

  // 2. Handle Text Messages
  if (!update.message) return;
  const message = update.message;
  const chatId = String(message.chat?.id || '');
  const text = String(message.text || '').trim();
  const fromUser = message.from;

  if (!chatId || !text) return;

  console.log(`[TelegramBot] Incoming message from chatId=${chatId} (${fromUser?.first_name || 'user'}) text="${text}"`);

  const settings = getTelegramSettings();
  let isAdmin = settings.adminChatIds.includes(chatId);

  // Check client link
  const clientLinks = getClientLinks();
  const linkedClient = clientLinks.find((l) => l.chatId === chatId);

  const [rawCommand, ...args] = text.split(/\s+/);
  const command = rawCommand.toLowerCase().split('@')[0];
  const queryParam = args.join(' ').trim();

  // Handle /admin, /authorize, /authorize_admin commands - never allow self-elevation!
  if (command === '/admin' || command === '/authorize' || command === '/authorize_admin') {
    if (isAdmin) {
      await sendTelegramMessage(chatId, `✅ <b>Admin Status:</b> You are already an authorized administrator for Nexora Network ISP.`);
      return;
    }
    await sendTelegramMessage(
      chatId,
      `⛔ <b>Admin Authorization Required</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      `Your Chat ID (<code>${chatId}</code>) is not authorized.\n\n` +
      `🔐 <b>How to Authorize:</b>\n` +
      `1. Log in to your ISP Admin Dashboard.\n` +
      `2. Go to <b>Settings &gt; Telegram Bot</b>.\n` +
      `3. Click <b>"Generate Admin 1-Click Link"</b> and open the link on Telegram.`
    );
    return;
  }

  // Command to test all 12 alerts right in Telegram (Admin only)
  if (command === '/test_alerts' || command === '/testalerts') {
    if (!isAdmin) {
      await sendTelegramMessage(chatId, `⛔ <b>Access Denied:</b> This command requires authorized administrator privileges.`);
      return;
    }
    await sendTelegramMessage(chatId, `🚀 <b>Dispatching all 12 system alerts to this chat now...</b>`);
    await dispatchAllDemoAlertsToAdmins(chatId);
    return;
  }

  // 1. /start command (Handles Admin Pairing & Client Account Linking)
  if (command === '/start') {
    // Check if start parameter was provided: /start <param>
    if (queryParam) {
      // Check Admin pairing token
      const adminPair = adminPairingTokens.get(queryParam);
      if (adminPair && Date.now() < adminPair.expiresAt) {
        adminPairingTokens.delete(queryParam);
        const updatedChatIds = Array.from(new Set([...settings.adminChatIds, chatId]));
        updateTelegramSettings({ adminChatIds: updatedChatIds });

        const welcomeAdmin =
          `<b>🔐 Admin Authorization Successful!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Welcome <b>${escapeHtml(fromUser?.first_name || 'Admin')}</b>! Your Telegram Chat ID (<code>${chatId}</code>) is now authorized as a <b>Nexora Network ISP Super Admin</b>.\n\n` +
          `You will receive real-time alerts for:\n` +
          `• New client registrations & orders\n` +
          `• Manual payment submissions\n` +
          `• MikroTik router & OLT disconnects\n` +
          `• ONU fiber breaks (LOS) & low optical power\n\n` +
          `Type <b>/help</b> or <b>/status</b> to get started!`;

        await sendTelegramMessage(chatId, welcomeAdmin);
        return;
      }

      // Check Client linking token: /start link_cli_xxx
      const cleanLinkToken = queryParam.startsWith('link_') ? queryParam.slice(5) : queryParam;
      const clientPair = clientPairingTokens.get(cleanLinkToken);
      if (clientPair && Date.now() < clientPair.expiresAt) {
        clientPairingTokens.delete(cleanLinkToken);
        saveClientLink(clientPair.userId, chatId, clientPair.clientName);

        const welcomeClient =
          `<b>🎉 Account Successfully Linked!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Hello <b>${escapeHtml(clientPair.clientName)}</b>! Your Telegram account is now securely linked to your Nexora Network ISP account (<b>${escapeHtml(clientPair.userId)}</b>).\n\n` +
          `You can now use these commands anytime:\n` +
          `• <b>/status</b> - View active package & subscription expiry\n` +
          `• <b>/mypayments</b> - View recent payment records\n` +
          `• <b>/myonu</b> - Check your real fiber optical signal\n` +
          `• <b>/unlink</b> - Unlink Telegram from this account`;

        await sendTelegramMessage(chatId, welcomeClient);
        return;
      }

      await sendTelegramMessage(
        chatId,
        `⚠️ <b>Invalid or Expired Link Token</b>\nPlease generate a fresh pairing link from your Admin Settings or Client Dashboard.`
      );
      return;
    }

    // Standard /start without params
    if (isAdmin) {
      const welcome =
        `<b>🌐 Nexora Network ISP - Admin Bot Dashboard</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Welcome <b>${escapeHtml(fromUser?.first_name || 'Admin')}</b>! You are an authorized administrator.\n\n` +
        `<b>🛠️ Admin Commands:</b>\n` +
        `• <b>/status</b> - Live ISP status, routers & OLTs\n` +
        `• <b>/clients</b> - Subscribers summary by package\n` +
        `• <b>/online</b> - Active online clients\n` +
        `• <b>/offline</b> - Expired/inactive subscribers\n` +
        `• <b>/olt</b> - Real OLT hardware status & PONs\n` +
        `• <b>/onu</b> - Real discovered ONUs & optical RX power\n` +
        `• <b>/alerts</b> - Active alerts & fiber breaks\n` +
        `• <b>/search &lt;query&gt;</b> - Search subscriber by name/ID/phone`;

      await sendTelegramMessage(chatId, welcome);
      return;
    }

    if (linkedClient) {
      const welcome =
        `<b>🌐 Welcome to Nexora Network ISP Self-Care Bot</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Subscriber: <b>${escapeHtml(linkedClient.clientName)}</b> (<code>${escapeHtml(linkedClient.userId)}</code>)\n\n` +
        `<b>Available Commands:</b>\n` +
        `• <b>/mybandwidth</b> or <b>/speed</b> - Live download & upload speed\n` +
        `• <b>/status</b> or <b>/myaccount</b> - Subscription expiry & dues\n` +
        `• <b>/mypackage</b> - Active plan & bandwidth details\n` +
        `• <b>/mypayments</b> - View recent payment history\n` +
        `• <b>/myonu</b> - Check real optical fiber signal\n` +
        `• <b>/unlink</b> - Disconnect Telegram account`;

      await sendTelegramMessage(chatId, welcome, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Live Bandwidth', callback_data: 'my_bw' },
              { text: '📶 Optical Signal', callback_data: 'my_onu' },
            ],
          ],
        },
      });
      return;
    }

    // Unlinked user
    const unlinkedMsg =
      `<b>🌐 Welcome to Nexora Network ISP Bot</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `This bot provides real-time alerts and self-care services for <b>Nexora Network ISP</b>.\n\n` +
      `• <b>Subscribers:</b> Log in to your Client Portal and click <i>"Link with Telegram"</i> to connect your account.\n` +
      `• <b>Administrators:</b> Open Admin Dashboard &gt; Settings &gt; Telegram Bot &gt; click <i>"Generate Admin 1-Click Link"</i> to authorize this chat ID (<code>${chatId}</code>).`;

    await sendTelegramMessage(chatId, unlinkedMsg);
    return;
  }

  // 2. /link <code> command
  if (command === '/link') {
    if (!queryParam) {
      await sendTelegramMessage(
        chatId,
        `ℹ️ <b>How to Link:</b> Enter <code>/link &lt;token&gt;</code> using the one-time code provided in your Client Portal or Admin Settings.`
      );
      return;
    }

    // Check if admin token
    const adminPair = adminPairingTokens.get(queryParam);
    if (adminPair && Date.now() < adminPair.expiresAt) {
      adminPairingTokens.delete(queryParam);
      const updatedChatIds = Array.from(new Set([...settings.adminChatIds, chatId]));
      updateTelegramSettings({ adminChatIds: updatedChatIds });
      await sendTelegramMessage(chatId, `✅ <b>Admin Chat ID Authorized:</b> <code>${chatId}</code>`);
      return;
    }

    // Check client token
    const clientPair = clientPairingTokens.get(queryParam);
    if (clientPair && Date.now() < clientPair.expiresAt) {
      clientPairingTokens.delete(queryParam);
      saveClientLink(clientPair.userId, chatId, clientPair.clientName);
      await sendTelegramMessage(
        chatId,
        `✅ <b>Account Linked:</b> Welcome <b>${escapeHtml(clientPair.clientName)}</b> (ID: <code>${escapeHtml(clientPair.userId)}</code>)!`
      );
      return;
    }

    await sendTelegramMessage(chatId, `❌ <b>Invalid or Expired Token</b>. Please generate a fresh link.`);
    return;
  }

  // 3. /unlink command
  if (command === '/unlink') {
    if (linkedClient) {
      removeClientLinkByChatId(chatId);
      await sendTelegramMessage(chatId, `✅ Your account (<b>${escapeHtml(linkedClient.userId)}</b>) has been unlinked from this Telegram chat.`);
      return;
    }
    await sendTelegramMessage(chatId, `ℹ️ No linked subscriber account found for this Telegram chat.`);
    return;
  }

  // =========================================================================
  // CLIENT COMMANDS
  // =========================================================================
  if (linkedClient && !isAdmin) {
    if (command === '/status' || command === '/myaccount') {
      const client = getClientByUserId(linkedClient.userId);
      if (!client) {
        await sendTelegramMessage(chatId, `⚠️ Client record not found in system.`);
        return;
      }

      const msg =
        `<b>👤 My Account - Nexora Network ISP</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Name: <b>${escapeHtml(client.name)}</b>\n` +
        `User ID: <code>${escapeHtml(client.userId)}</code>\n` +
        `Status: <b>${client.status === 'online' ? '🟢 ONLINE' : '🔴 EXPIRED/OFFLINE'}</b>\n` +
        `Active Package: <b>${escapeHtml(client.package || 'N/A')}</b>\n` +
        `Speed: ${escapeHtml(client.bandwidth || 'Standard')}\n` +
        `Monthly Price: ৳${client.price || '0'}\n` +
        `Expiry Date: <b>${escapeHtml(client.expiry || 'N/A')}</b>\n` +
        (client.balance ? `Current Due: ৳${client.balance}\n` : '');

      await sendTelegramMessage(chatId, msg);
      return;
    }

    if (command === '/mypackage') {
      const client = getClientByUserId(linkedClient.userId);
      const msg =
        `<b>📦 My Subscription Package</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Package: <b>${escapeHtml(client?.package || 'N/A')}</b>\n` +
        `Bandwidth: ${escapeHtml(client?.downloadSpeed ? `${client.downloadSpeed} Mbps` : client?.bandwidth || 'N/A')}\n` +
        `Monthly Fee: ৳${client?.price || '0'}\n` +
        `Renew before: <b>${escapeHtml(client?.expiry || 'N/A')}</b>`;
      await sendTelegramMessage(chatId, msg);
      return;
    }

    if (command === '/mypayments') {
      const payments = getPaymentsByUserId(linkedClient.userId);
      if (payments.length === 0) {
        await sendTelegramMessage(chatId, `ℹ️ No payment records found on file.`);
        return;
      }
      let payText = `<b>💳 Recent Payment History</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
      payments.slice(0, 5).forEach((p) => {
        payText += `• <b>৳${p.amount}</b> (${p.paymentMethod || 'Manual'}) - ${p.status || 'Completed'}\n  Trx: <code>${p.id}</code> | Date: ${p.timestamp || p.dateKey}\n`;
      });
      await sendTelegramMessage(chatId, payText);
      return;
    }

    if (command === '/myonu') {
      const realOnu = getRealOnuByUserId(linkedClient.userId);
      if (!realOnu) {
        await sendTelegramMessage(chatId, `ℹ️ No OLT fiber terminal currently mapped to your line.`);
        return;
      }
      const opticalMsg =
        `<b>📶 Optical Fiber Health (My ONU)</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Status: <b>${realOnu.status === 'online' ? '🟢 Online (Signal Healthy)' : realOnu.status === 'los' ? '🚨 LOS (Fiber Break)' : '⚠️ Signal Weak'}</b>\n` +
        `Optical RX Power: <b>${realOnu.rxPower !== null ? `${realOnu.rxPower.toFixed(1)} dBm` : 'N/A'}</b>\n` +
        (realOnu.txPower ? `Optical TX Power: ${realOnu.txPower.toFixed(1)} dBm\n` : '') +
        (realOnu.distanceMeters ? `Cable Distance: ${realOnu.distanceMeters} meters\n` : '') +
        `Serial Number: <code>${realOnu.serialNumber}</code>`;
      await sendTelegramMessage(chatId, opticalMsg);
      return;
    }

    if (
      command === '/mybandwidth' ||
      command === '/speed' ||
      command === '/bandwidth' ||
      command === '/live_bandwidth' ||
      command === '/livebandwidth' ||
      command === '/speedtest' ||
      text.toLowerCase().includes('live bandwidth') ||
      text.toLowerCase().includes('bandwidth') ||
      text.includes('ব্যান্ডউইথ') ||
      text.includes('স্পিড')
    ) {
      await executeClientLiveBandwidthCheck(chatId, linkedClient.userId);
      return;
    }

    if (command === '/help') {
      await sendTelegramMessage(
        chatId,
        `<b>📖 Subscriber Self-Care Help Menu</b>\n` +
        `• <b>/mybandwidth</b> or <b>/speed</b> - Live download & upload speed\n` +
        `• <b>/status</b> - Subscription & expiry status\n` +
        `• <b>/mypackage</b> - Current internet plan\n` +
        `• <b>/mypayments</b> - Past payment history\n` +
        `• <b>/myonu</b> - Live fiber optical signal\n` +
        `• <b>/unlink</b> - Disconnect Telegram`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📊 Live Bandwidth', callback_data: 'my_bw' },
                { text: '📶 Optical Signal', callback_data: 'my_onu' },
              ],
            ],
          },
        }
      );
      return;
    }

    await sendTelegramMessage(chatId, `❓ Unknown command. Type <b>/help</b> for list of subscriber commands.`);
    return;
  }

  // =========================================================================
  // ADMIN COMMANDS (Strictly restricted to authorized Admin Chat IDs)
  // =========================================================================
  if (!isAdmin) {
    await sendTelegramMessage(
      chatId,
      `⛔ <b>Access Denied</b>\nThis bot command requires authorized administrator privileges.\nYour Chat ID is <code>${chatId}</code>.`
    );
    return;
  }

  // Handle Admin Help
  if (command === '/help') {
    const helpMsg =
      `<b>🛠️ Nexora Network ISP - টেলিগ্রাম অ্যাডমিন রিমোট কন্ট্রোল</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>⚡ ক্লায়েন্ট লাইন চালু / বন্ধ করার কমান্ড:</b>\n` +
      `• <code>/on &lt;নাম/ফোন/আইডি&gt;</code> — লাইন চালু (Online) করুন\n` +
      `• <code>/off &lt;নাম/ফোন/আইডি&gt;</code> — লাইন বন্ধ (Offline/Suspend) করুন\n` +
      `• <code>/extend &lt;নাম/ফোন/আইডি&gt; [দিন]</code> — মেয়াদ বাড়ান (যেমন: <code>/extend 01817681233 30</code>)\n` +
      `• <code>/delete &lt;নাম/ফোন/আইডি&gt;</code> — ক্লায়েন্ট ডিলিট করুন\n\n` +
      `<b>🔍 সরাসরি সার্চ করার উপায়:</b>\n` +
      `• যে কারো <b>নাম</b> অথবা <b>ফোন নম্বর</b> লিখে সরাসরি মেসেজ পাঠালেই তার প্রোফাইল ও চালু/বন্ধ করার বাটন চলে আসবে!\n\n` +
      `<b>📊 সিস্টেম মনিটরিং ও ট্রাফিক:</b>\n` +
      `• <b>/traffic</b> বা <b>/bandwidth</b> — রাউটারের লাইভ ব্যান্ডউইথ (RX/TX Mbps)\n` +
      `• <b>/status</b> — সার্বিক নেটওয়ার্ক ওভারভিউ ও আজকের আয়\n` +
      `• <b>/clients</b> — সকল গ্রাহকের সারাংশ\n` +
      `• <b>/online</b> — বর্তমানে চালু গ্রাহকদের লিস্ট\n` +
      `• <b>/offline</b> — বন্ধ বা মেয়াদোত্তীর্ণ লাইন\n` +
      `• <b>/olt</b> — OLT ডিভাইস ও PON পোর্ট স্ট্যাটাস\n` +
      `• <b>/onu</b> — ONU সিগন্যাল ও RX Power (dBm)\n` +
      `• <b>/alerts</b> — লাইভ সিস্টেম অ্যালার্ট`;
    await sendTelegramMessage(chatId, helpMsg);
    return;
  }

  // Handle Admin /traffic or /bandwidth or /bw
  if (command === '/traffic' || command === '/bandwidth' || command === '/bw' || command === '/routerspeed' || command === '/live_traffic') {
    await executeAdminLiveTrafficCheck(chatId);
    return;
  }

  // Handle Admin /on, /active, /activate, /chalu, /enable, /unblock
  if (command === '/on' || command === '/active' || command === '/activate' || command === '/chalu' || command === '/enable' || command === '/unblock' || (command === '/online' && queryParam)) {
    if (!queryParam) {
      await sendTelegramMessage(
        chatId,
        `ℹ️ <b>ব্যবহারের নিয়ম:</b> <code>/on &lt;ফোন নম্বর, নাম বা ইউজার আইডি&gt;</code>\nউদাহরণ: <code>/on 01817681233</code> অথবা <code>/on Mim</code>`
      );
      return;
    }
    await executeAdminActivateClient(chatId, queryParam);
    return;
  }

  // Handle Admin /off, /inactive, /deactivate, /bondho, /disable, /suspend, /block
  if (command === '/off' || command === '/inactive' || command === '/deactivate' || command === '/bondho' || command === '/disable' || command === '/suspend' || command === '/block' || (command === '/offline' && queryParam)) {
    if (!queryParam) {
      await sendTelegramMessage(
        chatId,
        `ℹ️ <b>ব্যবহারের নিয়ম:</b> <code>/off &lt;ফোন নম্বর, নাম বা ইউজার আইডি&gt;</code>\nউদাহরণ: <code>/off 01817681233</code> অথবা <code>/off Mim</code>`
      );
      return;
    }
    await executeAdminDeactivateClient(chatId, queryParam);
    return;
  }

  // Handle Admin /extend command
  if (command === '/extend') {
    if (!queryParam) {
      await sendTelegramMessage(
        chatId,
        `ℹ️ <b>ব্যবহারের নিয়ম:</b> <code>/extend &lt;ফোন নম্বর বা আইডি&gt; [দিন]</code>\nউদাহরণ: <code>/extend 01817681233 30</code>`
      );
      return;
    }
    const [targetQuery, daysStr] = queryParam.split(/\s+/);
    await executeAdminExtendClient(chatId, targetQuery, Number(daysStr) || 30);
    return;
  }

  // Handle Admin /delete command
  if (command === '/delete' || command === '/del' || command === '/deleteclient') {
    if (!queryParam) {
      await sendTelegramMessage(
        chatId,
        `ℹ️ <b>ব্যবহারের নিয়ম:</b> <code>/delete &lt;ফোন নম্বর বা ইউজার আইডি&gt;</code>\nউদাহরণ: <code>/delete 01817681233</code>`
      );
      return;
    }
    await executeAdminDeleteClient(chatId, queryParam);
    return;
  }

  // Handle Admin /status
  if (command === '/status') {
    const clients: any[] = localDbRef['nexora_clients']?.value || [];
    const routers: any[] = localDbRef['nexora_routers']?.value || [];
    const olts: any[] = localDbRef['nexora_olts']?.value || [];
    const payments: any[] = localDbRef['nexora_payments']?.value || [];

    const totalClients = clients.length;
    const onlineClients = clients.filter((c) => c.status === 'online').length;
    const expiredClients = clients.filter((c) => c.status === 'offline' || c.status === 'expired').length;

    // Today's payments
    const today = new Date().toISOString().slice(0, 10);
    const todayPayments = payments.filter((p) => p.dateKey === today && p.status === 'Completed');
    const todayRevenue = todayPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const pendingPayments = payments.filter((p) => p.status === 'Pending' || p.status === 'Pending Approval').length;

    const statusMsg =
      `<b>📊 Nexora Network ISP - Live Status</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👥 <b>Subscribers:</b>\n` +
      `  • Total: <b>${totalClients}</b>\n` +
      `  • Online/Active: <b>${onlineClients}</b> 🟢\n` +
      `  • Expired/Offline: <b>${expiredClients}</b> 🔴\n\n` +
      `📡 <b>Network Infrastructure:</b>\n` +
      `  • MikroTik Routers: <b>${routers.length}</b> configured\n` +
      `  • OLT Devices: <b>${olts.length}</b> registered\n\n` +
      `💰 <b>Billing & Finance (Today):</b>\n` +
      `  • Revenue Collected: <b>৳${todayRevenue.toLocaleString()}</b>\n` +
      `  • Pending Verifications: <b>${pendingPayments}</b> ${pendingPayments > 0 ? '⚠️' : '✅'}\n\n` +
      `⏰ <i>Server Time: ${new Date().toLocaleTimeString()}</i>`;

    await sendTelegramMessage(chatId, statusMsg);
    return;
  }

  // Handle Admin /clients
  if (command === '/clients') {
    const clients: any[] = localDbRef['nexora_clients']?.value || [];
    const packageCounts: Record<string, number> = {};
    clients.forEach((c) => {
      const pkg = c.package || 'Unassigned';
      packageCounts[pkg] = (packageCounts[pkg] || 0) + 1;
    });

    let textOut = `<b>👥 Subscriber Summary (${clients.length} Total)</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    for (const [pkg, count] of Object.entries(packageCounts)) {
      textOut += `• <b>${escapeHtml(pkg)}:</b> ${count} subscribers\n`;
    }
    textOut += `\n<i>Type /online to view active lines or /search &lt;name&gt;</i>`;
    await sendTelegramMessage(chatId, textOut);
    return;
  }

  // Handle Admin /online
  if (command === '/online') {
    const clients: any[] = localDbRef['nexora_clients']?.value || [];
    const online = clients.filter((c) => c.status === 'online');

    if (online.length === 0) {
      await sendTelegramMessage(chatId, `ℹ️ No active subscribers currently marked online.`);
      return;
    }

    let out = `<b>🟢 Active Online Subscribers (${online.length})</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    online.slice(0, 15).forEach((c) => {
      out += `• <b>${escapeHtml(c.name)}</b> (<code>${escapeHtml(c.userId)}</code>)\n  Plan: ${escapeHtml(c.package)} | Exp: ${escapeHtml(c.expiry || 'N/A')}\n`;
    });
    if (online.length > 15) {
      out += `\n<i>...and ${online.length - 15} more active clients.</i>`;
    }
    await sendTelegramMessage(chatId, out);
    return;
  }

  // Handle Admin /offline
  if (command === '/offline') {
    const clients: any[] = localDbRef['nexora_clients']?.value || [];
    const offline = clients.filter((c) => c.status === 'offline' || c.status === 'expired');

    if (offline.length === 0) {
      await sendTelegramMessage(chatId, `🎉 All subscribers are currently active! No expired lines.`);
      return;
    }

    let out = `<b>🔴 Expired / Offline Subscribers (${offline.length})</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    offline.slice(0, 15).forEach((c) => {
      out += `• <b>${escapeHtml(c.name)}</b> (<code>${escapeHtml(c.userId)}</code>)\n  Phone: ${escapeHtml(c.phone || 'N/A')} | Exp: ${escapeHtml(c.expiry || 'Expired')}\n`;
    });
    if (offline.length > 15) {
      out += `\n<i>...and ${offline.length - 15} more offline lines.</i>`;
    }
    await sendTelegramMessage(chatId, out);
    return;
  }

  // Handle Admin /olt
  if (command === '/olt') {
    const olts: OLTServerConfig[] = localDbRef['nexora_olts']?.value || [];
    if (olts.length === 0) {
      await sendTelegramMessage(chatId, `ℹ️ No OLT hardware devices configured in system.`);
      return;
    }

    let oltText = `<b>🏢 OLT Optical Line Terminals (${olts.length})</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    for (const olt of olts) {
      const statusIcon = olt.status === 'online' ? '🟢' : '🔴';
      oltText +=
        `• <b>${escapeHtml(olt.name)}</b> ${statusIcon}\n` +
        `  Brand: ${escapeHtml(olt.brand)} | Model: ${escapeHtml(olt.model || 'N/A')}\n` +
        `  IP: <code>${escapeHtml(olt.ip)}</code>:${olt.managementPort}\n` +
        `  Uptime: ${escapeHtml(olt.lastSync ? new Date(olt.lastSync).toLocaleTimeString() : 'N/A')}\n\n`;
    }
    await sendTelegramMessage(chatId, oltText);
    return;
  }

  // Handle Admin /onu
  if (command === '/onu') {
    const olts: OLTServerConfig[] = localDbRef['nexora_olts']?.value || [];
    const mappings: any[] = localDbRef['nexora_onu_mappings']?.value || [];

    if (olts.length === 0) {
      await sendTelegramMessage(chatId, `ℹ️ No OLT devices available to query.`);
      return;
    }

    await sendTelegramMessage(chatId, `🔍 <i>Querying real SNMP OLT optical registers...</i>`);

    let totalDiscovered = 0;
    let onuListText = `<b>📡 Real Discovered ONUs & Optical Metrics</b>\n━━━━━━━━━━━━━━━━━━━━\n`;

    for (const olt of olts) {
      if (!olt.enabled) continue;
      try {
        const discovered = await queryRealOltOnus(olt, olt.status === 'online', undefined, mappings);
        totalDiscovered += discovered.length;

        for (const onu of discovered.slice(0, 10)) {
          const powerIcon = onu.status === 'los' ? '🚨 LOS' : onu.rxPower && onu.rxPower <= -25 ? '⚠️ Weak' : '🟢 Healthy';
          onuListText +=
            `• <b>ONU ${escapeHtml(onu.id)}</b> (${powerIcon})\n` +
            `  SN: <code>${escapeHtml(onu.serialNumber)}</code>\n` +
            (onu.mappedClientName ? `  Subscriber: ${escapeHtml(onu.mappedClientName)}\n` : '') +
            `  RX Power: <b>${onu.rxPower !== null ? `${onu.rxPower.toFixed(1)} dBm` : 'N/A'}</b>\n\n`;
        }
      } catch (err) {
        // Skip on error
      }
    }

    if (totalDiscovered === 0) {
      await sendTelegramMessage(chatId, `ℹ️ 0 ONUs currently registered or OLTs are offline.`);
      return;
    }

    await sendTelegramMessage(chatId, onuListText);
    return;
  }

  // Handle Admin /alerts
  if (command === '/alerts') {
    const olts: OLTServerConfig[] = localDbRef['nexora_olts']?.value || [];
    const routers: any[] = localDbRef['nexora_routers']?.value || [];
    const payments: any[] = localDbRef['nexora_payments']?.value || [];

    let alertCount = 0;
    let alertMsg = `<b>🚨 Active System Alerts & Diagnostics</b>\n━━━━━━━━━━━━━━━━━━━━\n`;

    // 1. Offline Routers
    routers.forEach((r) => {
      if (!r.connected && !r.isDemo) {
        alertCount++;
        alertMsg += `🔴 <b>Router Offline:</b> ${escapeHtml(r.name)} (${escapeHtml(r.ip)})\n`;
      }
    });

    // 2. Offline OLTs
    olts.forEach((o) => {
      if (o.status === 'offline') {
        alertCount++;
        alertMsg += `🚨 <b>OLT Offline:</b> ${escapeHtml(o.name)} (${escapeHtml(o.ip)})\n`;
      }
    });

    // 3. Pending Payments
    const pending = payments.filter((p) => p.status === 'Pending' || p.status === 'Pending Approval');
    if (pending.length > 0) {
      alertCount += pending.length;
      alertMsg += `💳 <b>Pending Manual Payments:</b> ${pending.length} payments await review\n`;
    }

    if (alertCount === 0) {
      await sendTelegramMessage(chatId, `✅ <b>All Systems Normal</b>. No active fiber breaks, disconnects, or alerts.`);
      return;
    }

    await sendTelegramMessage(chatId, alertMsg);
    return;
  }

  // Handle Admin /search <query> or /client <query>
  if (command === '/search' || command === '/client' || command === '/user') {
    if (!queryParam) {
      await sendTelegramMessage(chatId, `ℹ️ Usage: <code>/search &lt;name, user id, or phone&gt;</code>\nOr just type the client name/phone directly.`);
      return;
    }

    const clients: any[] = localDbRef['nexora_clients']?.value || [];
    const q = queryParam.toLowerCase();

    const matches = clients.filter((c) =>
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.userId || '').toLowerCase().includes(q) ||
      String(c.phone || '').includes(q) ||
      String(c.ip || '').includes(q) ||
      String(c.package || '').toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      await sendTelegramMessage(chatId, `🔍 No subscriber found matching "<b>${escapeHtml(queryParam)}</b>".`);
      return;
    }

    await sendTelegramMessage(chatId, `<b>🔍 Found ${matches.length} Subscriber(s) for "${escapeHtml(queryParam)}":</b>`);

    for (const c of matches.slice(0, 5)) {
      const realOnu = getRealOnuByUserId(c.userId);
      const isOnline = c.status === 'online';
      const cardText =
        `👤 <b>গ্রাহকের নাম:</b> ${escapeHtml(c.name)} (<code>${escapeHtml(c.userId)}</code>)\n` +
        `• <b>বর্তমান অবস্থা:</b> ${isOnline ? '🟢 <b>চালু (Online)</b>' : '🔴 <b>বন্ধ (Offline)</b>'}\n` +
        `• <b>প্যাকেজ:</b> ${escapeHtml(c.package || 'Standard')} (${escapeHtml(c.downloadSpeed || c.bandwidth || 'N/A')})\n` +
        `• <b>মাসিক ফি:</b> ৳${c.price || '0'}\n` +
        `• <b>ফোন নম্বর:</b> <code>${escapeHtml(c.phone || 'N/A')}</code>\n` +
        `• <b>মেয়াদ:</b> <b>${escapeHtml(c.expiry || c.expiryDate || 'N/A')}</b>\n` +
        (c.router ? `• <b>রাউটার:</b> ${escapeHtml(c.router)}\n` : '') +
        (c.ip ? `• <b>আইপি:</b> <code>${escapeHtml(c.ip)}</code>\n` : '') +
        (realOnu ? `• <b>অপটিক্যাল RX:</b> <b>${realOnu.rxPower ? `${realOnu.rxPower.toFixed(1)} dBm` : 'N/A'}</b> (${realOnu.status === 'los' ? '🚨 LOS' : '🟢 Normal'})\n` : '') +
        `\n<b>⚡ দ্রুত অ্যাকশন কমান্ড:</b>\n` +
        `• 🟢 চালু করতে: <code>/on ${c.userId}</code>\n` +
        `• 🔴 বন্ধ করতে: <code>/off ${c.userId}</code>\n` +
        `• 📅 মেয়াদ বাড়াতে: <code>/extend ${c.userId} 30</code>\n` +
        `• 🗑️ ডিলিট করতে: <code>/delete ${c.userId}</code>`;

      await sendTelegramMessage(chatId, cardText, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: isOnline ? '🔴 লাইন বন্ধ করুন (OFF)' : '🟢 লাইন চালু করুন (ON)', callback_data: isOnline ? `deact_${c.userId}` : `act_${c.userId}` },
              { text: '📅 মেয়াদ +৩০ দিন', callback_data: `ext_${c.userId}` },
            ],
            [
              { text: '🗑️ ক্লায়েন্ট ডিলিট', callback_data: `del_${c.userId}` },
            ],
          ],
        },
      });
    }
    return;
  }

  // If admin sent plain text without slash, auto-search client database!
  if (!text.startsWith('/')) {
    const clients: any[] = localDbRef['nexora_clients']?.value || [];
    const q = text.toLowerCase();

    const matches = clients.filter((c) =>
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.userId || '').toLowerCase().includes(q) ||
      String(c.phone || '').includes(q) ||
      String(c.ip || '').includes(q)
    );

    if (matches.length > 0) {
      await sendTelegramMessage(chatId, `<b>🔍 "${escapeHtml(text)}" দিয়ে পাওয়া গ্রাহক (${matches.length} জন):</b>`);

      for (const c of matches.slice(0, 5)) {
        const realOnu = getRealOnuByUserId(c.userId);
        const isOnline = c.status === 'online';
        const cardText =
          `👤 <b>গ্রাহকের নাম:</b> ${escapeHtml(c.name)} (<code>${escapeHtml(c.userId)}</code>)\n` +
          `• <b>বর্তমান অবস্থা:</b> ${isOnline ? '🟢 <b>চালু (Online)</b>' : '🔴 <b>বন্ধ (Offline)</b>'}\n` +
          `• <b>প্যাকেজ:</b> ${escapeHtml(c.package || 'Standard')} (${escapeHtml(c.downloadSpeed || c.bandwidth || 'N/A')})\n` +
          `• <b>মাসিক ফি:</b> ৳${c.price || '0'}\n` +
          `• <b>ফোন নম্বর:</b> <code>${escapeHtml(c.phone || 'N/A')}</code>\n` +
          `• <b>মেয়াদ:</b> <b>${escapeHtml(c.expiry || c.expiryDate || 'N/A')}</b>\n` +
          (c.router ? `• <b>রাউটার:</b> ${escapeHtml(c.router)}\n` : '') +
          (c.ip ? `• <b>আইপি:</b> <code>${escapeHtml(c.ip)}</code>\n` : '') +
          (realOnu ? `• <b>অপটিক্যাল RX:</b> <b>${realOnu.rxPower ? `${realOnu.rxPower.toFixed(1)} dBm` : 'N/A'}</b>\n` : '') +
          `\n<b>⚡ দ্রুত অ্যাকশন কমান্ড:</b>\n` +
          `• 🟢 চালু করতে: <code>/on ${c.userId}</code>\n` +
          `• 🔴 বন্ধ করতে: <code>/off ${c.userId}</code>\n` +
          `• 📅 মেয়াদ বাড়াতে: <code>/extend ${c.userId} 30</code>\n` +
          `• 🗑️ ডিলিট করতে: <code>/delete ${c.userId}</code>`;

        await sendTelegramMessage(chatId, cardText, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: isOnline ? '🔴 লাইন বন্ধ করুন (OFF)' : '🟢 লাইন চালু করুন (ON)', callback_data: isOnline ? `deact_${c.userId}` : `act_${c.userId}` },
                { text: '📅 মেয়াদ +৩০ দিন', callback_data: `ext_${c.userId}` },
              ],
              [
                { text: '🗑️ ক্লায়েন্ট ডিলিট', callback_data: `del_${c.userId}` },
              ],
            ],
          },
        });
      }
      return;
    }
  }

  // Fallback for admin
  await sendTelegramMessage(
    chatId,
    `❓ Command or subscriber "<b>${escapeHtml(text)}</b>" not found.\n\n` +
    `💡 <b>Quick Tips:</b>\n` +
    `• Type client name or phone number directly to search.\n` +
    `• Type <b>/status</b> for live network overview.\n` +
    `• Type <b>/test_alerts</b> to test all 11 system alerts.\n` +
    `• Type <b>/help</b> for all commands.`
  );
}

// =========================================================================
// HELPER LOOKUPS
// =========================================================================

// =========================================================================
// HELPER LOOKUPS & CLIENT ACTION CONTROLLERS
// =========================================================================

function findClientByQuery(query: string): any {
  const clients: any[] = localDbRef['nexora_clients']?.value || [];
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  // 1. Exact match (User ID, Phone, DB ID)
  let match = clients.find(
    (c) =>
      String(c.userId || '').toLowerCase() === q ||
      String(c.phone || '').trim() === q ||
      String(c.id || '').toLowerCase() === q
  );
  if (match) return match;
  // 2. Substring match (User ID, Phone, Name, IP)
  return clients.find(
    (c) =>
      String(c.userId || '').toLowerCase().includes(q) ||
      String(c.phone || '').includes(q) ||
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.ip || '').includes(q)
  );
}

export async function executeAdminActivateClient(chatId: string, query: string): Promise<void> {
  const client = findClientByQuery(query);
  if (!client) {
    await sendTelegramMessage(chatId, `❌ <b>গ্রাহক পাওয়া যায়নি:</b> "<code>${escapeHtml(query)}</code>" নামে বা নম্বরে কোনো ক্লায়েন্ট রেকর্ড মেলেনি।`);
    return;
  }

  const clients: any[] = localDbRef['nexora_clients']?.value || [];
  const idx = clients.findIndex((c) => c.id === client.id || c.userId === client.userId);
  if (idx === -1) return;

  // Extend expiry to at least 30 days from now if expired or missing
  const today = new Date();
  const currentExpiry = client.expiry ? new Date(client.expiry) : null;
  let newExpiryStr = client.expiry;
  if (!currentExpiry || isNaN(currentExpiry.getTime()) || currentExpiry < today) {
    const future = new Date(Date.now() + 30 * 86400000);
    newExpiryStr = future.toISOString().slice(0, 10);
  }

  clients[idx] = {
    ...clients[idx],
    status: 'online',
    billingStatus: 'paid',
    expiry: newExpiryStr,
    expiryDate: newExpiryStr,
    updatedAt: Date.now(),
  };

  localDbRef['nexora_clients'] = { value: clients, updatedAt: Date.now() };
  saveDbCallback();

  const msg =
    `🟢 <b>লাইন সফলভাবে চালু করা হয়েছে! (Line is ON)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>গ্রাহকের নাম:</b> ${escapeHtml(client.name)}\n` +
    `🆔 <b>ইউজার আইডি:</b> <code>${escapeHtml(client.userId)}</code>\n` +
    `📞 <b>ফোন নম্বর:</b> <code>${escapeHtml(client.phone || 'N/A')}</code>\n` +
    `📦 <b>প্যাকেজ:</b> ${escapeHtml(client.package || 'Standard')} (${escapeHtml(client.downloadSpeed || client.bandwidth || 'N/A')})\n` +
    `📶 <b>বর্তমান অবস্থা:</b> 🟢 <b>চালু (Active Online)</b>\n` +
    `📅 <b>মেয়াদ বর্ধিত হয়েছে:</b> <b>${escapeHtml(newExpiryStr)}</b>\n` +
    `🌐 <b>রাউটার:</b> ${escapeHtml(client.router || 'Core Router')}\n` +
    `⏰ <b>সময়:</b> ${new Date().toLocaleString()}`;

  await sendTelegramMessage(chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔴 লাইন বন্ধ করুন (OFF)', callback_data: `deact_${client.userId}` },
          { text: '📅 মেয়াদ +৩০ দিন বাড়ান', callback_data: `ext_${client.userId}` },
        ],
      ],
    },
  });

  // Direct notification to client if linked on Telegram
  await sendToClient(
    client.userId,
    `<b>⚡ আপনার ইন্টারনেট লাইন চালু করা হয়েছে!</b>\n━━━━━━━━━━━━━━━━━━━━\nপ্রিয় <b>${escapeHtml(client.name)}</b>, আপনার ইন্টারনেট সেবা সক্রিয় (Active Online) করা হয়েছে।\n📅 <b>মেয়াদ:</b> <b>${escapeHtml(newExpiryStr)}</b>\nNexora Network-এর সাথে থাকার জন্য ধন্যবাদ!`
  );
}

export async function executeAdminDeactivateClient(chatId: string, query: string): Promise<void> {
  const client = findClientByQuery(query);
  if (!client) {
    await sendTelegramMessage(chatId, `❌ <b>গ্রাহক পাওয়া যায়নি:</b> "<code>${escapeHtml(query)}</code>" নামে বা নম্বরে কোনো ক্লায়েন্ট রেকর্ড মেলেনি।`);
    return;
  }

  const clients: any[] = localDbRef['nexora_clients']?.value || [];
  const idx = clients.findIndex((c) => c.id === client.id || c.userId === client.userId);
  if (idx === -1) return;

  clients[idx] = {
    ...clients[idx],
    status: 'offline',
    billingStatus: 'unpaid',
    updatedAt: Date.now(),
  };

  localDbRef['nexora_clients'] = { value: clients, updatedAt: Date.now() };
  saveDbCallback();

  const msg =
    `🔴 <b>লাইন সফলভাবে বন্ধ করা হয়েছে! (Line is OFF)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>গ্রাহকের নাম:</b> ${escapeHtml(client.name)}\n` +
    `🆔 <b>ইউজার আইডি:</b> <code>${escapeHtml(client.userId)}</code>\n` +
    `📞 <b>ফোন নম্বর:</b> <code>${escapeHtml(client.phone || 'N/A')}</code>\n` +
    `📦 <b>প্যাকেজ:</b> ${escapeHtml(client.package || 'Standard')}\n` +
    `📶 <b>বর্তমান অবস্থা:</b> 🔴 <b>বন্ধ (Offline / Suspended)</b>\n` +
    `⏰ <b>সময়:</b> ${new Date().toLocaleString()}`;

  await sendTelegramMessage(chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🟢 লাইন চালু করুন (ON)', callback_data: `act_${client.userId}` },
          { text: '🗑️ ক্লায়েন্ট ডিলিট', callback_data: `del_${client.userId}` },
        ],
      ],
    },
  });

  // Direct notification to client if linked on Telegram
  await sendToClient(
    client.userId,
    `<b>⚠️ ইন্টারনেট সেবা স্থগিত করা হয়েছে</b>\n━━━━━━━━━━━━━━━━━━━━\nপ্রিয় <b>${escapeHtml(client.name)}</b>, আপনার ইন্টারনেট সংযোগটি বন্ধ/স্থগিত (Suspended) করা হয়েছে।\nপুনরায় লাইন চালু করতে বিল পরিশোধ করুন বা হেল্পডেস্কে যোগাযোগ করুন।`
  );
}

export async function executeAdminExtendClient(chatId: string, query: string, days = 30): Promise<void> {
  const client = findClientByQuery(query);
  if (!client) {
    await sendTelegramMessage(chatId, `❌ <b>Client Not Found:</b> No subscriber record found for "<code>${escapeHtml(query)}</code>".`);
    return;
  }

  const clients: any[] = localDbRef['nexora_clients']?.value || [];
  const idx = clients.findIndex((c) => c.id === client.id || c.userId === client.userId);
  if (idx === -1) return;

  const currentExpiry = client.expiry ? new Date(client.expiry) : null;
  const baseDate = currentExpiry && !isNaN(currentExpiry.getTime()) && currentExpiry > new Date() ? currentExpiry : new Date();
  const future = new Date(baseDate.getTime() + days * 86400000);
  const newExpiryStr = future.toISOString().slice(0, 10);

  clients[idx] = {
    ...clients[idx],
    status: 'online',
    billingStatus: 'paid',
    expiry: newExpiryStr,
    expiryDate: newExpiryStr,
    updatedAt: Date.now(),
  };

  localDbRef['nexora_clients'] = { value: clients, updatedAt: Date.now() };
  saveDbCallback();

  const msg =
    `<b>📅 Subscription Validity Extended (+${days} Days)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Subscriber:</b> ${escapeHtml(client.name)}\n` +
    `🆔 <b>User ID:</b> <code>${escapeHtml(client.userId)}</code>\n` +
    `🟢 <b>Status:</b> Active Online\n` +
    `📅 <b>New Expiry Date:</b> <b>${escapeHtml(newExpiryStr)}</b>\n` +
    `⏰ <b>Action Time:</b> ${new Date().toLocaleString()}`;

  await sendTelegramMessage(chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⛔ Deactivate / Offline', callback_data: `deact_${client.userId}` },
          { text: '📅 Add Another 30D', callback_data: `ext_${client.userId}` },
        ],
      ],
    },
  });
}

export async function executeAdminDeleteClient(chatId: string, query: string): Promise<void> {
  const client = findClientByQuery(query);
  if (!client) {
    await sendTelegramMessage(chatId, `❌ <b>Client Not Found:</b> No subscriber record found for "<code>${escapeHtml(query)}</code>".`);
    return;
  }

  let clients: any[] = localDbRef['nexora_clients']?.value || [];
  clients = clients.filter((c) => c.id !== client.id && c.userId !== client.userId);
  localDbRef['nexora_clients'] = { value: clients, updatedAt: Date.now() };
  saveDbCallback();

  const msg =
    `<b>🗑️ Subscriber Deleted Successfully</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Name:</b> ${escapeHtml(client.name)}\n` +
    `🆔 <b>User ID:</b> <code>${escapeHtml(client.userId)}</code>\n` +
    `📞 <b>Phone:</b> <code>${escapeHtml(client.phone || 'N/A')}</code>\n` +
    `The subscriber record has been completely removed from the database.`;

  await sendTelegramMessage(chatId, msg);
}

export async function executeClientLiveBandwidthCheck(chatId: string, userId: string): Promise<void> {
  const client = getClientByUserId(userId);
  if (!client) {
    await sendTelegramMessage(chatId, `⚠️ <b>Client Record Not Found:</b> Unable to locate account details for <code>${escapeHtml(userId)}</code>.`);
    return;
  }

  const routers: any[] = localDbRef['nexora_routers']?.value || [];
  const targetRouter =
    routers.find((r) => r.name === client.router || r.ip === client.router) ||
    routers.find((r) => r.connected) ||
    routers[0];

  if (!targetRouter || !targetRouter.ip) {
    await sendTelegramMessage(
      chatId,
      `<b>📊 Real-Time Live Bandwidth Check</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Subscriber:</b> ${escapeHtml(client.name)} (<code>${escapeHtml(client.userId)}</code>)\n` +
      `📦 <b>Package:</b> ${escapeHtml(client.package || 'Standard')} (${escapeHtml(client.downloadSpeed || client.bandwidth || 'N/A')})\n` +
      `📶 <b>Status:</b> ${client.status === 'online' ? '🟢 Active' : '🔴 Expired/Offline'}\n\n` +
      `⚠️ <i>No MikroTik gateway router configured for your line yet.</i>`
    );
    return;
  }

  const params: MikrotikConnParams = {
    host: sanitizeMikrotikHost(targetRouter.ip),
    port: Number(targetRouter.apiPort) || 8728,
    username: String(targetRouter.username || 'admin').trim(),
    password: targetRouter.password ? String(targetRouter.password).trim() : '',
    timeoutMs: 4500,
    useSsl: Number(targetRouter.apiPort) === 8729,
    isDemo: Boolean(targetRouter.isDemo),
  };

  try {
    // 1. Query real live traffic & queues
    const trafficRes = await fetchMikrotikTraffic(params);
    if (!trafficRes.success) {
      await sendTelegramMessage(
        chatId,
        `<b>📊 Real-Time Live Bandwidth Check</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Subscriber:</b> ${escapeHtml(client.name)} (<code>${escapeHtml(client.userId)}</code>)\n` +
        `🌐 <b>Gateway Router:</b> ${escapeHtml(targetRouter.name)} (${escapeHtml(targetRouter.ip)})\n` +
        `🔴 <b>Router Status:</b> Offline / Unreachable\n` +
        `⚠️ <i>${escapeHtml(trafficRes.error || 'Router API timeout')}</i>`
      );
      return;
    }

    // 2. Find client's specific Simple Queue
    const queues = trafficRes.queues || [];
    const queueNameDirect = `nexora_${client.userId}`;
    const matchedQueue = queues.find(
      (q) =>
        q.name === queueNameDirect ||
        q.name === client.userId ||
        (client.ip && q.target && q.target.includes(client.ip)) ||
        (client.ipAddress && q.target && q.target.includes(client.ipAddress))
    );

    // 3. Query active PPP session for live uptime & active IP
    let sessionUptime = '';
    let activeIp = client.ip || client.ipAddress || '';
    let callerId = '';
    try {
      const pppRes = await queryMikrotikSocket(params, ['/ppp/active/print']);
      if (pppRes.success && pppRes.sentences) {
        for (const sent of pppRes.sentences) {
          let pppUser = '';
          let pppUptime = '';
          let pppAddress = '';
          let pppCaller = '';
          for (const w of sent) {
            if (w.startsWith('=name=')) pppUser = w.substring(6);
            if (w.startsWith('=uptime=')) pppUptime = w.substring(8);
            if (w.startsWith('=address=')) pppAddress = w.substring(9);
            if (w.startsWith('=caller-id=')) pppCaller = w.substring(11);
          }
          if (pppUser.toLowerCase() === client.userId.toLowerCase()) {
            sessionUptime = pppUptime;
            if (pppAddress) activeIp = pppAddress;
            if (pppCaller) callerId = pppCaller;
            break;
          }
        }
      }
    } catch {}

    // Also check Hotspot active sessions if not found in PPPoE
    if (!sessionUptime) {
      try {
        const hsRes = await queryMikrotikSocket(params, ['/ip/hotspot/active/print']);
        if (hsRes.success && hsRes.sentences) {
          for (const sent of hsRes.sentences) {
            let hsUser = '';
            let hsUptime = '';
            let hsAddress = '';
            let hsMac = '';
            for (const w of sent) {
              if (w.startsWith('=user=')) hsUser = w.substring(6);
              if (w.startsWith('=uptime=')) hsUptime = w.substring(8);
              if (w.startsWith('=address=')) hsAddress = w.substring(9);
              if (w.startsWith('=mac-address=')) hsMac = w.substring(13);
            }
            if (hsUser.toLowerCase() === client.userId.toLowerCase()) {
              sessionUptime = hsUptime;
              if (hsAddress) activeIp = hsAddress;
              if (hsMac) callerId = hsMac;
              break;
            }
          }
        }
      } catch {}
    }

    const downMbps = matchedQueue ? Number(matchedQueue.rxMbps) || 0 : 0;
    const upMbps = matchedQueue ? Number(matchedQueue.txMbps) || 0 : 0;
    const isOnline = client.status === 'online' || Boolean(sessionUptime);

    // Calculate saturation if package speed is available
    const speedMatch = String(client.downloadSpeed || client.bandwidth || matchedQueue?.maxLimit || '').match(/(\d+)/);
    const allocatedNum = speedMatch ? parseInt(speedMatch[1], 10) : 0;
    const saturation = allocatedNum > 0 ? Math.min(100, Math.round((downMbps / allocatedNum) * 100)) : 0;

    const msg =
      `<b>📊 Real-Time Bandwidth & Session Telemetry</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Subscriber:</b> ${escapeHtml(client.name)} (<code>${escapeHtml(client.userId)}</code>)\n` +
      `📶 <b>Status:</b> ${isOnline ? '🟢 Connected (Online)' : '🔴 Disconnected (Offline)'}\n` +
      (sessionUptime ? `⏱️ <b>Session Uptime:</b> <b>${escapeHtml(sessionUptime)}</b>\n` : '') +
      (activeIp ? `🌐 <b>Assigned IP:</b> <code>${escapeHtml(activeIp)}</code>\n` : '') +
      (callerId ? `🔖 <b>Caller MAC:</b> <code>${escapeHtml(callerId)}</code>\n` : '') +
      `📦 <b>Plan Bandwidth:</b> ${escapeHtml(client.package || 'Standard')} (${escapeHtml(client.downloadSpeed || client.bandwidth || matchedQueue?.maxLimit || 'N/A')})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📥 <b>Live Download Speed:</b> <b>${downMbps.toFixed(2)} Mbps</b>\n` +
      `📤 <b>Live Upload Speed:</b> <b>${upMbps.toFixed(2)} Mbps</b>\n` +
      (allocatedNum > 0 ? `📊 <b>Bandwidth Saturation:</b> <b>${saturation}%</b>\n` : '') +
      (matchedQueue ? `🏷️ <b>Simple Queue:</b> <code>${escapeHtml(matchedQueue.name)}</code>\n` : '') +
      `⏰ <b>Measured At:</b> ${new Date().toLocaleTimeString()}`;

    await sendTelegramMessage(chatId, msg, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Refresh Live Speed', callback_data: `my_bw` },
            { text: '📶 Optical Signal', callback_data: `my_onu` },
          ],
        ],
      },
    });
  } catch (err: any) {
    await sendTelegramMessage(chatId, `⚠️ Failed to fetch live bandwidth from router: ${escapeHtml(err.message)}`);
  }
}

export async function executeAdminLiveTrafficCheck(chatId: string): Promise<void> {
  const routers: any[] = localDbRef['nexora_routers']?.value || [];
  const clients: any[] = localDbRef['nexora_clients']?.value || [];
  const targetRouter = routers.find((r) => r.connected) || routers[0];

  if (!targetRouter || !targetRouter.ip) {
    await sendTelegramMessage(
      chatId,
      `<b>📊 MikroTik Router Live Bandwidth</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ <i>No MikroTik router currently configured or connected.</i>`
    );
    return;
  }

  const params: MikrotikConnParams = {
    host: sanitizeMikrotikHost(targetRouter.ip),
    port: Number(targetRouter.apiPort) || 8728,
    username: String(targetRouter.username || 'admin').trim(),
    password: targetRouter.password ? String(targetRouter.password).trim() : '',
    timeoutMs: 5000,
    useSsl: Number(targetRouter.apiPort) === 8729,
    isDemo: Boolean(targetRouter.isDemo),
  };

  try {
    const trafficRes = await fetchMikrotikTraffic(params);
    if (!trafficRes.success) {
      await sendTelegramMessage(
        chatId,
        `<b>📊 MikroTik Router Live Bandwidth</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `🌐 <b>Router:</b> ${escapeHtml(targetRouter.name)} (<code>${escapeHtml(targetRouter.ip)}</code>)\n` +
        `🔴 <b>Status:</b> Offline / Unreachable\n` +
        `⚠️ <i>${escapeHtml(trafficRes.error || 'Router API timeout')}</i>`
      );
      return;
    }

    const downMbps = (Number(trafficRes.totalRxBps) || 0) * 8 / 1_000_000;
    const upMbps = (Number(trafficRes.totalTxBps) || 0) * 8 / 1_000_000;
    const totalThroughput = downMbps + upMbps;

    const queues = trafficRes.queues || [];
    const activeQueuesWithTraffic = queues.filter((q) => (Number(q.rxMbps) || 0) > 0.05 || (Number(q.txMbps) || 0) > 0.05);

    let totalClientDown = 0;
    let totalClientUp = 0;
    queues.forEach((q) => {
      totalClientDown += Number(q.rxMbps) || 0;
      totalClientUp += Number(q.txMbps) || 0;
    });

    const onlineClients = clients.filter((c) => c.status === 'online').length;

    let msg =
      `<b>📊 MikroTik Core Router - Real-Time Bandwidth</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🌐 <b>Router:</b> <b>${escapeHtml(targetRouter.name)}</b> (<code>${escapeHtml(targetRouter.ip)}</code>)\n` +
      `🟢 <b>Router Status:</b> Connected & Streaming\n` +
      `👥 <b>Online Clients:</b> <b>${onlineClients}</b> subscribers\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📥 <b>Total Download (RX):</b> <b>${downMbps.toFixed(2)} Mbps</b>\n` +
      `📤 <b>Total Upload (TX):</b> <b>${upMbps.toFixed(2)} Mbps</b>\n` +
      `⚡ <b>Aggregate Traffic:</b> <b>${totalThroughput.toFixed(2)} Mbps</b>\n` +
      `👥 <b>Active Client Usage:</b> <b>${(totalClientDown + totalClientUp).toFixed(2)} Mbps</b>\n`;

    if (activeQueuesWithTraffic.length > 0) {
      msg += `\n<b>🔥 Top Active Subscriber Lines:</b>\n`;
      activeQueuesWithTraffic.slice(0, 8).forEach((q) => {
        const cleanName = q.name.replace(/^nexora_/, '');
        msg += `• <code>${escapeHtml(cleanName)}</code>: 📥 ${Number(q.rxMbps).toFixed(2)}M / 📤 ${Number(q.txMbps).toFixed(2)}M\n`;
      });
    }

    msg += `\n⏰ <i>Measured: ${new Date().toLocaleTimeString()}</i>`;

    await sendTelegramMessage(chatId, msg, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Refresh Traffic', callback_data: 'admin_traffic' },
            { text: '👥 Online Subscribers', callback_data: 'admin_online' },
          ],
        ],
      },
    });
  } catch (err: any) {
    await sendTelegramMessage(chatId, `⚠️ Failed to fetch router traffic: ${escapeHtml(err.message)}`);
  }
}

function getClientByUserId(userId: string): any {
  const clients: any[] = localDbRef['nexora_clients']?.value || [];
  return clients.find((c) => String(c.userId).toLowerCase() === userId.toLowerCase());
}

function getPaymentsByUserId(userId: string): any[] {
  const payments: any[] = localDbRef['nexora_payments']?.value || [];
  return payments.filter((p) => String(p.userId).toLowerCase() === userId.toLowerCase());
}

function getRealOnuByUserId(userId: string): any {
  const mappings: any[] = localDbRef['nexora_onu_mappings']?.value || [];
  const map = mappings.find((m) => String(m.userId).toLowerCase() === userId.toLowerCase());
  if (!map) return null;

  return {
    serialNumber: map.serialNumber,
    status: map.status || 'online',
    rxPower: map.rxPower || null,
    distanceMeters: map.distanceMeters || null,
  };
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =========================================================================
// TELEGRAM BOT LONG-POLLING BACKGROUND WORKER
// =========================================================================

let isPollingWorkerActive = false;
let pollingOffset = 0;

export async function syncBotProfileToTelegram(): Promise<void> {
  const token = getTelegramBotToken();
  if (!token) return;

  try {
    // 1. Sync commands menu
    await callTelegramApi('setMyCommands', {
      commands: [
        { command: 'start', description: 'Start bot / Link account' },
        { command: 'help', description: 'Show commands & help guide' },
        { command: 'status', description: 'Live network & subscriber status' },
        { command: 'clients', description: 'Subscribers count & package summary' },
        { command: 'online', description: 'Active online subscribers' },
        { command: 'offline', description: 'Expired / offline subscribers' },
        { command: 'olt', description: 'OLT hardware & PON port status' },
        { command: 'onu', description: 'Discovered ONUs & optical RX power' },
        { command: 'alerts', description: 'Active alerts & fiber break diagnostics' },
        { command: 'search', description: 'Search subscriber by name, ID or phone' },
      ],
    });

    // 2. Sync bot description
    await callTelegramApi('setMyDescription', {
      description:
        '🌐 Official Telegram Bot for Nexora Network ISP.\n\n⚡ Features:\n• Instant alerts for New Client Registrations & Orders\n• Manual Payment Verification notifications\n• MikroTik & OLT Online/Offline diagnostics\n• ONU Optical RX Power & Fiber LOS alerts\n• Subscriber Self-Care (check package, validity & optical signal).',
    });

    // 3. Sync short description
    await callTelegramApi('setMyShortDescription', {
      short_description: 'Official Real-Time Network Monitoring & Subscriber Self-Care Bot for Nexora Network ISP.',
    });

    console.log('[TelegramBot] Commands menu and bot description synchronized successfully with Telegram API.');
  } catch (err) {
    console.warn('[TelegramBot] Warning during bot profile sync:', err);
  }
}

export function startTelegramPollingWorker(): void {
  if (isPollingWorkerActive) return;
  const token = getTelegramBotToken();
  if (!token) return;

  isPollingWorkerActive = true;
  console.log('[TelegramBot] Starting background update polling worker for @' + (process.env.TELEGRAM_BOT_USERNAME || 'NexoranetworkISPBot'));

  // Sync profile and commands with Telegram API on startup
  syncBotProfileToTelegram().catch(() => {});

  async function poll() {
    if (!isPollingWorkerActive) return;

    try {
      const tokenCurrent = getTelegramBotToken();
      if (!tokenCurrent) {
        setTimeout(poll, 15000);
        return;
      }

      const res = await callTelegramApi('getUpdates', {
        offset: pollingOffset,
        timeout: 20,
        allowed_updates: ['message', 'callback_query'],
      });

      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          pollingOffset = update.update_id + 1;
          try {
            await handleTelegramIncomingUpdate(update);
          } catch (handleErr) {
            console.error('[TelegramBot] Error processing update:', handleErr);
          }
        }
      }
      setTimeout(poll, 1000);
    } catch (err: any) {
      // Backoff on network or timeout error
      setTimeout(poll, 8000);
    }
  }

  poll();
}

export function stopTelegramPollingWorker(): void {
  isPollingWorkerActive = false;
}
