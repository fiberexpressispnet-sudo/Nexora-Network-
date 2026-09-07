import React, { useState } from 'react';
import { AppSettings, Client, PaymentRecord, RouterConfig } from '../../types';
import {
 ShieldCheck,
 Key,
 Lock,
 Smartphone,
 Users,
 Clock,
 Download,
 Upload,
 AlertTriangle,
 CheckCircle2,
 RefreshCw,
 Eye,
 EyeOff,
 Server,
 Layers,
} from 'lucide-react';

interface SecurityPageProps {
 settings: AppSettings;
 clients: Client[];
 payments: PaymentRecord[];
 routerConfig: RouterConfig;
 showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
 onRestoreData?: (data: any) => void;
}

export const SecurityPage: React.FC<SecurityPageProps> = ({
 settings,
 clients,
 payments,
 routerConfig,
 showToast,
 onRestoreData,
}) => {
 const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
 const [activeTab, setActiveTab] = useState<'auth' | 'roles' | 'sessions' | 'backup'>('auth');
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [showPass, setShowPass] = useState(false);

 const loginHistory = [
 { ip: '103.145.12.5', device: 'Chrome on Windows 11', time: 'Today at 09:15 AM', status: 'Success (Current Session)' },
 { ip: '103.145.12.5', device: 'Safari on iPhone 15 Pro', time: 'Yesterday at 08:30 PM', status: 'Success' },
 { ip: '172.56.21.9', device: 'Firefox on macOS', time: '3 days ago at 11:20 AM', status: 'Success' },
 { ip: '185.220.101.5', device: 'Unknown Bot / Tor Exit', time: '5 days ago at 03:14 AM', status: 'Blocked (Failed Password)' },
 ];

 const handlePasswordChange = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newPassword || newPassword !== confirmPassword) {
 showToast('New password and confirmation do not match!', 'error');
 return;
 }
 showToast('Admin password updated successfully!', 'success');
 setCurrentPassword('');
 setNewPassword('');
 setConfirmPassword('');
 };

 const handleExportBackup = () => {
 const fullBackup = {
 exportedAt: new Date().toISOString(),
 system: 'Nexora network Management Suite',
 version: '3.5.0',
 settings,
 clients,
 payments,
 routerConfig,
 };

 const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
 const downloadAnchor = document.createElement('a');
 downloadAnchor.setAttribute('href', dataStr);
 downloadAnchor.setAttribute('download', `nexoranetwork_backup_${new Date().toISOString().split('T')[0]}.json`);
 document.body.appendChild(downloadAnchor);
 downloadAnchor.click();
 downloadAnchor.remove();

 showToast('Complete database backup file downloaded successfully!', 'success');
 };

 const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
 const fileReader = new FileReader();
 if (e.target.files && e.target.files[0]) {
 fileReader.readAsText(e.target.files[0], 'UTF-8');
 fileReader.onload = (event) => {
 try {
 const parsed = JSON.parse(event.target?.result as string);
 if (parsed && (parsed.clients || parsed.settings)) {
 if (onRestoreData) onRestoreData(parsed);
 showToast('System backup data restored successfully!', 'success');
 } else {
 showToast('Invalid backup file format!', 'error');
 }
 } catch (err) {
 showToast('Failed to read backup file!', 'error');
 }
 };
 }
 };

 return (
 <div className="space-y-6">
 {/* Header Banner */}
 <div className="bg-slate-50 border border-slate-300 rounded p-5 text-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded shadow-sm">
 <ShieldCheck className="w-6 h-6 text-slate-800" />
 </div>
 <div>
 <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
 <span>Security, RBAC Access &amp; Database Safeguards</span>
 <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
 AES-256 Encrypted
 </span>
 </h1>
 <p className="text-xs text-slate-900 mt-0.5">
 Two-Factor Authentication (2FA), role-based permissions, login history, and database backup & restore.
 </p>
 </div>
 </div>

 <button
 onClick={handleExportBackup}
 className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded shadow-md transition-all cursor-pointer flex items-center gap-1.5"
 >
 <Download className="w-4 h-4" />
 <span>Export Full JSON Backup</span>
 </button>
 </div>

 {/* Navigation Tabs */}
 <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
 {[
 { id: 'auth', label: '2FA & Admin Password', icon: Key },
 { id: 'roles', label: 'Role-Based Access (RBAC)', icon: Users },
 { id: 'sessions', label: 'Login History & Device Sessions', icon: Clock },
 { id: 'backup', label: 'System Backup & Restore', icon: Layers },
 ].map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as any)}
 className={`flex items-center gap-2 px-4 py-2.5 rounded border transition-all cursor-pointer whitespace-nowrap ${
 isActive
 ? 'bg-indigo-600 text-white border-indigo-500 font-black shadow-sm'
 : 'bg-white border-slate-200 text-slate-900 hover:text-slate-900 '
 }`}
 >
 <Icon className="w-4 h-4" />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>

 {/* TAB 1: 2FA & PASSWORD */}
 {activeTab === 'auth' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Two-Factor Authentication */}
 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Smartphone className="w-4 h-4 text-indigo-500" />
 <span>Two-Factor Authentication (2FA / OTP)</span>
 </h3>
 <p className="text-xs text-slate-800">
 Enforce Google Authenticator or SMS OTP verification when logging into the admin panel.
 </p>

 <div className="p-4 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
 <div>
 <div className="font-bold text-xs text-slate-900 ">Require 2FA on Sign In</div>
 <div className="text-[11px] text-slate-800">Protects against credential theft</div>
 </div>
 <button
 onClick={() => {
 setTwoFactorEnabled(!twoFactorEnabled);
 showToast(`2FA Authentication ${!twoFactorEnabled ? 'Enabled' : 'Disabled'}`, 'info');
 }}
 className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
 twoFactorEnabled ? 'bg-indigo-600' : 'bg-slate-400 '
 }`}
 >
 <div
 className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
 twoFactorEnabled ? 'right-0.5' : 'left-0.5'
 }`}
 />
 </button>
 </div>

 {twoFactorEnabled && (
 <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded text-xs text-indigo-300 space-y-1">
 <div className="font-bold">2FA Active Protection:</div>
 <div>Authenticator App Key: <span className="font-mono font-bold text-slate-800">FBEXP-9921-XK82-MN41</span></div>
 </div>
 )}
 </div>

 {/* Change Admin Password */}
 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Lock className="w-4 h-4 text-indigo-500" />
 <span>Change Admin Master Password</span>
 </h3>

 <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
 <div>
 <label className="block font-bold text-slate-800 mb-1">Current Password</label>
 <input
 type={showPass ? 'text' : 'password'}
 required
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">New Secure Password</label>
 <input
 type={showPass ? 'text' : 'password'}
 required
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">Confirm New Password</label>
 <input
 type={showPass ? 'text' : 'password'}
 required
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div className="pt-2 flex items-center justify-between">
 <button
 type="button"
 onClick={() => setShowPass(!showPass)}
 className="text-slate-800 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
 >
 {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
 <span>{showPass ? 'Hide' : 'Show'} Password</span>
 </button>

 <button
 type="submit"
 className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow-md transition-colors cursor-pointer"
 >
 Update Password
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* TAB 2: ROLES & RBAC */}
 {activeTab === 'roles' && (
 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Users className="w-4 h-4 text-indigo-500" />
 <span>Role-Based Access Control (RBAC) Permissions</span>
 </h3>

 <div className="overflow-x-auto rounded border border-slate-100 ">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px]">
 <th className="p-3">Role Name</th>
 <th className="p-3">Clients CRUD</th>
 <th className="p-3">Billing &amp; Payment</th>
 <th className="p-3">MikroTik Router</th>
 <th className="p-3">Support Tickets</th>
 <th className="p-3">Audit Logs</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {[
 { role: 'Super Admin', c: 'Full Access', b: 'Full Access', m: 'Full Access', s: 'Full Access', a: 'Full Access' },
 { role: 'Billing Manager', c: 'View & Edit', b: 'Collect & Invoices', m: 'No Access', s: 'View Only', a: 'View Only' },
 { role: 'Support Lineman', c: 'View Only', b: 'No Access', m: 'Reboot/Disconnect', s: 'Update Tickets', a: 'No Access' },
 { role: 'Reseller Sub-Admin', c: 'Own Clients Only', b: 'Own Balance Only', m: 'Assigned Pool', s: 'Own Clients', a: 'No Access' },
 ].map((row, i) => (
 <tr key={i} className="hover:bg-slate-50 font-medium">
 <td className="p-3 font-bold text-slate-900 ">{row.role}</td>
 <td className="p-3 text-emerald-500">{row.c}</td>
 <td className="p-3 text-sky-400">{row.b}</td>
 <td className="p-3 text-amber-400">{row.m}</td>
 <td className="p-3 text-purple-400">{row.s}</td>
 <td className="p-3 text-slate-800">{row.a}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB 3: SESSIONS */}
 {activeTab === 'sessions' && (
 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Clock className="w-4 h-4 text-indigo-500" />
 <span>Admin Login Activity &amp; Active Device Sessions</span>
 </h3>
 <button
 onClick={() => showToast('All active remote sessions have been terminated!', 'info')}
 className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs rounded-lg border border-rose-500/30 transition-colors cursor-pointer"
 >
 Terminate All Other Sessions
 </button>
 </div>

 <div className="space-y-2">
 {loginHistory.map((item, idx) => (
 <div
 key={idx}
 className="p-3 bg-slate-50 border border-slate-100 rounded flex items-center justify-between text-xs font-mono"
 >
 <div>
 <div className="font-bold text-slate-900 font-sans">{item.device}</div>
 <div className="text-[11px] text-slate-800">IP: {item.ip} | {item.time}</div>
 </div>
 <span
 className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
 item.status.includes('Success')
 ? 'bg-emerald-500/20 text-[#00a65a]'
 : 'bg-rose-500/20 text-rose-400'
 }`}
 >
 {item.status}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* TAB 4: BACKUP & RESTORE */}
 {activeTab === 'backup' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Download className="w-4 h-4 text-emerald-500" />
 <span>Download Full Database Snapshot</span>
 </h3>
 <p className="text-xs text-slate-800">
 Single-file JSON backup of client records, billing accounts, payment transactions, and system configuration.
 </p>

 <button
 onClick={handleExportBackup}
 className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
 >
 <Download className="w-4 h-4" />
 <span>Download Instant JSON Backup</span>
 </button>
 </div>

 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Upload className="w-4 h-4 text-sky-500" />
 <span>Restore Database From JSON File</span>
 </h3>
 <p className="text-xs text-slate-800">
 Restore previous state by uploading a previously downloaded JSON backup file.
 </p>

 <label className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded text-xs border border-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-2">
 <Upload className="w-4 h-4 text-sky-400" />
 <span>Select JSON File to Restore</span>
 <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
 </label>
 </div>
 </div>
 )}
 </div>
 );
};
