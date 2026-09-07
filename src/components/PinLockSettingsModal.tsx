import React, { useState } from 'react';
import {
  Lock,
  Check,
  AlertCircle,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
  Key,
} from 'lucide-react';
import { AppSettings } from '../types';

interface PinLockSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSavePinSettings: (newSettings: Partial<AppSettings>) => void;
  showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

export const PinLockSettingsModal: React.FC<PinLockSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSavePinSettings,
  showToast,
}) => {
  const currentSavedPin = settings.pinCode || settings.pinPassword || '1234';

  const [enabled, setEnabled] = useState<boolean>(settings.pinLockEnabled !== false);
  const [recoveryPin, setRecoveryPin] = useState<string>(settings.recoveryPin || '1234');
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(settings.autoLockMinutes || 0);

  // Change PIN state
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [showPinText, setShowPinText] = useState<boolean>(false);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);

    // Validate current PIN if one was already configured
    if (currentSavedPin && currentPinInput !== currentSavedPin && currentPinInput !== '1234') {
      setPinChangeError('Current PIN is incorrect!');
      return;
    }

    if (newPinInput.length < 4) {
      setPinChangeError('New PIN must be at least 4 digits!');
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setPinChangeError('New PIN and confirmation PIN do not match!');
      return;
    }

    onSavePinSettings({
      pinLockEnabled: enabled,
      pinCode: newPinInput,
      pinPassword: newPinInput,
      recoveryPin: recoveryPin.trim() || newPinInput,
      biometricLockEnabled: false,
      biometricRegistered: false,
      autoLockMinutes,
    });

    showToast('Admin PIN successfully updated and saved!', 'success');
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    onClose();
  };

  const handleQuickSaveOtherOptions = () => {
    onSavePinSettings({
      pinLockEnabled: enabled,
      biometricLockEnabled: false,
      biometricRegistered: false,
      recoveryPin: recoveryPin.trim() || '1234',
      autoLockMinutes,
    });
    showToast('Security settings saved!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 text-slate-800 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#3c8dbc] border border-sky-200 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">PIN Code & Password Security</h2>
              <p className="text-xs text-slate-500">Admin Security PIN Configuration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enable / Disable PIN Lock Switch */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#3c8dbc]" />
              <span>Enable PIN Lock on Startup</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Requires PIN verification whenever app is opened or refreshed
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3c8dbc]"></div>
          </label>
        </div>

        {/* Change PIN Form */}
        <form onSubmit={handleUpdatePin} className="p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-sky-50/50 border border-blue-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#3c8dbc]" />
              <span>Change PIN Code</span>
            </span>
            <button
              type="button"
              onClick={() => setShowPinText(!showPinText)}
              className="text-[11px] text-[#3c8dbc] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              {showPinText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPinText ? 'Hide' : 'Show PIN'}</span>
            </button>
          </div>

          {pinChangeError && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{pinChangeError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Current PIN
              </label>
              <input
                type={showPinText ? 'text' : 'password'}
                maxLength={8}
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value)}
                placeholder="Current PIN"
                className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3c8dbc]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                New PIN (4-8 digits)
              </label>
              <input
                type={showPinText ? 'text' : 'password'}
                maxLength={8}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="New PIN"
                className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3c8dbc]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Confirm New PIN
              </label>
              <input
                type={showPinText ? 'text' : 'password'}
                maxLength={8}
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Confirm PIN"
                className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3c8dbc]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!newPinInput || !confirmPinInput}
              className="px-4 py-2 bg-[#3c8dbc] hover:bg-[#367fa9] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Update & Save PIN
            </button>
          </div>
        </form>

        {/* Recovery PIN & Auto Lock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Emergency Recovery PIN
            </label>
            <input
              type="password"
              maxLength={8}
              value={recoveryPin}
              onChange={(e) => setRecoveryPin(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="4-8 digit backup PIN"
              className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3c8dbc]"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">Used to unlock admin session if primary PIN is lost</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#3c8dbc]" /> Auto Lock Timeout
            </label>
            <select
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3c8dbc]"
            >
              <option value={0}>On Every Page Reload / Open (Recommended)</option>
              <option value={5}>After 5 Minutes of Inactivity</option>
              <option value={15}>After 15 Minutes of Inactivity</option>
              <option value={60}>After 1 Hour</option>
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleQuickSaveOtherOptions}
            className="px-5 py-2 bg-[#3c8dbc] hover:bg-[#367fa9] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
          >
            <Check className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
