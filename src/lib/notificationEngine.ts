import { NotificationItem } from '../types';
import { getAdminHeaders } from './apiClient';

export function isSoundAlertEnabled(): boolean {
  try {
    return localStorage.getItem('nexora_notif_sound') !== 'false';
  } catch {
    return true;
  }
}

export function setSoundAlertEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('nexora_notif_sound', enabled ? 'true' : 'false');
  } catch {}
}

export function isBrowserPushEnabled(): boolean {
  try {
    return localStorage.getItem('nexora_notif_push') !== 'false';
  } catch {
    return true;
  }
}

export function setBrowserPushEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('nexora_notif_push', enabled ? 'true' : 'false');
  } catch {}
}

export function playNotificationChime(
  variant: 'info' | 'success' | 'warning' | 'urgent' = 'info'
): void {
  if (!isSoundAlertEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = variant === 'urgent' ? 'triangle' : 'sine';
    osc1.frequency.setValueAtTime(variant === 'urgent' ? 660 : 587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = variant === 'urgent' ? 'triangle' : 'sine';
    osc2.frequency.setValueAtTime(
      variant === 'urgent' ? 880 : variant === 'success' ? 880 : 783.99,
      now + 0.14
    );
    gain2.gain.setValueAtTime(0.22, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.5);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export function getBrowserPushPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export async function requestBrowserPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await window.Notification.requestPermission();
    if (perm === 'granted') {
      setBrowserPushEnabled(true);
    }
    return perm;
  } catch {
    return window.Notification.permission;
  }
}

export function triggerBrowserPushNotification(
  title: string,
  body: string,
  tag?: string
): void {
  if (!isBrowserPushEnabled()) return;
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;

  try {
    new window.Notification(title, {
      body,
      tag: tag || `nexora-notif-${Date.now()}`,
    });
  } catch {
    // Ignore if browser blocks notification in current context
  }
}

export async function dispatchInAppNotification(
  text: string,
  icon: string = '🔔',
  timeLabel?: string
): Promise<NotificationItem> {
  const now = Date.now();
  const formattedTime =
    timeLabel ||
    new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const newNotif: NotificationItem = {
    id: now + Math.floor(Math.random() * 1000),
    icon,
    text,
    time: formattedTime,
    read: false,
  };

  try {
    let existing: NotificationItem[] = [];
    const res = await fetch('/api/db/get?key=nexora_notifications');
    const data = await res.json();
    if (data.success && Array.isArray(data.value)) {
      existing = data.value;
    } else {
      const local = localStorage.getItem('nexora_notifications');
      if (local) existing = JSON.parse(local);
    }

    const updated = [newNotif, ...existing.slice(0, 99)];
    localStorage.setItem('nexora_notifications', JSON.stringify(updated));
    localStorage.setItem('nexora_notifications_updatedAt', String(now));

    await fetch('/api/db/set', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({
        key: 'nexora_notifications',
        value: updated,
        updatedAt: now,
      }),
    });
    window.dispatchEvent(new Event('storage'));
  } catch {
    // Fallback to localStorage only
    try {
      const local = localStorage.getItem('nexora_notifications');
      const existing = local ? JSON.parse(local) : [];
      const updated = [newNotif, ...existing.slice(0, 99)];
      localStorage.setItem('nexora_notifications', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  }

  return newNotif;
}
