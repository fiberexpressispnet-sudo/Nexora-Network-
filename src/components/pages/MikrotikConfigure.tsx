import React, { useState } from 'react';
import { RouterConfig, RouterInfo } from '../../types';
import { Plug, Save, Cpu, HardDrive, Clock, Users, ShieldCheck, RefreshCw, Unlink, Link as LinkIcon, Zap } from 'lucide-react';
import { getAdminHeaders } from '../../lib/apiClient';

interface MikrotikConfigureProps {
 routerConfig: RouterConfig;
 onSaveConfig: (config: RouterConfig) => void;
 onConnectRouter: () => void;
 onDisconnectRouter: () => void;
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

export const MikrotikConfigurePage: React.FC<MikrotikConfigureProps> = ({
 routerConfig,
 onSaveConfig,
 onConnectRouter,
 onDisconnectRouter,
 showToast,
}) => {
 const [name, setName] = useState(routerConfig.name);
 const [ip, setIp] = useState(routerConfig.ip);
 const [apiPort, setApiPort] = useState(routerConfig.apiPort);
 const [apiSslPort, setApiSslPort] = useState(routerConfig.apiSslPort);
 const [username, setUsername] = useState(routerConfig.username);
 const [password, setPassword] = useState(routerConfig.password || '');

 const [testing, setTesting] = useState(false);
 const [testResult, setTestResult] = useState<any>(null);

 const [liveInfo, setLiveInfo] = useState<RouterInfo>({
 osVersion: 'RouterOS v7.12.1 (stable)',
 uptime: '14 days, 06:22:10',
 cpu: '12%',
 ram: '128 MB / 512 MB (25%)',
 activeUsers: 42,
 });

 const handleTestConnection = async (isStaging = false) => {
 setTesting(true);
 setTestResult(null);
 try {
 const res = await fetch('/api/mikrotik/test-connection', {
 method: 'POST',
 headers: getAdminHeaders(),
 body: JSON.stringify({
 host: ip,
 port: apiPort,
 username,
 password,
 forceConnect: isStaging,
 }),
 });
 const data = await res.json();
 setTestResult(data);

 if (data.connected || data.success) {
 if (data.info || data.router) {
 const infoObj = data.info || data.router;
 setLiveInfo({
 osVersion: infoObj.version || 'RouterOS',
 uptime: infoObj.uptime || 'N/A',
 cpu: infoObj.cpuLoad ? (String(infoObj.cpuLoad).includes('%') ? infoObj.cpuLoad : `${infoObj.cpuLoad}%`) : (infoObj.cpu || 'N/A'),
 ram: infoObj.ramUsage || infoObj.ram || 'N/A',
 activeUsers: data.activeUsersCount ?? 0,
 });
 }
 showToast(
 data.isDemo
 ? `✅ Staging Mode Verified! Simulated MikroTik active.`
 : `✅ Router Connection Success! MikroTik ${data.info?.identity || data.info?.boardName || ip} is reachable and responding.`,
 'success',
 );
 } else {
 showToast(data.error || 'Connection failed to MikroTik router.', 'error');
 }
 } catch (err: any) {
 showToast(`Network error testing connection: ${err.message}`, 'error');
 } finally {
 setTesting(false);
 }
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const updated: RouterConfig = {
 name: name.trim() || 'Main Router',
 ip: ip.trim(),
 apiPort: Number(apiPort),
 apiSslPort: Number(apiSslPort),
 username: username.trim(),
 password: password,
 connected: routerConfig.connected,
 };
 onSaveConfig(updated);
 showToast('MikroTik API configuration saved!', 'success');
 };

 return (
 <div className="space-y-6">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Configuration Form */}
 <div className="lg:col-span-2 bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-5">
 <div className="flex justify-between items-center border-b border-slate-200/80 pb-4">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
 <Plug className="w-5 h-5 text-sky-600 " /> MikroTik Router API Setup
 </h3>
 <span
 className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
 routerConfig.connected
 ? 'bg-teal-500/10 text-teal-600 '
 : 'bg-rose-500/10 text-rose-600 '
 }`}
 >
 <span
 className={`w-2 h-2 rounded-full ${
 routerConfig.connected ? 'bg-teal-500 animate-ping' : 'bg-rose-500'
 }`}
 />
 {routerConfig.connected ? 'Connected' : 'Disconnected'}
 </span>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Router Identifier Name
 </label>
 <input
 type="text"
 required
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Main Router Board"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Router IP Address
 </label>
 <input
 type="text"
 required
 value={ip}
 onChange={(e) => setIp(e.target.value)}
 placeholder="192.168.1.1"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 API Port
 </label>
 <input
 type="number"
 value={apiPort}
 onChange={(e) => setApiPort(Number(e.target.value))}
 placeholder="8728"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 API SSL Port
 </label>
 <input
 type="number"
 value={apiSslPort}
 onChange={(e) => setApiSslPort(Number(e.target.value))}
 placeholder="8729"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 API Username
 </label>
 <input
 type="text"
 required
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 API Password
 </label>
 <input
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200/80 ">
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => handleTestConnection(false)}
 disabled={testing}
 className="px-3.5 py-2 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
 {testing ? 'Testing Ping...' : 'Live Test'}
 </button>
 <button
 type="button"
 onClick={() => handleTestConnection(true)}
 disabled={testing}
 className="px-3.5 py-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold hover:bg-teal-100 transition-colors flex items-center gap-1.5 cursor-pointer"
 >
 <Zap className="w-3.5 h-3.5 text-teal-600" />
 Staging Test
 </button>
 </div>

 <div className="flex gap-2">
 {routerConfig.connected ? (
 <button
 type="button"
 onClick={onDisconnectRouter}
 className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <Unlink className="w-3.5 h-3.5" /> Disconnect
 </button>
 ) : (
 <button
 type="button"
 onClick={onConnectRouter}
 className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <LinkIcon className="w-3.5 h-3.5" /> Connect Now
 </button>
 )}

 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
 >
 <Save className="w-3.5 h-3.5" /> Save Config
 </button>
 </div>
 </div>
 </form>
 </div>

 {/* Router Live Status Details */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
 <div>
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200/80 pb-4">
 <ShieldCheck className="w-5 h-5 text-teal-500" /> Router System Status
 </h3>

 <div className="space-y-4 pt-4 text-xs">
 <div className="flex items-center justify-between p-3 rounded bg-slate-50 ">
 <span className="text-slate-800 flex items-center gap-2">
 <ShieldCheck className="w-4 h-4 text-sky-500" /> OS Version
 </span>
 <strong className="text-slate-900 font-mono">
 {routerConfig.connected ? liveInfo.osVersion : 'N/A'}
 </strong>
 </div>

 <div className="flex items-center justify-between p-3 rounded bg-slate-50 ">
 <span className="text-slate-800 flex items-center gap-2">
 <Clock className="w-4 h-4 text-amber-500" /> System Uptime
 </span>
 <strong className="text-slate-900 font-mono">
 {routerConfig.connected ? liveInfo.uptime : 'Offline'}
 </strong>
 </div>

 <div className="flex items-center justify-between p-3 rounded bg-slate-50 ">
 <span className="text-slate-800 flex items-center gap-2">
 <Cpu className="w-4 h-4 text-indigo-500" /> CPU Load
 </span>
 <strong className="text-slate-900 font-mono">
 {routerConfig.connected ? liveInfo.cpu : '0%'}
 </strong>
 </div>

 <div className="flex items-center justify-between p-3 rounded bg-slate-50 ">
 <span className="text-slate-800 flex items-center gap-2">
 <HardDrive className="w-4 h-4 text-purple-500" /> RAM Usage
 </span>
 <strong className="text-slate-900 font-mono">
 {routerConfig.connected ? liveInfo.ram : '0 MB'}
 </strong>
 </div>

 <div className="flex items-center justify-between p-3 rounded bg-slate-50 ">
 <span className="text-slate-800 flex items-center gap-2">
 <Users className="w-4 h-4 text-teal-500" /> Active Connections
 </span>
 <strong className="text-teal-600 font-bold font-mono">
 {routerConfig.connected ? liveInfo.activeUsers : 0}
 </strong>
 </div>
 </div>
 </div>

 <div className="text-[11px] text-slate-800 pt-2 border-t border-slate-200/80 ">
 Supports RouterOS API via socket/REST endpoint protocol v6 &amp; v7.
 </div>
 </div>
 </div>

 {/* MikroTik Terminal Setup Script & Mobile vs Router Package Policy Generator */}
 <div className="bg-slate-50 border border-cyan-500/30 rounded p-5 sm:p-6 text-slate-800 shadow-md space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
 <div>
 <h3 className="text-base font-extrabold text-[#3c8dbc] flex items-center gap-2 font-mono">
 <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-[#3c8dbc] border border-cyan-500/40 text-xs">
 NEW TERMINAL SCRIPT
 </span>
 <span>1-Click MikroTik Router Auto-Setup Code</span>
 </h3>
 <p className="text-xs text-slate-800 mt-1">
 Copy this script and paste it into your MikroTik <strong>New Terminal</strong>. It enables API remote access, turns on Cloud DDNS (for access from anywhere in the world), and sets up Mobile vs Router Hotspot package policies.
 </p>
 </div>

 <button
 onClick={() => {
 const scriptText = `# =========================================
# NEXORA NETWORK ISP - MIKROTIK AUTO SETUP SCRIPT
# =========================================

# 1. Enable API Service for Web App Control
/ip service enable api
/ip service set api port=8728
/ip service enable api-ssl
/ip service set api-ssl port=8729

# 2. Enable MikroTik Cloud DDNS (For Global Remote Control from Anywhere)
/ip cloud set ddns-enabled=yes

# 3. Create Mobile Package Profile (Anti-Sharing TTL = 1)
# Ensures Mobile packages ONLY work on 1 phone & CANNOT be tethered or shared via Router
/ip hotspot user profile add name="Mobile-Package" shared-users=1 rate-limit="10M/10M"
/ip firewall mangle add chain=postrouting action=change-ttl new-ttl=set:1 out-interface=all-ethernet comment="Mobile-Package-Block-Router-Sharing"

# 4. Create Router Package Profile (Allows Router & Multi-Device Sharing)
# Allows household WiFi router connection for multiple devices
/ip hotspot user profile add name="Router-Package" shared-users=10 rate-limit="20M/20M"
/ip firewall mangle add chain=postrouting action=change-ttl new-ttl=set:64 out-interface=all-ethernet comment="Router-Package-Allow-Multi-Device"

# 5. Enable Hotspot Cookie & MAC Auto-Login
/ip hotspot profile set [find default=yes] login-by=http-chap,cookie,mac-cookie cookie-lifetime=30d

# Setup Complete! Ready for remote connection.`;
 navigator.clipboard.writeText(scriptText);
 showToast('MikroTik New Terminal Setup Script copied to clipboard!', 'success');
 }}
 className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-black text-xs rounded shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
 >
 Copy Script for New Terminal
 </button>
 </div>

 {/* Script Preview Box */}
 <div className="bg-white border border-slate-200 rounded p-4 font-mono text-xs text-[#00a65a] space-y-1.5 overflow-x-auto selection:bg-[#3c8dbc] selection:text-white">
 <p className="text-slate-800"># 1. Enable API &amp; Cloud DDNS for Remote Access from Anywhere</p>
 <p className="text-[#3c8dbc]">/ip service enable api; /ip service set api port=8728</p>
 <p className="text-[#3c8dbc]">/ip cloud set ddns-enabled=yes</p>

 <p className="text-slate-800 mt-2"># 2. Mobile Package Policy (TTL=1 prevents Router/Tether sharing)</p>
 <p className="text-amber-300">/ip hotspot user profile add name="Mobile-Package" shared-users=1 rate-limit="10M/10M"</p>
 <p className="text-amber-300">/ip firewall mangle add chain=postrouting action=change-ttl new-ttl=set:1 out-interface=all-ethernet comment="Mobile-Block-Router"</p>

 <p className="text-slate-800 mt-2"># 3. Router Package Policy (TTL=64 allows Router &amp; Multi-device WiFi)</p>
 <p className="text-emerald-300">/ip hotspot user profile add name="Router-Package" shared-users=10 rate-limit="20M/20M"</p>

 <p className="text-slate-800 mt-2"># 4. Enable MAC Cookie &amp; Hotspot Auto Login</p>
 <p className="text-sky-300">/ip hotspot profile set [find default=yes] login-by=http-chap,cookie,mac-cookie cookie-lifetime=30d</p>
 </div>
 </div>
 </div>
 );
};
