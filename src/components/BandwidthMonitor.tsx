import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
 Activity,
 ArrowDown,
 ArrowUp,
 Radio,
 Zap,
 CheckCircle2,
 Plug,
 Network,
 Globe,
 Wifi,
 Layers,
 BarChart2,
 HardDrive,
 Cpu,
 RefreshCw,
 Sliders,
 Maximize2,
 Pause,
 Play,
 Download,
 ShieldCheck,
 Server,
 TrendingUp,
 SplitSquareVertical,
 Clock
} from 'lucide-react';
import { RouterConfig } from '../types';

export type InterfaceId = 'all' | 'ether1-wan' | 'ether2-lan' | 'ether3-hotspot';
export type GraphDisplayMode = 'area' | 'bilateral' | 'spectrum';

interface InterfaceMeta {
 id: InterfaceId;
 name: string;
 label: string;
 type: string;
 ip: string;
 mac: string;
 speed: string;
 duplex: string;
 mtu: number;
 color: {
 primary: string;
 rxColor: string;
 txColor: string;
 border: string;
 bg: string;
 text: string;
 badge: string;
 };
 desc: string;
}

const INTERFACES: InterfaceMeta[] = [
 {
 id: 'all',
 name: 'All interface',
 label: 'All Interfaces (Aggregate)',
 type: 'Bridge / Combined Trunk',
 ip: '192.168.88.1/24',
 mac: '6C:3B:6B:01:FE:10',
 speed: '10 Gbps SFP+',
 duplex: 'Full Duplex',
 mtu: 1500,
 color: {
 primary: '#06b6d4',
 rxColor: '#06b6d4', // Cyan
 txColor: '#10b981', // Emerald
 border: 'border-cyan-500/50',
 bg: 'bg-cyan-500/10',
 text: 'text-[#3c8dbc]',
 badge: 'bg-cyan-500/20 text-[#3c8dbc] border-cyan-500/40',
 },
 desc: 'Aggregate throughput summing WAN, LAN & Hotspot networks',
 },
 {
 id: 'ether1-wan',
 name: 'ether1-wan',
 label: 'ether1-wan (Internet Gateway)',
 type: 'WAN / Upstream IX',
 ip: '103.145.112.58/29',
 mac: '6C:3B:6B:01:FE:11',
 speed: '1 Gbps Copper',
 duplex: 'Full Duplex',
 mtu: 1500,
 color: {
 primary: '#38bdf8',
 rxColor: '#38bdf8', // Sky
 txColor: '#34d399', // Mint
 border: 'border-sky-500/50',
 bg: 'bg-sky-500/10',
 text: 'text-sky-400',
 badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
 },
 desc: 'Upstream BDIX & International Gateway Optical Internet link',
 },
 {
 id: 'ether2-lan',
 name: 'ether2-lan',
 label: 'ether2-lan (Local LAN / PPPoE)',
 type: 'LAN / Distribution',
 ip: '172.16.10.1/24',
 mac: '6C:3B:6B:01:FE:12',
 speed: '1 Gbps Copper',
 duplex: 'Full Duplex',
 mtu: 1500,
 color: {
 primary: '#10b981',
 rxColor: '#10b981', // Emerald
 txColor: '#f59e0b', // Amber
 border: 'border-emerald-500/50',
 bg: 'bg-emerald-500/10',
 text: 'text-[#00a65a]',
 badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
 },
 desc: 'Local Distribution Switch, Core Server & PPPoE client traffic',
 },
 {
 id: 'ether3-hotspot',
 name: 'ether3-hotspot',
 label: 'ether3-hotspot (Wireless Hotspot)',
 type: 'Hotspot / Voucher',
 ip: '10.5.50.1/24',
 mac: '6C:3B:6B:01:FE:13',
 speed: '1 Gbps Copper',
 duplex: 'Full Duplex',
 mtu: 1500,
 color: {
 primary: '#a855f7',
 rxColor: '#c084fc', // Purple
 txColor: '#f43f5e', // Rose
 border: 'border-purple-500/50',
 bg: 'bg-purple-500/10',
 text: 'text-purple-400',
 badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
 },
 desc: 'Public Wi-Fi Hotspot, Captive Portal & Radius guest network',
 },
];

interface BandwidthMonitorProps {
 routerConfig: RouterConfig;
 onConnectRouter: () => void;
}

interface DataPoint {
 time: string;
 download: number; // RX in Mbps
 upload: number; // TX in Mbps
 rxPkts: number; // Packets per sec
 txPkts: number; // Packets per sec
 ping: number;
}

export const BandwidthMonitor: React.FC<BandwidthMonitorProps> = ({
 routerConfig,
 onConnectRouter,
}) => {
 const [selectedInterface, setSelectedInterface] = useState<InterfaceId>('all');
 const [graphMode, setGraphMode] = useState<GraphDisplayMode>('area');
 const [isPaused, setIsPaused] = useState<boolean>(false);
 const [refreshRateMs, setRefreshRateMs] = useState<number>(1000);
 const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
 const [totalAccumulatedGB, setTotalAccumulatedGB] = useState({ rx: 148.4, tx: 62.1 });

 // 40-point history per interface
 const [interfaceStreams, setInterfaceStreams] = useState<Record<InterfaceId, DataPoint[]>>(() => {
 const now = Date.now();
 const streams: Record<InterfaceId, DataPoint[]> = {
 all: [],
 'ether1-wan': [],
 'ether2-lan': [],
 'ether3-hotspot': [],
 };

 const multipliers: Record<InterfaceId, { dl: number; ul: number }> = {
 all: { dl: 62, ul: 26 },
 'ether1-wan': { dl: 54, ul: 22 },
 'ether2-lan': { dl: 38, ul: 15 },
 'ether3-hotspot': { dl: 16, ul: 7 },
 };

 for (let i = 39; i >= 0; i--) {
 const timeStr = new Date(now - i * 1200).toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
 second: '2-digit',
 });

 (Object.keys(streams) as InterfaceId[]).forEach((iface) => {
 const { dl: baseDl, ul: baseUl } = multipliers[iface];
 const dl = Math.max(2, Math.min(95, baseDl + Math.sin((i + iface.length) * 0.45) * 16 + (Math.random() * 8 - 4)));
 const ul = Math.max(1, Math.min(48, baseUl + Math.cos((i + iface.length) * 0.45) * 7 + (Math.random() * 5 - 2.5)));
 streams[iface].push({
 time: timeStr,
 download: parseFloat(dl.toFixed(1)),
 upload: parseFloat(ul.toFixed(1)),
 rxPkts: Math.floor(dl * 280 + Math.random() * 400),
 txPkts: Math.floor(ul * 220 + Math.random() * 300),
 ping: Math.floor(2 + Math.random() * 3),
 });
 });
 }

 return streams;
 });

 // Current interface live metrics
 const [currentLiveStats, setCurrentLiveStats] = useState<Record<InterfaceId, {
 rx: number;
 tx: number;
 peakRx: number;
 peakTx: number;
 rxPkts: number;
 txPkts: number;
 ping: number;
 jitter: number;
 }>>({
 all: { rx: 68.4, tx: 29.2, peakRx: 96.5, peakTx: 45.0, rxPkts: 19100, txPkts: 9400, ping: 3, jitter: 0.1 },
 'ether1-wan': { rx: 58.2, tx: 25.1, peakRx: 89.4, peakTx: 39.8, rxPkts: 16200, txPkts: 7800, ping: 3, jitter: 0.2 },
 'ether2-lan': { rx: 44.5, tx: 19.3, peakRx: 69.2, peakTx: 30.1, rxPkts: 12400, txPkts: 6100, ping: 2, jitter: 0.1 },
 'ether3-hotspot': { rx: 20.1, tx: 8.4, peakRx: 37.8, peakTx: 15.0, rxPkts: 5100, txPkts: 2300, ping: 4, jitter: 0.3 },
 });

 // Real-time update interval loop
 useEffect(() => {
 if (!routerConfig.connected || isPaused) return;

 const interval = setInterval(() => {
 const now = new Date();
 const timeStr = now.toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
 second: '2-digit',
 });

 setInterfaceStreams((prev) => {
 const nextStreams: Record<InterfaceId, DataPoint[]> = { ...prev };

 // Generate accurate realistic bandwidth variations
 const wanDl = Math.max(8, Math.min(98, 48 + Math.sin(Date.now() / 3000) * 22 + (Math.random() * 20 - 10)));
 const wanUl = Math.max(3, Math.min(48, 20 + Math.cos(Date.now() / 3000) * 10 + (Math.random() * 8 - 4)));

 const lanDl = Math.max(4, Math.min(85, wanDl * 0.74 + (Math.random() * 6 - 3)));
 const lanUl = Math.max(1, Math.min(40, wanUl * 0.70 + (Math.random() * 4 - 2)));

 const hsDl = Math.max(1, Math.min(42, wanDl * 0.26 + (Math.random() * 4 - 2)));
 const hsUl = Math.max(0.5, Math.min(20, wanUl * 0.24 + (Math.random() * 2 - 1)));

 const allDl = parseFloat(wanDl.toFixed(1));
 const allUl = parseFloat(wanUl.toFixed(1));

 const newPoints: Record<InterfaceId, { dl: number; ul: number }> = {
 all: { dl: allDl, ul: allUl },
 'ether1-wan': { dl: parseFloat(wanDl.toFixed(1)), ul: parseFloat(wanUl.toFixed(1)) },
 'ether2-lan': { dl: parseFloat(lanDl.toFixed(1)), ul: parseFloat(lanUl.toFixed(1)) },
 'ether3-hotspot': { dl: parseFloat(hsDl.toFixed(1)), ul: parseFloat(hsUl.toFixed(1)) },
 };

 (Object.keys(nextStreams) as InterfaceId[]).forEach((iface) => {
 const stream = nextStreams[iface] || [];
 const pts = [...stream.slice(1)];
 const dl = newPoints[iface].dl;
 const ul = newPoints[iface].ul;
 pts.push({
 time: timeStr,
 download: dl,
 upload: ul,
 rxPkts: Math.floor(dl * 280 + Math.random() * 400),
 txPkts: Math.floor(ul * 220 + Math.random() * 300),
 ping: Math.floor(2 + Math.random() * 3),
 });
 nextStreams[iface] = pts;
 });

 // Update live stats HUD
 setCurrentLiveStats((prevStats) => {
 const nextStats = { ...prevStats };
 (Object.keys(newPoints) as InterfaceId[]).forEach((iface) => {
 const { dl, ul } = newPoints[iface];
 const prevItem = prevStats[iface] || { rx: dl, tx: ul, peakRx: dl, peakTx: ul, rxPkts: 5000, txPkts: 2000, ping: 3, jitter: 0.1 };
 nextStats[iface] = {
 rx: dl,
 tx: ul,
 peakRx: Math.max(prevItem.peakRx, dl),
 peakTx: Math.max(prevItem.peakTx, ul),
 rxPkts: Math.floor(dl * 280 + Math.random() * 400),
 txPkts: Math.floor(ul * 220 + Math.random() * 300),
 ping: Math.floor(2 + Math.random() * 3),
 jitter: parseFloat((0.1 + Math.random() * 0.2).toFixed(1)),
 };
 });
 return nextStats;
 });

 // Increment data counters
 setTotalAccumulatedGB((prev) => ({
 rx: parseFloat((prev.rx + (allDl / (8 * 1024 * 10))).toFixed(3)),
 tx: parseFloat((prev.tx + (allUl / (8 * 1024 * 10))).toFixed(3)),
 }));

 return nextStreams;
 });
 }, refreshRateMs);

 return () => clearInterval(interval);
 }, [routerConfig.connected, isPaused, refreshRateMs]);

 // Current interface metadata & streams
 const activeMeta = useMemo(() => {
 return INTERFACES.find((i) => i.id === selectedInterface) || INTERFACES[0];
 }, [selectedInterface]);

 const activeStream = interfaceStreams[selectedInterface] || [];
 const activeStats = currentLiveStats[selectedInterface] || currentLiveStats.all;

 // Maximum scale value based on interface type
 const maxScaleVal = selectedInterface === 'ether3-hotspot' ? 50 : selectedInterface === 'ether2-lan' ? 80 : 100;
 const svgWidth = 840;
 const svgHeight = 240;

 // Mode 1: Standard Area Chart Coordinates
 const areaCoords = useMemo(() => {
 if (!activeStream.length) return { dlPath: '', ulPath: '', dlArea: '', ulArea: '', points: [] };

 const points = activeStream.map((p, idx) => {
 const x = (idx / (activeStream.length - 1)) * svgWidth;
 const yDl = svgHeight - (Math.min(maxScaleVal, p.download) / maxScaleVal) * (svgHeight - 36) - 18;
 const yUl = svgHeight - (Math.min(maxScaleVal, p.upload) / maxScaleVal) * (svgHeight - 36) - 18;
 return { x, yDl, yUl, ...p };
 });

 const dlPath = points.reduce((acc, c, i) => {
 if (i === 0) return `M ${c.x},${c.yDl}`;
 const prev = points[i - 1];
 const cpX = (prev.x + c.x) / 2;
 return `${acc} C ${cpX},${prev.yDl} ${cpX},${c.yDl} ${c.x},${c.yDl}`;
 }, '');

 const ulPath = points.reduce((acc, c, i) => {
 if (i === 0) return `M ${c.x},${c.yUl}`;
 const prev = points[i - 1];
 const cpX = (prev.x + c.x) / 2;
 return `${acc} C ${cpX},${prev.yUl} ${cpX},${c.yUl} ${c.x},${c.yUl}`;
 }, '');

 const dlArea = `${dlPath} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;
 const ulArea = `${ulPath} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;

 return { dlPath, ulPath, dlArea, ulArea, points };
 }, [activeStream, maxScaleVal]);

 // Mode 2: Bilateral (Ingress / Egress split mirrored across center line)
 const bilateralCoords = useMemo(() => {
 if (!activeStream.length) return { dlPath: '', ulPath: '', dlArea: '', ulArea: '', centerY: svgHeight / 2 };

 const centerY = svgHeight / 2;
 const halfHeight = (svgHeight - 30) / 2;

 const points = activeStream.map((p, idx) => {
 const x = (idx / (activeStream.length - 1)) * svgWidth;
 // Ingress (Download) goes upwards from center
 const yDl = centerY - (Math.min(maxScaleVal, p.download) / maxScaleVal) * halfHeight;
 // Egress (Upload) goes downwards from center
 const yUl = centerY + (Math.min(maxScaleVal, p.upload) / maxScaleVal) * halfHeight;
 return { x, yDl, yUl, ...p };
 });

 const dlPath = points.reduce((acc, c, i) => {
 if (i === 0) return `M ${c.x},${c.yDl}`;
 const prev = points[i - 1];
 const cpX = (prev.x + c.x) / 2;
 return `${acc} C ${cpX},${prev.yDl} ${cpX},${c.yDl} ${c.x},${c.yDl}`;
 }, '');

 const ulPath = points.reduce((acc, c, i) => {
 if (i === 0) return `M ${c.x},${c.yUl}`;
 const prev = points[i - 1];
 const cpX = (prev.x + c.x) / 2;
 return `${acc} C ${cpX},${prev.yUl} ${cpX},${c.yUl} ${c.x},${c.yUl}`;
 }, '');

 const dlArea = `${dlPath} L ${svgWidth},${centerY} L 0,${centerY} Z`;
 const ulArea = `${ulPath} L ${svgWidth},${centerY} L 0,${centerY} Z`;

 return { dlPath, ulPath, dlArea, ulArea, centerY, points };
 }, [activeStream, maxScaleVal]);

 const activeHover = hoveredIndex !== null && areaCoords.points[hoveredIndex]
 ? areaCoords.points[hoveredIndex]
 : areaCoords.points[areaCoords.points.length - 1];

 // Helper to generate mini sparklines for cards
 const renderSparkline = (stream: DataPoint[], strokeColor: string) => {
 if (!stream.length) return null;
 const w = 120;
 const h = 30;
 const pts = stream.map((d, i) => {
 const x = (i / (stream.length - 1)) * w;
 const y = h - (Math.min(100, d.download) / 100) * (h - 4) - 2;
 return `${x},${y}`;
 }).join(' ');

 return (
 <svg width={w} height={h} className="overflow-visible">
 <polyline
 fill="none"
 stroke={strokeColor}
 strokeWidth="1.8"
 strokeLinecap="round"
 strokeLinejoin="round"
 points={pts}
 />
 </svg>
 );
 };

 // Export current graph dataset
 const handleExportData = () => {
 const headers = ['Timestamp', 'Interface', 'Download_RX_Mbps', 'Upload_TX_Mbps', 'RX_Packets_Sec', 'TX_Packets_Sec', 'Ping_ms'];
 const rows = activeStream.map((d) => [
 d.time,
 activeMeta.name,
 d.download,
 d.upload,
 d.rxPkts,
 d.txPkts,
 d.ping,
 ]);

 const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement('a');
 link.setAttribute('href', encodedUri);
 link.setAttribute('download', `NOC_Traffic_${activeMeta.name}_${new Date().toISOString().slice(0, 10)}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 return (
 <div className="bg-white border border-slate-200 rounded p-4 sm:p-6 text-slate-800 shadow-md space-y-5">
 {/* 1. TOP NOC EXECUTIVE HEADER BAR */}
 <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
 {/* Title & Live Status */}
 <div className="flex items-center gap-3.5">
 <div className="w-12 h-12 rounded bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-500/40 flex items-center justify-center text-[#3c8dbc] shadow-md shrink-0">
 <Activity className="w-6 h-6" />
 </div>

 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
 <span>ISP NOC Live Traffic HUD</span>
 <span className="text-slate-800 font-normal">|</span>
 <span className={activeMeta.color.text}>{activeMeta.name}</span>
 </h2>

 <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border ${activeMeta.color.badge}`}>
 {activeMeta.type}
 </span>

 <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-[#00a65a] border border-emerald-500/30">
 <span className="w-2 h-2 rounded-full bg-emerald-400" />
 <span>{isPaused ? 'PAUSED' : 'STREAMING LIVE'}</span>
 </span>
 </div>

 <p className="text-xs text-slate-800 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
 <span>Router: <strong className="text-slate-700">{routerConfig.ip}</strong></span>
 <span className="text-slate-900">•</span>
 <span>MAC: <strong className="text-slate-700">{activeMeta.mac}</strong></span>
 <span className="text-slate-900">•</span>
 <span>Link: <strong className="text-[#00a65a]">{activeMeta.speed} ({activeMeta.duplex})</strong></span>
 </p>
 </div>
 </div>

 {/* Action Controls: Graph Mode, Refresh Rate, Pause/Resume, Export */}
 <div className="flex items-center gap-2 flex-wrap">
 {/* Graph Layout Switcher */}
 <div className="flex bg-white border border-slate-200 p-1 rounded text-xs font-semibold">
 <button
 type="button"
 onClick={() => setGraphMode('area')}
 className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
 graphMode === 'area'
 ? 'bg-cyan-600 text-white font-bold shadow-xs'
 : 'text-slate-800 hover:text-slate-800'
 }`}
 title="WinBox / Grafana Smooth Area Graph"
 >
 <Zap className="w-3.5 h-3.5" /> NOC Area
 </button>

 <button
 type="button"
 onClick={() => setGraphMode('bilateral')}
 className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
 graphMode === 'bilateral'
 ? 'bg-cyan-600 text-white font-bold shadow-xs'
 : 'text-slate-800 hover:text-slate-800'
 }`}
 title="MRTG Ingress (Up) vs Egress (Down) Mirrored Flow"
 >
 <SplitSquareVertical className="w-3.5 h-3.5" /> Bilateral
 </button>

 <button
 type="button"
 onClick={() => setGraphMode('spectrum')}
 className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
 graphMode === 'spectrum'
 ? 'bg-cyan-600 text-white font-bold shadow-xs'
 : 'text-slate-800 hover:text-slate-800'
 }`}
 title="Digital LED Equalizer Histogram"
 >
 <BarChart2 className="w-3.5 h-3.5" /> Spectrum
 </button>
 </div>

 {/* Pause / Resume Button */}
 <button
 type="button"
 onClick={() => setIsPaused(!isPaused)}
 className={`px-3 py-2 rounded text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
 isPaused
 ? 'bg-emerald-500/20 text-[#00a65a] border-emerald-500/40 hover:bg-emerald-500/30'
 : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-200'
 }`}
 title={isPaused ? 'Resume live traffic polling' : 'Pause live traffic stream'}
 >
 {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
 <span>{isPaused ? 'Resume' : 'Pause'}</span>
 </button>

 {/* Export CSV Data */}
 <button
 type="button"
 onClick={handleExportData}
 className="px-3 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
 title="Download CSV telemetry logs"
 >
 <Download className="w-3.5 h-3.5 text-sky-400" />
 <span className="hidden sm:inline">Export</span>
 </button>
 </div>
 </div>

 {/* 2. FOUR DEDICATED INTERFACE CHANNEL CARDS (Click to Switch Graph) */}
 <div>
 <div className="text-[11px] font-mono uppercase tracking-wider text-slate-800 font-bold mb-2 flex items-center justify-between">
 <span>MikroTik Physical & Virtual Ports (যেকোনো ইন্টারফেসে ক্লিক করে লাইভ গ্রাফ দেখুন):</span>
 <span className="text-[#3c8dbc] font-normal">Active: {activeMeta.name}</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
 {INTERFACES.map((iface) => {
 const isSelected = selectedInterface === iface.id;
 const stats = currentLiveStats[iface.id] || { rx: 0, tx: 0, peakRx: 0, peakTx: 0 };
 const stream = interfaceStreams[iface.id] || [];

 return (
 <div
 key={iface.id}
 onClick={() => setSelectedInterface(iface.id)}
 className={`rounded p-3.5 transition-all cursor-pointer border flex flex-col justify-between relative overflow-hidden ${
 isSelected
 ? `bg-white ${iface.color.border} shadow-lg ring-1 ring-cyan-500/40`
 : 'bg-white border-slate-200/90 hover:bg-white hover:border-slate-300'
 }`}
 title={`Click to view real-time live graph for ${iface.name}`}
 >
 {/* Active Indicator Top Accent Bar */}
 {isSelected && (
 <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-400" />
 )}

 {/* Top Row: Icon, Port Name, Status Tag */}
 <div className="flex items-start justify-between gap-2 mb-2">
 <div className="flex items-center gap-2.5">
 <div className={`w-8 h-8 rounded-lg ${iface.color.bg} ${iface.color.text} border ${iface.color.border} flex items-center justify-center shrink-0`}>
 {iface.id === 'all' && <Layers className="w-4 h-4" />}
 {iface.id === 'ether1-wan' && <Globe className="w-4 h-4" />}
 {iface.id === 'ether2-lan' && <Network className="w-4 h-4" />}
 {iface.id === 'ether3-hotspot' && <Wifi className="w-4 h-4" />}
 </div>
 <div>
 <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
 <span>{iface.name}</span>
 {isSelected && (
 <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />
 )}
 </div>
 <div className="text-[10px] text-slate-800">{iface.type}</div>
 </div>
 </div>

 <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
 isSelected ? 'bg-cyan-500/20 text-[#3c8dbc] border border-cyan-500/40' : 'bg-white text-slate-800'
 }`}>
 {isSelected ? 'LIVE VIEW' : 'SELECT'}
 </span>
 </div>

 {/* Live Throughput Metrics (RX & TX) */}
 <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs font-mono">
 <div>
 <div className="text-[10px] text-slate-800 flex items-center gap-1">
 <ArrowDown className="w-3 h-3 text-[#3c8dbc]" /> RX (DL)
 </div>
 <div className="font-extrabold text-[#3c8dbc] text-sm">
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

 {/* Mini Live Sparkline & Port Info Footer */}
 <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
 <div className="text-[10px] text-slate-800 font-mono">
 Peak: <strong className="text-slate-900">{stats.peakRx}M</strong>
 </div>
 <div className="opacity-90">
 {renderSparkline(stream, isSelected ? '#06b6d4' : '#64748b')}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* 3. MAIN NOC LIVE GRAPH DISPLAY */}
 {routerConfig.connected ? (
 <div className="bg-white border border-slate-200 rounded p-4 overflow-hidden relative shadow-inner">
 {/* Legend & Tooltip HUD Bar */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono pb-3 mb-2 border-b border-slate-200/90">
 {/* Live Metrics at Cursor / Hover */}
 <div className="flex items-center gap-4 flex-wrap">
 <div className="flex items-center gap-1.5 text-[#3c8dbc] font-bold bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
 <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-xs" />
 <span>RX (Ingress / Download): {activeHover?.download ?? activeStats.rx} Mbps</span>
 </div>

 <div className="flex items-center gap-1.5 text-[#00a65a] font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs" />
 <span>TX (Egress / Upload): {activeHover?.upload ?? activeStats.tx} Mbps</span>
 </div>

 <div className="text-slate-800 font-semibold hidden lg:block">
 Total: <strong className="text-slate-800">{((activeHover?.download ?? activeStats.rx) + (activeHover?.upload ?? activeStats.tx)).toFixed(1)} Mbps</strong>
 </div>
 </div>

 {/* Time and Scale Legend */}
 <div className="text-slate-800 text-[11px] flex items-center gap-3">
 <span>Timestamp: <strong className="text-slate-700">{activeHover?.time || 'Live'}</strong></span>
 <span className="text-slate-900">•</span>
 <span>Scale: <strong className="text-slate-700">0 - {maxScaleVal} Mbps</strong></span>
 </div>
 </div>

 {/* Graph Renderer: Mode 1 - Area Graph */}
 {graphMode === 'area' && (
 <div className="relative h-[240px] w-full">
 {/* Horizontal Grid lines with crisp graduation labels */}
 <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
 <div className="border-b border-cyan-500/40 text-[9px] font-mono text-[#3c8dbc] pl-1">{maxScaleVal} Mbps</div>
 <div className="border-b border-cyan-500/40 text-[9px] font-mono text-[#3c8dbc] pl-1">{Math.round(maxScaleVal * 0.75)} Mbps</div>
 <div className="border-b border-cyan-500/40 text-[9px] font-mono text-[#3c8dbc] pl-1">{Math.round(maxScaleVal * 0.50)} Mbps</div>
 <div className="border-b border-cyan-500/40 text-[9px] font-mono text-[#3c8dbc] pl-1">{Math.round(maxScaleVal * 0.25)} Mbps</div>
 <div className="border-b border-cyan-500/40 text-[9px] font-mono text-[#3c8dbc] pl-1">0 Mbps</div>
 </div>

 <svg
 viewBox={`0 0 ${svgWidth} ${svgHeight}`}
 className="w-full h-full overflow-visible"
 preserveAspectRatio="none"
 >
 <defs>
 {/* Download Gradient */}
 <linearGradient id="nocDlGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
 <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
 </linearGradient>

 {/* Upload Gradient */}
 <linearGradient id="nocUlGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
 <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
 </linearGradient>
 </defs>

 {/* Area Fills */}
 <path d={areaCoords.dlArea} fill="url(#nocDlGradient)" />
 <path d={areaCoords.ulArea} fill="url(#nocUlGradient)" />

 {/* Stroke Curves */}
 <path
 d={areaCoords.ulPath}
 fill="none"
 stroke="#10b981"
 strokeWidth="2.5"
 strokeLinecap="round"
 />
 <path
 d={areaCoords.dlPath}
 fill="none"
 stroke="#06b6d4"
 strokeWidth="3"
 strokeLinecap="round"
 />

 {/* Interactive Points on Hover */}
 {areaCoords.points.map((c, idx) => (
 <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)}>
 <circle
 cx={c.x}
 cy={c.yDl}
 r={hoveredIndex === idx ? '5' : '2'}
 fill="#06b6d4"
 />
 <circle
 cx={c.x}
 cy={c.yUl}
 r={hoveredIndex === idx ? '4' : '1.5'}
 fill="#10b981"
 />
 </g>
 ))}
 </svg>
 </div>
 )}

 {/* Graph Renderer: Mode 2 - Bilateral Ingress vs Egress (MRTG style) */}
 {graphMode === 'bilateral' && (
 <div className="relative h-[240px] w-full">
 {/* Central Ingress / Egress Zero Division Line */}
 <div className="absolute top-1/2 left-0 right-0 border-b-2 border-dashed border-slate-300 pointer-events-none z-0" />
 <div className="absolute top-2 left-2 text-[9px] font-mono text-[#3c8dbc] font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
 ▲ INGRESS (Download: 0 to {maxScaleVal} Mbps)
 </div>
 <div className="absolute bottom-2 left-2 text-[9px] font-mono text-[#00a65a] font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
 ▼ EGRESS (Upload: 0 to {maxScaleVal} Mbps)
 </div>

 <svg
 viewBox={`0 0 ${svgWidth} ${svgHeight}`}
 className="w-full h-full overflow-visible"
 preserveAspectRatio="none"
 >
 <defs>
 <linearGradient id="bilateralDl" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
 <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
 </linearGradient>
 <linearGradient id="bilateralUl" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#10b981" stopOpacity="0.05" />
 <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
 </linearGradient>
 </defs>

 {/* Fills */}
 <path d={bilateralCoords.dlArea} fill="url(#bilateralDl)" />
 <path d={bilateralCoords.ulArea} fill="url(#bilateralUl)" />

 {/* Curves */}
 <path d={bilateralCoords.dlPath} fill="none" stroke="#06b6d4" strokeWidth="2.8" strokeLinecap="round" />
 <path d={bilateralCoords.ulPath} fill="none" stroke="#10b981" strokeWidth="2.8" strokeLinecap="round" />

 {/* Point Triggers */}
 {bilateralCoords.points.map((c, idx) => (
 <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)}>
 <circle cx={c.x} cy={c.yDl} r={hoveredIndex === idx ? '5' : '2'} fill="#06b6d4" />
 <circle cx={c.x} cy={c.yUl} r={hoveredIndex === idx ? '5' : '2'} fill="#10b981" />
 </g>
 ))}
 </svg>
 </div>
 )}

 {/* Graph Renderer: Mode 3 - Digital Spectrum Equalizer */}
 {graphMode === 'spectrum' && (
 <div className="h-[240px] flex items-end gap-1 sm:gap-1.5 pt-4">
 {activeStream.map((d, idx) => {
 const dlPct = Math.min(100, (d.download / maxScaleVal) * 100);
 const ulPct = Math.min(100, (d.upload / maxScaleVal) * 100);
 const isHovered = hoveredIndex === idx;

 return (
 <div
 key={idx}
 onMouseEnter={() => setHoveredIndex(idx)}
 className="flex-1 flex flex-col justify-end h-full gap-0.5 cursor-pointer group"
 >
 {/* RX (DL) Bar */}
 <div
 className={`w-full rounded-t-xs transition-colors ${
 isHovered
 ? 'bg-cyan-300 shadow-sm'
 : dlPct > 80
 ? 'bg-rose-500'
 : dlPct > 60
 ? 'bg-amber-400'
 : 'bg-cyan-500 opacity-80 group-hover:opacity-100'
 }`}
 style={{ height: `${dlPct}%` }}
 />
 {/* TX (UL) Bar */}
 <div
 className={`w-full rounded-b-xs transition-colors ${
 isHovered
 ? 'bg-emerald-300'
 : 'bg-emerald-500 opacity-80 group-hover:opacity-100'
 }`}
 style={{ height: `${ulPct / 2}%` }}
 />
 </div>
 );
 })}
 </div>
 )}

 {/* Time axis footer */}
 <div className="flex justify-between text-[10px] font-mono text-slate-800 pt-3 border-t border-slate-200 mt-1">
 <span>{activeStream[0]?.time || 'T-48s'}</span>
 <span>{activeStream[Math.floor(activeStream.length / 2)]?.time || 'T-24s'}</span>
 <span className="text-[#3c8dbc] font-bold">● LIVE NOW ({activeStream[activeStream.length - 1]?.time || 'Now'})</span>
 </div>
 </div>
 ) : (
 /* Disconnected State */
 <div className="bg-white border border-dashed border-slate-200 rounded p-8 flex flex-col items-center justify-center text-center space-y-3">
 <div className="w-12 h-12 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
 <Plug className="w-6 h-6" />
 </div>
 <div>
 <h4 className="text-sm font-bold text-slate-700 font-mono">MIKROTIK SOCKET OFFLINE</h4>
 <p className="text-xs text-slate-800 max-w-sm mt-1">
 Connect your MikroTik RouterBoard to stream live traffic for ether1-wan, ether2-lan, ether3-hotspot and aggregate trunk.
 </p>
 </div>
 <button
 type="button"
 onClick={onConnectRouter}
 className="px-5 py-2.5 rounded bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-extrabold text-xs shadow-sm hover:brightness-110 transition-colors cursor-pointer flex items-center gap-2"
 >
 <Radio className="w-4 h-4" /> Connect Router Board
 </button>
 </div>
 )}

 {/* 4. EXECUTIVE TELEMETRY TILES HUD */}
 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
 {/* RX Download */}
 <div className="bg-white border border-slate-200 rounded p-3">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#3c8dbc] flex items-center justify-between mb-1">
 <span className="flex items-center gap-1">
 <ArrowDown className="w-3.5 h-3.5 text-[#3c8dbc]" /> Ingress (RX)
 </span>
 </div>
 <div className="text-xl sm:text-2xl font-black font-mono text-[#3c8dbc] tracking-tight">
 {routerConfig.connected ? activeStats.rx : '0.0'}{' '}
 <span className="text-xs text-slate-800 font-normal">Mbps</span>
 </div>
 <div className="text-[10px] text-slate-800 font-mono mt-0.5">
 Peak: <strong className="text-slate-900">{activeStats.peakRx} Mbps</strong>
 </div>
 </div>

 {/* TX Upload */}
 <div className="bg-white border border-slate-200 rounded p-3">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#00a65a] flex items-center justify-between mb-1">
 <span className="flex items-center gap-1">
 <ArrowUp className="w-3.5 h-3.5 text-[#00a65a]" /> Egress (TX)
 </span>
 </div>
 <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300 tracking-tight">
 {routerConfig.connected ? activeStats.tx : '0.0'}{' '}
 <span className="text-xs text-slate-800 font-normal">Mbps</span>
 </div>
 <div className="text-[10px] text-slate-800 font-mono mt-0.5">
 Peak: <strong className="text-slate-900">{activeStats.peakTx} Mbps</strong>
 </div>
 </div>

 {/* Combined Load */}
 <div className="bg-white border border-slate-200 rounded p-3">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 mb-1">
 Total Throughput
 </div>
 <div className="text-xl sm:text-2xl font-black font-mono text-slate-800 tracking-tight">
 {routerConfig.connected ? (activeStats.rx + activeStats.tx).toFixed(1) : '0.0'}{' '}
 <span className="text-xs text-slate-800 font-normal">Mbps</span>
 </div>
 <div className="text-[10px] text-[#00a65a] font-mono mt-0.5 flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3" /> Full Duplex OK
 </div>
 </div>

 {/* Latency / Jitter */}
 <div className="bg-white border border-slate-200 rounded p-3">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
 Ping Latency
 </div>
 <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 tracking-tight">
 {routerConfig.connected ? activeStats.ping : '0'}{' '}
 <span className="text-xs text-slate-800 font-normal">ms</span>
 </div>
 <div className="text-[10px] text-slate-800 font-mono mt-0.5">
 Jitter: <strong className="text-slate-900">{activeStats.jitter} ms</strong>
 </div>
 </div>

 {/* Packets per Sec */}
 <div className="bg-white border border-slate-200 rounded p-3 hidden lg:block">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 mb-1">
 Packets / Sec
 </div>
 <div className="text-xl font-black font-mono text-purple-300 tracking-tight">
 {routerConfig.connected ? `${(activeStats.rxPkts + activeStats.txPkts).toLocaleString()}` : '0'}{' '}
 <span className="text-xs text-slate-800 font-normal">p/s</span>
 </div>
 <div className="text-[10px] text-slate-800 font-mono mt-0.5">
 Hardware FastPath
 </div>
 </div>

 {/* Total Volume */}
 <div className="bg-white border border-slate-200 rounded p-3 hidden lg:block">
 <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 mb-1">
 Total Session In/Out
 </div>
 <div className="text-base font-black font-mono text-sky-300 tracking-tight mt-0.5">
 ↓ {totalAccumulatedGB.rx} GB
 </div>
 <div className="text-xs font-mono text-[#00a65a]">
 ↑ {totalAccumulatedGB.tx} GB
 </div>
 </div>
 </div>
 </div>
 );
};
