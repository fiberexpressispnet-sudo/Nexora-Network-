import React, { useState, useEffect } from 'react';
import { Client } from '../../types';
import {
 X,
 CreditCard,
 DollarSign,
 Calendar,
 User,
 Phone,
 CheckCircle2,
 Receipt,
 Send,
 Printer,
 Sparkles,
 Search,
} from 'lucide-react';

interface BillingModalProps {
 isOpen: boolean;
 onClose: () => void;
 client?: Client | null;
 clients?: Client[];
 onConfirmPayment: (payment: {
 clientId: string;
 clientName: string;
 userId: string;
 amount: number;
 paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank';
 transactionType: 'Broadband Renewal' | 'New Client Activation' | 'Corporate Bill';
 validityMonths: number;
 sendSms: boolean;
 notes?: string;
 }) => void;
 currencySymbol?: string;
}

export const BillingModal: React.FC<BillingModalProps> = ({
 isOpen,
 onClose,
 client,
 clients = [],
 onConfirmPayment,
 currencySymbol = '৳',
}) => {
 const [selectedClient, setSelectedClient] = useState<Client | null>(client || (clients.length > 0 ? clients[0] : null));
 const [searchMember, setSearchMember] = useState('');

 useEffect(() => {
 if (client) {
 setSelectedClient(client);
 } else if (clients.length > 0 && !selectedClient) {
 setSelectedClient(clients[0]);
 }
 }, [client, clients]);

 const defaultPrice = selectedClient ? parseFloat(selectedClient.price || '800') || 800 : 800;
 const [amount, setAmount] = useState<number>(defaultPrice);
 const [validityMonths, setValidityMonths] = useState<number>(1);
 const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank'>('bKash');
 const [transactionType, setTransactionType] = useState<'Broadband Renewal' | 'New Client Activation' | 'Corporate Bill'>('Broadband Renewal');
 const [sendSms, setSendSms] = useState<boolean>(true);
 const [notes, setNotes] = useState<string>('');
 const [isSuccess, setIsSuccess] = useState<boolean>(false);

 useEffect(() => {
 if (selectedClient) {
 const price = parseFloat(selectedClient.price || '800') || 800;
 setAmount(Math.round(price * validityMonths));
 }
 }, [selectedClient, validityMonths]);

 if (!isOpen) return null;

 const currentClient = selectedClient || (clients.length > 0 ? clients[0] : null);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentClient || amount <= 0) return;

 onConfirmPayment({
 clientId: currentClient.id,
 clientName: currentClient.name,
 userId: currentClient.userId,
 amount,
 paymentMethod,
 transactionType,
 validityMonths,
 sendSms,
 notes,
 });

 setIsSuccess(true);
 setTimeout(() => {
 setIsSuccess(false);
 onClose();
 }, 1200);
 };

 const filteredMembers = searchMember
 ? clients.filter(
 (c) =>
 c.name.toLowerCase().includes(searchMember.toLowerCase()) ||
 c.userId.toLowerCase().includes(searchMember.toLowerCase()) ||
 c.phone.includes(searchMember)
 )
 : [];

 return (
 <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-white backdrop-blur-md animate-fade-in">
 <div className="bg-white border border-slate-300 rounded w-full max-w-lg shadow-md overflow-hidden text-slate-800 flex flex-col max-h-[90vh]">
 {/* Modal Header */}
 <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-[#3c8dbc] to-[#367fa9] flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-10 h-10 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
 <Receipt className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
 <span>Collect Subscription Fee</span>
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
 FlowForge Billing
 </span>
 </h3>
 <p className="text-xs text-slate-800">Record payments, extend expiry, and issue instant receipts</p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-1.5 rounded-lg text-slate-800 hover:text-slate-800 hover:bg-white transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {isSuccess ? (
 <div className="p-8 text-center space-y-3 animate-fade-in">
 <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[#00a65a] flex items-center justify-center mx-auto animate-bounce">
 <CheckCircle2 className="w-8 h-8" />
 </div>
 <h4 className="text-lg font-bold text-slate-800">Payment Recorded Successfully!</h4>
 <p className="text-xs text-slate-800">
 Subscriber renewal applied and receipt sent to ledger.
 </p>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
 {/* Member Selection if client wasn't fixed */}
 {!client && clients.length > 0 && (
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-slate-900">Select Member / Subscriber</label>
 <div className="relative">
 <input
 type="text"
 placeholder="Search subscriber ID, name, or phone..."
 value={searchMember}
 onChange={(e) => setSearchMember(e.target.value)}
 className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3c8dbc]"
 />
 {searchMember && filteredMembers.length > 0 && (
 <div className="absolute top-10 left-0 right-0 bg-white border border-slate-300 rounded shadow-md z-20 max-h-40 overflow-y-auto">
 {filteredMembers.map((m) => (
 <div
 key={m.id}
 onClick={() => {
 setSelectedClient(m);
 setSearchMember('');
 }}
 className="p-2 hover:bg-white cursor-pointer text-xs border-b border-slate-200 flex justify-between items-center"
 >
 <div>
 <span className="font-bold text-slate-800">{m.name}</span>
 <span className="text-[10px] text-indigo-400 font-mono ml-2">({m.userId})</span>
 </div>
 <span className="text-[10px] text-slate-800">{currencySymbol}{m.price || '800'}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}

 {/* Subscriber Info Card */}
 {currentClient && (
 <div className="p-3.5 rounded bg-white border border-slate-200 space-y-2">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-2">
 <User className="w-4 h-4 text-indigo-400" />
 <span className="font-bold text-slate-800">{currentClient.name}</span>
 </div>
 <span className="font-mono text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
 ID: {currentClient.userId}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-800 font-mono pt-1 border-t border-slate-200">
 <div>Package: <span className="text-slate-800 font-semibold">{currentClient.package}</span></div>
 <div>Expiry: <span className="text-amber-400 font-semibold">{currentClient.expiry}</span></div>
 </div>
 </div>
 )}

 {/* Validity Duration */}
 <div className="space-y-2">
 <label className="text-xs font-semibold text-slate-900 flex items-center justify-between">
 <span>Validity Duration (মেয়াদ)</span>
 <span className="text-[10px] text-indigo-500 font-bold font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
 +{Math.round(validityMonths * 30) >= 1 ? `${Math.round(validityMonths * 30)} Days` : '24 Hours'}
 </span>
 </label>
 
 <div>
 <div className="text-[10px] text-slate-800 font-bold mb-1 uppercase tracking-wider">Standard (মাসের মেয়াদ)</div>
 <div className="grid grid-cols-4 gap-2">
 {[
 { label: '1 Month', value: 1 },
 { label: '2 Months', value: 2 },
 { label: '3 Months', value: 3 },
 { label: '6 Months', value: 6 },
 ].map((opt) => (
 <button
 key={opt.label}
 type="button"
 onClick={() => setValidityMonths(opt.value)}
 className={`py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
 Math.abs(validityMonths - opt.value) < 0.001
 ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/25'
 : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
 }`}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 <div>
 <div className="text-[10px] text-slate-800 font-bold mb-1 uppercase tracking-wider">Custom / Short (দিনের মেয়াদ)</div>
 <div className="grid grid-cols-3 gap-2">
 {[
 { label: '20 Days', value: 20 / 30 },
 { label: '10 Days', value: 10 / 30 },
 { label: '24 Hours', value: 1 / 30 },
 ].map((opt) => (
 <button
 key={opt.label}
 type="button"
 onClick={() => setValidityMonths(opt.value)}
 className={`py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
 Math.abs(validityMonths - opt.value) < 0.001
 ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-500/25'
 : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
 }`}
 >
 ⚡ {opt.label}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Payment Method */}
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-slate-900">Payment Gateway / Method</label>
 <div className="grid grid-cols-5 gap-1.5">
 {(['bKash', 'Nagad', 'Rocket', 'Cash', 'Bank'] as const).map((method) => (
 <button
 key={method}
 type="button"
 onClick={() => setPaymentMethod(method)}
 className={`py-1.5 px-1 rounded text-[11px] font-bold border transition-all truncate text-center cursor-pointer ${
 paymentMethod === method
 ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
 : 'bg-white border-slate-300 text-slate-900 hover:bg-white'
 }`}
 >
 {method}
 </button>
 ))}
 </div>
 </div>

 {/* Amount Field */}
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-slate-900">Collection Amount ({currencySymbol})</label>
 <div className="relative">
 <input
 type="number"
 min="0"
 value={amount}
 onChange={(e) => setAmount(Number(e.target.value))}
 className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 <span className="absolute right-3 top-2 text-xs font-mono font-bold text-indigo-400">
 {currencySymbol} BDT
 </span>
 </div>
 </div>

 {/* SMS Notification Toggle */}
 <div className="flex items-center justify-between p-3 rounded bg-white border border-slate-200 text-xs">
 <span className="text-slate-900 font-medium">Send SMS &amp; WhatsApp Receipt to Client</span>
 <input
 type="checkbox"
 checked={sendSms}
 onChange={(e) => setSendSms(e.target.checked)}
 className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 focus:ring-0 cursor-pointer"
 />
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 rounded text-xs font-semibold text-slate-800 hover:bg-white hover:text-slate-800 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 rounded bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
 >
 <CheckCircle2 className="w-4 h-4" />
 <span>Confirm &amp; Issue Receipt</span>
 </button>
 </div>
 </form>
 )}
 </div>
 </div>
 );
};
