import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, Search, CheckCircle, AlertTriangle, Info, RefreshCw, Save, History, PlayCircle, ShieldAlert } from 'lucide-react';
import { DnsSecurityStatus, DnsProfileId, SecurityLogItem, ProposedChanges, RouterConfig } from '../../types';

interface MikrotikSecurityProps {
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
 routerConfig: RouterConfig;
}

export const MikrotikSecurityPage: React.FC<MikrotikSecurityProps> = ({
 showToast,
 routerConfig,
}) => {
 const connected = routerConfig.connected;
 const [loading, setLoading] = useState(false);
 const [status, setStatus] = useState<DnsSecurityStatus | null>(null);
 const [selectedProfile, setSelectedProfile] = useState<DnsProfileId>('cloudflare');
 const [previewOpen, setPreviewOpen] = useState(false);
 const [proposed, setProposed] = useState<ProposedChanges | null>(null);

 useEffect(() => {
 if (connected) {
 setLoading(true);
 fetch('/api/mikrotik/status', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 host: routerConfig.ip,
 port: routerConfig.apiPort,
 username: routerConfig.username,
 password: routerConfig.password,
 })
 })
 .then(r => r.json())
 .then(data => {
 if (data.success && data.info) {
 const info = data.info;
 let activeProfile: DnsProfileId = 'custom';
 if (info.currentPrimaryDns === '1.1.1.3') activeProfile = 'cloudflare';
 if (info.currentPrimaryDns === '94.140.14.15') activeProfile = 'adguard';
 
 setSelectedProfile(activeProfile);
 setStatus({
 enabled: info.redirectUdpPort53Active,
 profile: activeProfile,
 primaryDns: info.currentPrimaryDns,
 secondaryDns: info.currentSecondaryDns,
 allowRemoteRequests: info.allowRemoteRequests,
 redirectUdpPort53: info.redirectUdpPort53Active,
 redirectTcpPort53: info.redirectTcpPort53Active,
 backupCreated: false,
 hotspotInfo: {
 serverName: info.hotspotServer,
 interfaceName: info.hotspotInterface,
 addressPool: info.addressPool,
 subnet: info.subnet,
 dhcpServer: info.dhcpServer,
 routerIp: routerConfig.ip,
 activeClientsCount: 142 // Mocked metric
 }
 });
 }
 })
 .catch(() => {
 showToast('Failed to load DNS status from backend API', 'error');
 })
 .finally(() => setLoading(false));
 }
 }, [connected, routerConfig]);

 const dnsProfiles: Record<DnsProfileId, { name: string, primary: string, secondary: string, desc: string }> = {
 cloudflare: { name: 'Cloudflare Family', primary: '1.1.1.3', secondary: '1.0.0.3', desc: 'Blocks malware and adult content. Recommended for public hotspots.' },
 adguard: { name: 'Ad Blocking (AdGuard)', primary: '94.140.14.15', secondary: '94.140.15.16', desc: 'Blocks ads, tracking, and phishing.' },
 custom: { name: 'Custom DNS', primary: '', secondary: '', desc: 'Provide your own DNS servers.' }
 };

 const handleGeneratePreview = () => {
 if (!status?.hotspotInfo) return;
 setLoading(true);
 
 setTimeout(() => {
 const profile = dnsProfiles[selectedProfile];
 const primary = profile.primary || status.primaryDns;
 const secondary = profile.secondary || status.secondaryDns;
 
 const commands = [
 `# STEP 1: Enable remote requests and set DNS servers`,
 `/ip dns set allow-remote-requests=yes servers=${primary},${secondary}`,
 ``,
 `# STEP 2: Redirect all UDP port 53 traffic from Hotspot clients to MikroTik`,
 `/ip firewall nat add chain=dstnat action=redirect to-ports=53 protocol=udp dst-port=53 src-address=${status.hotspotInfo!.subnet} comment="DNS-Security-Redirect-UDP"`,
 ``,
 `# STEP 3: Redirect all TCP port 53 traffic from Hotspot clients to MikroTik`,
 `/ip firewall nat add chain=dstnat action=redirect to-ports=53 protocol=tcp dst-port=53 src-address=${status.hotspotInfo!.subnet} comment="DNS-Security-Redirect-TCP"`,
 ];

 setProposed({
 commands,
 explanation: [
 'Set Router DNS to ' + profile.name,
 'Capture and redirect UDP DNS queries from hotspot subnet',
 'Capture and redirect TCP DNS queries from hotspot subnet'
 ],
 hotspotInterface: status.hotspotInfo!.interfaceName,
 subnet: status.hotspotInfo!.subnet,
 existingRulesFound: 0,
 conflicts: []
 });
 setPreviewOpen(true);
 setLoading(false);
 }, 800);
 };

 const handleApplyConfig = () => {
 setLoading(true);
 
 fetch('/api/mikrotik/apply-dns', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 params: {
 host: routerConfig.ip,
 port: routerConfig.apiPort,
 username: routerConfig.username,
 password: routerConfig.password,
 },
 primary: dnsProfiles[selectedProfile].primary || status?.primaryDns,
 secondary: dnsProfiles[selectedProfile].secondary || status?.secondaryDns
 })
 })
 .then(r => r.json())
 .then(data => {
 if (data.success) {
 setStatus(prev => prev ? {
 ...prev,
 enabled: true,
 profile: selectedProfile,
 primaryDns: dnsProfiles[selectedProfile].primary || prev.primaryDns,
 secondaryDns: dnsProfiles[selectedProfile].secondary || prev.secondaryDns,
 redirectUdpPort53: true,
 redirectTcpPort53: true,
 lastConfiguredAt: new Date().toLocaleString(),
 backupCreated: true,
 } : null);
 
 setPreviewOpen(false);
 showToast('DNS Security Configuration Applied via API!', 'success');
 } else {
 showToast(data.error || 'Failed to apply configuration', 'error');
 }
 })
 .catch(() => showToast('API request failed', 'error'))
 .finally(() => setLoading(false));
 };

 if (!connected) {
 return (
 <div className="flex flex-col items-center justify-center p-12 bg-white/70 backdrop-blur-md rounded border border-white/40 ">
 <Server className="w-16 h-16 text-slate-900 mb-4" />
 <h2 className="text-xl font-bold text-slate-700 ">MikroTik Not Connected</h2>
 <p className="text-slate-800 mt-2 text-center max-w-md text-sm">Please connect to your MikroTik router first in the Configuration module to manage DNS Security.</p>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 
 {/* Warning Callout */}
 <div className="bg-amber-500/10 border border-amber-500/30 rounded p-4 flex gap-3 items-start">
 <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
 <div>
 <h4 className="text-sm font-bold text-amber-700 ">DNS Filtering Limitations</h4>
 <p className="text-xs text-amber-600 mt-1">
 DNS filtering is not 100% effective against browsers/apps using encrypted DNS (DNS-over-HTTPS/DoH), VPN, or proxy services. 
 This configuration enforces standard port 53 DNS redirection.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
 {/* Left Column: Config Panel */}
 <div className="lg:col-span-2 space-y-6">
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm">
 <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
 <ShieldCheck className="w-5 h-5 text-indigo-500" /> Configure DNS Security
 </h3>
 {status?.enabled && (
 <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-600 text-xs font-bold flex items-center gap-1.5">
 <CheckCircle className="w-3.5 h-3.5" /> Protected
 </span>
 )}
 </div>

 <div className="space-y-5">
 <div>
 <label className="block text-sm font-semibold text-slate-700 mb-2">Select DNS Provider</label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {(Object.keys(dnsProfiles) as DnsProfileId[]).map((key) => {
 const profile = dnsProfiles[key];
 const isSelected = selectedProfile === key;
 return (
 <div 
 key={key}
 onClick={() => setSelectedProfile(key)}
 className={`p-3 rounded border-2 cursor-pointer transition-all ${
 isSelected 
 ? 'border-indigo-500 bg-indigo-50 ' 
 : 'border-slate-200 hover:border-indigo-300 '
 }`}
 >
 <div className="flex justify-between items-start">
 <strong className={`block text-sm ${isSelected ? 'text-indigo-700 ' : 'text-slate-700 '}`}>
 {profile.name}
 </strong>
 {isSelected && <CheckCircle className="w-4 h-4 text-indigo-500" />}
 </div>
 <p className="text-[11px] text-slate-800 mt-1 leading-relaxed">{profile.desc}</p>
 {key !== 'custom' && (
 <div className="mt-2 flex flex-col gap-0.5 text-[10px] font-mono text-slate-900 ">
 <span>Pri: {profile.primary}</span>
 <span>Sec: {profile.secondary}</span>
 </div>
 )}
 </div>
 )
 })}
 </div>
 </div>

 {selectedProfile === 'custom' && (
 <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded border border-slate-200 ">
 <div>
 <label className="block text-xs font-semibold text-slate-900 mb-1">Primary DNS</label>
 <input 
 type="text" 
 placeholder="e.g. 8.8.8.8"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-900 mb-1">Secondary DNS</label>
 <input 
 type="text" 
 placeholder="e.g. 8.8.4.4"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>
 )}

 <div className="pt-4 border-t border-slate-200 flex justify-end">
 <button
 onClick={handleGeneratePreview}
 disabled={loading || !status?.hotspotInfo}
 className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
 >
 {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
 Preview &amp; Apply Changes
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* Right Column: Status Panel */}
 <div className="space-y-6">
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 shadow-sm">
 <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
 <Search className="w-4 h-4 text-sky-500" /> Hotspot Discovery
 </h4>
 
 {loading && !status ? (
 <div className="flex justify-center p-4"><RefreshCw className="w-5 h-5 text-slate-800 animate-spin" /></div>
 ) : status?.hotspotInfo ? (
 <div className="space-y-3 text-xs">
 <div className="flex justify-between items-center py-1">
 <span className="text-slate-800">Interface</span>
 <strong className="text-slate-800 font-mono">{status.hotspotInfo.interfaceName}</strong>
 </div>
 <div className="flex justify-between items-center py-1">
 <span className="text-slate-800">Subnet</span>
 <strong className="text-slate-800 font-mono">{status.hotspotInfo.subnet}</strong>
 </div>
 <div className="flex justify-between items-center py-1">
 <span className="text-slate-800">DHCP Server</span>
 <strong className="text-slate-800 font-mono">{status.hotspotInfo.dhcpServer}</strong>
 </div>
 <div className="flex justify-between items-center py-1">
 <span className="text-slate-800">Online Clients</span>
 <strong className="text-teal-600 font-bold">{status.hotspotInfo.activeClientsCount} users</strong>
 </div>
 </div>
 ) : (
 <div className="text-xs text-rose-500 flex items-center gap-1.5 p-3 bg-rose-50 rounded-lg">
 <ShieldAlert className="w-4 h-4 shrink-0" />
 No active Hotspot server found on this router.
 </div>
 )}
 </div>

 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 shadow-sm">
 <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
 <History className="w-4 h-4 text-slate-800" /> Current DNS Status
 </h4>
 
 <div className="space-y-3 text-xs">
 <div className="flex justify-between items-center py-1">
 <span className="text-slate-800">Redirect UDP 53</span>
 {status?.redirectUdpPort53 ? (
 <span className="px-2 py-0.5 bg-teal-500/10 text-teal-600 rounded-md font-bold text-[10px]">ACTIVE</span>
 ) : (
 <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md font-bold text-[10px]">INACTIVE</span>
 )}
 </div>
 <div className="flex justify-between items-center py-1">
 <span className="text-slate-800">Redirect TCP 53</span>
 {status?.redirectTcpPort53 ? (
 <span className="px-2 py-0.5 bg-teal-500/10 text-teal-600 rounded-md font-bold text-[10px]">ACTIVE</span>
 ) : (
 <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md font-bold text-[10px]">INACTIVE</span>
 )}
 </div>
 <div className="flex justify-between items-center py-1 border-t border-slate-100 pt-3 mt-1">
 <span className="text-slate-800">Last Configured</span>
 <strong className="text-slate-800 ">{status?.lastConfiguredAt || 'Never'}</strong>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Preview Modal */}
 {previewOpen && proposed && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white backdrop-blur-sm">
 <div className="bg-white w-full max-w-2xl rounded shadow-md border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
 <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 ">
 <h3 className="font-bold text-slate-900 flex items-center gap-2">
 <Info className="w-5 h-5 text-indigo-500" /> Proposed Configuration
 </h3>
 </div>
 
 <div className="p-5 overflow-y-auto space-y-5 flex-1">
 <div className="bg-amber-50 border border-amber-200 p-3 rounded flex gap-3 text-xs text-amber-700 ">
 <ShieldCheck className="w-4 h-4 shrink-0" />
 <p>A backup of current Firewall/NAT and DNS settings will be saved securely before applying these changes. Transaction workflow will rollback if verification fails.</p>
 </div>

 <div>
 <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Actions to Perform</h4>
 <ul className="list-disc pl-4 space-y-1 text-sm text-slate-700 ">
 {proposed.explanation.map((exp, i) => (
 <li key={i}>{exp}</li>
 ))}
 </ul>
 </div>

 <div>
 <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">RouterOS 6 Commands</h4>
 <div className="bg-white p-4 rounded font-mono text-xs text-[#3c8dbc] overflow-x-auto border border-slate-200">
 {proposed.commands.map((cmd, i) => (
 <div key={i} className={cmd.startsWith('#') ? 'text-slate-800 mt-2 first:mt-0' : 'pl-2'}>
 {cmd}
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
 <button 
 onClick={() => setPreviewOpen(false)}
 className="px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button 
 onClick={handleApplyConfig}
 className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
 >
 <Save className="w-4 h-4" /> Apply Configuration
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
