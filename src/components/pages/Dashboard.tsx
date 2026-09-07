import React, { useState } from 'react';
import {
 Client,
 PaymentRecord,
 HotspotUser,
 HotspotPackageRequest,
 OnlinePackageOrder,
 RouterConfig,
 AppSettings,
 PageId,
} from '../../types';
import { BandwidthMonitor } from '../BandwidthMonitor';
import {
 Users,
 Wifi,
 CreditCard,
 DollarSign,
 TrendingUp,
 MapPin,
 FileSpreadsheet,
 Plus,
 ArrowRight,
 ShieldCheck,
 AlertTriangle,
 RotateCcw,
 Sparkles,
 Zap,
 Activity,
 CheckCircle2,
 Clock,
 Search,
 BookOpen,
 Printer,
 ChevronRight,
 Radio,
 Server,
 Layers,
 Receipt,
 UserCheck,
 UserX,
 Bell,
 ShoppingCart,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { getClientExpiryInfo } from '../../lib/expiryUtils';
import { BillingModal } from '../flowforge/BillingModal';
import { ImportWizard } from '../flowforge/ImportWizard';
import { MemberLedgerModal } from '../flowforge/MemberLedgerModal';
import { TownViewModal } from '../flowforge/TownViewModal';

interface DashboardProps {
 clients: Client[];
 payments: PaymentRecord[];
 hotspotUsers: HotspotUser[];
 hotspotRequests?: HotspotPackageRequest[];
 onlineOrders?: OnlinePackageOrder[];
 routerConfig: RouterConfig;
 settings: AppSettings;
 onConnectRouter: () => void;
 onDisconnectRouter: () => void;
 onNavigate: (page: PageId) => void;
 onApproveRequest?: (id: string, createdUserId?: string) => void;
 onRejectRequest?: (id: string) => void;
 onApproveOnlineOrder?: (orderId: string) => void;
 onHardResetAll?: () => void;
 onCollectPayment?: (payment: any) => void;
 onBulkImportClients?: (clients: Client[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
 clients,
 payments,
 hotspotUsers,
 hotspotRequests = [],
 onlineOrders = [],
 routerConfig,
 settings,
 onConnectRouter,
 onDisconnectRouter,
 onNavigate,
 onApproveRequest,
 onRejectRequest,
 onApproveOnlineOrder,
 onHardResetAll,
 onCollectPayment,
 onBulkImportClients,
}) => {
 // Modals state
 const [selectedClientForBilling, setSelectedClientForBilling] = useState<Client | null>(null);
 const [selectedClientForLedger, setSelectedClientForLedger] = useState<Client | null>(null);
 const [showImportWizard, setShowImportWizard] = useState(false);
 const [showTownView, setShowTownView] = useState(false);

 // Search & Filter state for Fee Register table
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'expiring' | 'expired'>('all');

 // Metrics calculation
 const totalClients = clients.length;
 const onlineClients = clients.filter((c) => c.status === 'online').length;
 const offlineClients = clients.filter((c) => c.status === 'offline' || c.status === 'expired').length;

 const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
 const currentMonthRevenue = payments
 .filter((p) => p.monthKey === currentMonthKey)
 .reduce((sum, p) => sum + p.amount, 0);

 // Expiry statistics
 let expiringSoonCount = 0;
 let expiredCount = 0;
 clients.forEach((c) => {
 const info = getClientExpiryInfo(c.expiry);
 if (info.isExpired) expiredCount++;
 else if (info.isExpiringSoon) expiringSoonCount++;
 });

 const pieData = [
 { name: 'Active (Safe)', value: Math.max(0, totalClients - expiringSoonCount - expiredCount), color: '#10b981' },
 { name: 'Expiring (≤ 3d)', value: expiringSoonCount, color: '#f59e0b' },
 { name: 'Expired', value: expiredCount, color: '#ef4444' },
 ];

 // Filtered subscribers for Fee Register
 const filteredSubscribers = clients.filter((c) => {
 const matchesSearch =
 c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.phone.includes(searchQuery);

 if (!matchesSearch) return false;

 if (statusFilter === 'online') return c.status === 'online';
 if (statusFilter === 'expired') return c.status === 'expired' || c.status === 'offline';
 if (statusFilter === 'expiring') {
 const info = getClientExpiryInfo(c.expiry);
 return info.isExpiringSoon;
 }
 return true;
 });

 const currencySymbol = settings.currency || '৳';

 return (
 <div className="space-y-6 text-slate-900 animate-fade-in">
 {/* 1. Cover Photo Banner */}
      {settings?.banner && (
        <div className="relative rounded-lg overflow-hidden shadow-sm border border-slate-200 h-40 sm:h-56">
          <img src={settings.banner} alt="Cover" className="absolute inset-0 w-full h-full object-cover z-0" />
        </div>
      )}

      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
 <button
 type="button"
 onClick={() => setShowTownView(true)}
 className="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
 >
 <MapPin className="w-4 h-4 text-[#3c8dbc]" />
 <span>Town View</span>
 </button>

 <button
 type="button"
 onClick={() => setShowImportWizard(true)}
 className="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
 >
 <FileSpreadsheet className="w-4 h-4 text-[#00a65a]" />
 <span>Import Data</span>
 </button>

 <button
 type="button"
 onClick={() => onNavigate('clients')}
 className="px-4 py-2 rounded bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 <span>Add Member</span>
 </button>

 {onHardResetAll && (
 <button
 type="button"
 onClick={() => {
 if (window.confirm('Are you sure you want to perform a full system reset?')) {
 onHardResetAll();
 }
 }}
 className="p-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
 title="Full System Reset"
 >
 <RotateCcw className="w-4 h-4" />
 </button>
 )}
 </div>

 {/* Pending Online Package Purchases Alert */}
 {onlineOrders.filter((o) => o.status === 'pending').length > 0 && (
  <div className="bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-emerald-500/15 border-2 border-cyan-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
   <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
     <ShoppingCart className="w-5 h-5 animate-bounce" />
    </div>
    <div>
     <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
      <span>{onlineOrders.filter((o) => o.status === 'pending').length}টি নতুন প্যাকেজ ক্রয় ভেরিফিকেশন রিকোয়েস্ট পেন্ডিং</span>
      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black animate-pulse">
       Action Required
      </span>
     </h4>
     <p className="text-xs text-slate-600 font-medium">
      গ্রাহক পেমেন্ট সম্পন্ন করে TrxID সাবমিট করেছেন। যাচাই করে মাইক্রোটিকে সক্রিয় করুন।
     </p>
    </div>
   </div>
   <button
    type="button"
    onClick={() => onNavigate('notifications')}
    className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
   >
    <span>পেমেন্ট যাচাই ও অনুমোদন করুন</span>
    <ArrowRight className="w-3.5 h-3.5" />
   </button>
  </div>
 )}

      {/* Pending Hotspot Requests Alert if any */}
 {hotspotRequests.filter((r) => r.status === 'pending').length > 0 && (
 <div className="bg-amber-500/10 border border-amber-500/30 rounded p-4 flex items-center justify-between shadow-lg">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#f39c12] shrink-0">
 <Bell className="w-5 h-5" />
 </div>
 <div>
 <h4 className="text-sm font-bold text-amber-200">
 {hotspotRequests.filter((r) => r.status === 'pending').length} Pending Hotspot Voucher Requests
 </h4>
 <p className="text-xs text-slate-900">Subscribers requested renewal online via hotspot captive portal</p>
 </div>
 </div>
 <button
 onClick={() => onNavigate('clients')}
 className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1"
 >
 <span>Review</span>
 <ArrowRight className="w-3.5 h-3.5" />
 </button>
 </div>
 )}

 {/* 2. FlowForge 4-Hero KPI Cards Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Card 1: Total Subscribers */}
 <div
 onClick={() => onNavigate('clients')}
 className="p-5 rounded bg-white border border-slate-200 border-t-[3px] border-t-indigo-500 transition-all shadow-sm hover:shadow-md cursor-pointer relative group overflow-hidden"
 >
 <div className="flex items-center justify-between mb-3">
 <span className="text-xs font-semibold text-slate-900">Total Subscribers</span>
 <div className="w-10 h-10 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[#3c8dbc] group-hover:scale-110 transition-transform">
 <Users className="w-5 h-5" />
 </div>
 </div>
 <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
 {totalClients}
 </div>
 <div className="flex items-center justify-between text-xs text-slate-900 mt-2 font-mono">
 <span className="text-[#00a65a] flex items-center gap-1 font-bold">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
 {onlineClients} Online
 </span>
 <span>{offlineClients} Inactive</span>
 </div>
 </div>

 {/* Card 2: Monthly Fee Revenue */}
 <div
 onClick={() => onNavigate('billing')}
 className="p-5 rounded bg-white border border-slate-200 border-t-[3px] border-t-emerald-500 transition-all shadow-sm hover:shadow-md cursor-pointer relative group overflow-hidden"
 >
 <div className="flex items-center justify-between mb-3">
 <span className="text-xs font-semibold text-slate-900">Monthly Collections</span>
 <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00a65a] group-hover:scale-110 transition-transform">
 <DollarSign className="w-5 h-5" />
 </div>
 </div>
 <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
 {currencySymbol}{currentMonthRevenue.toLocaleString()}
 </div>
 <div className="text-xs text-[#00a65a] font-mono mt-2 font-bold flex items-center gap-1">
 <TrendingUp className="w-3.5 h-3.5" />
 <span>Active Billing Cycle</span>
 </div>
 </div>

 {/* Card 3: MikroTik Core Node */}
 <div
 onClick={() => onNavigate('mikrotik-management')}
 className="p-5 rounded bg-white border border-slate-200 border-t-[3px] border-t-sky-500 transition-all shadow-sm hover:shadow-md cursor-pointer relative group overflow-hidden"
 >
 <div className="flex items-center justify-between mb-3">
 <span className="text-xs font-semibold text-slate-900">MikroTik Telemetry</span>
 <div className="w-10 h-10 rounded bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
 <Server className="w-5 h-5" />
 </div>
 </div>
 <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight flex items-center gap-2">
 <span>{routerConfig.connected ? 'Connected' : 'Ready'}</span>
 <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-normal">
 API
 </span>
 </div>
 <div className="text-xs text-slate-900 font-mono mt-2 flex items-center justify-between">
 <span>IP: {routerConfig.ip || '192.168.88.1'}</span>
 <span className="text-[#00a65a] font-bold">Port {routerConfig.apiPort || 8728}</span>
 </div>
 </div>

 {/* Card 4: Expiring & Risk Alerts */}
 <div
 onClick={() => onNavigate('clients')}
 className="p-5 rounded bg-white border border-slate-200 border-t-[3px] border-t-amber-500 transition-all shadow-sm hover:shadow-md cursor-pointer relative group overflow-hidden"
 >
 <div className="flex items-center justify-between mb-3">
 <span className="text-xs font-semibold text-slate-900">Expiring &amp; Due</span>
 <div className="w-10 h-10 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#f39c12] group-hover:scale-110 transition-transform">
 <AlertTriangle className="w-5 h-5" />
 </div>
 </div>
 <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
 {expiringSoonCount + expiredCount}
 </div>
 <div className="flex items-center justify-between text-xs text-slate-900 mt-2 font-mono">
 <span className="text-[#f39c12] font-bold">{expiringSoonCount} Expiring Soon</span>
 <span className="text-[#dd4b39] font-bold">{expiredCount} Overdue</span>
 </div>
 </div>
 </div>

 {/* 3. FlowForge Fee Register & Member Billing Ledger Section */}
 <div className="rounded bg-white border border-slate-200 border-t-[3px] border-t-[#3c8dbc] p-5 shadow-sm sm:p-6 shadow-md space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
 <div>
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
 <CreditCard className="w-5 h-5 text-[#3c8dbc]" />
 <span>FlowForge Member Fee Register</span>
 </h3>
 <p className="text-xs text-slate-900">
 Instant subscriber fee collections, ledger status, and validity management
 </p>
 </div>

 {/* Search and Filters */}
 <div className="flex flex-wrap items-center gap-2">
 <div className="relative">
 <Search className="w-4 h-4 text-slate-900 absolute left-3 top-2.5" />
 <input
 type="text"
 placeholder="Search member..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div className="flex items-center bg-slate-50 border border-slate-200 rounded p-0.5 text-xs">
 {(['all', 'online', 'expiring', 'expired'] as const).map((filter) => (
 <button
 key={filter}
 type="button"
 onClick={() => setStatusFilter(filter)}
 className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all ${
 statusFilter === filter
 ? 'bg-indigo-600 text-white shadow-xs'
 : 'text-slate-900 hover:text-slate-900'
 }`}
 >
 {filter}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Member Fee Register Table */}
 <div className="overflow-x-auto border border-slate-200/60 rounded-lg">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-100 text-slate-900 uppercase font-mono text-[10px]">
 <tr>
 <th className="p-3">Subscriber</th>
 <th className="p-3">User ID</th>
 <th className="p-3">Package &amp; Speed</th>
 <th className="p-3">Monthly Fee</th>
 <th className="p-3">Validity Expiry</th>
 <th className="p-3">Status</th>
 <th className="p-3 text-right">Ledger Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {filteredSubscribers.slice(0, 8).map((client, idx) => {
 const expiryInfo = getClientExpiryInfo(client.expiry);

 return (
 <tr key={client.id ? `${client.id}-${idx}` : idx} className="hover:bg-white transition-colors">
 <td className="p-3 font-bold text-slate-900">
 <div>{client.name}</div>
 <div className="text-[10px] text-blue-100 font-mono">{client.phone}</div>
 </td>
 <td className="p-3 font-mono text-white font-semibold">{client.userId}</td>
 <td className="p-3 text-slate-900">
 <div className="font-semibold text-slate-900">{client.package}</div>
 <div className="text-[10px] text-blue-100 font-mono">{client.bandwidth}</div>
 </td>
 <td className="p-3 font-mono font-bold text-slate-900">
 {currencySymbol}{client.price || '800'}
 </td>
 <td className="p-3 font-mono">
 <div
 className={`text-xs font-bold ${
 expiryInfo.isExpired
 ? 'text-[#dd4b39]'
 : expiryInfo.isExpiringSoon
 ? 'text-[#f39c12]'
 : 'text-[#00a65a]'
 }`}
 >
 {new Date(client.expiry).toLocaleDateString('en-GB')}
 </div>
 <div className="text-[10px] text-slate-900">
 {expiryInfo.isExpired
 ? 'Expired'
 : `${Math.max(0, expiryInfo.daysLeft)} days left`}
 </div>
 </td>
 <td className="p-3">
 <span
 className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
 client.status === 'online'
 ? 'bg-emerald-500/20 text-emerald-300'
 : 'bg-rose-500/20 text-rose-300'
 }`}
 >
 {client.status}
 </span>
 </td>
 <td className="p-3 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <button
 type="button"
 onClick={() => setSelectedClientForLedger(client)}
 className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-900 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 transition-colors"
 title="View Ledger Statement"
 >
 <BookOpen className="w-3.5 h-3.5 text-[#3c8dbc]" />
 <span>Ledger</span>
 </button>
 <button
 type="button"
 onClick={() => setSelectedClientForBilling(client)}
 className="px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
 >
 <Receipt className="w-3.5 h-3.5" />
 <span>Collect</span>
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {filteredSubscribers.length > 8 && (
 <div className="flex justify-between items-center pt-2 text-xs text-slate-900">
 <span>Showing top 8 of {filteredSubscribers.length} filtered members</span>
 <button
 onClick={() => onNavigate('clients')}
 className="text-[#3c8dbc] hover:text-white font-bold flex items-center gap-1"
 >
 <span>View Full Directory</span>
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 )}
 </div>

 {/* 4. Live Bandwidth Telemetry & Expiry Analytics Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
 {/* Bandwidth Monitor */}
 <div className="lg:col-span-2 rounded bg-white border border-slate-200 border-t-[3px] border-t-[#3c8dbc] p-5 shadow-sm shadow-md">
 <BandwidthMonitor
 clients={clients}
 routerConfig={routerConfig}
 onConnectRouter={onConnectRouter}
 onDisconnectRouter={onDisconnectRouter}
 />
 </div>

 {/* Subscription Health Pie Breakdown */}
 <div className="rounded bg-white border border-slate-200 border-t-[3px] border-t-[#3c8dbc] p-5 shadow-sm shadow-md space-y-4 flex flex-col justify-between">
 <div>
 <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
 <ShieldCheck className="w-4 h-4 text-[#00a65a]" />
 <span>Subscription Health Matrix</span>
 </h3>
 <p className="text-xs text-slate-900">Active vs expiring validity status breakdown</p>
 </div>

 <div className="h-44 relative flex items-center justify-center">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={pieData}
 cx="50%"
 cy="50%"
 innerRadius={45}
 outerRadius={65}
 paddingAngle={5}
 dataKey="value"
 >
 {pieData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <RechartsTooltip />
 </PieChart>
 </ResponsiveContainer>
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
 <span className="text-xl font-black text-slate-900 font-mono">{totalClients}</span>
 <span className="text-[10px] text-blue-100 font-mono">Members</span>
 </div>
 </div>

 <div className="space-y-2 pt-2 border-t border-slate-200 text-xs font-mono">
 {pieData.map((item) => (
 <div key={item.name} className="flex items-center justify-between">
 <span className="flex items-center gap-2 text-slate-900">
 <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
 <span>{item.name}</span>
 </span>
 <span className="font-bold text-slate-900">{item.value}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* FlowForge Modals */}
 <BillingModal
 isOpen={!!selectedClientForBilling}
 onClose={() => setSelectedClientForBilling(null)}
 client={selectedClientForBilling}
 onConfirmPayment={(payment) => {
 if (onCollectPayment) {
 onCollectPayment(payment);
 }
 }}
 currencySymbol={currencySymbol}
 />

 <MemberLedgerModal
 isOpen={!!selectedClientForLedger}
 onClose={() => setSelectedClientForLedger(null)}
 client={selectedClientForLedger}
 payments={payments}
 invoices={[]}
 currencySymbol={currencySymbol}
 />

 <ImportWizard
 isOpen={showImportWizard}
 onClose={() => setShowImportWizard(false)}
 onImportClients={(imported) => {
 if (onBulkImportClients) {
 onBulkImportClients(imported);
 }
 }}
 />

 <TownViewModal
 isOpen={showTownView}
 onClose={() => setShowTownView(false)}
 clients={clients}
 payments={payments}
 onSelectClient={(c) => {
 setSelectedClientForLedger(c);
 setShowTownView(false);
 }}
 currencySymbol={currencySymbol}
 />
 </div>
 );
};
