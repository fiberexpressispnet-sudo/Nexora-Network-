import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

interface ConfirmationModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: () => void;
 title: string;
 message: string;
 confirmText?: string;
 cancelText?: string;
 variant?: 'danger' | 'warning' | 'info' | 'success';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
 isOpen,
 onClose,
 onConfirm,
 title,
 message,
 confirmText = 'Confirm',
 cancelText = 'Cancel',
 variant = 'warning',
}) => {
 if (!isOpen) return null;

 const icons = {
 danger: <AlertTriangle className="w-6 h-6 text-rose-400" />,
 warning: <AlertTriangle className="w-6 h-6 text-amber-400" />,
 info: <Info className="w-6 h-6 text-sky-400" />,
 success: <CheckCircle2 className="w-6 h-6 text-[#00a65a]" />,
 };

 const bgColors = {
 danger: 'bg-rose-500/20 border-rose-500/30 text-rose-400',
 warning: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
 info: 'bg-sky-500/20 border-sky-500/30 text-sky-400',
 success: 'bg-emerald-500/20 border-emerald-500/30 text-[#00a65a]',
 };

 const btnColors = {
 danger: 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25',
 warning: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25',
 info: 'bg-sky-600 hover:bg-sky-500 shadow-sky-500/25',
 success: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25',
 };

 return (
 <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-white backdrop-blur-md animate-fade-in">
 <div className="bg-white border border-slate-300 rounded w-full max-w-md shadow-md overflow-hidden text-slate-800 p-6 space-y-4">
 <div className="flex items-start gap-4">
 <div className={`w-12 h-12 rounded border flex items-center justify-center shrink-0 ${bgColors[variant]}`}>
 {icons[variant]}
 </div>
 <div className="space-y-1">
 <h3 className="text-base font-bold text-slate-800">{title}</h3>
 <p className="text-xs text-slate-900 leading-relaxed">{message}</p>
 </div>
 </div>

 <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 rounded text-xs font-semibold text-slate-800 hover:bg-white hover:text-slate-800 transition-colors"
 >
 {cancelText}
 </button>
 <button
 type="button"
 onClick={() => {
 onConfirm();
 onClose();
 }}
 className={`px-5 py-2 rounded text-xs font-bold text-slate-800 shadow-lg transition-all cursor-pointer ${btnColors[variant]}`}
 >
 {confirmText}
 </button>
 </div>
 </div>
 </div>
 );
};
