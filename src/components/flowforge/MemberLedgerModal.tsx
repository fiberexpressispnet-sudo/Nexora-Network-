import React from 'react';
import { Client, PaymentRecord, Invoice } from '../../types';
import {
 X,
 BookOpen,
 Calendar,
 CreditCard,
 Printer,
 Download,
 CheckCircle2,
 Clock,
 ArrowUpRight,
 Shield,
 Wifi,
 DollarSign,
 User,
 Phone,
 MapPin,
} from 'lucide-react';

interface MemberLedgerModalProps {
 isOpen: boolean;
 onClose: () => void;
 client: Client | null;
 payments: PaymentRecord[];
 invoices: Invoice[];
 onPrintReceipt?: (record: PaymentRecord) => void;
 currencySymbol?: string;
}

export const MemberLedgerModal: React.FC<MemberLedgerModalProps> = ({
 isOpen,
 onClose,
 client,
 payments,
 invoices,
 onPrintReceipt,
 currencySymbol = '৳',
}) => {
 if (!isOpen || !client) return null;

 const clientPayments = payments.filter(
 (p) => p.userId === client.userId || p.clientName.toLowerCase() === client.name.toLowerCase()
 );

 const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);

 return (
 <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-white backdrop-blur-md animate-fade-in">
 <div className="bg-white border border-slate-300 rounded w-full max-w-3xl shadow-md overflow-hidden text-slate-800 relative max-h-[90vh] flex flex-col">
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 flex items-center justify-between shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
 <BookOpen className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-bold text-white flex items-center gap-2">
 <span>Member Account Ledger</span>
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
 {client.userId}
 </span>
 </h3>
 <p className="text-xs text-slate-300">Comprehensive subscription history, fee collections &amp; receipts</p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Scrollable Body */}
 <div className="p-6 overflow-y-auto space-y-5">
 {/* Member Profile Overview Card */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div className="p-4 rounded bg-white border border-slate-200 space-y-1">
 <div className="text-xs text-slate-800">Client Details</div>
 <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
 <User className="w-4 h-4 text-indigo-400" />
 <span>{client.name}</span>
 </div>
 <div className="text-xs text-slate-900 flex items-center gap-1.5">
 <Phone className="w-3.5 h-3.5 text-slate-800" />
 <span>{client.phone}</span>
 </div>
 </div>

 <div className="p-4 rounded bg-white border border-slate-200 space-y-1">
 <div className="text-xs text-slate-800">Subscription Package</div>
 <div className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
 <Wifi className="w-4 h-4" />
 <span>{client.package}</span>
 </div>
 <div className="text-xs text-slate-900 font-mono">
 Speed: {client.bandwidth} • {currencySymbol}{client.price || '800'}/mo
 </div>
 </div>

 <div className="p-4 rounded bg-white border border-slate-200 space-y-1">
 <div className="text-xs text-slate-800">Total Lifetime Paid</div>
 <div className="text-lg font-black text-[#00a65a] font-mono">
 {currencySymbol}{totalPaid.toLocaleString()}
 </div>
 <div className="text-[11px] text-slate-800">
 {clientPayments.length} Completed Transactions
 </div>
 </div>
 </div>

 {/* Ledger Table */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
 Payment &amp; Renewal Transactions
 </h4>
 <span className="text-xs text-indigo-400 font-mono font-bold">
 {clientPayments.length} Records
 </span>
 </div>

 <div className="rounded border border-slate-200 overflow-hidden bg-white">
 {clientPayments.length === 0 ? (
 <div className="p-8 text-center text-slate-800 text-xs">
 No payment records found for this subscriber yet.
 </div>
 ) : (
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-100 text-slate-800 uppercase font-mono text-[10px]">
 <tr>
 <th className="p-3">Date &amp; Time</th>
 <th className="p-3">Transaction Type</th>
 <th className="p-3">Method</th>
 <th className="p-3">Amount</th>
 <th className="p-3">Status</th>
 <th className="p-3 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {clientPayments.map((payment) => (
 <tr key={payment.id} className="hover:bg-white">
 <td className="p-3 text-slate-900 font-mono">
 {new Date(payment.timestamp).toLocaleString('en-GB', {
 dateStyle: 'medium',
 timeStyle: 'short',
 })}
 </td>
 <td className="p-3 font-semibold text-slate-800">
 {payment.transactionType}
 </td>
 <td className="p-3">
 <span className="px-2 py-0.5 rounded-full bg-white text-slate-900 font-mono text-[10px]">
 {payment.paymentMethod}
 </span>
 </td>
 <td className="p-3 font-mono font-bold text-[#00a65a]">
 {currencySymbol}{payment.amount}
 </td>
 <td className="p-3">
 <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00a65a]">
 <CheckCircle2 className="w-3.5 h-3.5" />
 <span>{payment.status}</span>
 </span>
 </td>
 <td className="p-3 text-right">
 {onPrintReceipt && (
 <button
 type="button"
 onClick={() => onPrintReceipt(payment)}
 className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1 ml-auto transition-colors"
 >
 <Printer className="w-3.5 h-3.5" />
 <span>Receipt</span>
 </button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
 <div className="text-xs text-slate-800">
 Account Status: <span className="font-bold text-[#00a65a] uppercase">{client.status}</span>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 rounded bg-white hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
 >
 Close Ledger
 </button>
 </div>
 </div>
 </div>
 );
};
