import React from 'react';
import { ToastMessage } from '../types';
import {
 CheckCircle,
 AlertCircle,
 AlertTriangle,
 Info,
 X,
} from 'lucide-react';

interface ToastProps {
 toasts: ToastMessage[];
 onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
 if (toasts.length === 0) return null;

 return (
 <div className="fixed bottom-5 right-5 z-[3000] flex flex-col gap-2 max-w-[360px] w-full px-4 sm:px-0">
 {toasts.map((toast) => {
 let borderClass = 'border-l-sky-500';
 let IconComponent = Info;
 let iconColor = 'text-sky-500';

 if (toast.type === 'success') {
 borderClass = 'border-l-teal-500';
 IconComponent = CheckCircle;
 iconColor = 'text-teal-500';
 } else if (toast.type === 'error') {
 borderClass = 'border-l-rose-500';
 IconComponent = AlertCircle;
 iconColor = 'text-rose-500';
 } else if (toast.type === 'warning') {
 borderClass = 'border-l-amber-500';
 IconComponent = AlertTriangle;
 iconColor = 'text-amber-500';
 }

 return (
 <div
 key={toast.id}
 className={`p-3 sm:p-4 rounded bg-white/90 backdrop-blur-md border border-white/30 shadow-lg border-l-4 ${borderClass} flex items-center gap-3 text-xs sm:text-sm text-slate-800 animate-slide-in transition-all`}
 >
 <IconComponent className={`w-5 h-5 shrink-0 ${iconColor}`} />
 <span className="flex-1 font-medium">{toast.message}</span>
 <button
 onClick={() => onDismiss(toast.id)}
 className="text-slate-800 hover:text-slate-900 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 );
 })}
 </div>
 );
};
