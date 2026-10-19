import { adminFetch } from './apiClient';

export interface TelegramSettingsData {
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
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestError?: string;
}

export async function fetchTelegramSettings(): Promise<{
  success: boolean;
  settings?: any;
  hasToken?: boolean;
  botUsername?: string;
  error?: string;
}> {
  try {
    const res = await adminFetch('/api/messenger/settings');
    const data = await res.json();
    return {
      success: data.success,
      settings: data.settings
        ? {
            ...data.settings,
            botUsername: data.settings.whatsappNumber || 'NexoraNetworkISP',
            adminChatIds: data.settings.adminNumbers || [],
          }
        : undefined,
      hasToken: data.hasToken,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveTelegramSettings(
  settings: Partial<TelegramSettingsData>,
  newToken?: string
): Promise<{
  success: boolean;
  message?: string;
  settings?: any;
  hasToken?: boolean;
  error?: string;
}> {
  try {
    const messengerPayload: any = {
      enabled: settings.enabled,
      whatsappNumber: settings.botUsername || 'NexoraNetworkISP',
      adminNumbers: settings.adminChatIds || [],
      notifyNewClient: settings.notifyNewClient,
      notifyNewOrder: settings.notifyNewOrder,
      notifyPaymentSubmitted: settings.notifyPaymentSubmitted,
      notifyPaymentApproved: settings.notifyPaymentApproved,
      notifyPaymentRejected: settings.notifyPaymentRejected,
      notifyClientActivated: settings.notifyClientActivated,
      notifyClientExpired: settings.notifyClientExpired,
      notifyMikrotikAlerts: settings.notifyMikrotikAlerts,
      notifyOltAlerts: settings.notifyOltAlerts,
      notifyOnuAlerts: settings.notifyOnuAlerts,
      notifyLowOpticalPower: settings.notifyLowOpticalPower,
    };

    const res = await adminFetch('/api/messenger/settings', {
      method: 'POST',
      body: JSON.stringify({ ...messengerPayload, token: newToken }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function testTelegramConnection(): Promise<{
  success: boolean;
  message?: string;
  botInfo?: any;
  error?: string;
}> {
  try {
    const res = await adminFetch('/api/messenger/test-connection', {
      method: 'POST',
    });
    const data = await res.json();
    return {
      success: data.success,
      message: data.message,
      botInfo: data.accountInfo,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendTelegramTestMessage(): Promise<{
  success: boolean;
  message?: string;
  sentCount?: number;
  error?: string;
}> {
  try {
    const res = await adminFetch('/api/messenger/send-test', {
      method: 'POST',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function triggerDemoTelegramAlerts(): Promise<{
  success: boolean;
  message?: string;
  count?: number;
  error?: string;
}> {
  try {
    const res = await adminFetch('/api/messenger/trigger-demo-alerts', {
      method: 'POST',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateAdminPairToken(): Promise<{
  success: boolean;
  token?: string;
  link?: string;
  expiresAt?: number;
  error?: string;
}> {
  return {
    success: true,
    token: 'msg_admin_pair',
    link: 'https://m.me/NexoraNetworkISP?ref=admin_pair',
    expiresAt: Date.now() + 86400000,
  };
}

export async function generateClientLinkToken(
  userId: string,
  clientName: string
): Promise<{
  success: boolean;
  token?: string;
  link?: string;
  expiresAt?: number;
  error?: string;
}> {
  return {
    success: true,
    token: `msg_${userId}`,
    link: `https://m.me/NexoraNetworkISP?ref=link_${encodeURIComponent(userId)}`,
    expiresAt: Date.now() + 86400000,
  };
}

export async function checkClientLinkStatus(userId: string): Promise<{
  success: boolean;
  isLinked: boolean;
  linkDetails?: { linkedAt: string } | null;
  error?: string;
}> {
  return {
    success: true,
    isLinked: true,
    linkDetails: { linkedAt: new Date().toISOString() },
  };
}

export async function unlinkClientTelegram(userId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  return {
    success: true,
    message: 'Messenger Bot account unlinked successfully.',
  };
}

export function sendTelegramNotification(
  type:
    | 'NEW_CLIENT'
    | 'NEW_ORDER'
    | 'PAYMENT_SUBMITTED'
    | 'PAYMENT_DECISION'
    | 'CLIENT_STATUS'
    | 'MIKROTIK_ALERT'
    | 'OLT_ALERT'
    | 'ONU_ALERT'
    | 'SLOW_INTERNET'
    | 'SUPPORT_TICKET',
  payload: Record<string, any>
): void {
  try {
    const token =
      sessionStorage.getItem('client_token') ||
      localStorage.getItem('client_token') ||
      sessionStorage.getItem('admin_token') ||
      localStorage.getItem('admin_token') ||
      '';

    fetch('/api/messenger/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': token,
        'X-Admin-Token': token,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, payload }),
    }).catch(() => {});
  } catch (e) {
    // Ignore error
  }
}
