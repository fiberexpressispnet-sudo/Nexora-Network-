import React, { useState, useEffect, useCallback } from 'react';
import { PatternLockCanvas } from './PatternLockCanvas';
import { Lock, ShieldCheck, KeyRound, AlertCircle, Sparkles, RefreshCw, Fingerprint, ScanFace } from 'lucide-react';
import { AppSettings } from '../types';
import { isBiometricsSupported, verifyDeviceBiometrics, registerDeviceBiometrics } from '../lib/biometrics';

interface PatternLockScreenProps {
 settings: AppSettings;
 onUnlock: () => void;
 onSaveSettings?: (newSettings: AppSettings) => void;
}

export const PatternLockScreen: React.FC<PatternLockScreenProps> = ({
 settings,
 onUnlock,
 onSaveSettings,
}) => {
 const hasConfiguredPattern =
 Array.isArray(settings.patternSequence) && settings.patternSequence.length >= 3;

 const [isInitialSetup, setIsInitialSetup] = useState(!hasConfiguredPattern);
 const [setupStep, setSetupStep] = useState<'draw' | 'confirm'>('draw');
 const [tempSetupPattern, setTempSetupPattern] = useState<number[]>([]);

 const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
 const [errorMessage, setErrorMessage] = useState<string | null>(null);
 const [showPinDialog, setShowPinDialog] = useState(false);
 const [pinInput, setPinInput] = useState('');
 const [pinError, setPinError] = useState<string | null>(null);
 const [failedAttempts, setFailedAttempts] = useState(0);

 // Biometric / Fingerprint State
 const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
 const [isAuthenticatingBiometrics, setIsAuthenticatingBiometrics] = useState<boolean>(false);
 const [activeMode, setActiveMode] = useState<'fingerprint' | 'pattern'>('fingerprint');

 const configuredPattern = settings.patternSequence || [0, 1, 2, 5, 8];
 const recoveryPin = settings.recoveryPin || '1234';
 const biometricEnabled = settings.biometricLockEnabled !== false;

 // Check biometric support on mount
 useEffect(() => {
 let isMounted = true;
 isBiometricsSupported().then((supported) => {
 if (isMounted) {
 setBiometricAvailable(supported);
 // Default to pattern if in iframe or if biometrics is not available
 if (!supported || !biometricEnabled) {
 setActiveMode('pattern');
 }
 }
 });
 return () => {
 isMounted = false;
 };
 }, [biometricEnabled]);

 // Handle native Biometric Fingerprint scan
 const handleTriggerFingerprint = useCallback(async () => {
 if (isAuthenticatingBiometrics) return;
 setErrorMessage(null);
 setIsAuthenticatingBiometrics(true);

 try {
 // If credential is saved, verify against it; otherwise perform platform biometric challenge
 const result = await verifyDeviceBiometrics(settings.biometricCredentialId);
 if (result.success) {
 setStatus('success');
 setErrorMessage(null);
 setTimeout(() => {
 onUnlock();
 }, 400);
 } else {
 setStatus('error');
 setFailedAttempts((prev) => prev + 1);
 setErrorMessage(result.error || 'আঙুলের ছাপ মিলেনি! পুনরায় চেষ্টা করুন');
 if (result.isIframeBlocked) {
 setTimeout(() => {
 setActiveMode('pattern');
 setStatus('idle');
 setErrorMessage(null);
 }, 2500);
 } else {
 setTimeout(() => {
 setStatus('idle');
 setErrorMessage(null);
 }, 2000);
 }
 }
 } catch (e: any) {
 setStatus('error');
 setErrorMessage('প্যাটার্ন বা পিন দিয়ে আনলক করুন');
 setTimeout(() => {
 setStatus('idle');
 setErrorMessage(null);
 }, 2000);
 } finally {
 setIsAuthenticatingBiometrics(false);
 }
 }, [isAuthenticatingBiometrics, settings.biometricCredentialId, onUnlock]);

 // Optional 1-click register biometric if needed
 const handleRegisterBiometrics = async () => {
 setIsAuthenticatingBiometrics(true);
 const res = await registerDeviceBiometrics(settings.appName || 'Nexora network', 'Admin');
 if (res.success && res.credentialId) {
 const updated: AppSettings = {
 ...settings,
 biometricLockEnabled: true,
 biometricRegistered: true,
 biometricCredentialId: res.credentialId,
 };
 if (onSaveSettings) {
 onSaveSettings(updated);
 }
 setStatus('success');
 setErrorMessage(null);
 setTimeout(() => {
 onUnlock();
 }, 500);
 } else {
 setErrorMessage(res.error || 'ফিঙ্গারপ্রিন্ট রেজিস্টার ব্যর্থ হয়েছে');
 setTimeout(() => setErrorMessage(null), 2000);
 }
 setIsAuthenticatingBiometrics(false);
 };

 const handlePatternComplete = (pattern: number[]) => {
 if (isInitialSetup) {
 if (pattern.length < 4) {
 setStatus('error');
 setErrorMessage('কমপক্ষে ৪টি ডট যুক্ত করে প্যাটার্ন তৈরি করুন');
 setTimeout(() => {
 setStatus('idle');
 setErrorMessage(null);
 }, 1400);
 return;
 }

 if (setupStep === 'draw') {
 setTempSetupPattern(pattern);
 setStatus('success');
 setErrorMessage(null);
 setTimeout(() => {
 setStatus('idle');
 setSetupStep('confirm');
 }, 500);
 } else {
 const isMatch =
 pattern.length === tempSetupPattern.length &&
 pattern.every((val, idx) => val === tempSetupPattern[idx]);

 if (isMatch) {
 setStatus('success');
 setErrorMessage(null);
 const updated: AppSettings = {
 ...settings,
 patternLockEnabled: true,
 patternSequence: tempSetupPattern,
 recoveryPin: settings.recoveryPin || '1234',
 };
 if (onSaveSettings) {
 onSaveSettings(updated);
 }
 setTimeout(() => {
 onUnlock();
 }, 500);
 } else {
 setStatus('error');
 setErrorMessage('প্যাটার্ন মিলেনি! পুনরায় ১ম ধাপ থেকে ড্র করুন');
 setTimeout(() => {
 setStatus('idle');
 setErrorMessage(null);
 setSetupStep('draw');
 setTempSetupPattern([]);
 }, 1500);
 }
 }
 return;
 }

 // Normal Pattern Unlock
 if (pattern.length < 3) {
 setStatus('error');
 setErrorMessage('প্যাটার্ন ভুল! আবার চেষ্টা করুন');
 setTimeout(() => {
 setStatus('idle');
 setErrorMessage(null);
 }, 1400);
 return;
 }

 const isMatch =
 pattern.length === configuredPattern.length &&
 pattern.every((val, idx) => val === configuredPattern[idx]);

 if (isMatch) {
 setStatus('success');
 setErrorMessage(null);
 setTimeout(() => {
 onUnlock();
 }, 400);
 } else {
 setStatus('error');
 setFailedAttempts((prev) => prev + 1);
 setErrorMessage('ভুল প্যাটার্ন! পুনরায় চেষ্টা করুন');
 setTimeout(() => {
 setStatus('idle');
 setErrorMessage(null);
 }, 1400);
 }
 };

 const handlePinSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (pinInput.trim() === recoveryPin || (recoveryPin === '' && pinInput.trim() === '1234')) {
 setStatus('success');
 setShowPinDialog(false);
 onUnlock();
 } else {
 setPinError('ভুল রিকভারি পিন! পুনরায় চেষ্টা করুন');
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#ecf0f5] to-white text-slate-800 p-4 select-none overflow-y-auto">
 {/* Background ambient lighting effects */}
 <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
 <div className="absolute bottom-10 right-10 w-72 h-72 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

 <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-4">
 {/* Brand Header */}
 <div className="flex flex-col items-center space-y-2">
 <div className="relative">
 <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 p-0.5 shadow-xl shadow-cyan-500/20 flex items-center justify-center">
 {settings.logo ? (
 <img
 src={settings.logo}
 alt={settings.appName || 'ISP'}
 className="w-full h-full object-contain rounded-2xl p-1.5 bg-white"
 />
 ) : (
 <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center text-[#3c8dbc]">
 <Lock className="w-8 h-8" />
 </div>
 )}
 </div>
 <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-slate-800 shadow flex items-center gap-0.5">
 <ShieldCheck className="w-2.5 h-2.5" />
 <span>SECURED</span>
 </div>
 </div>

 <div>
 <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center justify-center gap-1.5">
 <span>{settings.appName || 'Nexora network'}</span>
 </h1>
 <p className="text-xs text-[#3c8dbc]/80 font-medium">
 {isInitialSetup
 ? 'প্রথমবার অ্যাডমিন প্যাটার্ন তৈরি করুন'
 : 'অ্যাডমিন বায়োমেট্রিক ও নিরাপত্তা লক'}
 </p>
 </div>
 </div>

 {/* Mode Switcher Tabs (Fingerprint vs Pattern) */}
 {!isInitialSetup && biometricAvailable && biometricEnabled && (
 <div className="flex items-center p-1 bg-slate-100 border border-slate-300 rounded-2xl w-full max-w-[260px]">
 <button
 type="button"
 onClick={() => {
 setActiveMode('fingerprint');
 setErrorMessage(null);
 }}
 className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
 activeMode === 'fingerprint'
 ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-800 shadow-md'
 : 'text-slate-800 hover:text-slate-700'
 }`}
 >
 <Fingerprint className="w-4 h-4" />
 <span>ফিঙ্গারপ্রিন্ট</span>
 </button>
 <button
 type="button"
 onClick={() => {
 setActiveMode('pattern');
 setErrorMessage(null);
 }}
 className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
 activeMode === 'pattern'
 ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-800 shadow-md'
 : 'text-slate-800 hover:text-slate-700'
 }`}
 >
 <Lock className="w-3.5 h-3.5" />
 <span>প্যাটার্ন</span>
 </button>
 </div>
 )}

 {/* Dynamic Status / Error banner */}
 <div className="h-7 flex items-center justify-center">
 {errorMessage ? (
 <div className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5">
 <AlertCircle className="w-3.5 h-3.5" />
 <span>{errorMessage}</span>
 </div>
 ) : status === 'success' ? (
 <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5" />
 <span>
 {isInitialSetup
 ? setupStep === 'draw'
 ? 'প্যাটার্ন রেকর্ড হয়েছে! নিশ্চিত করতে পুনরায় ড্র করুন'
 : 'প্যাটার্ন সংরক্ষিত হয়েছে! অ্যাপে প্রবেশ করা হচ্ছে...'
 : 'সঠিক যাচাই! আনলক হচ্ছে...'}
 </span>
 </div>
 ) : (
 <p className="text-xs text-slate-900 font-medium flex items-center gap-1">
 {isInitialSetup ? (
 <span>
 {setupStep === 'draw'
 ? '১ম ধাপ: আপনার পছন্দের নতুন সিকিউরিটি প্যাটার্ন আঁকুন'
 : '২য় ধাপ: প্যাটার্নটি নিশ্চিত করতে পুনরায় আঁকুন'}
 </span>
 ) : activeMode === 'fingerprint' ? (
 <span>ডিভাইসের ফিঙ্গারপ্রিন্ট সেন্সরে আঙুল স্পর্শ করুন</span>
 ) : (
 <span>নিরাপত্তা প্যাটার্নটি ড্র করুন</span>
 )}
 </p>
 )}
 </div>

 {/* Main Unlock Interface: Native Fingerprint scanner OR Pattern Canvas */}
 {activeMode === 'fingerprint' && !isInitialSetup && biometricAvailable && biometricEnabled ? (
 <div className="w-full flex flex-col items-center justify-center p-6 rounded-3xl bg-white border border-slate-300 shadow-xl space-y-6">
 <div className="relative group flex items-center justify-center">
 <button
 type="button"
 onClick={handleTriggerFingerprint}
 disabled={isAuthenticatingBiometrics}
 className="relative w-28 h-28 rounded-3xl bg-slate-50 border-2 border-cyan-500/60 shadow-lg flex flex-col items-center justify-center text-[#3c8dbc] hover:text-[#3c8dbc] hover:border-cyan-400 transition-colors cursor-pointer disabled:opacity-50"
 title="ফিঙ্গারপ্রিন্ট দিয়ে আনলক করুন"
 >
 <Fingerprint
 className="w-14 h-14 text-sky-400"
 />
 <span className="text-[10px] font-black uppercase tracking-wider text-[#3c8dbc] mt-1">
 {isAuthenticatingBiometrics ? 'যাচাই হচ্ছে...' : 'টাচ করুন'}
 </span>
 </button>
 </div>

 <div className="space-y-1.5 text-center">
 <p className="text-xs font-semibold text-slate-700">
 আসল ফিঙ্গারপ্রিন্ট সেন্সর ব্যবহার করুন
 </p>
 <p className="text-[11px] text-slate-800 max-w-xs">
 শুধুমাত্র আপনার ফোনের নিবন্ধিত আসল আঙুলের ছাপ দিলেই অ্যাপ খুলবে। অন্য কারো আঙুলে খুলবে না।
 </p>
 </div>

 <div className="flex flex-col gap-2 w-full pt-1">
 <button
 type="button"
 onClick={handleTriggerFingerprint}
 className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-slate-800 rounded-xl text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
 >
 <Fingerprint className="w-4 h-4" />
 <span>ফিঙ্গারপ্রিন্ট স্ক্যান শুরু করুন</span>
 </button>

 <button
 type="button"
 onClick={handleRegisterBiometrics}
 className="text-[11px] text-[#3c8dbc]/80 hover:text-[#3c8dbc] underline font-medium cursor-pointer"
 >
 নতুন করে এই ফোনের ফিঙ্গারপ্রিন্ট লিঙ্ক/রেজিস্টার করুন
 </button>
 </div>
 </div>
 ) : (
 <PatternLockCanvas
 key={isInitialSetup ? `setup-${setupStep}` : 'unlock-canvas'}
 onComplete={handlePatternComplete}
 status={status}
 size={280}
 showSequenceNumbers={isInitialSetup}
 minPoints={4}
 />
 )}

 {/* Bottom Actions: Fallback PIN & Help */}
 <div className="w-full flex items-center justify-between pt-1 px-2 text-xs">
 {!isInitialSetup ? (
 <button
 type="button"
 onClick={() => {
 setPinError(null);
 setPinInput('');
 setShowPinDialog(true);
 }}
 className="text-[#3c8dbc] hover:text-[#3c8dbc] hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
 >
 <KeyRound className="w-3.5 h-3.5" />
 <span>জরুরী রিকভারি পিন</span>
 </button>
 ) : (
 <button
 type="button"
 onClick={() => {
 setSetupStep('draw');
 setTempSetupPattern([]);
 setStatus('idle');
 setErrorMessage(null);
 }}
 className="text-slate-800 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer"
 >
 <RefreshCw className="w-3.5 h-3.5" />
 <span>পুনরায় আঁকুন</span>
 </button>
 )}

 <div className="text-[11px] text-slate-800">
 {failedAttempts > 0 && !isInitialSetup && (
 <span className="text-rose-400">ভুল চেষ্টা: {failedAttempts} বার</span>
 )}
 </div>
 </div>
 </div>

 {/* Emergency PIN Dialog Modal */}
 {showPinDialog && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-md">
 <div className="bg-white border border-slate-300 rounded-2xl p-6 max-w-xs w-full shadow-2xl text-left space-y-4 animate-in fade-in zoom-in-95 duration-200">
 <div className="flex items-center gap-2 text-[#3c8dbc] font-bold text-sm">
 <KeyRound className="w-4 h-4" />
 <span>জরুরী রিকভারি পিন দিয়ে আনলক</span>
 </div>

 <p className="text-xs text-slate-800">
 আপনার সংরক্ষিত গোপন রিকভারি পিন কোড প্রদান করে অ্যাপ আনলক করুন:
 </p>

 {pinError && (
 <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px]">
 {pinError}
 </div>
 )}

 <form onSubmit={handlePinSubmit} className="space-y-3">
 <input
 type="password"
 autoFocus
 maxLength={8}
 placeholder="গোপন PIN দিন"
 value={pinInput}
 onChange={(e) => setPinInput(e.target.value)}
 className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
 />

 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setShowPinDialog(false)}
 className="flex-1 py-2 text-xs text-slate-800 hover:text-slate-800 bg-slate-50 rounded-xl cursor-pointer"
 >
 বাতিল
 </button>
 <button
 type="submit"
 className="flex-1 py-2 text-xs font-bold text-slate-800 bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow cursor-pointer"
 >
 আনলক করুন
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
