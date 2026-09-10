/**
 * User & Username utility functions for ISP Management & MikroTik Integration
 */

/**
 * Generates a normalized client username in the format: normalizedName + phone
 * Example: "Abdul Rahim" + "01712345678" -> "abdulrahim01712345678"
 * Ensures unique usernames across existing clients / records.
 */
export function generateNormalizedUsername(
  name: string = "",
  phone: string = "",
  existingUserIds: string[] = [],
): string {
  // 1. Normalize name: lowercase, remove Bengali/Unicode special punctuation or spaces, keep alphanumeric
  const cleanName = (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");

  // Fallback to "user" if name contains no latin alphanumeric characters (e.g. pure Bengali script)
  const baseName = cleanName.length > 0 ? cleanName : "user";

  // 2. Normalize phone: remove leading country codes like +88 or 88 if desired, or keep 11-digit BD phone
  let cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("880") && cleanPhone.length === 13) {
    cleanPhone = "0" + cleanPhone.slice(3);
  }

  const baseUsername = `${baseName}${cleanPhone}`;

  // 3. Ensure uniqueness
  const existingSet = new Set(
    (existingUserIds || []).map((id) => (id || "").toLowerCase().trim()),
  );

  if (!existingSet.has(baseUsername.toLowerCase())) {
    return baseUsername;
  }

  let counter = 2;
  while (existingSet.has(`${baseUsername}_${counter}`.toLowerCase())) {
    counter++;
  }
  return `${baseUsername}_${counter}`;
}

/**
 * Generates a cryptographically strong random password for client accounts/vouchers.
 * Avoids weak/default passwords like "123456".
 */
export function generateSecurePassword(length: number = 8): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  let result = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

/**
 * Sanitizes router configuration to prevent exposing passwords to the client browser.
 */
export function sanitizeRouterForClient<T extends { password?: string }>(router: T): T {
  return {
    ...router,
    password: router.password ? '••••••••' : undefined,
  };
}

