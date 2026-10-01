import { getAdminHeaders, adminFetch } from './apiClient';

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
  settings?: TelegramSettingsData;
  hasToken?: boolean;
  botUsername?: string;
  error?: string;
}> {
  try {
    const res = await adminFetch('/api/telegram/settings');
    return await res.json();
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
  settings?: TelegramSettingsData;
  hasToken?: boolean;
  error?: string;
}> {
  try {
    const res = await adminFetch('/api/telegram/settings', {
      method: 'POST',
      body: JSON.stringify({ ...settings, token: newToken }),
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
    const res = await adminFetch('/api/telegram/test-connection', {
      method: 'POST',
    });
    return await res.json();
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
    const res = await adminFetch('/api/telegram/send-test', {
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
    const res = await adminFetch('/api/telegram/trigger-demo-alerts', {
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
  try {
    const res = await adminFetch('/api/telegram/generate-admin-pair-token', {
      method: 'POST',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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
  try {
    const token = sessionStorage.getItem('client_token') || localStorage.getItem('client_token') || sessionStorage.getItem('admin_token') || '';
    const res = await fetch('/api/telegram/generate-client-link-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': token,
        'X-Admin-Token': token,
      },
      body: JSON.stringify({ userId, clientName }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function checkClientLinkStatus(userId: string): Promise<{
  success: boolean;
  isLinked: boolean;
  linkDetails?: { linkedAt: string } | null;
  error?: string;
}> {
  try {
    const token = sessionStorage.getItem('client_token') || localStorage.getItem('client_token') || sessionStorage.getItem('admin_token') || '';
    const res = await fetch(`/api/telegram/client-link-status?userId=${encodeURIComponent(userId)}`, {
      headers: {
        'X-Client-Token': token,
        'X-Admin-Token': token,
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, isLinked: false, error: err.message };
  }
}

export async function unlinkClientTelegram(userId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const token = sessionStorage.getItem('client_token') || localStorage.getItem('client_token') || sessionStorage.getItem('admin_token') || '';
    const res = await fetch('/api/telegram/unlink-client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': token,
        'X-Admin-Token': token,
      },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Asynchronously dispatches a notification through the server Telegram Service.
 * Non-blocking: will never crash or halt caller logic if Telegram is down.
 */
export function sendTelegramNotification(
  type:
    | 'NEW_CLIENT'
    | 'NEW_ORDER'
    | 'PAYMENT_SUBMITTED'
    | 'PAYMENT_DECISION'
    | 'CLIENT_STATUS'
    | 'MIKROTIK_ALERT'
    | 'OLT_ALERT'
    | 'ONU_ALERT',
  payload: Record<string, any>
): void {
  try {
    fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    }).catch((err) => {
      // Ignore network/offline error gracefully
    });
  } catch (e) {
    // Ignore error
  }
}
