import { getAdminHeaders } from './apiClient';

export interface WhatsappSettingsData {
  enabled: boolean;
  whatsappNumber: string; // Stores Messenger Page Username / Bot ID
  adminNumbers: string[]; // Stores Authorized Admin Messenger IDs / PSIDs
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
  notifySupportTicket: boolean;
}

export async function fetchWhatsappSettings(): Promise<{
  success: boolean;
  settings?: WhatsappSettingsData;
  hasToken?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch('/api/messenger/settings', {
      headers: getAdminHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveWhatsappSettings(
  settings: Partial<WhatsappSettingsData>,
  token?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  settings?: WhatsappSettingsData;
  hasToken?: boolean;
}> {
  try {
    const res = await fetch('/api/messenger/settings', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ ...settings, token }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function testWhatsappConnection(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  accountInfo?: any;
}> {
  try {
    const res = await fetch('/api/messenger/test-connection', {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendWhatsappTestMessage(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  primaryUrl?: string;
  directUrls?: Array<{ number: string; url: string }>;
  hasToken?: boolean;
}> {
  try {
    const res = await fetch('/api/messenger/send-test', {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function triggerDemoWhatsappAlerts(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/messenger/trigger-demo-alerts', {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Asynchronously dispatches a notification through the server Facebook Messenger Bot Service.
 */
export function sendWhatsappNotification(
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
      sessionStorage.getItem('nexora_client_token') ||
      localStorage.getItem('nexora_client_token') ||
      sessionStorage.getItem('nexora_admin_token') ||
      localStorage.getItem('nexora_admin_token') ||
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
