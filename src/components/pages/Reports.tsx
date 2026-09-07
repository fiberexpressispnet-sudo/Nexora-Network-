import React, { useState } from 'react';
import { BarChart2, Download, FileSpreadsheet, TrendingUp, DollarSign, Users, RotateCcw } from 'lucide-react';
import { Client, Package } from '../../types';

interface ReportsProps {
 clients: Client[];
 packages: Package[];
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
 onHardReset?: () => void;
}

export const ReportsPage: React.FC<ReportsProps> = ({ clients, packages, showToast, onHardReset }) => {
 const [dateRange, setDateRange] = useState('month');

 // Compute revenue estimates based on individual client's set price
 const totalMonthlyRevenue = clients.reduce((acc, c) => {
 const pkg = packages.find((p) => p.name === c.package);
 const rawPrice = c.price || '0';
 const clientPrice = parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10);
 if (!isNaN(clientPrice) && clientPrice > 0) {
 return acc + clientPrice;
 }
 const pkgRawPrice = pkg ? pkg.price : '500';
 return acc + (parseInt(String(pkgRawPrice).replace(/[^\d]/g, ''), 10) || 500);
 }, 0);

 const handleExportCSV = () => {
 if (clients.length === 0) {
 showToast('No client data available to export', 'warning');
 return;
 }
 const headers = ['Client ID', 'Name', 'Phone', 'User ID', 'Package', 'Price (BDT)', 'Bandwidth', 'Status', 'Expiry Date'];
 const rows = clients.map((c) => [
 c.id,
 c.name,
 c.phone,
 c.userId,
 c.package,
 c.price || '500',
 c.bandwidth,
 c.status,
 c.expiry,
 ]);
 const csvContent =
 'data:text/csv;charset=utf-8,' +
 [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');

 const encodedUri = encodeURI(csvContent);
 const link = document.createElement('a');
 link.setAttribute('href', encodedUri);
 link.setAttribute('download', `ISP_Client_Report_${new Date().toISOString().slice(0, 10)}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 showToast(`Exported ${clients.length} ISP clients to CSV report!`, 'success');
 };

 const handleExportPDF = () => {
 showToast('Opening printable executive report window...', 'info');
 window.print();
 };

 return (
 <div className="space-y-6">
 {/* Top Controls */}
 <div className="flex justify-between items-center flex-wrap gap-3">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
 <BarChart2 className="w-5 h-5 text-sky-600 " /> Analytics &amp; Reports
 </h3>

 <div className="flex items-center gap-2">
 {onHardReset && (
 <button
 type="button"
 onClick={() => {
 if (window.confirm('Are you sure you want to clear all billing & payment report data? (Hard Reset)')) {
 onHardReset();
 }
 }}
 className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
 title="Clear all billing report data"
 >
 <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
 <span>Hard Reset (Reset Data)</span>
 </button>
 )}

 <select
 value={dateRange}
 onChange={(e) => setDateRange(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="week">This Week</option>
 <option value="month">This Month</option>
 <option value="quarter">This Quarter</option>
 <option value="year">This Year</option>
 </select>

 <button
 onClick={handleExportCSV}
 className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
 </button>

 <button
 onClick={handleExportPDF}
 className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
 >
 <Download className="w-3.5 h-3.5" /> PDF Report
 </button>
 </div>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 shadow-sm space-y-1">
 <div className="text-xs text-slate-800 font-semibold flex items-center gap-1">
 <DollarSign className="w-4 h-4 text-emerald-500" /> Projected Revenue
 </div>
 <div className="text-2xl font-extrabold text-slate-900 ">
 ৳{totalMonthlyRevenue.toLocaleString()}
 </div>
 <span className="text-[11px] text-teal-600 font-semibold flex items-center gap-1">
 <TrendingUp className="w-3 h-3" /> +12.4% vs last month
 </span>
 </div>

 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 shadow-sm space-y-1">
 <div className="text-xs text-slate-800 font-semibold flex items-center gap-1">
 <Users className="w-4 h-4 text-sky-500" /> Active Subscriptions
 </div>
 <div className="text-2xl font-extrabold text-slate-900 ">
 {clients.length} Clients
 </div>
 <span className="text-[11px] text-sky-600 font-semibold">100% database active</span>
 </div>

 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 shadow-sm space-y-1">
 <div className="text-xs text-slate-800 font-semibold flex items-center gap-1">
 <TrendingUp className="w-4 h-4 text-purple-500" /> Avg Revenue Per User (ARPU)
 </div>
 <div className="text-2xl font-extrabold text-slate-900 ">
 ৳
 {clients.length > 0
 ? (totalMonthlyRevenue / clients.length).toFixed(0)
 : 0}
 </div>
 <span className="text-[11px] text-slate-800">Monthly average</span>
 </div>
 </div>

 {/* Graphical Visualizer Cards */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Client Growth Chart Bar Simulation */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-4">
 <h4 className="text-sm font-bold text-slate-900 ">
 Monthly Client Subscriptions Growth
 </h4>
 <div className="h-44 flex items-end gap-3 pt-4 border-b border-slate-200 pb-2">
 {[
 { month: 'Jan', count: 18 },
 { month: 'Feb', count: 24 },
 { month: 'Mar', count: 32 },
 { month: 'Apr', count: 45 },
 { month: 'May', count: 58 },
 { month: 'Jun', count: 72 },
 ].map((m, idx) => (
 <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
 <span className="text-[10px] font-bold text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">
 {m.count}
 </span>
 <div
 className="w-full bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-lg transition-all duration-300 opacity-80 group-hover:opacity-100"
 style={{ height: `${(m.count / 80) * 100}%` }}
 />
 <span className="text-[10px] text-slate-800 font-medium">{m.month}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Package Revenue Distribution */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-4">
 <h4 className="text-sm font-bold text-slate-900 ">
 Package Subscription Distribution
 </h4>
 <div className="space-y-3 pt-2">
 {packages.map((pkg) => {
 const count = clients.filter((c) => c.package === pkg.name).length;
 const percent = clients.length > 0 ? (count / clients.length) * 100 : 20;

 return (
 <div key={pkg.id} className="space-y-1 text-xs">
 <div className="flex justify-between font-semibold">
 <span className="text-slate-800 ">{pkg.name}</span>
 <span className="text-slate-800">
 {count} clients ({percent.toFixed(0)}%)
 </span>
 </div>
 <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-sky-500 to-teal-400 rounded-full"
 style={{ width: `${percent}%` }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 );
};
