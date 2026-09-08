import React, { useState, useMemo } from 'react';
import { Client, AppSettings, PageId, BroadbandRenewalRequest, Package } from '../../types';
import {
 Calendar,
 Clock,
 AlertTriangle,
 CheckCircle2,
 XCircle,
 RefreshCw,
 Search,
 Filter,
 DollarSign,
 Send,
 UserCheck,
 ShieldAlert,
 ArrowRight,
 Sparkles,
 Phone,
 Wifi,
} from 'lucide-react';

interface SubscriptionsPageProps {
 clients: Client[];
 packages: Package[];
 settings: AppSettings;
 onRenewClient: (clientId: string, months: number, amount: number, paymentMethod: string) => void;
 onSendSmsReminder: (client: Client) => void;
 onToggleStatus: (clientId: string) => void;
 onNavigate: (page: PageId) => void;
 showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
 renewalRequests?: BroadbandRenewalRequest[];
 onApproveRenewalRequest?: (reqId: string, customMessage?: string) => void;
 onRejectRenewalRequest?: (reqId: string) => void;
}

export const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({
 clients,
 packages,
 settings,
 onRenewClient,
 onSendSmsReminder,
 onToggleStatus,
 onNavigate,
 showToast,
 renewalRequests = [],
 onApproveRenewalRequest,
 onRejectRenewalRequest,
}) => {
 const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'soon' | 'expired' | 'renewed' | 'all'>('today');
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedClientForRenew, setSelectedClientForRenew] = useState<Client | null>(null);
 const [renewMonths, setRenewMonths] = useState<number>(1);
 const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Cash' | 'Nagad' | 'Bank'>('bKash');
 
 const [selectedRequestForApprove, setSelectedRequestForApprove] = useState<BroadbandRenewalRequest | null>(null);
 const [customSmsText, setCustomSmsText] = useState('');
 const [shouldSendSms, setShouldSendSms] = useState(true);

 const getCalculatedNewExpiry = (client: Client, requestedPackage: string) => {
 const selectedPkg = packages.find((p) => p.name === requestedPackage);
 let validityDays = 30;
 if (selectedPkg && selectedPkg.validity) {
 const daysMatch = selectedPkg.validity.match(/\d+/);
 if (daysMatch) validityDays = parseInt(daysMatch[0], 10);
 }

 const currentExp = new Date(client.expiry).getTime();
 const now = Date.now();
 const baseDate = isNaN(currentExp) || currentExp < now ? now : currentExp;
 return new Date(baseDate + (validityDays * 86400000)).toISOString().split('T')[0];
 };

 React.useEffect(() => {
 if (selectedRequestForApprove) {
 const client = clients.find(c => c.id === selectedRequestForApprove.clientId || c.userId === selectedRequestForApprove.userId);
 if (client) {
 const calculatedExpiry = getCalculatedNewExpiry(client, selectedRequestForApprove.requestedPackage);
 setCustomSmsText(`Dear ${client.name}, your account is successfully renewed with ${selectedRequestForApprove.requestedPackage}. Valid till ${calculatedExpiry}. TrxID: ${selectedRequestForApprove.transactionId || 'N/A'}. Nexora network.`);
 }
 }
 }, [selectedRequestForApprove, clients]);

 const today = new Date();
 today.setHours(0, 0, 0, 0);

 const tomorrow = new Date(today);
 tomorrow.setDate(tomorrow.getDate() + 1);

 const in7Days = new Date(today);
 in7Days.setDate(in7Days.getDate() + 7);

 // Group clients by expiry timeline
 const categorized = useMemo(() => {
 const todayList: Client[] = [];
 const tomorrowList: Client[] = [];
 const soonList: Client[] = [];
 const expiredList: Client[] = [];
 const renewedList: Client[] = [];

 clients.forEach((client) => {
 if (!client.expiry) return;
 const expDate = new Date(client.expiry);
 expDate.setHours(0, 0, 0, 0);

 const diffTime = expDate.getTime() - today.getTime();
 const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

 if (diffDays < 0 || client.status === 'expired') {
 expiredList.push(client);
 } else if (diffDays === 0) {
 todayList.push(client);
 } else if (diffDays === 1) {
 tomorrowList.push(client);
 } else if (diffDays > 1 && diffDays <= 7) {
 soonList.push(client);
 } else {
 renewedList.push(client);
 }
 });

 return {
 today: todayList,
 tomorrow: tomorrowList,
 soon: soonList,
 expired: expiredList,
 renewed: renewedList,
 all: clients,
 };
 }, [clients]);

 const currentList = categorized[activeTab] || [];

 const filteredList = currentList.filter(
 (c) =>
 c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 c.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
 c.phone.includes(searchTerm) ||
 (c.package && c.package.toLowerCase().includes(searchTerm.toLowerCase()))
 );

 const handleRenewSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedClientForRenew) return;

 const monthlyPrice = parseFloat(selectedClientForRenew.price || '500') || 500;
 const totalAmount = Math.round(monthlyPrice * renewMonths);
 const daysAdded = Math.round(renewMonths * 30);
 const durationText = daysAdded >= 1 ? `${daysAdded} Days` : '24 Hours';

 onRenewClient(selectedClientForRenew.id, renewMonths, totalAmount, paymentMethod);
 showToast(
 `Package renewal completed! ${selectedClientForRenew.name} validity extended by ${durationText}.`,
 'success'
 );
 setSelectedClientForRenew(null);
 };

 return (
 <div className="space-y-6">
 {/* Header Banner */}
 <div className="bg-slate-50 border border-slate-300 rounded p-5 text-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded">
 <Calendar className="w-5 h-5 text-slate-800" />
 </div>
 <div>
 <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
 <span>Subscription &amp; Package Renewal Center</span>
 <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
 Automated Billing
 </span>
 </h1>
 <p className="text-xs text-slate-900 mt-0.5">
 Real-time subscriber expiry tracking, SMS reminders, and instant auto-renewal hub.
 </p>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={() => {
 categorized.today.concat(categorized.tomorrow).forEach((c) => onSendSmsReminder(c));
 showToast('SMS reminder sent to all expired subscribers with 1 click!', 'success');
 }}
 className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded shadow-md transition-all cursor-pointer flex items-center gap-1.5"
 >
 <Send className="w-4 h-4" />
 <span>Send Bulk Expiry SMS ({categorized.today.length + categorized.tomorrow.length})</span>
 </button>
 </div>
 </div>

 {/* Online Renewal Requests Panel */}
 {renewalRequests && renewalRequests.length > 0 && (
 <div className="bg-slate-50 border border-slate-200 rounded p-4 shadow-sm space-y-4">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <div className="flex items-center gap-2">
 <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
 <h2 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
 <span>Online Renewal Requests</span>
 <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/30">
 {renewalRequests.filter(r => r.status === 'pending').length} Pending
 </span>
 </h2>
 </div>
 <span className="text-[11px] text-slate-800 font-medium">Clients renewing from portal</span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {renewalRequests.filter(r => r.status === 'pending').length === 0 ? (
 <div className="col-span-full py-6 text-center text-xs text-slate-800">
 No pending online renewal requests.
 </div>
 ) : (
 renewalRequests.filter(r => r.status === 'pending').map((req) => (
 <div key={req.id} className="bg-white border border-slate-200 rounded p-4 space-y-3 shadow-xs relative overflow-hidden">
 <div className="flex justify-between items-start">
 <div>
 <div className="font-extrabold text-slate-900 text-xs">{req.clientName}</div>
 <div className="text-[10px] text-amber-500 font-mono">User ID: {req.userId}</div>
 </div>
 <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 text-[10px] font-black rounded-lg">
 PENDING
 </span>
 </div>

 <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] space-y-1">
 <div className="flex justify-between">
 <span className="text-slate-800">Requesting:</span>
 <span className="font-black text-sky-400">{req.requestedPackage}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">Monthly Price:</span>
 <span className="font-bold text-emerald-500">৳{req.price}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">Pay Via:</span>
 <span className="font-bold text-slate-900 ">{req.paymentMethod}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">TrxID:</span>
 <span className="font-mono font-bold text-amber-500">{req.transactionId || 'N/A'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">Time:</span>
 <span className="text-slate-800">{req.requestedAt}</span>
 </div>
 </div>

 <div className="flex gap-2">
 <button
 onClick={() => onRejectRenewalRequest?.(req.id)}
 className="w-1/3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[11px] rounded-lg border border-rose-500/20 transition-all cursor-pointer text-center"
 >
 Reject
 </button>
 <button
 onClick={() => setSelectedRequestForApprove(req)}
 className="w-2/3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
 >
 <CheckCircle2 className="w-3.5 h-3.5" />
 <span>Approve &amp; Activate</span>
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {/* Expiry Category Stat Cards */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 {[
 { id: 'today', label: 'Expiring Today', count: categorized.today.length, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
 { id: 'tomorrow', label: 'Expiring Tomorrow', count: categorized.tomorrow.length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
 { id: 'soon', label: 'Expiring in 7 Days', count: categorized.soon.length, icon: Calendar, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
 { id: 'expired', label: 'Already Expired', count: categorized.expired.length, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
 { id: 'renewed', label: 'Active & Renewed', count: categorized.renewed.length, icon: CheckCircle2, color: 'text-[#00a65a]', bg: 'bg-emerald-500/10 border-emerald-500/30' },
 ].map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as any)}
 className={`p-4 rounded border text-left transition-all cursor-pointer ${
 isActive
 ? `${tab.bg} ring-2 ring-amber-400 shadow-md`
 : 'bg-white border-slate-200 hover:border-slate-400'
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-800 ">{tab.label}</span>
 <Icon className={`w-4 h-4 ${tab.color}`} />
 </div>
 <div className={`text-2xl font-black mt-2 ${tab.color}`}>{tab.count}</div>
 <div className="text-[11px] text-slate-800 mt-0.5">Click to view list</div>
 </button>
 );
 })}
 </div>

 {/* Filter and Search Bar */}
 <div className="bg-white border border-slate-200 rounded p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
 <div className="relative w-full sm:max-w-md">
 <Search className="w-4 h-4 text-slate-800 absolute left-3 top-3" />
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Search by client name, user ID, phone, package..."
 className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
 />
 </div>

 <div className="text-xs font-bold text-slate-800 font-mono">
 Showing <span className="text-amber-500 font-black">{filteredList.length}</span> clients in this view
 </div>
 </div>

 {/* Subscriptions Table */}
 <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
 <th className="p-3.5">Client &amp; ID</th>
 <th className="p-3.5">Phone &amp; Router</th>
 <th className="p-3.5">Package &amp; Speed</th>
 <th className="p-3.5">Monthly Fee</th>
 <th className="p-3.5">Expiry Date</th>
 <th className="p-3.5">Status</th>
 <th className="p-3.5 text-right">Instant Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredList.length === 0 ? (
 <tr>
 <td colSpan={7} className="p-8 text-center text-slate-800">
 No clients found.
 </td>
 </tr>
 ) : (
 filteredList.map((client) => {
 const expDate = new Date(client.expiry);
 const isExp = expDate.getTime() < Date.now();
 return (
 <tr key={client.id} className="hover:bg-slate-50 transition-colors">
 <td className="p-3.5">
 <div className="font-bold text-slate-900 ">{client.name}</div>
 <div className="text-[11px] text-amber-500 font-mono">ID: {client.userId}</div>
 </td>
 <td className="p-3.5">
 <div className="font-mono text-slate-700 ">{client.phone}</div>
 <div className="text-[10px] text-slate-800">{client.router || 'Core Router'}</div>
 </td>
 <td className="p-3.5">
 <div className="font-bold text-sky-500">{client.package}</div>
 <div className="text-[10px] text-slate-800 font-mono">
 ↓ {client.downloadSpeed || client.bandwidth} | ↑ {client.uploadSpeed || '5 Mbps'}
 </div>
 </td>
 <td className="p-3.5 font-bold font-mono text-emerald-500">
 ৳{client.price || '500'}
 </td>
 <td className="p-3.5">
 <div className={`font-mono font-bold ${isExp ? 'text-rose-500' : 'text-slate-800 '}`}>
 {client.expiry}
 </div>
 <div className="text-[10px] text-slate-800">
 {isExp ? 'Expired' : `${Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left`}
 </div>
 </td>
 <td className="p-3.5">
 <span
 className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
 client.status === 'online'
 ? 'bg-emerald-500/20 text-[#00a65a] border border-emerald-500/30'
 : client.status === 'expired'
 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
 : 'bg-slate-500/20 text-slate-800'
 }`}
 >
 {client.status.toUpperCase()}
 </span>
 </td>
 <td className="p-3.5 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <button
 onClick={() => onSendSmsReminder(client)}
 className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30 transition-colors cursor-pointer"
 title="Send Expiry Reminder SMS"
 >
 <Send className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => setSelectedClientForRenew(client)}
 className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
 >
 <RefreshCw className="w-3.5 h-3.5" />
 <span>Renew</span>
 </button>
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Renew Modal */}
 {selectedClientForRenew && (
 <div className="fixed inset-0 z-[150] bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded p-6 max-w-md w-full shadow-md text-slate-900 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
 <RefreshCw className="w-5 h-5" />
 </div>
 <div>
 <h3 className="font-extrabold text-base">Renew Subscription</h3>
 <p className="text-xs text-slate-800">Extend validity and auto-activate</p>
 </div>
 </div>
 <button
 onClick={() => setSelectedClientForRenew(null)}
 className="text-slate-800 hover:text-slate-800 cursor-pointer"
 >
 ✕
 </button>
 </div>

 <div className="bg-slate-50 p-3.5 rounded text-xs space-y-1.5 border border-slate-200 ">
 <div className="flex justify-between">
 <span className="text-slate-800">Client:</span>
 <span className="font-bold">{selectedClientForRenew.name} ({selectedClientForRenew.userId})</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">Current Package:</span>
 <span className="font-bold text-sky-400">{selectedClientForRenew.package}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">Current Expiry:</span>
 <span className="font-bold text-rose-400">{selectedClientForRenew.expiry}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">Monthly Price:</span>
 <span className="font-bold text-[#00a65a]">৳{selectedClientForRenew.price || '500'}</span>
 </div>
 </div>

 <form onSubmit={handleRenewSubmit} className="space-y-4 text-xs">
 <div>
 <label className="block font-bold text-slate-800 mb-1">Select Duration (মেয়াদ)</label>
 <div className="space-y-2">
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
 onClick={() => setRenewMonths(opt.value)}
 className={`py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
 Math.abs(renewMonths - opt.value) < 0.001
 ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
 : 'bg-slate-100 text-slate-700 border-slate-300'
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
 onClick={() => setRenewMonths(opt.value)}
 className={`py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
 Math.abs(renewMonths - opt.value) < 0.001
 ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
 : 'bg-slate-100 text-slate-700 border-slate-300'
 }`}
 >
 ⚡ {opt.label}
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">Payment Method</label>
 <div className="grid grid-cols-4 gap-2">
 {(['bKash', 'Nagad', 'Cash', 'Bank'] as const).map((method) => {
 const logoUrl = settings.paymentLogos?.[method.toLowerCase() as keyof typeof settings.paymentLogos];
 return (
 <button
 key={method}
 type="button"
 onClick={() => setPaymentMethod(method)}
 className={`p-2 flex flex-col items-center justify-center gap-2 rounded-lg font-bold border transition-all cursor-pointer min-h-[60px] ${
 paymentMethod === method
 ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
 : 'bg-slate-100 text-slate-700 border-slate-300 hover:border-sky-400 hover:shadow-sm'
 }`}
 >
 {logoUrl && (
 <div className="h-7 w-full flex items-center justify-center">
 <img src={logoUrl} alt={method} className="h-full max-w-full object-contain" />
 </div>
 )}
 <span className="text-[10px] sm:text-xs">{method}</span>
 </button>
 );
 })}
 </div>
 </div>

 <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 flex items-center justify-between">
 <div>
 <div className="text-[10px] text-amber-300 uppercase font-bold">Total Collection Amount</div>
 <div className="text-lg font-black text-amber-400">
 ৳{Math.round((parseFloat(selectedClientForRenew.price || '500') || 500) * renewMonths)}
 </div>
 </div>
 <div className="text-right text-[11px] text-slate-900">
 <div>Auto Extend +{Math.round(renewMonths * 30) >= 1 ? `${Math.round(renewMonths * 30)} Days` : '24 Hours'}</div>
 <div className="text-[#00a65a] font-bold">MikroTik Auto Unblock</div>
 </div>
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => setSelectedClientForRenew(null)}
 className="w-1/3 py-2 bg-slate-200 text-slate-700 font-bold rounded cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="w-2/3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black rounded shadow-md cursor-pointer flex items-center justify-center gap-1.5"
 >
 <CheckCircle2 className="w-4 h-4" />
 <span>Confirm Payment &amp; Renew</span>
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Online Renewal Approval Modal with SMS prefills */}
 {selectedRequestForApprove && (() => {
 const client = clients.find(c => c.id === selectedRequestForApprove.clientId || c.userId === selectedRequestForApprove.userId);
 const calculatedNewExpiry = client ? getCalculatedNewExpiry(client, selectedRequestForApprove.requestedPackage) : '';

 return (
 <div className="fixed inset-0 z-[150] bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded p-6 max-w-md w-full shadow-md text-slate-900 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg font-bold">
 <CheckCircle2 className="w-5 h-5" />
 </div>
 <div>
 <h3 className="font-extrabold text-base">Approve Online Renewal</h3>
 <p className="text-xs text-slate-800">Verify details and send confirmation SMS</p>
 </div>
 </div>
 <button
 onClick={() => setSelectedRequestForApprove(null)}
 className="text-slate-800 hover:text-slate-800 cursor-pointer"
 >
 ✕
 </button>
 </div>

 <div className="bg-slate-50 p-3.5 rounded text-xs space-y-1.5 border border-slate-200 font-mono">
 <div className="flex justify-between">
 <span className="text-slate-800">Client:</span>
 <span className="font-bold text-slate-800 ">{selectedRequestForApprove.clientName}</span>
 </div>
 <div className="flex justify-between font-bold">
 <span className="text-slate-800">UserID:</span>
 <span className="text-amber-500">{selectedRequestForApprove.userId}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">Phone:</span>
 <span className="font-bold">{selectedRequestForApprove.phone}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">Current Package:</span>
 <span className="font-bold text-slate-800">{selectedRequestForApprove.currentPackage || 'None'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">Requested Package:</span>
 <span className="font-bold text-sky-400">{selectedRequestForApprove.requestedPackage}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">Monthly Price:</span>
 <span className="font-bold text-[#00a65a]">৳{selectedRequestForApprove.price}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800 font-bold">New Calculated Expiry:</span>
 <span className="font-bold text-[#00a65a]">{calculatedNewExpiry}</span>
 </div>
 <div className="flex justify-between font-bold">
 <span className="text-slate-800">Payment Method:</span>
 <span className="text-slate-800 ">{selectedRequestForApprove.paymentMethod}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800">TrxID:</span>
 <span className="font-bold text-amber-500">{selectedRequestForApprove.transactionId || 'N/A'}</span>
 </div>
 </div>

 {/* SMS prefill form */}
 <div className="space-y-2 text-xs font-bold">
 <div className="flex items-center justify-between">
 <label className="text-slate-800">SMS Confirmation</label>
 <label className="inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={shouldSendSms}
 onChange={(e) => setShouldSendSms(e.target.checked)}
 className="sr-only peer"
 />
 <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
 <span className="ms-2 text-xs font-bold text-slate-800">
 {shouldSendSms ? 'Send SMS' : 'Skip SMS'}
 </span>
 </label>
 </div>

 {shouldSendSms && (
 <div>
 <textarea
 value={customSmsText}
 onChange={(e) => setCustomSmsText(e.target.value)}
 rows={3}
 className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
 placeholder="Enter custom SMS confirmation message..."
 />
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 * SMS will be logged to sent history log and simulation system.
 </p>
 </div>
 )}
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => setSelectedRequestForApprove(null)}
 className="w-1/3 py-2 bg-slate-200 text-slate-700 font-bold rounded cursor-pointer"
 >
 Cancel
 </button>
 <button
 onClick={() => {
 if (onApproveRenewalRequest) {
 onApproveRenewalRequest(
 selectedRequestForApprove.id,
 shouldSendSms ? customSmsText : 'No SMS'
 );
 }
 setSelectedRequestForApprove(null);
 }}
 className="w-2/3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-extrabold rounded shadow-md cursor-pointer flex items-center justify-center gap-1.5"
 >
 <CheckCircle2 className="w-4 h-4" />
 <span>Approve &amp; Activate Client</span>
 </button>
 </div>
 </div>
 </div>
 );
 })()}
 </div>
 );
};
