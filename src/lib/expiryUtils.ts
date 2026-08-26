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
 badgeText: `⚠️ মেয়াদ শেষ (${overdueDays} দিন পূর্বে)`,
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
 badgeText: `🚨 আজই শেষ (${hoursLeft}ঘণ্টা ${minutesLeft}মি.)`,
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
 badgeText: `⚠️ ১ দিন বাকি (${hoursLeft}ঘণ্টা)`,
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
 badgeText: `⏰ ${calendarDaysDiff} দিন বাকি`,
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
 badgeText: `🟢 ${calendarDaysDiff} দিন বাকি`,
 badgeClass: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
 urgencyLevel: 'normal',
 formattedCountdown: `${calendarDaysDiff} Days remaining`,
 progressPercent,
 };
}

/**
 * Calculates a new expiry date string (YYYY-MM-DD) based on base date or today plus daysToAdd
 */
export function addDaysToExpiry(baseDateStr?: string, daysToAdd: number = 30): string {
 let baseDate = new Date();
 if (baseDateStr) {
 const parts = baseDateStr.split('-').map(Number);
 if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
 const parsed = new Date(parts[0], parts[1] - 1, parts[2]);
 // If current expiry is in future, add from that date; if already expired, add from today
 if (parsed.getTime() > baseDate.getTime()) {
 baseDate = parsed;
 }
 }
 }

 const result = new Date(baseDate.getTime() + daysToAdd * 86400000);
 return result.toISOString().split('T')[0];
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
 formattedText: `মেয়াদ শেষ (${overdueDays} দিন ${overdueHours} ঘণ্টা পূর্বে) - লাইন অফলাইন`,
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
 formattedText: `${days} দিন ${hours} ঘণ্টা ${minutes} মিনিট ${seconds} সেকেন্ড`,
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
 title: '৩ দিন পূর্বে স্ট্যান্ডার্ড নোটিশ (Standard 3-Day Reminder)',
 badge: '3-Day Notice',
 description: 'মেয়াদ শেষ হওয়ার পূর্বে সাধারণ পেমেন্ট রিমাইন্ডার মেসেজ।',
 generateText: (client, settings) => {
 const price = client.price || '500';
 const company = settings.companyName || settings.appName || 'Nexora network';
 const helpline = settings.phone || settings.whatsapp || '01700000000';
 return `সম্মানিত গ্রাহক ${client.name}, আপনার ${client.package} প্যাকেজের ইন্টারনেট বিল ৳${price} এর মেয়াদ ${client.expiry} তারিখে শেষ হচ্ছে। নিরবচ্ছিন্ন সেবা পেতে অনুগ্রহ করে বিল পরিশোধ করুন। হেল্পলাইন: ${helpline}। - ${company}`;
 },
 },
 {
 id: 'urgent_expiry',
 title: 'জরুরি মেয়াদ শেষ সতর্কতা (Urgent Expiry Alert)',
 badge: 'Urgent Alert',
 description: 'আজ অথবা আগামীকাল মেয়াদ শেষ হওয়ার জন্য জরুরি সতর্কবার্তা।',
 generateText: (client, settings) => {
 const price = client.price || '500';
 const company = settings.companyName || settings.appName || 'Nexora network';
 const helpline = settings.phone || settings.whatsapp || '01700000000';
 return `জরুরি নোটিশ: প্রিয় গ্রাহক ${client.name}, আপনার ইন্টারনেট সংযোগের মেয়াদ ${client.expiry} তারিখে শেষ হচ্ছে (বিল: ৳${price})। সংযোগ বিচ্ছিন্ন হওয়া এড়াতে দ্রুত বিকাশ/নগদে বিল পরিশোধ করে রিনিউ করুন। হেল্পলাইন: ${helpline}। - ${company}`;
 },
 },
 {
 id: 'expired_disconnect',
 title: 'সংযোগ বিচ্ছিন্ন নোটিশ (Expired / Disconnection Notice)',
 badge: 'Disconnection',
 description: 'ইতোমধ্যে মেয়াদ শেষ হয়ে যাওয়া ক্লায়েন্টদের জন্য সতর্কতা নোটিশ।',
 generateText: (client, settings) => {
 const price = client.price || '500';
 const company = settings.companyName || settings.appName || 'Nexora network';
 const helpline = settings.phone || settings.whatsapp || '01700000000';
 return `প্রিয় ${client.name}, আপনার ইন্টারনেট একাউন্টের (${client.userId}) মেয়াদ শেষ হয়ে গেছে। পুনরায় সংযোগ চালু করতে দ্রুত ৳${price} টাকা পরিশোধ করুন। হেল্পলাইন: ${helpline}। - ${company}`;
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
