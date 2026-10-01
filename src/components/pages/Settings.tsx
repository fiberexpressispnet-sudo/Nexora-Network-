import React, { useState, useEffect } from 'react';
import { AppSettings } from '../../types';
import { Settings, Save, Upload, Image, Phone, MessageSquare, Shield, Building, Trash2, RotateCcw, Lock, KeyRound, ShieldCheck, Fingerprint, Key, Send, Bell, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Bot, Copy, Check, Radio } from 'lucide-react';
import { compressImage } from '../../lib/imageUtils';
import { PinLockSettingsModal } from '../PinLockSettingsModal';
import {
  fetchTelegramSettings,
  saveTelegramSettings,
  testTelegramConnection,
  sendTelegramTestMessage,
  triggerDemoTelegramAlerts,
  generateAdminPairToken,
  TelegramSettingsData,
} from '../../lib/telegramClient';

interface SettingsProps {
 settings: AppSettings;
 onSaveSettings: (settings: AppSettings) => void;
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
 onResetAllData?: () => void;
}

export const SettingsPage: React.FC<SettingsProps> = ({
 settings,
 onSaveSettings,
 showToast,
 onResetAllData,
}) => {
 const [appName, setAppName] = useState(settings.appName);
 const [phone, setPhone] = useState(settings.phone);
 const [whatsapp, setWhatsapp] = useState(settings.whatsapp);
 const [companyName, setCompanyName] = useState(settings.companyName);
 const [address, setAddress] = useState(settings.address);
 const [logo, setLogo] = useState<string | null>(settings.logo);
 const [banner, setBanner] = useState<string | null>(settings.banner);
 const [timezone, setTimezone] = useState(settings.timezone);
 const [currency, setCurrency] = useState(settings.currency);
 const [sessionTimeout, setSessionTimeout] = useState(settings.sessionTimeout);
 const [twoFactor, setTwoFactor] = useState(settings.twoFactor);
 const [pinLockEnabled, setPinLockEnabled] = useState<boolean>(settings.pinLockEnabled !== false && settings.patternLockEnabled !== false);
 const [recoveryPin, setRecoveryPin] = useState<string>(settings.recoveryPin || '1234');
 const [isPinModalOpen, setIsPinModalOpen] = useState(false);
 const [paymentLogos, setPaymentLogos] = useState(settings.paymentLogos || {});

 // Telegram Bot Settings State
 const [telegramSettings, setTelegramSettings] = useState<TelegramSettingsData>({
   enabled: true,
   botUsername: 'NexoranetworkISPBot',
   adminChatIds: [],
   notifyNewClient: true,
   notifyNewOrder: true,
   notifyPaymentSubmitted: true,
   notifyPaymentApproved: true,
   notifyPaymentRejected: true,
   notifyClientActivated: true,
   notifyClientExpired: true,
   notifyMikrotikAlerts: true,
   notifyOltAlerts: true,
   notifyOnuAlerts: true,
   notifyLowOpticalPower: true,
 });
 const [hasTelegramToken, setHasTelegramToken] = useState(false);
 const [telegramTokenInput, setTelegramTokenInput] = useState('');
 const [newAdminChatId, setNewAdminChatId] = useState('');
 const [isTestingTelegram, setIsTestingTelegram] = useState(false);
 const [isSendingTestMsg, setIsSendingTestMsg] = useState(false);
 const [isSavingTelegram, setIsSavingTelegram] = useState(false);
 const [isGeneratingAdminPair, setIsGeneratingAdminPair] = useState(false);
 const [adminPairLink, setAdminPairLink] = useState<{ token: string; link: string; expiresAt: number } | null>(null);
 const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string; botInfo?: any } | null>(null);
 const [copiedPairLink, setCopiedPairLink] = useState(false);

 useEffect(() => {
   fetchTelegramSettings().then((res) => {
     if (res.success && res.settings) {
       setTelegramSettings(res.settings);
       setHasTelegramToken(Boolean(res.hasToken));
     }
   });
 }, []);

 const handleTestTelegramBot = async () => {
   setIsTestingTelegram(true);
   setTelegramTestResult(null);
   const res = await testTelegramConnection();
   setIsTestingTelegram(false);
   if (res.success) {
     setTelegramTestResult({
       success: true,
       message: res.message || `Connected to @${res.botInfo?.username || 'NexoranetworkISPBot'}`,
       botInfo: res.botInfo,
     });
     showToast(`Telegram Bot authenticated as @${res.botInfo?.username || 'NexoranetworkISPBot'}!`, 'success');
   } else {
     setTelegramTestResult({
       success: false,
       message: res.error || 'Failed to authenticate Bot Token',
     });
     showToast(res.error || 'Failed to connect to Telegram Bot', 'error');
   }
 };

 const handleSendTelegramTestMsg = async () => {
   if (!telegramSettings.adminChatIds || telegramSettings.adminChatIds.length === 0) {
     showToast('Please add or link at least one Admin Chat ID first', 'warning');
     return;
   }
   setIsSendingTestMsg(true);
   const res = await sendTelegramTestMessage();
   setIsSendingTestMsg(false);
   if (res.success) {
     showToast(res.message || 'Test alert sent to authorized Telegram admins!', 'success');
   } else {
     showToast(res.error || 'Failed to send test message', 'error');
   }
 };

 const [isSendingDemoAlerts, setIsSendingDemoAlerts] = useState(false);
 const handleTriggerAllDemoAlerts = async () => {
   if (!telegramSettings.adminChatIds || telegramSettings.adminChatIds.length === 0) {
     showToast('No Admin Telegram Chat ID linked yet! Please open @NexoranetworkISPBot on Telegram and type /start first.', 'warning');
     return;
   }
   setIsSendingDemoAlerts(true);
   const res = await triggerDemoTelegramAlerts();
   setIsSendingDemoAlerts(false);
   if (res.success) {
     showToast(res.message || 'All 11 alerts dispatched to your Telegram!', 'success');
   } else {
     showToast(res.error || 'Failed to dispatch alerts', 'error');
   }
 };

 const handleGenerateAdminPairLink = async () => {
   setIsGeneratingAdminPair(true);
   const res = await generateAdminPairToken();
   setIsGeneratingAdminPair(false);
   if (res.success && res.link && res.token && res.expiresAt) {
     setAdminPairLink({ link: res.link, token: res.token, expiresAt: res.expiresAt });
     showToast('1-Click Telegram Admin authorization link created!', 'info');
   } else {
     showToast(res.error || 'Failed to generate pairing token', 'error');
   }
 };

 const handleAddAdminChatId = () => {
   const clean = newAdminChatId.trim();
   if (!clean) return;
   if (telegramSettings.adminChatIds.includes(clean)) {
     showToast('Admin Chat ID already added', 'warning');
     return;
   }
   setTelegramSettings((prev) => ({
     ...prev,
     adminChatIds: [...prev.adminChatIds, clean],
   }));
   setNewAdminChatId('');
 };

 const handleRemoveAdminChatId = (idToRemove: string) => {
   setTelegramSettings((prev) => ({
     ...prev,
     adminChatIds: prev.adminChatIds.filter((id) => id !== idToRemove),
   }));
 };

 const handleSaveTelegram = async () => {
   setIsSavingTelegram(true);
   const res = await saveTelegramSettings(telegramSettings, telegramTokenInput || undefined);
   setIsSavingTelegram(false);
   if (res.success) {
     setTelegramTokenInput('');
     setHasTelegramToken(Boolean(res.hasToken));
     if (res.settings) setTelegramSettings(res.settings);
     showToast('Telegram Bot settings saved successfully!', 'success');
   } else {
     showToast(res.error || 'Failed to save Telegram settings', 'error');
   }
 };

 const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 try {
 const compressed = await compressImage(file, 400, 400, 0.7);
 setLogo(compressed);
 showToast('Logo image loaded & compressed. Click Save to apply.', 'info');
 } catch (err) {
 const reader = new FileReader();
 reader.onload = (ev) => {
 setLogo(ev.target?.result as string);
 showToast('Logo image loaded. Click Save to apply.', 'info');
 };
 reader.readAsDataURL(file);
 }
 }
 };

 const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 try {
 const compressed = await compressImage(file, 900, 450, 0.65);
 setBanner(compressed);
 showToast('Banner image loaded & compressed. Click Save to apply.', 'info');
 } catch (err) {
 const reader = new FileReader();
 reader.onload = (ev) => {
 setBanner(ev.target?.result as string);
 showToast('Banner image loaded. Click Save to apply.', 'info');
 };
 reader.readAsDataURL(file);
 }
 }
 };

 const handlePaymentLogoUpload = async (method: 'bkash' | 'nagad' | 'rocket' | 'bank', e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 try {
 const compressed = await compressImage(file, 200, 200, 0.7);
 setPaymentLogos(prev => ({ ...prev, [method]: compressed }));
 showToast(`${method} logo image loaded. Click Save to apply.`, 'info');
 } catch (err) {
 const reader = new FileReader();
 reader.onload = (ev) => {
 setPaymentLogos(prev => ({ ...prev, [method]: ev.target?.result as string }));
 showToast(`${method} logo image loaded. Click Save to apply.`, 'info');
 };
 reader.readAsDataURL(file);
 }
 }
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const updated: AppSettings = {
 appName: appName.trim() || 'Nexora network',
 phone: phone.trim(),
 whatsapp: whatsapp.trim(),
 companyName: companyName.trim(),
 address: address.trim(),
 logo,
 banner,
 timezone,
 currency,
 sessionTimeout: Number(sessionTimeout),
 twoFactor,
 pinLockEnabled,
 pinCode: settings.pinCode || settings.pinPassword || '1234',
 pinPassword: settings.pinCode || settings.pinPassword || '1234',
 patternLockEnabled: pinLockEnabled,
 patternSequence: settings.patternSequence || [0, 1, 2, 5, 8],
 recoveryPin: recoveryPin.trim() || '1234',
 autoLockMinutes: settings.autoLockMinutes || 0,
 paymentLogos,
 };

 onSaveSettings(updated);
 showToast('System settings and branding updated!', 'success');
 };

 const handleSavePinConfig = (newVals: Partial<AppSettings>) => {
 const updated: AppSettings = {
 ...settings,
 ...newVals,
 };
 if (newVals.pinLockEnabled !== undefined) setPinLockEnabled(newVals.pinLockEnabled);
 if (newVals.recoveryPin !== undefined) setRecoveryPin(newVals.recoveryPin);
 onSaveSettings(updated);
 };

 return (
 <div className="space-y-6">
 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Branding & Visual Customization */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-5">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200/80 pb-4">
 <Image className="w-5 h-5 text-sky-600 " /> Branding &amp; Visual Customization
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Logo Upload & Preview */}
 <div className="space-y-2">
 <label className="block text-xs font-semibold text-slate-700 ">
 Company Logo Icon
 </label>
 <div className="flex items-center gap-4 p-4 border border-slate-200 rounded bg-slate-50/50 ">
 <div className="w-16 h-16 rounded bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-500 overflow-hidden shrink-0">
 {logo ? (
 <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
 ) : (
 <Image className="w-8 h-8 opacity-40" />
 )}
 </div>
 <div className="flex-1 space-y-1">
 <input
 type="file"
 accept="image/*"
 onChange={handleLogoUpload}
 className="w-full text-xs text-slate-800 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/10 file:text-sky-600 hover:file:bg-sky-500/20"
 />
 {logo && (
 <button
 type="button"
 onClick={() => setLogo(null)}
 className="text-[11px] text-rose-500 hover:underline font-semibold"
 >
 Remove Logo
 </button>
 )}
 </div>
 </div>
 </div>

 {/* Banner Upload & Preview */}
 <div className="space-y-2">
 <label className="block text-xs font-semibold text-slate-700 ">
 Dashboard Hero Banner Image
 </label>
 <div className="flex items-center gap-4 p-4 border border-slate-200 rounded bg-slate-50/50 ">
 <div className="w-24 h-16 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-800 overflow-hidden shrink-0">
 {banner ? (
 <img src={banner} alt="Banner" className="w-full h-full object-contain" />
 ) : (
 <Image className="w-6 h-6 opacity-40" />
 )}
 </div>
 <div className="flex-1 space-y-1">
 <input
 type="file"
 accept="image/*"
 onChange={handleBannerUpload}
 className="w-full text-xs text-slate-800 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/10 file:text-sky-600 hover:file:bg-sky-500/20"
 />
 {banner && (
 <button
 type="button"
 onClick={() => setBanner(null)}
 className="text-[11px] text-rose-500 hover:underline font-semibold"
 >
 Remove Banner
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Payment Gateway Logos */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-5">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200/80 pb-4">
 <Image className="w-5 h-5 text-sky-600 " /> Payment Gateway Logos
 </h3>
 <p className="text-xs text-slate-800">Upload individual logos for each payment gateway to show them in the app.</p>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {(['bkash', 'nagad', 'rocket', 'bank'] as const).map((method) => (
 <div key={method} className="space-y-2">
 <label className="block text-xs font-semibold text-slate-700 capitalize">
 {method} Logo
 </label>
 <div className="flex flex-col items-center gap-3 p-3 border border-slate-200 rounded bg-slate-50/50 ">
 <div className="w-16 h-16 rounded bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-500 overflow-hidden shrink-0">
 {paymentLogos?.[method] ? (
 <img src={paymentLogos[method]} alt={`${method} Logo`} className="w-full h-full object-contain p-1" />
 ) : (
 <Image className="w-6 h-6 opacity-40" />
 )}
 </div>
 <div className="w-full flex flex-col gap-1 items-center">
 <label className="cursor-pointer text-xs font-semibold text-sky-600 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg text-center w-full">
 Choose Image
 <input
 type="file"
 accept="image/*"
 onChange={(e) => handlePaymentLogoUpload(method, e)}
 className="hidden"
 />
 </label>
 {paymentLogos?.[method] && (
 <button
 type="button"
 onClick={() => setPaymentLogos((prev) => { const copy = {...prev}; delete copy[method]; return copy; })}
 className="text-[10px] text-rose-500 hover:underline font-semibold"
 >
 Remove
 </button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Telegram Bot Integration & Instant Alerts */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
 <div>
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
 <Bot className="w-5 h-5 text-sky-600" /> Telegram Bot Settings &amp; Instant Network Alerts
 </h3>
 <p className="text-xs text-slate-500 mt-1">
 Real-time notifications for new orders, manual payments, MikroTik/OLT disconnects, and fiber breaks (LOS).
 </p>
 </div>
 <div className="flex items-center gap-2">
 <span
 className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
 hasTelegramToken
 ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
 : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
 }`}
 >
 <span className={`w-2 h-2 rounded-full ${hasTelegramToken ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
 <span>{hasTelegramToken ? `Bot Active (@${telegramSettings.botUsername || 'NexoranetworkISPBot'})` : 'Token Required'}</span>
 </span>
 </div>
 </div>

 {/* Bot Token & Core Actions */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="space-y-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
 <span>Telegram Bot Token (Server Secret)</span>
 {hasTelegramToken && (
 <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3" /> Configured securely in .env
 </span>
 )}
 </label>
 <input
 type="password"
 value={telegramTokenInput}
 onChange={(e) => setTelegramTokenInput(e.target.value)}
 placeholder={hasTelegramToken ? '•••••••••••••••••••••••••••••••• (Secure on Server)' : 'Paste Bot Token from @BotFather'}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 <p className="text-[11px] text-slate-500 mt-1">
 Bot token is stored server-side only as an environment secret and never displayed in plaintext.
 </p>
 </div>

 <div className="flex flex-wrap gap-2 pt-1">
 <button
 type="button"
 onClick={handleTestTelegramBot}
 disabled={isTestingTelegram}
 className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${isTestingTelegram ? 'animate-spin' : ''}`} />
 <span>{isTestingTelegram ? 'Testing...' : 'Test Bot Connection'}</span>
 </button>

 <button
 type="button"
 onClick={handleSendTelegramTestMsg}
 disabled={isSendingTestMsg || !telegramSettings.adminChatIds || telegramSettings.adminChatIds.length === 0}
 className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
 >
 <Send className="w-3.5 h-3.5" />
 <span>{isSendingTestMsg ? 'Sending...' : 'Send Test Alert'}</span>
 </button>

 <button
 type="button"
 onClick={handleTriggerAllDemoAlerts}
 disabled={isSendingDemoAlerts || !telegramSettings.adminChatIds || telegramSettings.adminChatIds.length === 0}
 className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
 >
 <Bell className={`w-3.5 h-3.5 ${isSendingDemoAlerts ? 'animate-bounce' : ''}`} />
 <span>{isSendingDemoAlerts ? 'Dispatching 11 Alerts...' : 'Send All 11 Sample Alerts'}</span>
 </button>

 <button
 type="button"
 onClick={handleSaveTelegram}
 disabled={isSavingTelegram}
 className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
 >
 <Save className="w-3.5 h-3.5" />
 <span>{isSavingTelegram ? 'Saving...' : 'Save Bot Settings'}</span>
 </button>
 </div>

 {telegramSettings.adminChatIds.length === 0 && (
 <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
 <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
 <div className="space-y-1">
 <p className="font-bold text-amber-950">⚠️ No Admin Telegram Connected Yet!</p>
 <p className="text-amber-800 leading-relaxed">
 Telegram bots cannot send messages without an authorized Chat ID. Open <a href="https://t.me/NexoranetworkISPBot" target="_blank" rel="noreferrer" className="font-bold text-sky-700 underline">@NexoranetworkISPBot</a> on Telegram and send <strong>/start</strong>, or click <em>&quot;Generate 1-Click Admin Authorization Link&quot;</em> below to instantly link your account and receive live alerts!
 </p>
 </div>
 </div>
 )}

 {telegramTestResult && (
 <div
 className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
 telegramTestResult.success
 ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
 : 'bg-rose-50 border-rose-200 text-rose-800'
 }`}
 >
 {telegramTestResult.success ? (
 <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
 ) : (
 <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
 )}
 <span>{telegramTestResult.message}</span>
 </div>
 )}
 </div>

 {/* Admin Authorization (1-Click Link or Manual Chat ID) */}
 <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-4">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
 <ShieldCheck className="w-4 h-4 text-sky-600" /> Authorized Admin Telegram Accounts
 </h4>
 <span className="text-[11px] font-bold text-slate-500">
 {telegramSettings.adminChatIds.length} Linked
 </span>
 </div>

 <p className="text-xs text-slate-600 leading-relaxed">
 Only authorized admin Telegram IDs can view system commands (<code>/status</code>, <code>/clients</code>, <code>/olt</code>, <code>/onu</code>, <code>/alerts</code>).
 </p>

 {/* 1-Click Link Generator */}
 <div className="space-y-2 pt-1">
 <button
 type="button"
 onClick={handleGenerateAdminPairLink}
 disabled={isGeneratingAdminPair}
 className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
 >
 <ExternalLink className="w-3.5 h-3.5" />
 <span>{isGeneratingAdminPair ? 'Generating...' : 'Generate 1-Click Admin Authorization Link'}</span>
 </button>

 {adminPairLink && (
 <div className="p-3 bg-white rounded-lg border border-indigo-200 space-y-2">
 <div className="text-[11px] text-slate-700 font-semibold flex items-center justify-between">
 <span>Click link in Telegram or send to admin:</span>
 <span className="text-amber-600 font-bold text-[10px]">Valid for 15 mins</span>
 </div>
 <div className="flex items-center gap-2">
 <input
 type="text"
 readOnly
 value={adminPairLink.link}
 className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 rounded border border-slate-200 font-mono text-slate-800 truncate"
 />
 <button
 type="button"
 onClick={() => {
 navigator.clipboard.writeText(adminPairLink.link);
 setCopiedPairLink(true);
 setTimeout(() => setCopiedPairLink(false), 2000);
 }}
 className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded flex items-center gap-1 cursor-pointer"
 >
 {copiedPairLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
 <span>{copiedPairLink ? 'Copied' : 'Copy'}</span>
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Manual Chat ID Input */}
 <div className="space-y-2 pt-2 border-t border-slate-200">
 <label className="block text-[11px] font-semibold text-slate-700">
 Or Add Admin Chat ID Manually:
 </label>
 <div className="flex items-center gap-2">
 <input
 type="text"
 value={newAdminChatId}
 onChange={(e) => setNewAdminChatId(e.target.value)}
 placeholder="e.g. 589410321"
 className="flex-1 px-3 py-1.5 text-xs font-mono rounded border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 <button
 type="button"
 onClick={handleAddAdminChatId}
 className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold cursor-pointer"
 >
 Add ID
 </button>
 </div>

 {telegramSettings.adminChatIds.length > 0 && (
 <div className="flex flex-wrap gap-1.5 pt-1">
 {telegramSettings.adminChatIds.map((id) => (
 <span
 key={id}
 className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-800 text-[11px] font-mono font-bold"
 >
 <span>{id}</span>
 <button
 type="button"
 onClick={() => handleRemoveAdminChatId(id)}
 className="text-rose-500 hover:text-rose-700 ml-1 cursor-pointer font-bold"
 >
 ×
 </button>
 </span>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Notification Alert Rules & Triggers */}
 <div className="border-t border-slate-200/80 pt-5 space-y-3">
 <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
 <Bell className="w-4 h-4 text-sky-600" /> Automated Alert Dispatch Settings
 </h4>
 <p className="text-xs text-slate-500">
 Choose which events trigger real-time instant alerts to authorized Telegram administrators.
 </p>

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all">
 <span className="text-xs font-semibold text-slate-700">🆕 New Client Registration</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyNewClient}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyNewClient: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>

 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all">
 <span className="text-xs font-semibold text-slate-700">📦 New Package Order</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyNewOrder}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyNewOrder: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>

 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all">
 <span className="text-xs font-semibold text-slate-700">💳 Payment Submitted (Manual)</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyPaymentSubmitted}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyPaymentSubmitted: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>

 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all">
 <span className="text-xs font-semibold text-slate-700">✅ Payment Approved</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyPaymentApproved}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyPaymentApproved: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>

 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all">
 <span className="text-xs font-semibold text-slate-700">❌ Payment Rejected</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyPaymentRejected}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyPaymentRejected: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>

 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all">
 <span className="text-xs font-semibold text-slate-700">⚡ Line Activated (Online)</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyClientActivated}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyClientActivated: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>

 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all">
 <span className="text-xs font-semibold text-slate-700">⏰ Subscription Expired</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyClientExpired}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyClientExpired: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>

 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all">
 <span className="text-xs font-semibold text-slate-700">📡 MikroTik Online / Offline</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyMikrotikAlerts}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyMikrotikAlerts: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>

 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all">
 <span className="text-xs font-semibold text-slate-700">🏢 OLT Online / Offline</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyOltAlerts}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyOltAlerts: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>

 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all">
 <span className="text-xs font-semibold text-slate-700">🚨 ONU Fiber Break / LOS Alert</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyOnuAlerts}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyOnuAlerts: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>

 <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white/60 hover:bg-white cursor-pointer transition-all sm:col-span-2">
 <span className="text-xs font-semibold text-slate-700">📉 Low Optical RX Power Warning (Below -25 dBm)</span>
 <input
 type="checkbox"
 checked={telegramSettings.notifyLowOpticalPower}
 onChange={(e) => setTelegramSettings((prev) => ({ ...prev, notifyLowOpticalPower: e.target.checked }))}
 className="w-4 h-4 text-sky-600 rounded"
 />
 </label>
 </div>
 </div>
 </div>

 {/* Company & Support Information */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-5">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200/80 pb-4">
 <Building className="w-5 h-5 text-sky-600 " /> ISP Organization &amp; Support Info
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Application Title / Brand Name
 </label>
 <input
 type="text"
 required
 value={appName}
 onChange={(e) => setAppName(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Company Legal Name
 </label>
 <input
 type="text"
 value={companyName}
 onChange={(e) => setCompanyName(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
 <Phone className="w-3.5 h-3.5 text-sky-500" /> Helpdesk Phone Number
 </label>
 <input
 type="text"
 required
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
 <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp Support Number
 </label>
 <input
 type="text"
 required
 value={whatsapp}
 onChange={(e) => setWhatsapp(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 </div>

 <div className="sm:col-span-2">
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 HQ Physical Address
 </label>
 <input
 type="text"
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>
 </div>

 {/* App Security & PIN Lock Configuration */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-5">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
 <Lock className="w-5 h-5 text-sky-600 " /> PIN Code & Password Security (PIN &amp; Password Lock)
 </h3>
 <span
 className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
 pinLockEnabled
 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
 : 'bg-slate-100 text-slate-800 border border-slate-200 '
 }`}
 >
 <KeyRound className="w-3.5 h-3.5" />
 <span>{pinLockEnabled ? 'PIN Lock Enabled' : 'PIN Lock Disabled'}</span>
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <p className="text-xs text-slate-900 leading-relaxed">
 Whenever the app is opened from any mobile or browser, it will prompt for the 4-8 digit <strong>Admin Security PIN</strong>. Only you can enter the system with your configured PIN.
 </p>

 <div className="flex flex-wrap gap-3">
 <button
 type="button"
 onClick={() => setIsPinModalOpen(true)}
 className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-bold flex items-center gap-2 shadow transition-all cursor-pointer"
 >
 <KeyRound className="w-4 h-4" /> PIN Code & Security Configuration
 </button>
 </div>
 </div>

 <div className="p-4 rounded bg-slate-50/70 border border-slate-200 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-700 ">
 PIN lock required on app startup
 </span>
 <input
 type="checkbox"
 checked={pinLockEnabled}
 onChange={(e) => setPinLockEnabled(e.target.checked)}
 className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
 <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Backup Recovery PIN (Emergency PIN)
 </label>
 <input
 type="password"
 maxLength={8}
 value={recoveryPin}
 onChange={(e) => setRecoveryPin(e.target.value.replace(/[^\d]/g, ''))}
 placeholder="Enter secret recovery PIN"
 className="w-full px-3 py-1.5 text-xs font-mono font-bold tracking-wider rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Security & System Options */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-5">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200/80 pb-4">
 <Shield className="w-5 h-5 text-sky-600 " /> Security &amp; Regional
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Currency
 </label>
 <input
 type="text"
 value={currency}
 onChange={(e) => setCurrency(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Timezone
 </label>
 <input
 type="text"
 value={timezone}
 onChange={(e) => setTimezone(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Session Timeout (minutes)
 </label>
 <input
 type="number"
 value={sessionTimeout}
 onChange={(e) => setSessionTimeout(Number(e.target.value))}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Two-Factor Auth
 </label>
 <select
 value={twoFactor}
 onChange={(e) => setTwoFactor(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="Disabled">Disabled</option>
 <option value="Enabled (SMS)">Enabled (SMS)</option>
 <option value="Enabled (Authenticator App)">Enabled (Authenticator App)</option>
 </select>
 </div>
 </div>
 </div>

 {/* Danger Zone / Reset Application */}
 {onResetAllData && (
 <div className="bg-rose-50/70 border border-rose-200 rounded p-5 sm:p-6 shadow-sm space-y-3">
 <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
 <RotateCcw className="w-5 h-5 text-rose-600 " /> System Reset / Fresh App Data Reset
 </h3>
 <p className="text-xs text-rose-700 leading-relaxed">
 If you want to start fresh with client lists, payment records, and ISP module data, click below to clear all demo or legacy data and start from zero (0).
 </p>
 <button
 type="button"
 onClick={() => {
 if (window.confirm('Are you sure you want to delete all existing client & demo data and start as a completely fresh app?')) {
 onResetAllData();
 }
 }}
 className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold flex items-center gap-2 shadow transition-all cursor-pointer"
 >
 <Trash2 className="w-4 h-4" /> Reset All App Data to Clean State (0 Clients)
 </button>
 </div>
 )}

 <div className="flex justify-end">
 <button
 type="submit"
 className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
 >
 <Save className="w-4 h-4" /> Save All Settings
 </button>
 </div>
 </form>

 {/* PIN Lock Configuration Modal */}
 <PinLockSettingsModal
 isOpen={isPinModalOpen}
 onClose={() => setIsPinModalOpen(false)}
 settings={settings}
 onSavePinSettings={handleSavePinConfig}
 showToast={showToast}
 />
 </div>
 );
};
