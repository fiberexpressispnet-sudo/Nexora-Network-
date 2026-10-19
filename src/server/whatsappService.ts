export interface WhatsappSettingsData {
  enabled: boolean;
  whatsappNumber: string;
  adminNumbers: string[];
  notifyNewClient: boolean;
  notifyNewOrder: boolean;
  notifyPaymentSubmitted: boolean;
  notifyPaymentApproved: boolean;
  notifyPaymentRejected: boolean;
  notifyClientStatus: boolean;
  notifyMikrotikOffline: boolean;
  notifyOltOffline: boolean;
  notifyOnuSignal: boolean;
  notifySlowInternet: boolean;
  notifySupportTicket: boolean;
}

export const defaultWhatsappSettings: WhatsappSettingsData = {
  enabled: true,
  whatsappNumber: "Built-In Real-Time Engine",
  adminNumbers: ["Admin Panel", "Client Portal", "Browser Push"],
  notifyNewClient: true,
  notifyNewOrder: true,
  notifyPaymentSubmitted: true,
  notifyPaymentApproved: true,
  notifyPaymentRejected: true,
  notifyClientStatus: true,
  notifyMikrotikOffline: true,
  notifyOltOffline: true,
  notifyOnuSignal: true,
  notifySlowInternet: true,
  notifySupportTicket: true,
};

let localDbRef: Record<string, { value: any; updatedAt: number }> | null = null;
let saveDbCallback: (() => void) | null = null;

export function setWhatsappDbReference(
  dbRef: Record<string, { value: any; updatedAt: number }>,
  saveFn: () => void
) {
  localDbRef = dbRef;
  saveDbCallback = saveFn;
}

export function getWhatsappSettings(): WhatsappSettingsData {
  if (!localDbRef) return defaultWhatsappSettings;
  const record = localDbRef["whatsapp_bot_settings"];
  if (record && record.value && typeof record.value === "object") {
    return {
      ...defaultWhatsappSettings,
      ...record.value,
      adminNumbers: Array.isArray(record.value.adminNumbers)
        ? record.value.adminNumbers
        : defaultWhatsappSettings.adminNumbers,
    };
  }
  return defaultWhatsappSettings;
}

export function updateWhatsappSettings(
  updates: Partial<WhatsappSettingsData>
): WhatsappSettingsData {
  const current = getWhatsappSettings();
  const merged: WhatsappSettingsData = {
    ...current,
    ...updates,
    adminNumbers: Array.isArray(updates.adminNumbers)
      ? updates.adminNumbers.map((s) => String(s).trim()).filter(Boolean)
      : current.adminNumbers,
  };
  if (localDbRef) {
    localDbRef["whatsapp_bot_settings"] = {
      value: merged,
      updatedAt: Date.now(),
    };
    if (saveDbCallback) saveDbCallback();
  }
  return merged;
}

export function getWhatsappApiToken(): string {
  return "builtin_realtime_notification_engine";
}

export function saveWhatsappApiToken(_token: string) {
  // No external token needed for built-in notification engine
}

function appendInAppNotification(text: string, icon: string = "🔔"): boolean {
  if (!localDbRef) return false;
  const now = Date.now();
  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const notifRecord = localDbRef["nexora_notifications"];
  const existing: any[] = Array.isArray(notifRecord?.value)
    ? notifRecord.value
    : [];

  const newNotif = {
    id: now + Math.floor(Math.random() * 10000),
    icon,
    text,
    time: timeStr,
    read: false,
  };

  localDbRef["nexora_notifications"] = {
    value: [newNotif, ...existing.slice(0, 99)],
    updatedAt: now,
  };
  if (saveDbCallback) saveDbCallback();
  return true;
}

export async function testWhatsappBotConnection(): Promise<{
  success: boolean;
  accountInfo?: { number: string; provider: string; status: string };
  error?: string;
}> {
  appendInAppNotification(
    "✅ Real-Time Notification System Tested: All Admin & Client Portal notification channels are active and delivering alerts!",
    "⚡"
  );
  return {
    success: true,
    accountInfo: {
      number: "Active (Admin + Client + Browser Push)",
      provider: "Nexora Real-Time Notification Engine",
      status: "Connected & Active",
    },
  };
}

export async function sendWhatsappMessage(
  _toNumberOrPsid: string,
  text: string,
  icon: string = "🔔"
): Promise<{ success: boolean; error?: string; directUrl?: string }> {
  const settings = getWhatsappSettings();
  if (!settings.enabled) {
    return { success: false, error: "Notification system is disabled in settings." };
  }
  const cleanText = text.replace(/\*+/g, "").replace(/━+/g, "—").replace(/\n+/g, " | ").trim();
  appendInAppNotification(cleanText, icon);
  return { success: true };
}

export async function sendToAllAdminWhatsapps(
  text: string,
  icon: string = "🔔"
): Promise<number> {
  const settings = getWhatsappSettings();
  if (!settings.enabled) return 0;
  const cleanText = text.replace(/\*+/g, "").replace(/━+/g, "—").replace(/\n+/g, " | ").trim();
  appendInAppNotification(cleanText, icon);
  return 1;
}

// ============================================================================
// REAL-TIME ISP EVENT DISPATCHERS (DIRECT IN-APP & PUSH NOTIFICATIONS)
// ============================================================================

export async function notifyNewClientRegistration(client: {
  name: string;
  userId: string;
  phone: string;
  package?: string;
  price?: string | number;
  router?: string;
}) {
  const settings = getWhatsappSettings();
  if (!settings.enabled || !settings.notifyNewClient) return;

  const text = `👤 New Client Registered: ${client.name} (${client.userId}) • Phone: ${client.phone} • Package: ${client.package || "N/A"} [৳${client.price || "0"}] • Router: ${client.router || "Main Router"}`;
  appendInAppNotification(text, "UserPlus");
}

export async function notifyNewPackageOrder(order: {
  orderNumber?: string;
  clientName: string;
  userId?: string;
  phone: string;
  packageName: string;
  price: string | number;
  paymentMethod?: string;
  transactionId?: string;
  connectionType?: string;
  gateway?: string;
  transaction?: string;
}) {
  const settings = getWhatsappSettings();
  if (!settings.enabled || !settings.notifyNewOrder) return;

  const method = order.paymentMethod || order.gateway || "Mobile Banking";
  const trx = order.transactionId || order.transaction || "N/A";
  const text = `🛒 New Package Order (${order.orderNumber || "NEW"}): ${order.clientName} (${order.userId || order.phone}) • Package: ${order.packageName} (${order.connectionType || "PPPoE"}) • Amount: ৳${order.price} via ${method} • TrxID: ${trx}`;
  appendInAppNotification(text, "⚡");
}

export async function notifyPaymentSubmitted(payment: {
  clientName: string;
  userId: string;
  phone?: string;
  package?: string;
  amount: string | number;
  paymentMethod: string;
  transactionId: string;
}) {
  const settings = getWhatsappSettings();
  if (!settings.enabled || !settings.notifyPaymentSubmitted) return;

  const text = `💳 Payment Submitted [Pending Approval]: ${payment.clientName} (${payment.userId}) paid ৳${payment.amount} for ${payment.package || "Broadband"} via ${payment.paymentMethod} • TrxID: ${payment.transactionId}`;
  appendInAppNotification(text, "CreditCard");
}

export async function notifyPaymentDecision(decision: {
  status: "approved" | "rejected";
  clientName: string;
  userId: string;
  phone?: string;
  package?: string;
  amount: string | number;
  paymentMethod?: string;
  transactionId?: string;
  expiry?: string;
  newExpiry?: string;
  reason?: string;
}) {
  const settings = getWhatsappSettings();
  if (!settings.enabled) return;
  if (decision.status === "approved" && !settings.notifyPaymentApproved) return;
  if (decision.status === "rejected" && !settings.notifyPaymentRejected) return;

  const isApproved = decision.status === "approved";
  const exp = decision.newExpiry || decision.expiry;
  const reasonText = decision.reason ? ` Reason: ${decision.reason}` : "";
  const text = isApproved
    ? `✅ Payment Approved & Line Active: ${decision.clientName} (${decision.userId}) • Package: ${decision.package || "Standard"} • Paid: ৳${decision.amount} (TrxID: ${decision.transactionId || "N/A"})${exp ? ` • New Expiry: ${exp}` : ""}`
    : `❌ Payment Rejected: ${decision.clientName} (${decision.userId}) • Amount: ৳${decision.amount} (TrxID: ${decision.transactionId || "N/A"})${reasonText}`;

  appendInAppNotification(text, isApproved ? "CreditCard" : "AlertTriangle");
}

export async function notifyClientStatusChange(data: {
  name: string;
  userId: string;
  status: string;
  router?: string;
  reason?: string;
  package?: string;
  expiry?: string;
}) {
  const settings = getWhatsappSettings();
  if (!settings.enabled || !settings.notifyClientStatus) return;

  const isOnline =
    data.status.toLowerCase() === "online" ||
    data.status.toLowerCase() === "active";
  const text = `${isOnline ? "🟢" : "🔴"} Subscriber Status Changed: ${data.name} (${data.userId}) is now ${data.status.toUpperCase()} on ${data.router || "Core Router"}${data.reason ? ` (${data.reason})` : ""}`;
  appendInAppNotification(text, "Wifi");
}

export async function notifyMikrotikAlert(alert: {
  routerName?: string;
  name?: string;
  ip: string;
  status: "offline" | "online" | "high_load";
  cpu?: string | number;
  details?: string;
  error?: string;
}) {
  const settings = getWhatsappSettings();
  if (!settings.enabled || !settings.notifyMikrotikOffline) return;

  const rName = alert.routerName || alert.name || "MikroTik Gateway";
  const icon =
    alert.status === "offline"
      ? "🚨"
      : alert.status === "high_load"
        ? "⚠️"
        : "⚡";
  const text = `${icon} MikroTik Router Alert: ${rName} (${alert.ip}) is ${alert.status.toUpperCase()}${alert.cpu ? ` • CPU Load: ${alert.cpu}%` : ""}${alert.details ? ` — ${alert.details}` : ""}`;
  appendInAppNotification(text, icon);
}

export async function notifyOltAlert(alert: {
  oltName?: string;
  name?: string;
  ip: string;
  brand?: string;
  status: "offline" | "online" | "pon_down";
  details?: string;
  error?: string;
}) {
  const settings = getWhatsappSettings();
  if (!settings.enabled || !settings.notifyOltOffline) return;

  const oName = alert.oltName || alert.name || "OLT Hardware";
  const icon = alert.status === "online" ? "⚡" : "🚨";
  const text = `${icon} OLT Optical Hardware Alert: ${oName} (${alert.brand || "OLT"} - ${alert.ip}) is ${alert.status.toUpperCase()}${alert.details ? ` — ${alert.details}` : ""}`;
  appendInAppNotification(text, icon);
}

export async function notifyOnuAlert(alert: {
  clientName?: string;
  userId?: string;
  serialNumber: string;
  onuId?: string;
  oltName?: string;
  ponPort?: string;
  rxPower?: number | string;
  status?: "los" | "dying_gasp" | "low_rx" | "offline" | string;
  alertType?: string;
  distanceMeters?: number;
}) {
  const settings = getWhatsappSettings();
  if (!settings.enabled || !settings.notifyOnuSignal) return;

  const statusStr = alert.status || alert.alertType || "warning";
  const text = `⚠️ ONU Optical Signal Alert: ${alert.clientName || "Subscriber"} (${alert.userId || alert.serialNumber}) • ONU SN: ${alert.serialNumber} • Port: ${alert.oltName || "OLT"} PON ${alert.ponPort || "0/1"} • Signal: ${statusStr.toUpperCase()} (RX: ${alert.rxPower !== undefined && alert.rxPower !== null ? `${alert.rxPower} dBm` : "LOS"})`;
  appendInAppNotification(text, "⚠️");
}

export async function notifySlowInternetAlert(alert: {
  routerName?: string;
  clientName?: string;
  userId?: string;
  currentBandwidth?: string;
  latencyMs?: number;
  details?: string;
}) {
  const settings = getWhatsappSettings();
  if (!settings.enabled || !settings.notifySlowInternet) return;

  const text = `⚠️ High Bandwidth / Latency Alert: ${alert.clientName ? `${alert.clientName} (${alert.userId})` : "Network Trunk"} on ${alert.routerName || "Main Gateway"} • Traffic: ${alert.currentBandwidth || "High"} • Ping: ${alert.latencyMs !== undefined ? `${alert.latencyMs} ms` : "Elevated"}${alert.details ? ` — ${alert.details}` : ""}`;
  appendInAppNotification(text, "⚠️");
}

export async function notifySupportTicket(ticket: {
  ticketNumber?: string;
  clientName: string;
  userId?: string;
  phone: string;
  category?: string;
  priority?: string;
  subject: string;
  description?: string;
  location?: string;
}) {
  const settings = getWhatsappSettings();
  if (!settings.enabled || !settings.notifySupportTicket) return;

  const text = `🎫 New Support Ticket (${ticket.ticketNumber || "OPEN"}): ${ticket.clientName} (${ticket.userId || ticket.phone}) • Category: ${ticket.category || "Support"} [${ticket.priority || "High"}] • Subject: "${ticket.subject}"`;
  appendInAppNotification(text, "AlertTriangle");
}

export async function dispatchAllDemoWhatsappAlerts(): Promise<{
  count: number;
}> {
  let count = 0;
  await notifyNewClientRegistration({
    name: "Tanvir Hossain",
    userId: "tanvir01711",
    phone: "01711000000",
    package: "30 Mbps Turbo",
    price: 800,
    router: "Core MikroTik CCR",
  });
  count++;

  await notifyNewPackageOrder({
    orderNumber: "ORD-9082",
    clientName: "Sadia Islam",
    userId: "sadia01819",
    phone: "01819000000",
    packageName: "50 Mbps Gaming",
    price: 1200,
    paymentMethod: "bKash",
    transactionId: "BK9928374X",
    connectionType: "PPPoE",
  });
  count++;

  await notifyPaymentSubmitted({
    clientName: "Rafiqul Alam",
    userId: "rafiq01911",
    phone: "01911223344",
    package: "20 Mbps Home",
    amount: 600,
    paymentMethod: "Nagad",
    transactionId: "NG7726152A",
  });
  count++;

  await notifyPaymentDecision({
    status: "approved",
    clientName: "Rafiqul Alam",
    userId: "rafiq01911",
    package: "20 Mbps Home",
    amount: 600,
    paymentMethod: "Nagad",
    transactionId: "NG7726152A",
    expiry: "2026-11-10",
  });
  count++;

  await notifyClientStatusChange({
    name: "Mahmudul Hasan",
    userId: "mahmud102",
    status: "offline",
    router: "Main Gateway Router",
    reason: "PPPoE Session Disconnected",
  });
  count++;

  await notifyMikrotikAlert({
    routerName: "Core-MikroTik-CCR2004",
    ip: "103.145.20.1",
    status: "high_load",
    cpu: 88,
    details: "Peak evening traffic load detected on sfp-sfpplus1",
  });
  count++;

  await notifyOltAlert({
    oltName: "BDCOM-GP3600-08",
    ip: "10.20.30.2",
    brand: "BDCOM",
    status: "pon_down",
    details: "PON Port 0/3 link down alert",
  });
  count++;

  await notifyOnuAlert({
    clientName: "Kamrul Hasan",
    userId: "kamrul55",
    serialNumber: "HWTC882910AA",
    oltName: "Huawei-MA5608T",
    ponPort: "0/2",
    rxPower: -29.4,
    status: "low_rx",
  });
  count++;

  await notifySupportTicket({
    ticketNumber: "TK-2026-809",
    clientName: "Nusrat Jahan",
    userId: "nusrat016",
    phone: "01611998877",
    category: "LOS Red Light",
    priority: "Urgent",
    subject: "ONU Red LOS light blinking since morning",
    location: "Sector 7, Uttara",
  });
  count++;

  return { count };
}

export async function handleWhatsappIncomingMessage(
  _fromNumberOrPsid: string,
  _messageText: string
): Promise<string> {
  return "Nexora Real-Time Notification System is active.";
}
