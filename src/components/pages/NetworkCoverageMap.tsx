import React, { useState } from 'react';
import { NetworkNodeItem, Client } from '../../types';
import {
 MapPin,
 Radio,
 Server,
 Wifi,
 Activity,
 Layers,
 Search,
 Filter,
 CheckCircle2,
 AlertTriangle,
 Zap,
 Info,
 Maximize2,
} from 'lucide-react';

interface NetworkCoverageMapProps {
 clients: Client[];
 showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

const defaultNodes: NetworkNodeItem[] = [
 {
 id: 'NODE-1',
 name: 'Main NOC & Core Router (CCR2004)',
 type: 'Core Router',
 ip: '103.145.12.1',
 status: 'Online',
 lat: 23.8759,
 lng: 90.3795,
 zone: 'Uttara Sector 4 NOC',
 connectedClients: 350,
 },
 {
 id: 'NODE-2',
 name: 'GPON OLT-01 (VSOL 16-Port)',
 type: 'OLT',
 ip: '172.16.10.2',
 ponPort: 'PON 1-8',
 status: 'Online',
 signalPower: '+3.5 dBm Tx',
 lat: 23.8785,
 lng: 90.383,
 zone: 'Uttara North Zone',
 connectedClients: 180,
 parentConnection: 'Main NOC',
 },
 {
 id: 'NODE-3',
 name: 'EPON OLT-02 (BDCOM 8-Port)',
 type: 'OLT',
 ip: '172.16.10.3',
 ponPort: 'PON 1-4',
 status: 'Online',
 signalPower: '+4.0 dBm Tx',
 lat: 23.8223,
 lng: 90.3654,
 zone: 'Mirpur POP Hub',
 connectedClients: 120,
 parentConnection: 'Main NOC',
 },
 {
 id: 'NODE-4',
 name: 'Road 5 Distribution Box (1:8 Splitter)',
 type: 'Splitter',
 status: 'Online',
 signalPower: '-18.4 dBm Rx',
 lat: 23.8765,
 lng: 90.3812,
 zone: 'Uttara Sector 4',
 connectedClients: 8,
 parentConnection: 'GPON OLT-01',
 },
 {
 id: 'NODE-5',
 name: 'Road 12 Pole TJ Box (1:16 Splitter)',
 type: 'Splitter',
 status: 'Degraded',
 signalPower: '-26.8 dBm (High Loss)',
 lat: 23.879,
 lng: 90.3845,
 zone: 'Uttara Sector 4',
 connectedClients: 14,
 parentConnection: 'GPON OLT-01',
 },
 {
 id: 'NODE-6',
 name: 'Mirpur Block B Distribution Hub',
 type: 'Distribution Box',
 status: 'Online',
 signalPower: '-19.2 dBm Rx',
 lat: 23.821,
 lng: 90.368,
 zone: 'Mirpur 11',
 connectedClients: 32,
 parentConnection: 'EPON OLT-02',
 },
];

export const NetworkCoverageMap: React.FC<NetworkCoverageMapProps> = ({
 clients,
 showToast,
}) => {
 const [selectedNode, setSelectedNode] = useState<NetworkNodeItem>(defaultNodes[0]);
 const [activeZoneFilter, setActiveZoneFilter] = useState<string>('All');

 const filteredNodes = defaultNodes.filter(
 (n) => activeZoneFilter === 'All' || n.zone.toLowerCase().includes(activeZoneFilter.toLowerCase())
 );

 return (
 <div className="space-y-6">
 {/* Header Banner */}
 <div className="bg-slate-50 border border-slate-300 rounded p-5 text-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-gradient-to-br from-sky-500 to-indigo-600 rounded shadow-sm">
 <MapPin className="w-6 h-6 text-slate-800" />
 </div>
 <div>
 <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
 <span>Fiber Network &amp; Coverage Topology Map</span>
 <span className="text-xs font-mono bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-500/30">
 GPON / EPON Optical GIS
 </span>
 </h1>
 <p className="text-xs text-slate-900 mt-0.5">
 কোর রাউটার, OLT, অপটিক্যাল স্প্লিটার, ডিস্ট্রিবিউশন বক্স এবং গ্রাহক ফাইবারের লাইভ সিগন্যাল পাওয়ার (-dBm)।
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <select
 value={activeZoneFilter}
 onChange={(e) => setActiveZoneFilter(e.target.value)}
 className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-sky-400"
 >
 <option value="All">All Coverage Zones</option>
 <option value="Uttara">Uttara Sector 4 / North</option>
 <option value="Mirpur">Mirpur 11 POP</option>
 </select>
 </div>
 </div>

 {/* Main Interactive Visual Canvas & Detail Split */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Interactive Visual Network Canvas */}
 <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded p-6 shadow-md relative min-h-[460px] flex flex-col justify-between overflow-hidden">
 {/* Canvas Background Grid */}
 <div
 className="absolute inset-0 opacity-15 pointer-events-none"
 style={{
 backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
 backgroundSize: '24px 24px',
 }}
 />

 {/* Top Canvas Bar */}
 <div className="relative z-10 flex items-center justify-between">
 <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded text-xs text-slate-700">
 <Activity className="w-3.5 h-3.5 text-[#00a65a] animate-pulse" />
 <span>Topology Live Sync (6 Optical Nodes)</span>
 </div>

 <div className="flex items-center gap-3 text-[11px] font-mono text-slate-800">
 <span className="flex items-center gap-1">
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Optimal (&gt; -24 dBm)
 </span>
 <span className="flex items-center gap-1">
 <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> High Loss (&lt; -26 dBm)
 </span>
 </div>
 </div>

 {/* Schematic Visual Graph Nodes */}
 <div className="relative z-10 my-8 grid grid-cols-3 gap-4 sm:gap-6 items-center">
 {filteredNodes.map((node) => {
 const isSelected = selectedNode.id === node.id;
 const isDegraded = node.status === 'Degraded';
 return (
 <div
 key={node.id}
 onClick={() => setSelectedNode(node)}
 className={`p-4 rounded border transition-all cursor-pointer relative group ${
 isSelected
 ? 'bg-sky-950/80 border-sky-400 shadow-lg ring-2 ring-sky-400/30'
 : 'bg-white border-slate-200 hover:border-slate-300'
 }`}
 >
 <div className="flex items-center justify-between mb-2">
 <div
 className={`p-2 rounded ${
 node.type === 'Core Router'
 ? 'bg-purple-500/20 text-purple-400'
 : node.type === 'OLT'
 ? 'bg-sky-500/20 text-sky-400'
 : 'bg-emerald-500/20 text-[#00a65a]'
 }`}
 >
 {node.type === 'Core Router' ? (
 <Server className="w-4 h-4" />
 ) : node.type === 'OLT' ? (
 <Radio className="w-4 h-4" />
 ) : (
 <Layers className="w-4 h-4" />
 )}
 </div>
 <span
 className={`w-2 h-2 rounded-full ${
 isDegraded ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
 }`}
 />
 </div>

 <div className="font-extrabold text-xs text-slate-800 group-hover:text-sky-300 transition-colors">
 {node.name}
 </div>
 <div className="text-[10px] text-slate-800 mt-1 font-mono">{node.zone}</div>

 {node.signalPower && (
 <div
 className={`mt-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
 isDegraded
 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
 : 'bg-emerald-500/20 text-emerald-300'
 }`}
 >
 {node.signalPower}
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* Bottom Canvas Footer */}
 <div className="relative z-10 flex items-center justify-between text-xs text-slate-800 border-t border-slate-200 pt-3">
 <span>Core Fiber: 24-Core Armored Single-Mode (G.652D)</span>
 <button
 onClick={() => showToast('Fiber GIS Map refreshed successfully!', 'success')}
 className="text-sky-400 font-bold hover:underline cursor-pointer"
 >
 Re-Scan Optical Power
 </button>
 </div>
 </div>

 {/* Node Inspector Sidebar */}
 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Info className="w-4 h-4 text-sky-500" />
 <span>Node Inspector Details</span>
 </h3>
 <span
 className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
 selectedNode.status === 'Online'
 ? 'bg-emerald-500/20 text-[#00a65a]'
 : 'bg-amber-500/20 text-amber-400'
 }`}
 >
 {selectedNode.status}
 </span>
 </div>

 <div className="space-y-3 text-xs">
 <div>
 <div className="text-slate-800 text-[11px]">Node Name / Hardware:</div>
 <div className="font-bold text-slate-900 text-sm">{selectedNode.name}</div>
 </div>

 <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded font-mono text-[11px] border border-slate-100 ">
 <div>
 <span className="text-slate-800 font-sans block">Type:</span>
 <span className="font-bold text-sky-400">{selectedNode.type}</span>
 </div>
 <div>
 <span className="text-slate-800 font-sans block">IP Address:</span>
 <span className="font-bold text-slate-900 ">{selectedNode.ip || 'Passive Box'}</span>
 </div>
 <div>
 <span className="text-slate-800 font-sans block">Subscribers:</span>
 <span className="font-bold text-[#00a65a]">{selectedNode.connectedClients} Online</span>
 </div>
 <div>
 <span className="text-slate-800 font-sans block">Optical Power:</span>
 <span className="font-bold text-amber-400">{selectedNode.signalPower || 'N/A'}</span>
 </div>
 </div>

 <div>
 <div className="text-slate-800 text-[11px]">Location Zone:</div>
 <div className="font-medium text-slate-800 ">{selectedNode.zone}</div>
 </div>

 <div className="pt-2 border-t border-slate-100 space-y-2">
 <button
 onClick={() => showToast(`OTDR Optical Pulse dispatched to ${selectedNode.name}`, 'info')}
 className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-xs shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
 >
 <Zap className="w-3.5 h-3.5" />
 <span>Run OTDR Fiber Pulse Test</span>
 </button>

 <button
 onClick={() => showToast(`Viewing all ${selectedNode.connectedClients} clients in this zone`, 'info')}
 className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-xs transition-colors cursor-pointer"
 >
 View Connected Subscribers ({selectedNode.connectedClients})
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};
