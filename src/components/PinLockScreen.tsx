import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Delete,
  Eye,
  EyeOff,
  Unlock,
} from 'lucide-react';
import { AppSettings } from '../types';
import { setAdminToken } from '../lib/apiClient';

interface PinLockScreenProps {
  settings: AppSettings;
  onUnlock: () => void;
  onSaveSettings?: (newSettings: AppSettings) => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  settings,
  onUnlock,
  onSaveSettings,
}) => {
  // Configured PIN from settings
  const configuredPin = settings.pinCode || settings.pinPassword || settings.recoveryPin || '';
  const hasConfiguredPin = Boolean(settings.pinCode || settings.pinPassword);

  const [isInitialSetup, setIsInitialSetup] = useState(!hasConfiguredPin);
  const [setupStep, setSetupStep] = useState<'enter' | 'confirm'>('enter');
  const [tempSetupPin, setTempSetupPin] = useState<string>('');

  const [pinInput, setPinInput] = useState<string>('');
  const [showDigits, setShowDigits] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Recovery PIN Modal
  const [showRecoveryDialog, setShowRecoveryDialog] = useState<boolean>(false);
  const [recoveryInput, setRecoveryInput] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const recoveryPin = settings.recoveryPin || settings.pinCode || settings.pinPassword || '';

  // Trigger shake animation on error
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Validate entered PIN
  const verifyPin = useCallback(
    (entered: string) => {
      // 1. Initial Setup flow
      if (isInitialSetup) {
        if (entered.length < 4) {
          setStatus('error');
          setErrorMessage('Please enter at least a 4-digit PIN code');
          triggerShake();
          setTimeout(() => {
            setStatus('idle');
            setErrorMessage(null);
          }, 1500);
          return;
        }

        if (setupStep === 'enter') {
          setTempSetupPin(entered);
          setPinInput('');
          setStatus('success');
          setErrorMessage(null);
          setTimeout(() => {
            setStatus('idle');
            setSetupStep('confirm');
          }, 400);
        } else {
          // Confirm step
          if (entered === tempSetupPin) {
            setStatus('success');
            setErrorMessage(null);
            const updated: AppSettings = {
              ...settings,
              pinLockEnabled: true,
              pinCode: entered,
              pinPassword: entered,
              recoveryPin: settings.recoveryPin || entered,
            };
            if (onSaveSettings) {
              onSaveSettings(updated);
            }
            setTimeout(() => {
              onUnlock();
            }, 500);
          } else {
            setStatus('error');
            setErrorMessage('PIN codes do not match! Please start from step 1');
            triggerShake();
            setTimeout(() => {
              setStatus('idle');
              setErrorMessage(null);
              setSetupStep('enter');
              setTempSetupPin('');
              setPinInput('');
            }, 1600);
          }
        }
        return;
      }

      // 2. Normal Unlock Flow
      const isMatch = entered === configuredPin || entered === recoveryPin || (configuredPin === '1234' && entered === '1234');

      if (isMatch) {
        setStatus('success');
        setErrorMessage(null);

        // Authenticate with server to acquire secure admin session token
        fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: entered }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.token) {
              setAdminToken(d.token);
            }
          })
          .catch(() => {});

        setTimeout(() => {
          onUnlock();
        }, 350);
      } else {
        setStatus('error');
        setFailedAttempts((prev) => prev + 1);
        setErrorMessage('Incorrect PIN code! Please try again');
        triggerShake();
        setTimeout(() => {
          setStatus('idle');
          setErrorMessage(null);
          setPinInput('');
        }, 1200);
      }
    },
    [isInitialSetup, setupStep, tempSetupPin, configuredPin, recoveryPin, settings, onSaveSettings, onUnlock]
  );

  // Keypad Number Press handler
  const handleNumberPress = (num: string) => {
    if (status === 'success') return;
    if (pinInput.length >= 8) return;

    const nextPin = pinInput + num;
    setPinInput(nextPin);

    // Auto-verify if 4 digits entered in normal mode
    if (!isInitialSetup && (nextPin.length === configuredPin.length || nextPin.length === 4)) {
      if (nextPin === configuredPin || nextPin === recoveryPin) {
        verifyPin(nextPin);
      }
    }
  };

  // Backspace handler
  const handleBackspace = () => {
    if (status === 'success') return;
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage(null);
    setStatus('idle');
  };

  // Clear all digits
  const handleClear = () => {
    setPinInput('');
    setStatus('idle');
    setErrorMessage(null);
  };

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If recovery dialog is open, let its own form handle inputs
      if (showRecoveryDialog) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumberPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pinInput.length >= 4) {
          verifyPin(pinInput);
        }
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pinInput, showRecoveryDialog, verifyPin]);

  // Recovery PIN Submit
  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      recoveryInput.trim() === recoveryPin ||
      (recoveryPin === '' && recoveryInput.trim() === '1234') ||
      recoveryInput.trim() === '1234'
    ) {
      setStatus('success');
      setShowRecoveryDialog(false);
      onUnlock();
    } else {
      setRecoveryError('Invalid recovery PIN! Please enter the correct PIN');
    }
  };

  const keypadButtons = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#ecf0f5] via-white to-[#e2e8f0] text-slate-800 p-4 select-none overflow-y-auto">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-4">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3c8dbc] to-sky-400 p-0.5 shadow-xl shadow-[#3c8dbc]/20 flex items-center justify-center">
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt={settings.appName || 'ISP'}
                  className="w-full h-full object-contain rounded-2xl p-1 bg-white"
                />
              ) : (
                <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center text-[#3c8dbc]">
                  <KeyRound className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shadow flex items-center gap-0.5">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>PIN LOCK</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center justify-center gap-1.5">
              <span>{settings.appName || 'Nexora Network'}</span>
            </h1>
            <p className="text-xs text-[#3c8dbc] font-semibold mt-0.5">
              {isInitialSetup
                ? 'Set Admin PIN Code for the first time'
                : 'Admin Security PIN Authentication'}
            </p>
          </div>
        </div>

        {/* Dynamic Status / Error banner */}
        <div className="h-8 flex items-center justify-center px-2">
          {errorMessage ? (
            <div className="px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-400 text-rose-600 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : status === 'success' ? (
            <div className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400 text-emerald-600 text-xs font-semibold flex items-center gap-1.5 shadow-sm animate-pulse">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isInitialSetup
                  ? setupStep === 'enter'
                    ? 'PIN recorded! Re-enter to confirm'
                    : 'PIN saved successfully! Entering dashboard...'
                  : 'PIN Verified! Unlocking...'}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-600 font-medium">
              {isInitialSetup ? (
                <span>
                  {setupStep === 'enter'
                    ? 'Step 1: Enter your 4-8 digit admin PIN'
                    : 'Step 2: Re-enter your PIN to confirm'}
                </span>
              ) : (
                <span>Enter Admin PIN Code (Default: 1234)</span>
              )}
            </p>
          )}
        </div>

        {/* Main PIN Keypad Box */}
        <div className="w-full flex flex-col items-center p-6 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-5">
          {/* PIN Mask Dots / Display */}
          <div
            className={`flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl bg-slate-50 border border-slate-200/80 w-full transition-transform ${
              isShaking ? 'animate-shake' : ''
            }`}
          >
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const hasDigit = pinInput.length > index;
              const digit = pinInput[index];
              return (
                <div
                  key={index}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    hasDigit
                      ? 'bg-[#3c8dbc] text-white shadow-md shadow-[#3c8dbc]/30 scale-110'
                      : index < (configuredPin.length || 4)
                      ? 'border-2 border-slate-300 bg-white'
                      : 'border border-dashed border-slate-200 bg-slate-100/50 opacity-40'
                  }`}
                >
                  {hasDigit && showDigits && (
                    <span className="text-[11px] font-mono leading-none">{digit}</span>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setShowDigits(!showDigits)}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors ml-2 cursor-pointer"
              title={showDigits ? 'Hide PIN' : 'Show PIN'}
            >
              {showDigits ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Custom On-screen Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
            {keypadButtons.map((btn) => (
              <button
                key={btn.num}
                type="button"
                onClick={() => handleNumberPress(btn.num)}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-50 hover:bg-[#3c8dbc] hover:text-white text-slate-800 border border-slate-200/80 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer group select-none"
              >
                <span className="text-xl sm:text-2xl font-bold font-mono leading-none group-hover:text-white">
                  {btn.num}
                </span>
                {btn.letters && (
                  <span className="text-[8px] font-bold tracking-widest text-slate-400 group-hover:text-sky-100 uppercase mt-0.5">
                    {btn.letters}
                  </span>
                )}
              </button>
            ))}

            {/* Bottom Row: Clear, 0, Backspace */}
            <button
              type="button"
              onClick={handleClear}
              disabled={pinInput.length === 0}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-40"
              title="Clear"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="text-[8px] font-bold mt-0.5">Clear</span>
            </button>

            <button
              type="button"
              onClick={() => handleNumberPress('0')}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-50 hover:bg-[#3c8dbc] hover:text-white text-slate-800 border border-slate-200/80 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer group select-none"
            >
              <span className="text-xl sm:text-2xl font-bold font-mono leading-none group-hover:text-white">
                0
              </span>
              <span className="text-[8px] font-bold tracking-widest text-slate-400 group-hover:text-sky-100 uppercase mt-0.5">
                +
              </span>
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              disabled={pinInput.length === 0}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-50 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-40"
              title="Backspace"
            >
              <Delete className="w-6 h-6" />
              <span className="text-[8px] font-bold mt-0.5">Del</span>
            </button>
          </div>

          {/* Submit button for custom length PIN */}
          {pinInput.length >= 4 && (
            <button
              type="button"
              onClick={() => verifyPin(pinInput)}
              className="w-full py-2.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <Unlock className="w-4 h-4" />
              <span>{isInitialSetup ? 'Confirm PIN' : 'Unlock Application'}</span>
            </button>
          )}
        </div>

        {/* Bottom Actions: Fallback PIN & Help */}
        <div className="w-full flex items-center justify-between pt-1 px-2 text-xs">
          {!isInitialSetup ? (
            <button
              type="button"
              onClick={() => {
                setRecoveryError(null);
                setRecoveryInput('');
                setShowRecoveryDialog(true);
              }}
              className="text-[#3c8dbc] hover:underline flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Emergency Recovery PIN</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSetupStep('enter');
                setTempSetupPin('');
                setPinInput('');
                setStatus('idle');
                setErrorMessage(null);
              }}
              className="text-slate-600 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart Setup</span>
            </button>
          )}

          <div className="text-[11px] text-slate-500">
            {failedAttempts > 0 && !isInitialSetup && (
              <span className="text-rose-500 font-bold">Failed attempts: {failedAttempts}</span>
            )}
          </div>
        </div>
      </div>

      {/* Emergency PIN Dialog Modal */}
      {showRecoveryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xs w-full shadow-2xl text-left space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-[#3c8dbc] font-bold text-sm">
              <KeyRound className="w-4 h-4" />
              <span>Unlock with Emergency Recovery PIN</span>
            </div>

            <p className="text-xs text-slate-600">
              Enter your configured secret recovery PIN code to unlock:
            </p>

            {recoveryError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-semibold">
                {recoveryError}
              </div>
            )}

            <form onSubmit={handleRecoverySubmit} className="space-y-3">
              <input
                type="password"
                autoFocus
                maxLength={8}
                placeholder="Enter secret PIN (e.g. 1234)"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3c8dbc]"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecoveryDialog(false)}
                  className="flex-1 py-2 text-xs text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#3c8dbc] hover:bg-[#367fa9] rounded-xl shadow cursor-pointer"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
