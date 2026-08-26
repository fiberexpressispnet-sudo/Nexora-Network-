import React, { useState } from 'react';
import { Client, PaymentRecord } from '../../types';
import {
 X,
 MapPin,
 Users,
 Wifi,
 DollarSign,
 TrendingUp,
 Filter,
 CheckCircle2,
 AlertTriangle,
 Layers,
 Search,
} from 'lucide-react';

interface TownViewModalProps {
 isOpen: boolean;
 onClose: () => void;
 clients: Client[];
 payments: PaymentRecord[];
 onSelectClient?: (client: Client) => void;
 currencySymbol?: string;
}

export const TownViewModal: React.FC<TownViewModalProps> = ({
 isOpen,
 onClose,
 clients,
 payments,
 onSelectClient,
 currencySymbol = '৳',
}) => {
 if (!isOpen) return null;

 // Group clients by router / area / town
 const defaultZones = ['Zone A - Central Hub', 'Zone B - North Town', 'Zone C - West Commercial', 'Zone D - South Link'];
 
 // Distribute clients across zones if not explicitly defined
 const zoneMap: Record<string, { clients: Client[]; revenue: number; online: number; offline: number }> = {};

 defaultZones.forEach((z) => {
 zoneMap[z] = { clients: [], revenue: 0, online: 0, offline: 0 };
 });

 clients.forEach((c, idx) => {
 const assignedZone = c.router || defaultZones[idx % defaultZones.length];
 if (!zoneMap[assignedZone]) {
 zoneMap[assignedZone] = { clients: [], revenue: 0, online: 0, offline: 0 };
 }
 zoneMap[assignedZone].clients.push(c);
 const clientPrice = parseFloat(c.price || '800') || 800;
 zoneMap[assignedZone].revenue += clientPrice;
 if (c.status === 'online') {
 zoneMap[assignedZone].online++;
 } else {
 zoneMap[assignedZone].offline++;
 }
 });

 const [selectedZone, setSelectedZone] = useState<string>(Object.keys(zoneMap)[0] || defaultZones[0]);
 const [searchTerm, setSearchTerm] = useState('');

 const activeZoneData = zoneMap[selectedZone] || { clients: [], revenue: 0, online: 0, offline: 0 };
 const filteredClients = activeZoneData.clients.filter(
 (c) =>
 c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 c.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
 c.phone.includes(searchTerm)
 );

 return (
 <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-white backdrop-blur-md animate-fade-in">
 <div className="bg-white border border-slate-300 rounded w-full max-w-4xl shadow-md overflow-hidden text-slate-800 relative max-h-[90vh] flex flex-col">
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 flex items-center justify-between shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
 <MapPin className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
 <span>FlowForge Town &amp; Zone Distribution View</span>
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
 GIS &amp; Pop Node
 </span>
 </h3>
 <p className="text-xs text-slate-800">
 Segmented client health, revenue collections &amp; line status per geographical zone
 </p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-1.5 rounded-lg text-slate-800 hover:text-slate-800 hover:bg-white transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Body */}
 <div className="p-6 overflow-y-auto space-y-6">
 {/* Zone Selector Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
 {Object.entries(zoneMap).map(([zoneName, data]) => {
 const isSelected = selectedZone === zoneName;
 const onlinePct = data.clients.length > 0 ? Math.round((data.online / data.clients.length) * 100) : 0;

 return (
 <div
 key={zoneName}
 onClick={() => setSelectedZone(zoneName)}
 className={`p-4 rounded border transition-all cursor-pointer ${
 isSelected
 ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
 : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-white'
 }`}
 >
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-bold text-slate-800 truncate">{zoneName}</span>
 <span
 className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
 onlinePct >= 80
 ? 'bg-emerald-500/20 text-emerald-300'
 : 'bg-amber-500/20 text-amber-300'
 }`}
 >
 {onlinePct}% Live
 </span>
 </div>

 <div className="text-xl font-bold text-slate-800 font-mono mb-1">
 {data.clients.length} <span className="text-xs font-normal text-slate-800">Subscribers</span>
 </div>

 {/* Mini Progress Bar */}
 <div className="w-full h-1.5 bg-white rounded-full overflow-hidden mb-2">
 <div
 className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
 style={{ width: `${onlinePct}%` }}
 />
 </div>

 <div className="flex items-center justify-between text-[11px] text-slate-800 font-mono">
 <span>{currencySymbol}{data.revenue.toLocaleString()} /mo</span>
 <span className="text-[#00a65a] font-bold">{data.online} Online</span>
 </div>
 </div>
 );
 })}
 </div>

 {/* Detailed Selected Zone View */}
 <div className="space-y-3">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded border border-slate-200">
 <div>
 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
 <MapPin className="w-4 h-4 text-indigo-400" />
 <span>{selectedZone} — Subscriber Directory</span>
 </h4>
 <p className="text-xs text-slate-800">
 Showing {filteredClients.length} clients registered under this distribution point
 </p>
 </div>

 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-800" />
 <input
 type="text"
 placeholder="Search in zone..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full bg-slate-50 border border-slate-300 rounded pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 {/* Client List */}
 <div className="rounded border border-slate-200 overflow-hidden bg-white">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-100 text-slate-800 uppercase font-mono text-[10px]">
 <tr>
 <th className="p-3">Client Name</th>
 <th className="p-3">User ID</th>
 <th className="p-3">Phone</th>
 <th className="p-3">Package / Speed</th>
 <th className="p-3">Monthly Bill</th>
 <th className="p-3">Line Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {filteredClients.length === 0 ? (
 <tr>
 <td colSpan={6} className="p-6 text-center text-slate-800">
 No clients found in this zone.
 </td>
 </tr>
 ) : (
 filteredClients.map((client) => (
 <tr
 key={client.id}
 onClick={() => onSelectClient?.(client)}
 className="hover:bg-white cursor-pointer"
 >
 <td className="p-3 font-bold text-slate-800">{client.name}</td>
 <td className="p-3 font-mono text-indigo-300">{client.userId}</td>
 <td className="p-3 text-slate-900">{client.phone}</td>
 <td className="p-3 text-slate-900">
 {client.package} ({client.bandwidth})
 </td>
 <td className="p-3 font-mono font-bold text-slate-800">
 {currencySymbol}{client.price || '800'}
 </td>
 <td className="p-3">
 <span
 className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
 client.status === 'online'
 ? 'bg-emerald-500/20 text-emerald-300'
 : 'bg-rose-500/20 text-rose-300'
 }`}
 >
 {client.status}
 </span>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
 <div className="text-xs text-slate-800">
 Total {clients.length} network subscribers mapped across all areas.
 </div>
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 rounded bg-white hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
 >
 Close View
 </button>
 </div>
 </div>
 </div>
 );
};
