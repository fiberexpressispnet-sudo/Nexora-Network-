import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
 isOpen: boolean;
 title: string;
 onClose: () => void;
 children: React.ReactNode;
 maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
 isOpen,
 title,
 onClose,
 children,
 maxWidth = 'max-w-xl',
}) => {
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape') onClose();
 };
 if (isOpen) {
 window.addEventListener('keydown', handleKeyDown);
 }
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isOpen, onClose]);

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-slate-50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 transition-opacity duration-300">
 <div
 className={`bg-white/90 backdrop-blur-xl border border-white/40 rounded w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-md p-4 sm:p-6 text-slate-800 transition-all transform scale-100`}
 >
 <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200/80 ">
 <h2 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
 <button
 onClick={onClose}
 className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 flex items-center justify-center transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 <div>{children}</div>
 </div>
 </div>
 );
};
