import React, { useState, useEffect } from 'react';
import { PatternLockCanvas } from './PatternLockCanvas';
import { Lock, ShieldCheck, Check, AlertCircle, RefreshCw, X, KeyRound, Sparkles, Fingerprint } from 'lucide-react';
import { AppSettings } from '../types';
import { isBiometricsSupported, registerDeviceBiometrics, verifyDeviceBiometrics } from '../lib/biometrics';

interface PatternLockSettingsModalProps {
 isOpen: boolean;
 onClose: () => void;
 settings: AppSettings;
 onSavePatternSettings: (newSettings: Partial<AppSettings>) => void;
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

export const PatternLockSettingsModal: React.FC<PatternLockSettingsModalProps> = ({
 isOpen,
 onClose,
 settings,
 onSavePatternSettings,
 showToast,
}) => {
 const [step, setStep] = useState<'draw_new' | 'confirm_new' | 'test' | 'success'>('draw_new');
 const [tempNewPattern, setTempNewPattern] = useState<number[]>([]);
 const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
 const [feedback, setFeedback] = useState<string | null>(null);
 
 const [enabled, setEnabled] = useState<boolean>(settings.patternLockEnabled !== false);
 const [biometricEnabled, setBiometricEnabled] = useState<boolean>(settings.biometricLockEnabled !== false);
 const [recoveryPin, setRecoveryPin] = useState<string>(settings.recoveryPin || '1234');
 const [autoLockMinutes, setAutoLockMinutes] = useState<number>(settings.autoLockMinutes || 0);

 const [biometricsAvailable, setBiometricsAvailable] = useState<boolean>(false);
 const [isRegisteringBio, setIsRegisteringBio] = useState<boolean>(false);

 useEffect(() => {
 isBiometricsSupported().then(setBiometricsAvailable);
 }, []);

 if (!isOpen) return null;

 const handleDrawNew = (pattern: number[]) => {
 if (pattern.length < 4) {
 setStatus('error');
 setFeedback('কমপক্ষে ৪টি ডট যুক্ত করে প্যাটার্ন তৈরি করুন!');
 setTimeout(() => {
 setStatus('idle');
 setFeedback(null);
 }, 1500);
 return;
 }

 setTempNewPattern(pattern);
 setStatus('success');
 setFeedback('প্যাটার্ন রেকর্ড করা হয়েছে! নিশ্চিত করতে পুনরায় ড্র করুন।');
 setTimeout(() => {
 setStatus('idle');
 setFeedback(null);
 setStep('confirm_new');
 }, 600);
 };

 const handleConfirmNew = (pattern: number[]) => {
 const isMatch =
 pattern.length === tempNewPattern.length &&
 pattern.every((val, idx) => val === tempNewPattern[idx]);

 if (isMatch) {
 setStatus('success');
 setFeedback('নতুন প্যাটার্ন সফলভাবে ম্যাচ করেছে!');
 setTimeout(() => {
 onSavePatternSettings({
 patternLockEnabled: enabled,
 patternSequence: tempNewPattern,
 biometricLockEnabled: biometricEnabled,
 recoveryPin: recoveryPin.trim() || '1234',
 autoLockMinutes,
 });
 showToast('নতুন অ্যাপ সিকিউরিটি প্যাটার্ন সফলভাবে সেট করা হয়েছে!', 'success');
 setStep('success');
 }, 600);
 } else {
 setStatus('error');
 setFeedback('প্যাটার্ন মিলেনি! প্রথম থেকে পুনরায় চেষ্টা করুন।');
 setTimeout(() => {
 setStatus('idle');
 setFeedback(null);
 setStep('draw_new');
 setTempNewPattern([]);
 }, 1500);
 }
 };

 const handleRegisterBiometricsClick = async () => {
 setIsRegisteringBio(true);
 const res = await registerDeviceBiometrics(settings.appName || 'Nexora network', 'Admin');
 if (res.success && res.credentialId) {
 onSavePatternSettings({
 biometricLockEnabled: true,
 biometricRegistered: true,
 biometricCredentialId: res.credentialId,
 });
 setBiometricEnabled(true);
 showToast('আপনার ডিভাইসের আসল ফিঙ্গারপ্রিন্ট সফলভাবে যুক্ত করা হয়েছে!', 'success');
 } else {
 showToast(res.error || 'ফিঙ্গারপ্রিন্ট যুক্ত করা সম্ভব হয়নি।', 'error');
 }
 setIsRegisteringBio(false);
 };

 const handleTestBiometrics = async () => {
 const res = await verifyDeviceBiometrics(settings.biometricCredentialId);
 if (res.success) {
 showToast('ফিঙ্গারপ্রিন্ট সফলভাবে যাচাই সম্পন্ন হয়েছে!', 'success');
 } else {
 showToast(res.error || 'ফিঙ্গারপ্রিন্ট যাচাই ব্যর্থ হয়েছে!', 'error');
 }
 };

 const handleQuickSaveOtherOptions = () => {
 onSavePatternSettings({
 patternLockEnabled: enabled,
 biometricLockEnabled: biometricEnabled,
 recoveryPin: recoveryPin.trim() || '1234',
 autoLockMinutes,
 });
 showToast('নিরাপত্তা সেটিংস সংরক্ষিত হয়েছে!', 'success');
 onClose();
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-sm overflow-y-auto">
 <div className="bg-white border border-slate-200 rounded p-6 max-w-md w-full shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200 text-slate-800 my-auto">
 {/* Header */}
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <div className="flex items-center gap-2.5">
 <div className="w-10 h-10 rounded bg-sky-500/10 text-sky-600 flex items-center justify-center">
 <Fingerprint className="w-5 h-5" />
 </div>
 <div>
 <h2 className="text-base font-bold">বায়োমেট্রিক ও প্যাটার্ন নিরাপত্তা</h2>
 <p className="text-xs text-slate-800 ">আসল ফিঙ্গারপ্রিন্ট ও প্যাটার্ন কনফিগারেশন</p>
 </div>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="p-1.5 rounded hover:bg-slate-100 text-slate-800 hover:text-slate-900 transition-colors cursor-pointer"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {step === 'success' ? (
 <div className="text-center py-6 space-y-4">
 <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
 <ShieldCheck className="w-10 h-10" />
 </div>
 <h3 className="text-lg font-bold text-emerald-600 ">
 নিরাপত্তা লক সক্রিয় ও সংরক্ষিত!
 </h3>
 <p className="text-xs text-slate-800 max-w-xs mx-auto">
 যেকোনো মোবাইল বা ডিভাইস থেকে এই অ্যাপে ঢুকলে আপনার আসল ফিঙ্গারপ্রিন্ট অথবা সেট করা নতুন প্যাটার্ন চাইবে।
 </p>
 <button
 type="button"
 onClick={onClose}
 className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-md cursor-pointer transition-colors"
 >
 সম্পন্ন করুন
 </button>
 </div>
 ) : (
 <>
 {/* Native Hardware Fingerprint Section */}
 <div className="p-3.5 rounded bg-gradient-to-r from-sky-500/10 to-cyan-500/10 border border-sky-500/30 space-y-3">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <div className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
 <Fingerprint className="w-4 h-4 text-sky-500" />
 <span>ডিভাইস ফিঙ্গারপ্রিন্ট লক (Touch / Face ID)</span>
 </div>
 <p className="text-[11px] text-slate-800 ">
 শুধুমাত্র আপনার নিবন্ধিত আঙুলের ছাপে অ্যাপ আনলক হবে
 </p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={biometricEnabled}
 onChange={(e) => setBiometricEnabled(e.target.checked)}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
 </label>
 </div>

 {biometricsAvailable ? (
 <div className="flex items-center gap-2 pt-1">
 <button
 type="button"
 onClick={handleRegisterBiometricsClick}
 disabled={isRegisteringBio}
 className="flex-1 py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
 >
 <Fingerprint className="w-3.5 h-3.5" />
 <span>{isRegisteringBio ? 'নিবন্ধন চলছে...' : 'নতুন ফিঙ্গারপ্রিন্ট লিঙ্ক করুন'}</span>
 </button>
 <button
 type="button"
 onClick={handleTestBiometrics}
 className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
 >
 <span>টেস্ট করুন</span>
 </button>
 </div>
 ) : (
 <p className="text-[11px] text-amber-600 bg-amber-500/10 p-2 rounded">
 ডিভাইসে বায়োমেট্রিক সেন্সর পাওয়া গেলে এখানে সরাসরি সক্রিয় হবে।
 </p>
 )}
 </div>

 {/* Pattern Canvas Setup */}
 <div className="flex flex-col items-center space-y-2 pt-1">
 <div className="text-center space-y-1">
 <span className="text-xs font-bold text-sky-600 px-3 py-1 rounded-full bg-sky-500/10">
 {step === 'draw_new'
 ? '১ম ধাপ: আপনার পছন্দের ব্যাকআপ প্যাটার্ন ড্র করুন'
 : '২য় ধাপ: প্যাটার্নটি নিশ্চিত করতে পুনরায় আঁকুন'}
 </span>
 {feedback && (
 <p className={`text-xs font-semibold ${status === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>
 {feedback}
 </p>
 )}
 </div>

 <PatternLockCanvas
 onComplete={step === 'draw_new' ? handleDrawNew : handleConfirmNew}
 status={status}
 size={230}
 showSequenceNumbers={true}
 minPoints={4}
 />
 </div>

 {/* Recovery PIN & Auto Lock */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 ">
 <div>
 <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
 <KeyRound className="w-3.5 h-3.5 text-amber-500" /> জরুরী ব্যাকআপ পিন (PIN)
 </label>
 <input
 type="password"
 maxLength={6}
 value={recoveryPin}
 onChange={(e) => setRecoveryPin(e.target.value.replace(/[^\d]/g, ''))}
 placeholder="৪-৬ ডিজিটের গোপন পিন"
 className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider rounded border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
 />
 <p className="text-[10px] text-slate-800 mt-0.5">প্যাটার্ন ভুলে গেলে এই পিন দিয়ে খোলা যাবে</p>
 </div>

 <div>
 <label className="block text-[11px] font-bold text-slate-700 mb-1">
 অটো লক সময় (Auto Lock)
 </label>
 <select
 value={autoLockMinutes}
 onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
 className="w-full px-3 py-2 text-xs rounded border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
 >
 <option value={0}>প্রতিবার পেজ রিলোড/ওপেন হলে (প্রস্তাবিত)</option>
 <option value={5}>৫ মিনিট নিষ্ক্রিয় থাকলে</option>
 <option value={15}>১৫ মিনিট নিষ্ক্রিয় থাকলে</option>
 <option value={60}>১ ঘণ্টা পর</option>
 </select>
 </div>
 </div>

 {/* Action buttons */}
 <div className="flex items-center justify-between pt-2">
 {step === 'confirm_new' ? (
 <button
 type="button"
 onClick={() => {
 setStep('draw_new');
 setTempNewPattern([]);
 setStatus('idle');
 setFeedback(null);
 }}
 className="px-4 py-2 text-xs font-semibold text-slate-800 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
 >
 <RefreshCw className="w-3.5 h-3.5" /> পুনরায় শুরু
 </button>
 ) : (
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-xs font-semibold text-slate-800 hover:text-slate-700 cursor-pointer"
 >
 বাতিল
 </button>
 )}

 <button
 type="button"
 onClick={handleQuickSaveOtherOptions}
 className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
 >
 <Check className="w-4 h-4" /> সেটিংস সংরক্ষণ করুন
 </button>
 </div>
 </>
 )}
 </div>
 </div>
 );
};
