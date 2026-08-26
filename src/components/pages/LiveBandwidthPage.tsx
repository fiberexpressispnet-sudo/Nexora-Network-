import React, { useState, useEffect } from 'react';
import { Client, RouterConfig } from '../../types';
import {
 Activity,
 ArrowDownCircle,
 ArrowUpCircle,
 Gauge,
 Wifi,
 Server,
 Zap,
 Clock,
 Radio,
 Sliders,
 RefreshCw,
 Search,
 Filter,
 CheckCircle2,
 XCircle,
 TrendingUp,
} from 'lucide-react';
import {
 AreaChart,
 Area,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 Legend,
} from 'recharts';

interface LiveBandwidthPageProps {
 clients: Client[];
 routerConfig: RouterConfig;
 showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export const LiveBandwidthPage: React.FC<LiveBandwidthPageProps> = ({
 clients,
 routerConfig,
 showToast,
}) => {
 const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('1h');
 const [selectedInterface, setSelectedInterface] = useState<string>('ether1-WAN');
 const [clientSearch, setClientSearch] = useState<string>('');

 // Live traffic stream states
 const [trafficData, setTrafficData] = useState<{ time: string; download: number; upload: number }[]>([]);
 const [currentMetrics, setCurrentMetrics] = useState({
 download: 342.5,
 upload: 128.4,
 peakDownload: 580.0,
 peakUpload: 240.0,
 latency: 2.1,
 packetLoss: 0.0,
 });

 // Generate initial historic dataset based on time range
 useEffect(() => {
 const pointsCount = timeRange === '1h' ? 20 : timeRange === '6h' ? 24 : timeRange === '24h' ? 24 : 30;
 const baseDown = timeRange === '30d' ? 380 : 320;
 const baseUp = timeRange === '30d' ? 140 : 110;

 const initial = Array.from({ length: pointsCount }).map((_, i) => {
 const label =
 timeRange === '1h'
 ? `${i * 3}m`
 : timeRange === '6h'
 ? `${i * 15}m`
 : timeRange === '24h'
 ? `${i}:00`
 : timeRange === '7d'
 ? `Day ${i + 1}`
 : `Aug ${i + 1}`;

 const variance = Math.sin(i / 2) * 80 + (Math.random() * 40 - 20);
 const varianceUp = Math.cos(i / 2) * 35 + (Math.random() * 20 - 10);

 return {
 time: label,
 download: Math.max(20, Math.round(baseDown + variance)),
 upload: Math.max(10, Math.round(baseUp + varianceUp)),
 };
 });

 setTrafficData(initial);
 }, [timeRange]);

 // Live streaming interval for '1h'
 useEffect(() => {
 const interval = setInterval(() => {
 const now = new Date();
 const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
 const down = Math.round(300 + Math.random() * 90);
 const up = Math.round(110 + Math.random() * 45);

 setCurrentMetrics((prev) => ({
 download: down,
 upload: up,
 peakDownload: Math.max(prev.peakDownload, down),
 peakUpload: Math.max(prev.peakUpload, up),
 latency: +(1.8 + Math.random() * 0.8).toFixed(1),
 packetLoss: 0.0,
 }));

 if (timeRange === '1h') {
 setTrafficData((prev) => {
 const next = [...prev.slice(1), { time: timeStr, download: down, upload: up }];
 return next;
 });
 }
 }, 2500);

 return () => clearInterval(interval);
 }, [timeRange]);

 // Per client simulated real-time stream
 const perClientTraffic = clients.map((c, i) => {
 const speedLimit = parseInt(c.downloadSpeed || c.bandwidth || '10') || 10;
 const currentDown = +(speedLimit * (0.4 + (i % 5) * 0.12)).toFixed(1);
 const currentUp = +(currentDown * 0.35).toFixed(1);
 return {
 ...c,
 currentDown,
 currentUp,
 peakDown: +(speedLimit * 0.95).toFixed(1),
 interface: i % 2 === 0 ? 'ether2-LAN' : 'wlan1-Hotspot',
 ip: `172.16.0.${10 + i}`,
 mac: `B4:86:55:${(10 + i).toString(16).toUpperCase()}:${(20 + i).toString(16).toUpperCase()}:FE`,
 sessionDuration: `${3 + (i % 12)}h ${14 + (i * 7) % 45}m`,
 };
 });

 const filteredClients = perClientTraffic.filter(
 (c) =>
 c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
 c.userId.toLowerCase().includes(clientSearch.toLowerCase()) ||
 c.ip.includes(clientSearch)
 );

 return (
 <div className="space-y-6">
 {/* Header Banner */}
 <div className="bg-slate-50 border border-slate-300 rounded p-5 text-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded shadow-sm">
 <Gauge className="w-6 h-6 text-slate-800" />
 </div>
 <div>
 <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
 <span>Live Bandwidth Monitoring &amp; Traffic Hub</span>
 <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
 MikroTik SNMP Active
 </span>
 </h1>
 <p className="text-xs text-slate-900 mt-0.5">
 সার্ভারের আপস্ট্রিম, ব্যান্ডউইথ কনজাম্পশন, পিক ট্রাফিক ও প্রতিটি ক্লায়েন্টের রিয়েল-টাইম স্পিড মনিটর।
 </p>
 </div>
 </div>

 {/* Interface Switcher */}
 <div className="flex items-center gap-2">
 <span className="text-xs text-slate-800 font-bold hidden sm:inline">Interface:</span>
 <select
 value={selectedInterface}
 onChange={(e) => {
 setSelectedInterface(e.target.value);
 showToast(`Interface switched to ${e.target.value}`, 'info');
 }}
 className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-cyan-400"
 >
 <option value="ether1-WAN">ether1-WAN (Uplink BDIX/IIG)</option>
 <option value="ether2-LAN">ether2-LAN (PPPoE Subscribers)</option>
 <option value="wlan1-Hotspot">wlan1-Hotspot (Public WiFi)</option>
 <option value="sfp1-Core">sfp1-Core (10G Fiber Hub)</option>
 </select>
 </div>
 </div>

 {/* 4 Big Live Metric Cards */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 font-mono">
 <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-1">
 <div className="flex items-center justify-between text-xs text-slate-800">
 <span className="font-bold">Current Download (RX)</span>
 <ArrowDownCircle className="w-4 h-4 text-emerald-500 animate-bounce" />
 </div>
 <div className="text-2xl sm:text-3xl font-black text-emerald-500">
 {currentMetrics.download} <span className="text-xs font-bold text-slate-800">Mbps</span>
 </div>
 <div className="text-[10px] text-slate-800">Peak: {currentMetrics.peakDownload} Mbps</div>
 </div>

 <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-1">
 <div className="flex items-center justify-between text-xs text-slate-800">
 <span className="font-bold">Current Upload (TX)</span>
 <ArrowUpCircle className="w-4 h-4 text-sky-500" />
 </div>
 <div className="text-2xl sm:text-3xl font-black text-sky-500">
 {currentMetrics.upload} <span className="text-xs font-bold text-slate-800">Mbps</span>
 </div>
 <div className="text-[10px] text-slate-800">Peak: {currentMetrics.peakUpload} Mbps</div>
 </div>

 <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-1">
 <div className="flex items-center justify-between text-xs text-slate-800">
 <span className="font-bold">Core Router Latency</span>
 <Zap className="w-4 h-4 text-amber-500" />
 </div>
 <div className="text-2xl sm:text-3xl font-black text-amber-500">
 {currentMetrics.latency} <span className="text-xs font-bold text-slate-800">ms</span>
 </div>
 <div className="text-[10px] text-slate-800">Target: &lt; 5.0 ms (Optimal)</div>
 </div>

 <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-1">
 <div className="flex items-center justify-between text-xs text-slate-800">
 <span className="font-bold">Total Active Throughput</span>
 <TrendingUp className="w-4 h-4 text-purple-500" />
 </div>
 <div className="text-2xl sm:text-3xl font-black text-purple-500">
 {(currentMetrics.download + currentMetrics.upload).toFixed(1)}{' '}
 <span className="text-xs font-bold text-slate-800">Mbps</span>
 </div>
 <div className="text-[10px] text-emerald-500 font-bold">Packet Loss: 0.00%</div>
 </div>
 </div>

 {/* Main Interactive Traffic Recharts Graph */}
 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
 <div>
 <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
 <Activity className="w-4 h-4 text-cyan-500" />
 <span>Real-Time Traffic Graph: {selectedInterface}</span>
 </h2>
 <p className="text-[11px] text-slate-800">Live 2.5s polling from MikroTik RouterOS API</p>
 </div>

 {/* Time Range Tabs */}
 <div className="flex items-center gap-1 bg-slate-100 p-1 rounded font-mono text-xs">
 {(['1h', '6h', '24h', '7d', '30d'] as const).map((r) => (
 <button
 key={r}
 onClick={() => setTimeRange(r)}
 className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
 timeRange === r
 ? 'bg-cyan-500 text-slate-950 shadow-sm'
 : 'text-slate-800 hover:text-white'
 }`}
 >
 {r.toUpperCase()}
 </button>
 ))}
 </div>
 </div>

 {/* Recharts Area */}
 <div className="h-64 sm:h-72 w-full pt-2">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={trafficData}>
 <defs>
 <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
 <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
 </linearGradient>
 <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
 <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
 <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
 <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} unit="M" />
 <Tooltip
 contentStyle={{
 backgroundColor: '#0f172a',
 borderColor: '#334155',
 borderRadius: '0.75rem',
 fontSize: '11px',
 color: '#fff',
 }}
 />
 <Legend wrapperStyle={{ fontSize: '11px' }} />
 <Area
 type="monotone"
 dataKey="download"
 name="Download (RX Mbps)"
 stroke="#10b981"
 strokeWidth={2}
 fillOpacity={1}
 fill="url(#downGrad)"
 />
 <Area
 type="monotone"
 dataKey="upload"
 name="Upload (TX Mbps)"
 stroke="#0ea5e9"
 strokeWidth={2}
 fillOpacity={1}
 fill="url(#upGrad)"
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Per Client Live Bandwidth Drilldown Table */}
 <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden space-y-3 p-4 sm:p-5">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div>
 <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
 <Wifi className="w-4 h-4 text-emerald-500" />
 <span>Per-Client Live Bandwidth Consumption</span>
 </h3>
 <p className="text-xs text-slate-800">প্রতিটি সংযুক্ত গ্রাহকের বর্তমান ডাউনলোড ও আপলোড স্পিড</p>
 </div>

 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 text-slate-800 absolute left-3 top-2.5" />
 <input
 type="text"
 value={clientSearch}
 onChange={(e) => setClientSearch(e.target.value)}
 placeholder="Search client or IP..."
 className="w-full bg-slate-50 border border-slate-200 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div className="overflow-x-auto rounded border border-slate-100 ">
 <table className="w-full text-left text-xs border-collapse font-mono">
 <thead>
 <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px]">
 <th className="p-3">Client Name / User ID</th>
 <th className="p-3">Assigned IP &amp; MAC</th>
 <th className="p-3">Package Limit</th>
 <th className="p-3">Live Download (RX)</th>
 <th className="p-3">Live Upload (TX)</th>
 <th className="p-3">Session Time</th>
 <th className="p-3 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredClients.length === 0 ? (
 <tr>
 <td colSpan={7} className="p-6 text-center text-slate-800 font-sans">
 কোনো অ্যাক্টিভ ক্লায়েন্ট পাওয়া যায়নি।
 </td>
 </tr>
 ) : (
 filteredClients.map((client) => (
 <tr key={client.id} className="hover:bg-slate-50 transition-colors">
 <td className="p-3 font-sans">
 <div className="font-bold text-slate-900 ">{client.name}</div>
 <div className="text-[11px] text-cyan-500 font-mono">@{client.userId}</div>
 </td>
 <td className="p-3">
 <div className="text-slate-800 font-bold">{client.ip}</div>
 <div className="text-[10px] text-slate-800">{client.mac}</div>
 </td>
 <td className="p-3 font-sans">
 <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700 ">
 {client.package} ({client.downloadSpeed || client.bandwidth})
 </span>
 </td>
 <td className="p-3">
 <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
 <ArrowDownCircle className="w-3.5 h-3.5" />
 <span>{client.currentDown} Mbps</span>
 </div>
 <div className="w-20 bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
 <div
 className="bg-emerald-500 h-full"
 style={{
 width: `${Math.min(100, (client.currentDown / (parseInt(client.downloadSpeed || '10') || 10)) * 100)}%`,
 }}
 />
 </div>
 </td>
 <td className="p-3">
 <div className="flex items-center gap-1.5 text-sky-500 font-bold">
 <ArrowUpCircle className="w-3.5 h-3.5" />
 <span>{client.currentUp} Mbps</span>
 </div>
 </td>
 <td className="p-3 text-slate-800 text-[11px]">
 {client.sessionDuration}
 </td>
 <td className="p-3 text-right">
 <button
 onClick={() => showToast(`Session disconnected for client @${client.userId}`, 'warning')}
 className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[11px] rounded-lg border border-rose-500/30 transition-colors cursor-pointer"
 >
 Disconnect
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
};
