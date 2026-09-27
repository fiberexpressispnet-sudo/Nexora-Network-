/**
 * Secure API Client Helper for Nexora ISP Network Management
 * Handles Authorization headers, token persistence, and authenticated requests.
 */

const ADMIN_TOKEN_STORAGE_KEY = 'nexora_admin_token';
const CLIENT_TOKEN_STORAGE_KEY = 'nexora_client_token';

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ||
    sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ||
    ''
  );
}

export function setAdminToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearAdminToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function getClientToken(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem(CLIENT_TOKEN_STORAGE_KEY) ||
    sessionStorage.getItem(CLIENT_TOKEN_STORAGE_KEY) ||
    ''
  );
}

export function setClientToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLIENT_TOKEN_STORAGE_KEY, token);
}

export function clearClientToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CLIENT_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(CLIENT_TOKEN_STORAGE_KEY);
}

/**
 * Returns standard authorization headers for Admin API calls.
 */
export function getAdminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    'x-admin-token': token,
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Returns standard authorization headers for Client self-service calls.
 */
export function getClientHeaders(): Record<string, string> {
  const token = getClientToken();
  return {
    'Content-Type': 'application/json',
    'x-client-token': token,
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Authenticated fetch helper for admin-only backend routes.
 */
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAdminHeaders(),
    ...(options.headers || {}),
  };
  return fetch(url, {
    ...options,
    headers,
  });
}
