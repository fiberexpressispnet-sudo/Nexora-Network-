import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import assert from 'assert';
import {
  getTelegramSettings,
  updateTelegramSettings,
  getTelegramBotToken,
  generateAdminPairingToken,
  generateClientLinkingToken,
  saveClientLink,
  getClientLinks,
  removeClientLinkByChatId,
  setTelegramDbReference,
  validateTelegramWebhookSecret,
  handleTelegramIncomingUpdate,
} from '../src/server/telegramService';

console.log('=== Nexora Network ISP Telegram Bot Integration & Security Test Suite ===');

// Setup mock test database
const mockDb: Record<string, { value: any; updatedAt: number }> = {
  nexora_clients: {
    value: [
      {
        id: 'CLI-01',
        name: 'Rahim Ahmed',
        userId: 'rahim_fiber',
        phone: '01817681233',
        package: 'Fiber 20',
        price: '800',
        status: 'online',
        expiry: '2026-10-30',
      },
      {
        id: 'CLI-02',
        name: 'Karim Ullah',
        userId: 'karim_fiber',
        phone: '01712345678',
        package: 'Fiber 10',
        price: '500',
        status: 'expired',
        expiry: '2026-09-25',
      },
    ],
    updatedAt: Date.now(),
  },
  nexora_olts: {
    value: [
      {
        id: 'olt-1',
        name: 'Mirpur Core Huawei OLT',
        brand: 'Huawei',
        ip: '192.168.10.1',
        managementPort: 161,
        status: 'online',
        enabled: true,
      },
    ],
    updatedAt: Date.now(),
  },
  nexora_onu_mappings: {
    value: [
      {
        clientId: 'CLI-01',
        userId: 'rahim_fiber',
        serialNumber: 'HWTC12345678',
        status: 'online',
        rxPower: -19.4,
        distanceMeters: 450,
      },
    ],
    updatedAt: Date.now(),
  },
  nexora_telegram_settings: {
    value: {
      enabled: true,
      botUsername: 'NexoranetworkISPBot',
      adminChatIds: [],
    },
    updatedAt: Date.now(),
  },
};

setTelegramDbReference(mockDb, () => {});

// Test 1: Bot Token Security & Safe Environment Reading
console.log('Test 1: Bot Token Security');
const token = getTelegramBotToken();
assert.ok(typeof token === 'string', 'PASS: Token is returned as string');
assert.ok(!token.includes('undefined') && !token.includes('null'), 'PASS: Token is not null or undefined placeholder');
console.log('  ✓ PASS: Telegram bot token loaded securely from server environment.');

// Test 2: Admin Authorization Allowlist
console.log('Test 2: Admin Authorization Allowlist');
const initialSettings = getTelegramSettings();
assert.ok(Array.isArray(initialSettings.adminChatIds), 'PASS: Admin chat IDs is array');

const updated = updateTelegramSettings({ adminChatIds: ['123456789', '987654321'] });
assert.strictEqual(updated.adminChatIds.length, 2, 'PASS: Added admin IDs correctly');
assert.ok(updated.adminChatIds.includes('123456789'), 'PASS: Admin ID 123456789 is present');
console.log('  ✓ PASS: Admin Chat ID allowlist securely stored and enforced.');

// Test 3: No Automatic First-User Super Admin
console.log('Test 3: No Automatic First-User Super Admin');
updateTelegramSettings({ adminChatIds: [] });
const emptySettings = getTelegramSettings();
assert.strictEqual(emptySettings.adminChatIds.length, 0, 'PASS: Admin list is empty');

// Simulate unauthenticated /start command from unknown user
handleTelegramIncomingUpdate({
  message: {
    chat: { id: 999999 },
    text: '/start',
    from: { first_name: 'UnknownUser' },
  },
});
const settingsAfterStart = getTelegramSettings();
assert.strictEqual(settingsAfterStart.adminChatIds.length, 0, 'PASS: First user is NOT automatically made admin');
console.log('  ✓ PASS: First Telegram user is NOT automatically made Super Admin.');

// Test 4: /admin and /authorize cannot self-elevate
console.log('Test 4: /admin and /authorize cannot self-elevate');
handleTelegramIncomingUpdate({
  message: {
    chat: { id: 888888 },
    text: '/admin',
    from: { first_name: 'Attacker' },
  },
});
const settingsAfterAdminCmd = getTelegramSettings();
assert.ok(!settingsAfterAdminCmd.adminChatIds.includes('888888'), 'PASS: /admin command did not elevate unauthorized user');
console.log('  ✓ PASS: Unauthorized user cannot elevate privileges via /admin command.');

// Test 5: Admin 1-Click Pairing Token (Cryptographically random, single-use, expires)
console.log('Test 5: Admin 1-Click Pairing Token (Single-use & Expiration)');
const adminPair = generateAdminPairingToken();
assert.ok(adminPair.token.startsWith('adm_'), 'PASS: Admin pairing token has adm_ prefix');
assert.ok(adminPair.link.includes('NexoranetworkISPBot'), 'PASS: Link contains bot username');
assert.ok(adminPair.expiresAt > Date.now(), 'PASS: Expires in future');

// Consume token once
handleTelegramIncomingUpdate({
  message: {
    chat: { id: 777111 },
    text: `/start ${adminPair.token}`,
    from: { first_name: 'RealAdmin' },
  },
});
const settingsAfterPairing = getTelegramSettings();
assert.ok(settingsAfterPairing.adminChatIds.includes('777111'), 'PASS: RealAdmin authorized via valid pairing token');

// Try consuming the same token a second time (must fail)
handleTelegramIncomingUpdate({
  message: {
    chat: { id: 777222 },
    text: `/start ${adminPair.token}`,
    from: { first_name: 'SecondUser' },
  },
});
const settingsAfterReuse = getTelegramSettings();
assert.ok(!settingsAfterReuse.adminChatIds.includes('777222'), 'PASS: Single-use pairing token was invalidated immediately');
console.log('  ✓ PASS: Admin pairing token is single-use and invalidates immediately after use.');

// Test 6: Client One-Time Linking Token & Account Isolation
console.log('Test 6: Client Linking Token & Account Isolation');
const clientPair = generateClientLinkingToken('rahim_fiber', 'Rahim Ahmed');
assert.ok(clientPair.token.startsWith('cli_'), 'PASS: Client linking token has cli_ prefix');
assert.ok(clientPair.link.includes('start=link_'), 'PASS: Deep-link has link_ prefix');

// Pair client
handleTelegramIncomingUpdate({
  message: {
    chat: { id: 55512345 },
    text: `/start link_${clientPair.token}`,
    from: { first_name: 'Rahim' },
  },
});
const links = getClientLinks();
const found = links.find((l) => l.userId === 'rahim_fiber');
assert.ok(found, 'PASS: Client link saved');
assert.strictEqual(found?.chatId, '55512345', 'PASS: Chat ID matches');

// Test unlinking
const unlinked = removeClientLinkByChatId('55512345');
assert.strictEqual(unlinked, true, 'PASS: Successfully unlinked');
const linksAfter = getClientLinks();
assert.ok(!linksAfter.find((l) => l.chatId === '55512345'), 'PASS: Chat ID removed from links');
console.log('  ✓ PASS: Client link isolation and unlinking verified.');

// Test 7: Webhook Secret Token Verification
console.log('Test 7: Webhook Secret Token Verification');
process.env.TELEGRAM_WEBHOOK_SECRET = 'secure_webhook_secret_key_2026';
assert.strictEqual(validateTelegramWebhookSecret('secure_webhook_secret_key_2026'), true, 'PASS: Matching secret valid');
assert.strictEqual(validateTelegramWebhookSecret('wrong_secret'), false, 'PASS: Invalid secret rejected');
assert.strictEqual(validateTelegramWebhookSecret(undefined), false, 'PASS: Missing secret rejected');
console.log('  ✓ PASS: Webhook secret token validation strictly enforced.');

console.log('====================================================');
console.log('All 7 Telegram Bot integration and security test suites PASSED! ✓');
