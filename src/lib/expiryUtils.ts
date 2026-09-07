import { Client, AppSettings } from '../types';

export interface ExpiryInfo {
  daysLeft: number;
  hoursLeft?: number;
  minutesLeft?: number;
  isExpired: boolean;
  isExpiringToday: boolean;
  isExpiringSoon: boolean; // <= 3 days (0, 1, 2, 3, or negative)
  badgeText: string;
  badgeClass: string;
  urgencyLevel: 'expired' | 'today' | 'urgent' | 'warning' | 'normal';
  formattedCountdown?: string;
  progressPercent?: number; // 0 to 100
}

export interface DetailedCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalHours: number;
  formattedText: string;
  statusBadge: string;
  statusColor: string;
}

export function getClientExpiryInfo(expiryDateStr?: string): ExpiryInfo {
  if (!expiryDateStr) {
    return {
      daysLeft: 999,
      isExpired: false,
      isExpiringToday: false,
      isExpiringSoon: false,
      badgeText: 'N/A',
      badgeClass: 'bg-slate-100 text-slate-500',
      urgencyLevel: 'normal',
      formattedCountdown: 'No Expiry Set',
      progressPercent: 100,
    };
  }

  // Parse YYYY-MM-DD or full date formats safely
  const parts = expiryDateStr.trim().split('-').map(Number);
  const now = new Date();

  let targetDate: Date;
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    // End of the expiry date day: 23:59:59.999
    targetDate = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
  } else {
    const parsed = new Date(expiryDateStr);
    if (isNaN(parsed.getTime())) {
      return {
        daysLeft: 999,
        isExpired: false,
        isExpiringToday: false,
        isExpiringSoon: false,
        badgeText: expiryDateStr,
        badgeClass: 'bg-slate-100 text-slate-500',
        urgencyLevel: 'normal',
        formattedCountdown: expiryDateStr,
        progressPercent: 100,
      };
    }
    targetDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
  }

  const diffMs = targetDate.getTime() - now.getTime();
  
  // Calculate calendar days remaining based on midnight dates
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const calendarDaysDiff = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  const hoursLeft = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

  // Progress calculation assuming a standard 30-day billing cycle
  const maxCycleDays = 30;
  const progressPercent = Math.max(0, Math.min(100, Math.round((Math.max(0, calendarDaysDiff) / maxCycleDays) * 100)));

  if (diffMs <= 0 || calendarDaysDiff < 0) {
    const overdueDays = Math.max(1, Math.abs(calendarDaysDiff));
    return {
      daysLeft: 0,
      hoursLeft: 0,
      minutesLeft: 0,
      isExpired: true,
      isExpiringToday: false,
      isExpiringSoon: true,
      badgeText: `⚠️ Expired (${overdueDays} days ago)`,
      badgeClass: 'bg-rose-500/15 text-rose-600 border border-rose-500/30 animate-pulse font-bold',
      urgencyLevel: 'expired',
      formattedCountdown: `Expired ${overdueDays}d ago (Line Auto-Offline)`,
      progressPercent: 0,
    };
  }

  if (calendarDaysDiff === 0) {
    return {
      daysLeft: 0,
      hoursLeft,
      minutesLeft,
      isExpired: false,
      isExpiringToday: true,
      isExpiringSoon: true,
      badgeText: `🚨 Expires Today (${hoursLeft}h ${minutesLeft}m)`,
      badgeClass: 'bg-rose-500/20 text-rose-600 border border-rose-500/40 font-extrabold',
      urgencyLevel: 'today',
      formattedCountdown: `${hoursLeft}h ${minutesLeft}m remaining`,
      progressPercent: Math.max(5, progressPercent),
    };
  }

  if (calendarDaysDiff === 1) {
    return {
      daysLeft: 1,
      hoursLeft,
      minutesLeft,
      isExpired: false,
      isExpiringToday: false,
      isExpiringSoon: true,
      badgeText: `⚠️ 1 Day Left (${hoursLeft}h)`,
      badgeClass: 'bg-amber-500/20 text-amber-700 border border-amber-500/40 font-bold',
      urgencyLevel: 'urgent',
      formattedCountdown: `1 Day ${hoursLeft} Hours remaining`,
      progressPercent: 10,
    };
  }

  if (calendarDaysDiff <= 3) {
    return {
      daysLeft: calendarDaysDiff,
      hoursLeft,
      minutesLeft,
      isExpired: false,
      isExpiringToday: false,
      isExpiringSoon: true,
      badgeText: `⏰ ${calendarDaysDiff} Days Left`,
      badgeClass: 'bg-amber-500/15 text-amber-700 border border-amber-500/30 font-semibold',
      urgencyLevel: 'warning',
      formattedCountdown: `${calendarDaysDiff} Days ${hoursLeft} Hours remaining`,
      progressPercent: Math.min(25, progressPercent),
    };
  }

  return {
    daysLeft: calendarDaysDiff,
    hoursLeft,
    minutesLeft,
    isExpired: false,
    isExpiringToday: false,
    isExpiringSoon: false,
    badgeText: `🟢 ${calendarDaysDiff} Days Left`,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
    urgencyLevel: 'normal',
    formattedCountdown: `${calendarDaysDiff} Days remaining`,
    progressPercent,
  };
}

/**
 * Parses package validity string or package details into number of days
 */
export function parseValidityDays(
  validityStr?: string,
  packageName?: string,
  priceVal?: string | number
): number {
  if (validityStr) {
    const str = validityStr.trim().toLowerCase();

    if (str.includes("year") || str.includes("yr")) {
      const num = parseInt(str.match(/\d+/)?.[0] || "1", 10);
      return Math.max(1, num * 365);
    }
    if (str.includes("month") || str.includes("mo")) {
      const num = parseInt(str.match(/\d+/)?.[0] || "1", 10);
      return Math.max(1, num * 30);
    }
    if (str.includes("week") || str.includes("wk")) {
      const num = parseInt(str.match(/\d+/)?.[0] || "1", 10);
      return Math.max(1, num * 7);
    }
    if (str.includes("hour") || str.includes("hr")) {
      const hrs = parseInt(str.match(/\d+/)?.[0] || "24", 10);
      return Math.max(1, Math.ceil(hrs / 24));
    }
    if (str.includes("day") || str.includes("d")) {
      const num = parseInt(str.match(/\d+/)?.[0] || "30", 10);
      return Math.max(1, num);
    }

    const plainNum = parseInt(str.match(/\d+/)?.[0] || "", 10);
    if (!isNaN(plainNum) && plainNum > 0) {
      return plainNum;
    }
  }

  if (packageName) {
    const str = packageName.trim().toLowerCase();
    if (str.includes("1 year") || str.includes("yearly")) return 365;
    if (str.includes("1 month") || str.includes("monthly")) return 30;
    if (str.includes("15 day") || str.includes("15days")) return 15;
    if (str.includes("10 day") || str.includes("10days")) return 10;
    if (str.includes("7 day") || str.includes("weekly") || str.includes("7days")) return 7;
    if (str.includes("3 day") || str.includes("3days")) return 3;
    if (str.includes("1 day") || str.includes("daily") || str.includes("24 hour")) return 1;
  }

  if (priceVal !== undefined && priceVal !== null) {
    const numPrice = typeof priceVal === "number" ? priceVal : parseFloat(String(priceVal).replace(/[^\d.]/g, ""));
    if (!isNaN(numPrice) && numPrice > 0) {
      if (numPrice <= 25) return 1;       // e.g. ৳10, ৳15, ৳20 -> 1 day pass
      if (numPrice <= 70) return 7;       // e.g. ৳30, ৳50, ৳60 -> 7 days pass
      if (numPrice <= 150) return 15;     // e.g. ৳100, ৳150 -> 15 days pass
    }
  }

  return 30;
}

/**
 * Robustly matches a package from the packages list by name, partial name, or price
 */
export function findPackageByDetails(
  pkgList?: any[],
  packageName?: string,
  priceStr?: string | number
): any | undefined {
  if (!pkgList || pkgList.length === 0) return undefined;
  const cleanName = (packageName || "").trim().toLowerCase();
  const numPrice = priceStr !== undefined ? parseFloat(String(priceStr).replace(/[^\d.]/g, "")) : NaN;

  if (cleanName) {
    const exact = pkgList.find((p) => p.name?.trim().toLowerCase() === cleanName);
    if (exact) return exact;
  }

  if (cleanName) {
    const partial = pkgList.find(
      (p) =>
        p.name?.trim().toLowerCase().includes(cleanName) ||
        cleanName.includes(p.name?.trim().toLowerCase())
    );
    if (partial) return partial;
  }

  if (!isNaN(numPrice) && numPrice > 0) {
    const priceMatch = pkgList.find(
      (p) => parseFloat(String(p.price).replace(/[^\d.]/g, "")) === numPrice
    );
    if (priceMatch) return priceMatch;
  }

  return undefined;
}

/**
 * Calculates a new expiry date string (YYYY-MM-DD) based on base date or today plus daysToAdd
 */
export function addDaysToExpiry(baseDateStr?: string, daysToAdd: number = 30): string {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  let startDate = todayMidnight;

  if (baseDateStr) {
    const parts = baseDateStr.trim().split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const existingDate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      // If current expiry is strictly in future relative to today, extend from that date; if expired/today, extend from today
      if (existingDate.getTime() > todayMidnight.getTime()) {
        startDate = existingDate;
      }
    }
  }

  const result = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + daysToAdd, 0, 0, 0, 0);
  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, '0');
  const day = String(result.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate precise countdown components down to seconds
 */
export function getLiveCountdown(expiryDateStr?: string): DetailedCountdown {
  if (!expiryDateStr) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: false,
      totalHours: 0,
      formattedText: 'No Expiry Date',
      statusBadge: 'N/A',
      statusColor: 'text-slate-400',
    };
  }

  const parts = expiryDateStr.trim().split('-').map(Number);
  let targetDate: Date;
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    targetDate = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
  } else {
    const parsed = new Date(expiryDateStr);
    targetDate = isNaN(parsed.getTime()) ? new Date() : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
  }

  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    const overdueMs = Math.abs(diffMs);
    const overdueDays = Math.floor(overdueMs / (1000 * 60 * 60 * 24));
    const overdueHours = Math.floor((overdueMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      totalHours: 0,
      formattedText: `Expired (${overdueDays}d ${overdueHours}h ago) - Line Offline`,
      statusBadge: 'EXPIRED (OFFLINE)',
      statusColor: 'text-rose-500',
    };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    totalHours,
    formattedText: `${days} Days ${hours} Hours ${minutes} Minutes ${seconds} Seconds`,
    statusBadge: days <= 3 ? 'EXPIRING SOON' : 'ACTIVE ONLINE',
    statusColor: days <= 3 ? 'text-amber-500' : 'text-emerald-500',
  };
}

export interface SmsTemplate {
  id: string;
  title: string;
  badge: string;
  description: string;
  generateText: (client: Client, settings: AppSettings) => string;
}

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'standard_3day',
    title: 'Standard 3-Day Renewal Notice',
    badge: '3-Day Notice',
    description: 'Standard payment reminder message prior to expiry.',
    generateText: (client, settings) => {
      const price = client.price || '500';
      const company = settings.companyName || settings.appName || 'Nexora network';
      const helpline = settings.phone || settings.whatsapp || '01700000000';
      return `Dear ${client.name}, your ${client.package} internet bill of ৳${price} expires on ${client.expiry}. Please pay to continue uninterrupted service. Helpline: ${helpline}. - ${company}`;
    },
  },
  {
    id: 'urgent_expiry',
    title: 'Urgent Expiry Alert',
    badge: 'Urgent Alert',
    description: 'Urgent reminder notice for expiring today or tomorrow.',
    generateText: (client, settings) => {
      const price = client.price || '500';
      const company = settings.companyName || settings.appName || 'Nexora network';
      const helpline = settings.phone || settings.whatsapp || '01700000000';
      return `Urgent Notice: Dear ${client.name}, your internet subscription expires on ${client.expiry} (Bill: ৳${price}). Please renew immediately via bKash/Nagad to avoid line suspension. Helpline: ${helpline}. - ${company}`;
    },
  },
  {
    id: 'expired_disconnect',
    title: 'Expired / Disconnection Notice',
    badge: 'Disconnection',
    description: 'Alert notice for clients whose subscription has already expired.',
    generateText: (client, settings) => {
      const price = client.price || '500';
      const company = settings.companyName || settings.appName || 'Nexora network';
      const helpline = settings.phone || settings.whatsapp || '01700000000';
      return `Dear ${client.name}, your internet account (${client.userId}) has expired. Please pay ৳${price} to reactivate your connection immediately. Helpline: ${helpline}. - ${company}`;
    },
  },
  {
    id: 'english_reminder',
    title: 'English Reminder (Renewal Notice)',
    badge: 'English Notice',
    description: 'Professional English billing renewal reminder SMS.',
    generateText: (client, settings) => {
      const price = client.price || '500';
      const company = settings.companyName || settings.appName || 'Nexora network';
      const helpline = settings.phone || settings.whatsapp || '01700000000';
      return `Dear ${client.name}, your ${client.package} internet package (User ID: ${client.userId}) expires on ${client.expiry}. Please pay ৳${price} to avoid service disruption. Helpline: ${helpline}. - ${company}`;
    },
  },
];
