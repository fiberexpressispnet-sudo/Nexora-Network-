import React, { useState, useEffect, useMemo } from 'react';
import {
 ResponsiveContainer,
 AreaChart,
 LineChart,
 Area,
 Line,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 Legend
} from 'recharts';
import {
 Activity,
 ArrowDown,
 ArrowUp,
 Globe,
 Network,
 Wifi,
 Layers,
 Zap,
 Pause,
 Play,
 Download,
 CheckCircle2,
 Sliders,
 Maximize2,
 HardDrive
} from 'lucide-react';
import { RouterConfig } from '../types';

export type InterfaceTabId = 'ether1-wan' | 'ether2-lan' | 'ether3-hotspot' | 'all';

interface InterfaceConfig {
 id: InterfaceTabId;
 name: string;
 badge: string;
 role: string;
 ip: string;
 mac: string;
 speed: string;
 duplex: string;
 mtu: number;
 color: {
 primary: string;
 rx: string;
 tx: string;
 border: string;
 bg: string;
 text: string;
 };
 desc: string;
}

const INTERFACE_DEFS: InterfaceConfig[] = [
 {
 id: 'ether1-wan',
 name: 'ether1-wan',
 badge: 'WAN / UPLINK',
 role: 'Internet Gateway & BDIX Trunk',
 ip: '103.145.112.58/29',
 mac: '6C:3B:6B:01:FE:11',
 speed: '1 Gbps Optical',
 duplex: 'Full Duplex',
 mtu: 1500,
 color: {
 primary: '#0ea5e9', // Sky
 rx: '#0ea5e9', // Sky Blue (RX)
 tx: '#10b981', // Emerald Green (TX)
 border: 'border-sky-500/40',
 bg: 'bg-sky-500/10',
 text: 'text-sky-400',
 },
 desc: 'Primary Upstream Fiber Optical Gateway to IX & BDIX',
 },
 {
 id: 'ether2-lan',
 name: 'ether2-lan',
 badge: 'LAN / PPPoE',
 role: 'Local Subnet & Client Distribution',
 ip: '172.16.10.1/24',
 mac: '6C:3B:6B:01:FE:12',
 speed: '1 Gbps Copper',
 duplex: 'Full Duplex',
 mtu: 1500,
 color: {
 primary: '#10b981', // Emerald
 rx: '#10b981', // Emerald (RX)
 tx: '#f59e0b', // Amber (TX)
 border: 'border-emerald-500/40',
 bg: 'bg-emerald-500/10',
 text: 'text-[#00a65a]',
 },
 desc: 'Distribution Core Switch & PPPoE Client Broadband Traffic',
 },
 {
 id: 'ether3-hotspot',
 name: 'ether3-hotspot',
 badge: 'HOTSPOT / AP',
 role: 'Wireless Captive Portal Zone',
 ip: '10.5.50.1/24',
 mac: '6C:3B:6B:01:FE:13',
 speed: '1 Gbps Copper',
 duplex: 'Full Duplex',
 mtu: 1500,
 color: {
 primary: '#a855f7', // Purple
 rx: '#c084fc', // Purple (RX)
 tx: '#f43f5e', // Rose (TX)
 border: 'border-purple-500/40',
 bg: 'bg-purple-500/10',
 text: 'text-purple-400',
 },
 desc: 'Public Wi-Fi Access Points, Captive Portal & Radius Guest Zone',
 },
 {
 id: 'all',
 name: 'All interface',
 badge: 'AGGREGATE',
 role: 'Total Combined Trunk Bandwidth',
 ip: '192.168.88.1/24',
 mac: '6C:3B:6B:01:FE:10',
 speed: '10 Gbps SFP+',
 duplex: 'Full Duplex',
 mtu: 1500,
 color: {
 primary: '#06b6d4', // Cyan
 rx: '#06b6d4', // Cyan (RX)
 tx: '#34d399', // Mint (TX)
 border: 'border-cyan-500/40',
 bg: 'bg-cyan-500/10',
 text: 'text-[#3c8dbc]',
 },
 desc: 'Combined aggregate bandwidth across all physical & SFP+ interfaces',
 },
];

interface LiveNetworkTrafficProps {
 routerConfig?: RouterConfig;
 onConnectRouter?: () => void;
}

interface RechartsDataPoint {
 time: string;
 download: number; // In Mbps
 upload: number; // In Mbps
 combined: number;
 rxPkts: number;
 txPkts: number;
 ping: number;
}

// Custom Tooltip component for Recharts
const CustomRechartsTooltip = ({ active, payload, label }: any) => {
 if (active && payload && payload.length) {
 const rx = payload.find((p: any) => p.dataKey === 'download')?.value || 0;
 const tx = payload.find((p: any) => p.dataKey === 'upload')?.value || 0;
 const data = payload[0]?.payload;

 return (
 <div className="bg-white border border-slate-300 p-3 rounded shadow-md font-mono text-xs text-slate-800 min-w-[200px] z-50">
 <div className="text-slate-800 text-[10px] pb-1.5 border-b border-slate-200 flex items-center justify-between">
 <span>TIME: <strong className="text-slate-700">{label}</strong></span>
 <span className="text-[#00a65a] font-bold">● LIVE</span>
 </div>

 <div className="space-y-1.5 pt-2">
 <div className="flex items-center justify-between text-sky-400">
 <span className="flex items-center gap-1">
 <ArrowDown className="w-3.5 h-3.5" /> RX (Download):
 </span>
 <span className="font-extrabold text-sm">{rx} Mbps</span>
 </div>

 <div className="flex items-center justify-between text-[#00a65a]">
 <span className="flex items-center gap-1">
 <ArrowUp className="w-3.5 h-3.5" /> TX (Upload):
 </span>
 <span className="font-extrabold text-sm">{tx} Mbps</span>
 </div>

 <div className="flex items-center justify-between text-slate-800 font-bold pt-1 border-t border-slate-200">
 <span>Total Load:</span>
 <span>{(rx + tx).toFixed(1)} Mbps</span>
 </div>

 {data && (
 <div className="text-[10px] text-slate-800 pt-1 flex justify-between">
 <span>Packets: {((data.rxPkts || 0) + (data.txPkts || 0)).toLocaleString()} p/s</span>
 <span>Ping: {data.ping || 2} ms</span>
 </div>
 )}
 </div>
 </div>
 );
 }
 return null;
};

export const LiveNetworkTraffic: React.FC<LiveNetworkTrafficProps> = ({
 routerConfig = { ip: '192.168.88.1', port: '8728', user: 'admin', connected: true },
 onConnectRouter,
}) => {
 const [activeTab, setActiveTab] = useState<InterfaceTabId>('ether1-wan');
 const [chartType, setChartType] = useState<'area' | 'line'>('area');
 const [isPaused, setIsPaused] = useState<boolean>(false);

 // Initialize 30 sliding data points per interface
 const [interfaceData, setInterfaceData] = useState<Record<InterfaceTabId, RechartsDataPoint[]>>(() => {
 const now = Date.now();
 const result: Record<InterfaceTabId, RechartsDataPoint[]> = {
 'ether1-wan': [],
 'ether2-lan': [],
 'ether3-hotspot': [],
 all: [],
 };

 const baseProfiles: Record<InterfaceTabId, { dl: number; ul: number }> = {
 'ether1-wan': { dl: 56, ul: 24 },
 'ether2-lan': { dl: 42, ul: 18 },
 'ether3-hotspot': { dl: 18, ul: 8 },
 all: { dl: 68, ul: 30 },
 };

 for (let i = 29; i >= 0; i--) {
 const timeStr = new Date(now - i * 1500).toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
 second: '2-digit',
 });

 (Object.keys(result) as InterfaceTabId[]).forEach((id) => {
 const { dl: baseDl, ul: baseUl } = baseProfiles[id];
 const dl = Math.max(2, Math.min(100, baseDl + Math.sin((i + id.length) * 0.4) * 16 + (Math.random() * 8 - 4)));
 const ul = Math.max(1, Math.min(50, baseUl + Math.cos((i + id.length) * 0.4) * 8 + (Math.random() * 6 - 3)));

 result[id].push({
 time: timeStr,
 download: parseFloat(dl.toFixed(1)),
 upload: parseFloat(ul.toFixed(1)),
 combined: parseFloat((dl + ul).toFixed(1)),
 rxPkts: Math.floor(dl * 260 + Math.random() * 300),
 txPkts: Math.floor(ul * 220 + Math.random() * 200),
 ping: Math.floor(2 + Math.random() * 3),
 });
 });
 }

 return result;
 });

 // Current interface live metrics summary
 const [liveMetrics, setLiveMetrics] = useState<Record<InterfaceTabId, {
 rx: number;
 tx: number;
 peakRx: number;
 peakTx: number;
 rxPkts: number;
 txPkts: number;
 ping: number;
 }>>({
 'ether1-wan': { rx: 58.4, tx: 25.2, peakRx: 88.5, peakTx: 39.4, rxPkts: 15400, txPkts: 7600, ping: 3 },
 'ether2-lan': { rx: 44.2, tx: 19.1, peakRx: 68.2, peakTx: 29.8, rxPkts: 11800, txPkts: 5900, ping: 2 },
 'ether3-hotspot': { rx: 19.5, tx: 8.2, peakRx: 36.8, peakTx: 14.5, rxPkts: 5100, txPkts: 2200, ping: 4 },
 all: { rx: 69.1, tx: 29.8, peakRx: 96.2, peakTx: 45.1, rxPkts: 18900, txPkts: 9300, ping: 3 },
 });

 // Live simulation tick update
 useEffect(() => {
 if (!routerConfig.connected || isPaused) return;

 const interval = setInterval(() => {
 const now = new Date();
 const timeStr = now.toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
 second: '2-digit',
 });

 setInterfaceData((prev) => {
 const next: Record<InterfaceTabId, RechartsDataPoint[]> = { ...prev };

 // Calculate dynamic live traffic
 const wanDl = Math.max(5, Math.min(98, 48 + Math.sin(Date.now() / 2500) * 22 + (Math.random() * 16 - 8)));
 const wanUl = Math.max(2, Math.min(48, 20 + Math.cos(Date.now() / 2500) * 9 + (Math.random() * 6 - 3)));

 const lanDl = Math.max(4, Math.min(85, wanDl * 0.74 + (Math.random() * 5 - 2.5)));
 const lanUl = Math.max(1, Math.min(40, wanUl * 0.70 + (Math.random() * 4 - 2)));

 const hsDl = Math.max(1, Math.min(42, wanDl * 0.26 + (Math.random() * 4 - 2)));
 const hsUl = Math.max(0.5, Math.min(20, wanUl * 0.24 + (Math.random() * 2 - 1)));

 const allDl = parseFloat(wanDl.toFixed(1));
 const allUl = parseFloat(wanUl.toFixed(1));

 const newVals: Record<InterfaceTabId, { dl: number; ul: number }> = {
 'ether1-wan': { dl: parseFloat(wanDl.toFixed(1)), ul: parseFloat(wanUl.toFixed(1)) },
 'ether2-lan': { dl: parseFloat(lanDl.toFixed(1)), ul: parseFloat(lanUl.toFixed(1)) },
 'ether3-hotspot': { dl: parseFloat(hsDl.toFixed(1)), ul: parseFloat(hsUl.toFixed(1)) },
 all: { dl: allDl, ul: allUl },
 };

 (Object.keys(next) as InterfaceTabId[]).forEach((tab) => {
 const list = next[tab] || [];
 const pts = [...list.slice(1)];
 const dl = newVals[tab].dl;
 const ul = newVals[tab].ul;
 pts.push({
 time: timeStr,
 download: dl,
 upload: ul,
 combined: parseFloat((dl + ul).toFixed(1)),
 rxPkts: Math.floor(dl * 260 + Math.random() * 300),
 txPkts: Math.floor(ul * 220 + Math.random() * 200),
 ping: Math.floor(2 + Math.random() * 3),
 });
 next[tab] = pts;
 });

 // Update live metrics HUD
 setLiveMetrics((prevMetrics) => {
 const updated = { ...prevMetrics };
 (Object.keys(newVals) as InterfaceTabId[]).forEach((tab) => {
 const { dl, ul } = newVals[tab];
 const old = prevMetrics[tab] || { rx: dl, tx: ul, peakRx: dl, peakTx: ul, rxPkts: 5000, txPkts: 2000, ping: 3 };
 updated[tab] = {
 rx: dl,
 tx: ul,
 peakRx: Math.max(old.peakRx, dl),
 peakTx: Math.max(old.peakTx, ul),
 rxPkts: Math.floor(dl * 260 + Math.random() * 300),
 txPkts: Math.floor(ul * 220 + Math.random() * 200),
 ping: Math.floor(2 + Math.random() * 3),
 };
 });
 return updated;
 });

 return next;
 });
 }, 1400);

 return () => clearInterval(interval);
 }, [routerConfig.connected, isPaused]);

 // Current selected tab metadata and stream
 const activeDef = useMemo(() => {
 return INTERFACE_DEFS.find((d) => d.id === activeTab) || INTERFACE_DEFS[0];
 }, [activeTab]);

 const activeDataset = interfaceData[activeTab] || [];
 const currentStats = liveMetrics[activeTab] || liveMetrics['ether1-wan'];

 return (
 <div className="bg-[#ecf0f5] border border-slate-200 rounded p-4 sm:p-6 text-slate-800 shadow-md space-y-5">
 {/* 1. Header Bar with Router Connection Details */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
 <div className="flex items-center gap-3">
 <div className={`w-11 h-11 rounded ${activeDef.color.bg} border ${activeDef.color.border} flex items-center justify-center ${activeDef.color.text} shadow-sm shrink-0`}>
 {activeTab === 'ether1-wan' && <Globe className="w-6 h-6" />}
 {activeTab === 'ether2-lan' && <Network className="w-6 h-6" />}
 {activeTab === 'ether3-hotspot' && <Wifi className="w-6 h-6" />}
 {activeTab === 'all' && <Layers className="w-6 h-6" />}
 </div>

 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
 <span>Live Network Traffic:</span>
 <span className={activeDef.color.text}>{activeDef.name}</span>
 </h3>
 <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${activeDef.color.bg} ${activeDef.color.text} border ${activeDef.color.border}`}>
 {activeDef.badge}
 </span>
 <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-[#00a65a] font-bold border border-emerald-500/30">
 ● Connected ({activeDef.speed})
 </span>
 </div>
 <p className="text-xs text-slate-800 font-mono mt-0.5">
 IP: <span className="text-slate-700">{activeDef.ip}</span> | MAC: <span className="text-slate-700">{activeDef.mac}</span> | {activeDef.desc}
 </p>
 </div>
 </div>

 {/* Graph Controls: Area/Line Mode, Pause/Resume */}
 <div className="flex items-center gap-2 flex-wrap">
 <div className="flex bg-white border border-slate-200 p-1 rounded text-xs font-semibold">
 <button
 type="button"
 onClick={() => setChartType('area')}
 className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
 chartType === 'area'
 ? 'bg-sky-600 text-white font-bold shadow-xs'
 : 'text-slate-800 hover:text-slate-800'
 }`}
 >
 <Zap className="w-3.5 h-3.5" /> Area Curve
 </button>
 <button
 type="button"
 onClick={() => setChartType('line')}
 className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
 chartType === 'line'
 ? 'bg-sky-600 text-white font-bold shadow-xs'
 : 'text-slate-800 hover:text-slate-800'
 }`}
 >
 <Activity className="w-3.5 h-3.5" /> Line Graph
 </button>
 </div>

 <button
 type="button"
 onClick={() => setIsPaused(!isPaused)}
 className={`px-3 py-2 rounded text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
 isPaused
 ? 'bg-emerald-500/20 text-[#00a65a] border-emerald-500/40 hover:bg-emerald-500/30'
 : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-200'
 }`}
 >
 {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
 <span>{isPaused ? 'Resume' : 'Pause'}</span>
 </button>
 </div>
 </div>

 {/* 2. Interactive Tab-Based Interface Switcher */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
 {INTERFACE_DEFS.map((iface) => {
 const isSelected = activeTab === iface.id;
 const stats = liveMetrics[iface.id] || { rx: 0, tx: 0, peakRx: 0, peakTx: 0 };

 return (
 <button
 key={iface.id}
 type="button"
 onClick={() => setActiveTab(iface.id)}
 className={`text-left rounded p-3.5 transition-all cursor-pointer border flex flex-col justify-between relative overflow-hidden ${
 isSelected
 ? `bg-white ${iface.color.border} shadow-lg ring-2 ring-sky-500/40`
 : 'bg-white border-slate-200 hover:bg-white hover:border-slate-300'
 }`}
 >
 {isSelected && (
 <div className="absolute top-0 left-0 right-0 h-1 bg-sky-400" />
 )}

 <div className="flex items-start justify-between gap-2 mb-2">
 <div className="flex items-center gap-2">
 <div className={`w-8 h-8 rounded-lg ${iface.color.bg} ${iface.color.text} flex items-center justify-center shrink-0`}>
 {iface.id === 'ether1-wan' && <Globe className="w-4 h-4" />}
 {iface.id === 'ether2-lan' && <Network className="w-4 h-4" />}
 {iface.id === 'ether3-hotspot' && <Wifi className="w-4 h-4" />}
 {iface.id === 'all' && <Layers className="w-4 h-4" />}
 </div>
 <div>
 <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
 <span>{iface.name}</span>
 {isSelected && (
 <span className="w-2 h-2 rounded-full bg-emerald-400" />
 )}
 </div>
 <div className="text-[10px] text-slate-800">{iface.role}</div>
 </div>
 </div>

 <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
 isSelected ? `${iface.color.bg} ${iface.color.text} border ${iface.color.border}` : 'bg-white text-slate-800'
 }`}>
 {isSelected ? 'ACTIVE TAB' : 'SWITCH'}
 </span>
 </div>

 {/* Ingress / Egress Stats */}
 <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs font-mono">
 <div>
 <div className="text-[10px] text-slate-800 flex items-center gap-1">
 <ArrowDown className="w-3 h-3 text-sky-400" /> RX (DL)
 </div>
 <div className="font-extrabold text-sky-300 text-sm">
 {routerConfig.connected ? stats.rx : '0.0'}{' '}
 <span className="text-[10px] text-slate-800 font-normal">Mbps</span>
 </div>
 </div>

 <div>
 <div className="text-[10px] text-slate-800 flex items-center gap-1">
 <ArrowUp className="w-3 h-3 text-[#00a65a]" /> TX (UL)
 </div>
 <div className="font-extrabold text-emerald-300 text-sm">
 {routerConfig.connected ? stats.tx : '0.0'}{' '}
 <span className="text-[10px] text-slate-800 font-normal">Mbps</span>
 </div>
 </div>
 </div>

 <div className="mt-2 text-[10px] text-slate-800 font-mono flex items-center justify-between">
 <span>Peak: {stats.peakRx} Mbps</span>
 <span>{iface.speed}</span>
 </div>
 </button>
 );
 })}
 </div>

 {/* 3. Recharts Smooth Line / Area Graph */}
 <div className="bg-white border border-slate-200 rounded p-4 overflow-hidden">
 {/* Recharts Legend & Live Crosshair Info */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono mb-3 px-1 pb-2 border-b border-slate-200">
 <div className="flex items-center gap-4 flex-wrap">
 <span className="flex items-center gap-1.5 text-sky-400 font-bold">
 <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
 <span>RX (Download): {currentStats.rx} Mbps</span>
 </span>
 <span className="flex items-center gap-1.5 text-[#00a65a] font-bold">
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
 <span>TX (Upload): {currentStats.tx} Mbps</span>
 </span>
 <span className="text-slate-800">
 Interface: <strong className={activeDef.color.text}>{activeDef.name}</strong>
 </span>
 </div>

 <div className="text-slate-800 text-[11px] flex items-center gap-3">
 <span>Graph Engine: <strong className="text-slate-700">Recharts v2</strong></span>
 <span className="text-[#00a65a] font-bold">● STREAMING LIVE</span>
 </div>
 </div>

 {/* Recharts Container */}
 <div className="w-full h-[260px]">
 <ResponsiveContainer width="100%" height="100%">
 {chartType === 'area' ? (
 <AreaChart data={activeDataset} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <defs>
 <linearGradient id="rechartsDlGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor={activeDef.color.rx} stopOpacity={0.5} />
 <stop offset="95%" stopColor={activeDef.color.rx} stopOpacity={0.0} />
 </linearGradient>
 <linearGradient id="rechartsUlGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor={activeDef.color.tx} stopOpacity={0.4} />
 <stop offset="95%" stopColor={activeDef.color.tx} stopOpacity={0.0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
 <XAxis
 dataKey="time"
 stroke="#64748b"
 tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
 tickLine={{ stroke: '#334155' }}
 />
 <YAxis
 stroke="#64748b"
 tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
 tickLine={{ stroke: '#334155' }}
 domain={[0, 'dataMax + 15']}
 unit="M"
 />
 <Tooltip content={<CustomRechartsTooltip />} />
 <Area
 type="monotone"
 dataKey="download"
 name="RX (Download)"
 stroke={activeDef.color.rx}
 strokeWidth={2.8}
 fillOpacity={1}
 fill="url(#rechartsDlGrad)"
 isAnimationActive={false}
 />
 <Area
 type="monotone"
 dataKey="upload"
 name="TX (Upload)"
 stroke={activeDef.color.tx}
 strokeWidth={2.2}
 fillOpacity={1}
 fill="url(#rechartsUlGrad)"
 isAnimationActive={false}
 />
 </AreaChart>
 ) : (
 <LineChart data={activeDataset} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
 <XAxis
 dataKey="time"
 stroke="#64748b"
 tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
 tickLine={{ stroke: '#334155' }}
 />
 <YAxis
 stroke="#64748b"
 tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
 tickLine={{ stroke: '#334155' }}
 domain={[0, 'dataMax + 15']}
 unit="M"
 />
 <Tooltip content={<CustomRechartsTooltip />} />
 <Line
 type="monotone"
 dataKey="download"
 name="RX (Download)"
 stroke={activeDef.color.rx}
 strokeWidth={3}
 dot={{ r: 2, fill: activeDef.color.rx }}
 activeDot={{ r: 6, fill: activeDef.color.rx }}
 isAnimationActive={false}
 />
 <Line
 type="monotone"
 dataKey="upload"
 name="TX (Upload)"
 stroke={activeDef.color.tx}
 strokeWidth={2.5}
 dot={{ r: 2, fill: activeDef.color.tx }}
 activeDot={{ r: 6, fill: activeDef.color.tx }}
 isAnimationActive={false}
 />
 </LineChart>
 )}
 </ResponsiveContainer>
 </div>

 {/* Time footer */}
 <div className="flex justify-between text-[10px] font-mono text-slate-800 pt-2 border-t border-slate-200 mt-1">
 <span>{activeDataset[0]?.time || 'T-45s'}</span>
 <span>{activeDataset[Math.floor(activeDataset.length / 2)]?.time || 'T-20s'}</span>
 <span className="text-sky-400 font-bold">● LIVE SAMPLE ({activeDataset[activeDataset.length - 1]?.time || 'Now'})</span>
 </div>
 </div>

 {/* 4. Telemetry Metric HUD Tiles */}
 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
 {/* RX (DL) */}
 <div className="bg-white border border-slate-200 rounded p-3">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between mb-1">
 <span className="flex items-center gap-1">
 <ArrowDown className="w-3.5 h-3.5 text-sky-400" /> Ingress (RX)
 </span>
 </div>
 <div className="text-xl font-black font-mono text-sky-300 tracking-tight">
 {routerConfig.connected ? currentStats.rx : '0.0'}{' '}
 <span className="text-xs text-slate-800 font-normal">Mbps</span>
 </div>
 <div className="text-[10px] text-slate-800 font-mono mt-0.5">
 Peak: <strong className="text-slate-900">{currentStats.peakRx} Mbps</strong>
 </div>
 </div>

 {/* TX (UL) */}
 <div className="bg-white border border-slate-200 rounded p-3">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#00a65a] flex items-center justify-between mb-1">
 <span className="flex items-center gap-1">
 <ArrowUp className="w-3.5 h-3.5 text-[#00a65a]" /> Egress (TX)
 </span>
 </div>
 <div className="text-xl font-black font-mono text-emerald-300 tracking-tight">
 {routerConfig.connected ? currentStats.tx : '0.0'}{' '}
 <span className="text-xs text-slate-800 font-normal">Mbps</span>
 </div>
 <div className="text-[10px] text-slate-800 font-mono mt-0.5">
 Peak: <strong className="text-slate-900">{currentStats.peakTx} Mbps</strong>
 </div>
 </div>

 {/* Combined Bandwidth */}
 <div className="bg-white border border-slate-200 rounded p-3">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 mb-1">
 Total Throughput
 </div>
 <div className="text-xl font-black font-mono text-slate-800 tracking-tight">
 {routerConfig.connected ? (currentStats.rx + currentStats.tx).toFixed(1) : '0.0'}{' '}
 <span className="text-xs text-slate-800 font-normal">Mbps</span>
 </div>
 <div className="text-[10px] text-[#00a65a] font-mono mt-0.5 flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3" /> Full Duplex OK
 </div>
 </div>

 {/* Latency */}
 <div className="bg-white border border-slate-200 rounded p-3">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
 Latency (Ping)
 </div>
 <div className="text-xl font-black font-mono text-amber-300 tracking-tight">
 {routerConfig.connected ? currentStats.ping : '0'}{' '}
 <span className="text-xs text-slate-800 font-normal">ms</span>
 </div>
 <div className="text-[10px] text-slate-800 font-mono mt-0.5">
 0% Packet Loss
 </div>
 </div>

 {/* Packets per Sec */}
 <div className="bg-white border border-slate-200 rounded p-3 hidden lg:block">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 mb-1">
 Packets / Sec
 </div>
 <div className="text-xl font-black font-mono text-purple-300 tracking-tight">
 {routerConfig.connected ? `${(currentStats.rxPkts + currentStats.txPkts).toLocaleString()}` : '0'}{' '}
 <span className="text-xs text-slate-800 font-normal">p/s</span>
 </div>
 <div className="text-[10px] text-slate-800 font-mono mt-0.5">
 Hardware FastPath
 </div>
 </div>

 {/* Link Speed */}
 <div className="bg-white border border-slate-200 rounded p-3 hidden lg:block">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 mb-1">
 Link Speed
 </div>
 <div className="text-base font-black font-mono text-[#3c8dbc] tracking-tight mt-0.5">
 {activeDef.speed}
 </div>
 <div className="text-xs font-mono text-[#00a65a]">
 MTU: {activeDef.mtu}
 </div>
 </div>
 </div>
 </div>
 );
};
