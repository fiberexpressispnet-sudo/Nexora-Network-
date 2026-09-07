import React, { useState } from 'react';
import { AppSettings } from '../../types';
import { Settings, Save, Upload, Image, Phone, MessageSquare, Shield, Building, Trash2, RotateCcw, Lock, KeyRound, ShieldCheck, Fingerprint, Key } from 'lucide-react';
import { compressImage } from '../../lib/imageUtils';
import { PinLockSettingsModal } from '../PinLockSettingsModal';

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
