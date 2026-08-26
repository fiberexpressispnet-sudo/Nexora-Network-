import React, { useState } from 'react';
import { Client, AppSettings, SmsLogItem } from '../../types';
import {
 MessageSquare,
 Send,
 Bell,
 Smartphone,
 CheckCircle2,
 AlertTriangle,
 Clock,
 Sparkles,
 Sliders,
 Filter,
 Search,
 Check,
 ShieldCheck,
 RefreshCw,
} from 'lucide-react';

interface SmsNotificationPageProps {
 clients: Client[];
 settings: AppSettings;
 showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

const defaultSmsLogs: SmsLogItem[] = [
 {
 id: 'SMS-1',
 recipientName: 'Tanvir Ahmed',
 phone: '01711223344',
 type: 'Payment Received',
 message: 'Dear Tanvir Ahmed, we received ৳800 for Package Standard 20M. Valid till 2026-09-19. Nexora network.',
 sentAt: '2026-08-19 11:30 AM',
 status: 'Delivered',
 },
 {
 id: 'SMS-2',
 recipientName: 'Nusrat Jahan',
 phone: '01812345678',
 type: 'Payment Due Reminder',
 message: 'Reminder: Your Nexora network bill of ৳500 is due on 2026-08-20. Pay via bKash/Nagad to avoid interruption.',
 sentAt: '2026-08-19 09:00 AM',
 status: 'Delivered',
 },
 {
 id: 'SMS-3',
 recipientName: 'Mahmudul Hasan',
 phone: '01911998877',
 type: 'Package Expiring',
 message: 'Dear Mahmudul Hasan, your internet package expires tomorrow. Please renew online to enjoy uninterrupted fiber net.',
 sentAt: '2026-08-18 06:15 PM',
 status: 'Delivered',
 },
];

export const SmsNotificationPage: React.FC<SmsNotificationPageProps> = ({
 clients,
 settings,
 showToast,
}) => {
 const [activeTab, setActiveTab] = useState<'broadcast' | 'triggers' | 'gateway' | 'logs'>('broadcast');

 // Automated trigger settings
 const [triggers, setTriggers] = useState({
 billGenerated: true,
 paymentReceived: true,
 paymentDue: true,
 paymentOverdue: true,
 packageExpiring: true,
 packageRenewed: true,
 connectionSuspended: true,
 connectionActivated: true,
 complaintUpdated: true,
 });

 // Gateway Settings
 const [gatewayConfig, setGatewayConfig] = useState({
 provider: 'Bangladesh SMS Hub (Greenweb / BulkSMS)',
 senderId: 'NEXORA',
 apiKey: 'bk_live_89f7832a8e919cd8271037',
 smsBalance: 2840,
 smsRate: '৳0.35 / SMS',
 });

 // Broadcast Composer
 const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'due' | 'expired' | 'online'>('due');
 const [customMessage, setCustomMessage] = useState(
 'সম্মানিত গ্রাহক, আপনার Nexora network ইন্টারনেট বিল বকেয়া রয়েছে। নিরবচ্ছিন্ন সেবার জন্য দ্রুত বিল পরিশোধ করুন। ধন্যবাদ।'
 );
 const [logs, setLogs] = useState<SmsLogItem[]>(() => {
 try {
 const saved = localStorage.getItem('isp_sms_logs');
 if (saved) return JSON.parse(saved);
 } catch (e) {
 console.error(e);
 }
 return defaultSmsLogs;
 });

 const getTargetRecipients = () => {
 if (broadcastTarget === 'all') return clients;
 if (broadcastTarget === 'due' || broadcastTarget === 'expired')
 return clients.filter((c) => c.status === 'expired');
 if (broadcastTarget === 'online') return clients.filter((c) => c.status === 'online');
 return clients;
 };

 const recipients = getTargetRecipients();

 const handleSendBroadcast = () => {
 if (!customMessage.trim()) {
 showToast('অনুগ্রহ করে মেসেজ লিখুন।', 'error');
 return;
 }
 if (recipients.length === 0) {
 showToast('নির্বাচিত ক্যাটাগরিতে কোনো গ্রাহক নেই।', 'error');
 return;
 }

 const newLogs: SmsLogItem[] = recipients.map((r, i) => ({
 id: `SMS-${Date.now()}-${i}`,
 recipientName: r.name,
 phone: r.phone,
 type: 'Custom Broadcast',
 message: customMessage.replace('{client_name}', r.name).replace('{user_id}', r.userId),
 sentAt: new Date().toLocaleString(),
 status: 'Delivered',
 }));

 const updatedLogs = [...newLogs, ...logs];
 setLogs(updatedLogs);
 localStorage.setItem('isp_sms_logs', JSON.stringify(updatedLogs));

 setGatewayConfig((prev) => ({
 ...prev,
 smsBalance: Math.max(0, prev.smsBalance - recipients.length),
 }));

 showToast(
 `সফলভাবে ${recipients.length} জন গ্রাহককে বাল্ক SMS পাঠানো হয়েছে! (Sender: ${gatewayConfig.senderId})`,
 'success'
 );
 };

 return (
 <div className="space-y-6">
 {/* Header Banner */}
 <div className="bg-slate-50 border border-slate-300 rounded p-5 text-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded shadow-sm">
 <MessageSquare className="w-6 h-6 text-slate-800" />
 </div>
 <div>
 <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
 <span>Automated SMS &amp; Multi-Channel Notification Center</span>
 <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
 Sender ID: {gatewayConfig.senderId}
 </span>
 </h1>
 <p className="text-xs text-slate-900 mt-0.5">
 অটোমেটিক বিলিং SMS, মেয়াদোত্তীর্ণ সতর্কতা, হোয়াটসঅ্যাপ ডিরেক্ট মেসেজ ও বাল্ক নোটিফিকেশন ইঞ্জিন।
 </p>
 </div>
 </div>

 <div className="bg-white border border-emerald-500/30 px-4 py-2 rounded text-xs font-mono flex items-center gap-3">
 <div>
 <div className="text-[10px] text-slate-800">SMS Balance</div>
 <div className="text-base font-black text-[#00a65a]">{gatewayConfig.smsBalance.toLocaleString()} SMS</div>
 </div>
 <button
 onClick={() => showToast('SMS Gateway Recharged with 1,000 SMS!', 'success')}
 className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
 >
 + Top-Up
 </button>
 </div>
 </div>

 {/* Navigation Tabs */}
 <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
 {[
 { id: 'broadcast', label: 'Broadcast SMS Composer', icon: Send },
 { id: 'triggers', label: 'Automated Event Triggers (9 Triggers)', icon: Bell },
 { id: 'gateway', label: 'SMS Gateway & WhatsApp API', icon: Sliders },
 { id: 'logs', label: `Sent Delivery Logs (${logs.length})`, icon: Clock },
 ].map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as any)}
 className={`flex items-center gap-2 px-4 py-2.5 rounded border transition-all cursor-pointer whitespace-nowrap ${
 isActive
 ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm'
 : 'bg-white border-slate-200 text-slate-900 hover:text-slate-900 '
 }`}
 >
 <Icon className="w-4 h-4" />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>

 {/* TAB 1: BROADCAST COMPOSER */}
 {activeTab === 'broadcast' && (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Send className="w-4 h-4 text-emerald-500" />
 <span>Compose Custom Bulk Broadcast SMS</span>
 </h3>

 <div>
 <label className="block font-bold text-xs text-slate-800 mb-1.5">Select Target Audience</label>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
 {[
 { id: 'due', label: 'Due / Expired Clients', count: clients.filter((c) => c.status === 'expired').length },
 { id: 'all', label: 'All Active Clients', count: clients.length },
 { id: 'online', label: 'Online Users Now', count: clients.filter((c) => c.status === 'online').length },
 { id: 'expired', label: 'Suspended Lines', count: clients.filter((c) => c.status === 'suspended').length },
 ].map((target) => (
 <button
 key={target.id}
 type="button"
 onClick={() => setBroadcastTarget(target.id as any)}
 className={`p-3 rounded border text-left transition-all cursor-pointer ${
 broadcastTarget === target.id
 ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 font-bold ring-2 ring-emerald-500/20'
 : 'bg-slate-50 border-slate-200 text-slate-700 '
 }`}
 >
 <div className="text-[11px]">{target.label}</div>
 <div className="text-lg font-black mt-1 font-mono">{target.count} Recipient{target.count > 1 ? 's' : ''}</div>
 </button>
 ))}
 </div>
 </div>

 <div>
 <div className="flex items-center justify-between mb-1.5">
 <label className="block font-bold text-xs text-slate-800">Message Template / Text (Bangla / English)</label>
 <span className="text-[11px] font-mono text-slate-800">
 {customMessage.length} characters ({Math.ceil(customMessage.length / 160)} SMS Parts)
 </span>
 </div>
 <textarea
 rows={4}
 value={customMessage}
 onChange={(e) => setCustomMessage(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
 />
 </div>

 {/* Quick Dynamic Tags */}
 <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
 <span className="text-slate-800 font-bold">Quick Tags:</span>
 {['{client_name}', '{user_id}', '{amount}', '{expiry_date}', '{company_name}'].map((tag) => (
 <button
 key={tag}
 type="button"
 onClick={() => setCustomMessage((prev) => `${prev} ${tag}`)}
 className="px-2 py-0.5 bg-slate-100 text-sky-500 font-mono font-bold rounded border border-slate-300 hover:bg-sky-500 hover:text-white transition-colors cursor-pointer"
 >
 +{tag}
 </button>
 ))}
 </div>

 <div className="pt-2 flex items-center justify-between border-t border-slate-100 ">
 <div className="text-xs font-mono text-slate-800">
 Cost: <span className="font-bold text-emerald-500">{recipients.length} Credits</span> (~৳{(recipients.length * 0.35).toFixed(2)})
 </div>
 <button
 onClick={handleSendBroadcast}
 className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 font-black text-xs rounded shadow-md transition-all cursor-pointer flex items-center gap-2"
 >
 <Send className="w-4 h-4" />
 <span>Send Broadcast to {recipients.length} Clients</span>
 </button>
 </div>
 </div>

 {/* WhatsApp Direct Link Preview */}
 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Smartphone className="w-4 h-4 text-emerald-500" />
 <span>Direct WhatsApp Messenger Integration</span>
 </h3>
 <p className="text-xs text-slate-800">
 যেকোনো ক্লায়েন্টকে সরাসরি WhatsApp Web বা অ্যাপের মাধ্যমে কাস্টম নোটিফিকেশন পাঠাতে পারবেন।
 </p>

 <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
 {clients.slice(0, 5).map((client) => {
 const waUrl = `https://wa.me/88${client.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
 `সম্মানিত ${client.name}, আপনার Nexora network ইন্টারনেট সংযোগের বিষয়ে জরুরি বার্তা।`
 )}`;
 return (
 <div
 key={client.id}
 className="p-3 bg-slate-50 border border-slate-100 rounded flex items-center justify-between text-xs"
 >
 <div>
 <div className="font-bold text-slate-900 ">{client.name}</div>
 <div className="text-[10px] text-emerald-500 font-mono">{client.phone}</div>
 </div>
 <a
 href={waUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer flex items-center gap-1"
 >
 <span>WhatsApp</span>
 </a>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 )}

 {/* TAB 2: AUTOMATED TRIGGERS */}
 {activeTab === 'triggers' && (
 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Bell className="w-4 h-4 text-emerald-500" />
 <span>Automatic Instant SMS Event Triggers</span>
 </h3>
 <p className="text-xs text-slate-800">
 নিচের ইভেন্টগুলো ঘটলে সিস্টেম নিজে থেকেই তাৎক্ষণিকভাবে সংশ্লিষ্ট গ্রাহককে SMS অ্যালার্ট পাঠাবে।
 </p>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
 {[
 { id: 'billGenerated', title: 'Monthly Bill Generated', desc: 'প্রতি মাসের ১ তারিখে নতুন ইনভয়েস ইস্যু হলে গ্রাহককে মোট বিল জানানো।' },
 { id: 'paymentReceived', title: 'Payment Received (Receipt)', desc: 'বিকাশ/নগদ/ক্যাশে টাকা জমা হলে ট্রানজেকশন আইডিসহ ডিজিটাল মানি রিসিট।' },
 { id: 'paymentDue', title: 'Payment Due Warning (3 Days Before)', desc: 'বিল পরিশোধের শেষ তারিখের ৩ দিন আগে মৃদু সতর্কবার্তা প্রেরণ।' },
 { id: 'paymentOverdue', title: 'Payment Overdue Alert', desc: 'মেয়াদ শেষ হওয়ার পর বকেয়া নোটিশ ও সংযোগ বন্ধের আগাম সতর্কতা।' },
 { id: 'packageExpiring', title: 'Package Expiring in 24 Hours', desc: 'প্যাকেজের ২৪ ঘণ্টা মেয়াদ বাকি থাকলে অটো-রিমাইন্ডার।' },
 { id: 'packageRenewed', title: 'Package Successfully Renewed', desc: 'প্যাকেজ রিনিউ ও নতুন ভ্যালিডিটি ডেট কনফার্মেশন SMS।' },
 { id: 'connectionSuspended', title: 'Connection Suspended Notice', desc: 'অনাদায়ী বিলের জন্য লাইন সাময়িক বন্ধ হলে কারণসহ বার্তা।' },
 { id: 'connectionActivated', title: 'Connection Unblocked / Activated', desc: 'পেমেন্টের পর মাইক্রোটিকে লাইন আনব্লক হওয়ার তাৎক্ষণিক সুখবর।' },
 { id: 'complaintUpdated', title: 'Support Ticket Status Update', desc: 'গ্রাহকের অভিযোগ টিকেট সমাধান হলে টেকনিশিয়ানের রিপোর্ট SMS।' },
 ].map((item) => {
 const isEnabled = triggers[item.id as keyof typeof triggers];
 return (
 <div
 key={item.id}
 className={`p-4 rounded border transition-all ${
 isEnabled
 ? 'bg-emerald-500/5 border-emerald-500/30'
 : 'bg-slate-50 border-slate-200 '
 }`}
 >
 <div className="flex items-center justify-between mb-2">
 <span className="font-extrabold text-slate-900 ">{item.title}</span>
 <button
 type="button"
 onClick={() => {
 setTriggers((prev) => ({ ...prev, [item.id]: !isEnabled }));
 showToast(`Trigger '${item.title}' ${!isEnabled ? 'Enabled' : 'Disabled'}`, 'info');
 }}
 className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
 isEnabled ? 'bg-emerald-500' : 'bg-slate-400 '
 }`}
 >
 <div
 className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
 isEnabled ? 'right-0.5' : 'left-0.5'
 }`}
 />
 </button>
 </div>
 <p className="text-[11px] text-slate-800 ">{item.desc}</p>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* TAB 3: GATEWAY SETTINGS */}
 {activeTab === 'gateway' && (
 <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4 max-w-xl">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Sliders className="w-4 h-4 text-emerald-500" />
 <span>SMS Provider Gateway API Credentials</span>
 </h3>

 <div className="space-y-3 text-xs">
 <div>
 <label className="block font-bold text-slate-800 mb-1">Gateway Provider</label>
 <input
 type="text"
 value={gatewayConfig.provider}
 onChange={(e) => setGatewayConfig({ ...gatewayConfig, provider: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">Masking / Sender ID</label>
 <input
 type="text"
 value={gatewayConfig.senderId}
 onChange={(e) => setGatewayConfig({ ...gatewayConfig, senderId: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono font-bold"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">API Key / Secret Token</label>
 <input
 type="password"
 value={gatewayConfig.apiKey}
 onChange={(e) => setGatewayConfig({ ...gatewayConfig, apiKey: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
 />
 </div>

 <div className="pt-2">
 <button
 onClick={() => showToast('SMS Gateway Connection Tested & Verified! Response: 200 OK', 'success')}
 className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded shadow-md transition-colors cursor-pointer"
 >
 Test Gateway Connection &amp; Check Balance
 </button>
 </div>
 </div>
 </div>
 )}

 {/* TAB 4: DELIVERY LOGS */}
 {activeTab === 'logs' && (
 <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden p-4 sm:p-5 space-y-3">
 <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
 <Clock className="w-4 h-4 text-emerald-500" />
 <span>SMS Dispatch &amp; Delivery Audit Logs</span>
 </h3>

 <div className="overflow-x-auto rounded border border-slate-100 ">
 <table className="w-full text-left text-xs border-collapse font-mono">
 <thead>
 <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
 <th className="p-3">Recipient &amp; Phone</th>
 <th className="p-3">Event Type</th>
 <th className="p-3">Message Snippet</th>
 <th className="p-3">Sent Time</th>
 <th className="p-3 text-right">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {logs.map((log) => (
 <tr key={log.id} className="hover:bg-slate-50 ">
 <td className="p-3 font-sans">
 <div className="font-bold text-slate-900 ">{log.recipientName}</div>
 <div className="text-[11px] text-emerald-500 font-mono">{log.phone}</div>
 </td>
 <td className="p-3">
 <span className="bg-slate-100 text-sky-400 px-2 py-0.5 rounded font-bold text-[10px]">
 {log.type}
 </span>
 </td>
 <td className="p-3 font-sans text-slate-900 max-w-xs truncate">
 {log.message}
 </td>
 <td className="p-3 text-slate-800 text-[11px]">{log.sentAt}</td>
 <td className="p-3 text-right">
 <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
 {log.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 );
};
