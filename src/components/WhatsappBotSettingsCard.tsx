import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  RefreshCw,
  Send,
  Save,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  MonitorSmartphone,
} from 'lucide-react';
import { WhatsappSettingsData } from '../lib/whatsappClient';
import {
  isSoundAlertEnabled,
  setSoundAlertEnabled,
  isBrowserPushEnabled,
  setBrowserPushEnabled,
  getBrowserPushPermission,
  requestBrowserPushPermission,
  playNotificationChime,
  triggerBrowserPushNotification,
} from '../lib/notificationEngine';

interface WhatsappBotSettingsCardProps {
  whatsappSettings: WhatsappSettingsData;
  setWhatsappSettings: React.Dispatch<React.SetStateAction<WhatsappSettingsData>>;
  waApiToken: string;
  setWaApiToken: (val: string) => void;
  waHasToken: boolean;
  waTesting: boolean;
  waSendingTest: boolean;
  waSaving: boolean;
  waTriggeringDemo: boolean;
  waConnectionInfo: { number?: string; provider?: string; status?: string } | null;
  newAdminWaInput: string;
  setNewAdminWaInput: (val: string) => void;
  handleAddAdminWaNumber: () => void;
  handleRemoveAdminWaNumber: (num: string) => void;
  handleSaveWhatsappSettings: () => void;
  handleTestWhatsappConnection: () => void;
  handleSendTestWhatsappMessage: () => void;
  handleTriggerDemoWhatsappAlerts: () => void;
}

export const WhatsappBotSettingsCard: React.FC<WhatsappBotSettingsCardProps> = ({
  whatsappSettings,
  setWhatsappSettings,
  waTesting,
  waSendingTest,
  waSaving,
  waTriggeringDemo,
  handleSaveWhatsappSettings,
  handleTestWhatsappConnection,
  handleSendTestWhatsappMessage,
  handleTriggerDemoWhatsappAlerts,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isSoundAlertEnabled());
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => isBrowserPushEnabled());
  const [pushPermission, setPushPermission] = useState<string>(() => getBrowserPushPermission());

  useEffect(() => {
    setPushPermission(getBrowserPushPermission());
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundAlertEnabled(next);
    if (next) {
      playNotificationChime('success');
    }
  };

  const handleTogglePush = async () => {
    if (pushPermission !== 'granted') {
      const perm = await requestBrowserPushPermission();
      setPushPermission(perm);
      if (perm === 'granted') {
        setPushEnabled(true);
        setBrowserPushEnabled(true);
        triggerBrowserPushNotification(
          'Nexora Real-Time Notifications Enabled',
          'আপনি এখন সকল প্রয়োজনীয় নোটিফিকেশন সরাসরি ব্রাউজার ও অ্যাপে পাবেন।'
        );
      }
      return;
    }
    const next = !pushEnabled;
    setPushEnabled(next);
    setBrowserPushEnabled(next);
  };

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-6 space-y-6 border-t-4 border-t-sky-600">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>বিল্ট-ইন রিয়েল-টাইম নোটিফিকেশন সিস্টেম (Real-Time Notification System)</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  whatsappSettings.enabled
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                }`}
              >
                {whatsappSettings.enabled ? '● Active (No Bot Needed)' : '○ Disabled'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              কোনো এক্সটার্নাল বট ছাড়াই নতুন ক্লায়েন্ট, প্যাকেজ অর্ডার, পেমেন্ট ভেরিফিকেশন, রাউটার/OLT/ONU সিগন্যাল ও সাপোর্ট টিকেটের সকল নোটিফিকেশন সরাসরি অ্যাপ এবং ব্রাউজারে পান।
            </p>
          </div>
        </div>

        {/* Enable/Disable Switch */}
        <label className="flex items-center gap-2.5 cursor-pointer self-start sm:self-auto bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <input
            type="checkbox"
            checked={whatsappSettings.enabled}
            onChange={(e) =>
              setWhatsappSettings((prev) => ({
                ...prev,
                enabled: e.target.checked,
              }))
            }
            className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-800">
            Enable All Notifications
          </span>
        </label>
      </div>

      {/* Instant Channels: In-App Live Bell + Browser Push + Sound Chime */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-sky-600" />
              <span>ইন-অ্যাপ লাইভ নোটিফিকেশন</span>
            </div>
            <p className="text-[11px] text-slate-600">
              অ্যাডমিন প্যানেল ও ক্লায়েন্ট পোর্টালে তাৎক্ষণিক লাইভ পপআপ এবং নোটিফিকেশন বেল আপডেট।
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 shrink-0">
            ● Always On
          </span>
        </div>

        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <MonitorSmartphone className="w-4 h-4 text-indigo-600" />
              <span>ব্রাউজার ও মোবাইল পুশ অ্যালার্ট</span>
            </div>
            <p className="text-[11px] text-slate-600">
              ব্রাউজার মিনিমাইজ থাকলেও নতুন অর্ডার বা পেমেন্ট আসলে ডেস্কটপ/মোবাইলে নোটিফিকেশন আসবে।
            </p>
          </div>
          <button
            type="button"
            onClick={handleTogglePush}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
              pushPermission === 'granted' && pushEnabled
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            {pushPermission === 'granted' && pushEnabled
              ? '✓ Push Enabled'
              : 'Enable Push'}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <span>সাউন্ড ও অডিও অ্যালার্ট</span>
            </div>
            <p className="text-[11px] text-slate-600">
              নতুন কোনো নোটিফিকেশন আসলে সাথে সাথে নোটিফিকেশন সাউন্ড বাজবে।
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleSound}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
              soundEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF'}
          </button>
        </div>
      </div>

      {/* Notification Event Triggers */}
      <div className="space-y-3 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-sky-600" /> যে সকল প্রয়োজনীয় নোটিফিকেশন স্বয়ংক্রিয়ভাবে আসবে (Notification Event Triggers)
          </h4>
          <button
            type="button"
            onClick={() =>
              setWhatsappSettings((prev) => ({
                ...prev,
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
              }))
            }
            className="text-[11px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
          >
            সবগুলো চালু করুন (Select All)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {[
            { key: 'notifyNewClient', label: '👤 নতুন ক্লায়েন্ট রেজিস্ট্রেশন (New Client)' },
            { key: 'notifyNewOrder', label: '🛒 নতুন প্যাকেজ ক্রয় রিকোয়েস্ট (New Package Order)' },
            { key: 'notifyPaymentSubmitted', label: '💳 পেমেন্ট ও রিনিউয়াল সাবমিট (Payment Submitted)' },
            { key: 'notifyPaymentApproved', label: '✅ পেমেন্ট অ্যাপ্রুভ ও লাইন এক্টিভ (Payment Approved)' },
            { key: 'notifyPaymentRejected', label: '❌ পেমেন্ট বাতিল অ্যালার্ট (Payment Rejected)' },
            { key: 'notifyClientStatus', label: '🔌 ক্লায়েন্ট অনলাইন / অফলাইন স্ট্যাটাস (Line Status)' },
            { key: 'notifyMikrotikOffline', label: '🖥️ মাইক্রোটিক রাউটার অফলাইন / লোড (MikroTik Alert)' },
            { key: 'notifyOltOffline', label: '🖧 OLT ডিভাইস ও PON পোর্ট অ্যালার্ট (OLT Alert)' },
            { key: 'notifyOnuSignal', label: '📡 ONU ফাইবার সিগন্যাল লস / Low RX (ONU Signal)' },
            { key: 'notifySlowInternet', label: '⚡ স্লো ইন্টারনেট ও হাই ব্যান্ডউইথ (Traffic Alert)' },
            { key: 'notifySupportTicket', label: '🎫 নতুন সাপোর্ট টিকেট ও কমপ্লেইন (Support Ticket)' },
          ].map((item) => {
            const checked = Boolean((whatsappSettings as any)[item.key]);
            return (
              <label
                key={item.key}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  checked
                    ? 'bg-sky-50/70 border-sky-300 text-slate-900 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setWhatsappSettings((prev) => ({
                      ...prev,
                      [item.key]: e.target.checked,
                    }))
                  }
                  className="w-3.5 h-3.5 accent-sky-600 rounded cursor-pointer"
                />
                <span>{item.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Action Buttons: Save, Test & Trigger Sample Notifications */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playNotificationChime('info');
              triggerBrowserPushNotification(
                'Nexora Real-Time Notification Test',
                'সিস্টেম টেস্ট সফল! আপনার নোটিফিকেশন ইঞ্জিন সচল রয়েছে।'
              );
              handleTestWhatsappConnection();
            }}
            disabled={waTesting}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {waTesting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Test Notification Engine</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playNotificationChime('success');
              triggerBrowserPushNotification(
                'Nexora Network ISP Alert',
                'নতুন টেস্ট নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!'
              );
              handleSendTestWhatsappMessage();
            }}
            disabled={waSendingTest}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            {waSendingTest ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send Test Notification</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playNotificationChime('urgent');
              triggerBrowserPushNotification(
                'Nexora All-Channel Alerts Dispatched',
                'সকল ক্যাটাগরির ডেমো নোটিফিকেশন জেনারেট করা হয়েছে।'
              );
              handleTriggerDemoWhatsappAlerts();
            }}
            disabled={waTriggeringDemo}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            {waTriggeringDemo ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Trigger All Sample Notifications</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleSaveWhatsappSettings}
          disabled={waSaving}
          className="px-5 py-2 bg-[#00a65a] hover:bg-[#008d4c] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
        >
          {waSaving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Save Notification Settings</span>
        </button>
      </div>
    </div>
  );
};
