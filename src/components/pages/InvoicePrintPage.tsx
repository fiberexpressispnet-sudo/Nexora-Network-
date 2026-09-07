import React, { useState } from 'react';
import { Client, AppSettings, PaymentRecord } from '../../types';
import {
 Printer,
 FileText,
 Download,
 Share2,
 CheckCircle2,
 Search,
 ArrowLeft,
 DollarSign,
 Smartphone,
 Phone,
 Mail,
 MapPin,
 Globe,
} from 'lucide-react';

interface InvoicePrintPageProps {
 clients: Client[];
 settings: AppSettings;
 payments: PaymentRecord[];
 showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export const InvoicePrintPage: React.FC<InvoicePrintPageProps> = ({
 clients,
 settings,
 payments,
 showToast,
}) => {
 const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
 const [billingMonth, setBillingMonth] = useState<string>('August 2026');
 const [invoiceNumber, setInvoiceNumber] = useState<string>('INV-2026-0881');

 const client = clients.find((c) => c.id === selectedClientId) || clients[0];

 const monthlyPrice = parseFloat(client?.price || '500') || 500;
 const prevDue = client?.status === 'expired' ? monthlyPrice : 0;
 const totalAmount = monthlyPrice + prevDue;
 const isPaid = client?.status === 'online';

 const handlePrint = () => {
 window.print();
 };

 return (
 <div className="space-y-6">
 {/* Action Bar (Hidden on Print) */}
 <div className="print:hidden bg-slate-50 border border-slate-300 rounded p-5 text-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded shadow-sm">
 <Printer className="w-6 h-6 text-slate-800" />
 </div>
 <div>
 <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
 <span>Official Invoice &amp; Customer Bill Generator</span>
 <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
 Nexora network Printable
 </span>
 </h1>
 <p className="text-xs text-slate-900 mt-0.5">
 Official invoice generation, direct printing, money receipts, and WhatsApp sharing.
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {/* Client Selector */}
 <select
 value={selectedClientId}
 onChange={(e) => setSelectedClientId(e.target.value)}
 className="bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-400"
 >
 {clients.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name} (@{c.userId} - ৳{c.price || 500})
 </option>
 ))}
 </select>

 <button
 onClick={handlePrint}
 className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 font-black text-xs rounded shadow-md transition-all cursor-pointer flex items-center gap-1.5"
 >
 <Printer className="w-4 h-4" />
 <span>Print Invoice (A4 / POS)</span>
 </button>
 </div>
 </div>

 {/* Official Clean Invoice Document (Styled for screen & paper print) */}
 <div className="max-w-3xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded shadow-md border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0">
 {/* Invoice Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-6 gap-4">
 <div className="flex items-center gap-3.5">
 {settings?.logo ? (
 <img src={settings.logo} alt="Logo" className="w-14 h-14 object-contain rounded" />
 ) : (
 <div className="w-14 h-14 bg-white text-slate-800 rounded flex items-center justify-center font-black text-2xl tracking-tighter shadow-md">
 FX
 </div>
 )}
 <div>
 <h2 className="text-2xl font-black tracking-tight text-slate-900">
 {settings?.companyName || 'Nexora network'}
 </h2>
 <p className="text-xs text-slate-900 font-medium">
 High Speed Optical Fiber &amp; Broadband Internet Service Provider
 </p>
 <div className="text-[11px] text-slate-800 flex flex-wrap items-center gap-3 mt-1 font-mono">
 <span>📞 {settings?.phone || '+880 1700-000000'}</span>
 <span>✉️ {settings?.email || 'support@nexoranetwork.net'}</span>
 </div>
 </div>
 </div>

 <div className="text-right sm:text-right">
 <div className="text-2xl font-black uppercase text-slate-900 tracking-wider">INVOICE</div>
 <div className="text-xs font-mono font-bold text-slate-700 mt-1">
 Invoice #: <span className="text-emerald-700">{invoiceNumber}</span>
 </div>
 <div className="text-xs text-slate-800 font-mono">Billing Month: {billingMonth}</div>
 <div className="text-xs text-slate-800 font-mono">Date: {new Date().toLocaleDateString()}</div>
 </div>
 </div>

 {/* Client & Bill Details Grid */}
 <div className="grid grid-cols-2 gap-6 my-6 text-xs">
 <div className="bg-slate-50 p-4 rounded border border-slate-200/80 space-y-1">
 <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800">Billed To (Customer):</div>
 <div className="text-base font-black text-slate-900">{client?.name || 'Customer Name'}</div>
 <div className="font-mono font-bold text-emerald-600">Subscriber ID: {client?.userId}</div>
 <div className="text-slate-900">Phone: {client?.phone}</div>
 <div className="text-slate-900">Address / POP: {client?.router || 'Central Coverage Zone'}</div>
 </div>

 <div className="bg-slate-50 p-4 rounded border border-slate-200/80 space-y-1">
 <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800">Subscription Status:</div>
 <div className="flex items-center justify-between">
 <span className="text-slate-800">Package:</span>
 <span className="font-bold text-slate-900">{client?.package || 'Home Fiber 20M'}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-slate-800">Bandwidth Speed:</span>
 <span className="font-mono font-bold text-slate-900">{client?.downloadSpeed || client?.bandwidth || '20 Mbps'}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-slate-800">Validity Expiry:</span>
 <span className="font-mono font-bold text-slate-900">{client?.expiry || '2026-08-31'}</span>
 </div>
 <div className="flex items-center justify-between pt-1 border-t border-slate-200">
 <span className="text-slate-800">Payment Status:</span>
 <span
 className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
 isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
 }`}
 >
 {isPaid ? 'PAID / ACTIVE' : 'PAYMENT DUE'}
 </span>
 </div>
 </div>
 </div>

 {/* Itemized Line Items Table */}
 <div className="overflow-hidden rounded border border-slate-200 my-6">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-white text-slate-800 font-bold text-[11px] uppercase tracking-wider">
 <th className="p-3.5">SL</th>
 <th className="p-3.5">Description / Service</th>
 <th className="p-3.5">Billing Period</th>
 <th className="p-3.5 text-right">Amount (BDT)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 <tr>
 <td className="p-3.5 font-mono text-slate-800">01</td>
 <td className="p-3.5">
 <div className="font-bold text-slate-900">{client?.package || 'Broadband Internet'}</div>
 <div className="text-[11px] text-slate-800">Dedicated Unlimited Optical Fiber Internet</div>
 </td>
 <td className="p-3.5 font-mono text-slate-900">{billingMonth}</td>
 <td className="p-3.5 text-right font-mono font-bold text-slate-900">৳{monthlyPrice.toLocaleString()}</td>
 </tr>
 {prevDue > 0 && (
 <tr>
 <td className="p-3.5 font-mono text-slate-800">02</td>
 <td className="p-3.5 font-bold text-rose-600">Previous Arrears / Unpaid Due</td>
 <td className="p-3.5 font-mono text-slate-900">Previous Cycle</td>
 <td className="p-3.5 text-right font-mono font-bold text-rose-600">৳{prevDue.toLocaleString()}</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Totals Breakdown */}
 <div className="flex flex-col sm:flex-row justify-between items-start gap-4 my-6">
 <div className="bg-slate-50 p-4 rounded border border-slate-200 max-w-xs text-xs space-y-1">
 <div className="font-bold text-slate-900">Payment Methods:</div>
 <div className="text-slate-900 font-mono text-[11px]">bKash: 01817681233</div>
 <div className="text-slate-900 font-mono text-[11px]">Nagad: 01817681233</div>
 <div className="text-slate-900 font-mono text-[11px]">Bank: City Bank A/C: 110293817201</div>
 </div>

 <div className="w-full sm:w-64 space-y-2 text-xs font-mono">
 <div className="flex justify-between text-slate-900">
 <span>Subtotal:</span>
 <span>৳{monthlyPrice.toLocaleString()}</span>
 </div>
 {prevDue > 0 && (
 <div className="flex justify-between text-rose-600">
 <span>Previous Due:</span>
 <span>+৳{prevDue.toLocaleString()}</span>
 </div>
 )}
 <div className="flex justify-between text-slate-900">
 <span>Discount / Waiver:</span>
 <span>-৳0.00</span>
 </div>
 <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2 font-sans">
 <span>Total Payable:</span>
 <span className="font-mono text-emerald-700">৳{totalAmount.toLocaleString()}</span>
 </div>
 </div>
 </div>

 {/* Signatures & Footer Note */}
 <div className="border-t border-slate-200 pt-8 mt-8 flex items-center justify-between text-xs text-slate-800">
 <div>
 <div className="font-bold text-slate-900">Nexora network Customer Desk</div>
 <div className="text-[11px]">Thank you for choosing Nexora network!</div>
 </div>

 <div className="text-center">
 <div className="w-36 border-b border-slate-400 mb-1" />
 <div className="font-mono text-[10px] uppercase font-bold text-slate-900">Authorized Signature</div>
 </div>
 </div>
 </div>
 </div>
 );
};
