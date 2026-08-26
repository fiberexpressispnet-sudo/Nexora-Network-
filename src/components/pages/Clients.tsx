import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Client, Package, BandwidthProfile, DaysProfile, AppSettings, HotspotPackageRequest, MikrotikRouter } from '../../types';
import { compressImage } from '../../lib/imageUtils';
import { getClientExpiryInfo, addDaysToExpiry, getLiveCountdown } from '../../lib/expiryUtils';
import { ClientBandwidthGraph } from '../ClientBandwidthGraph';
import { SmsReminderModal } from '../SmsReminderModal';
import {
 Users,
 Search,
 Plus,
 Eye,
 Edit2,
 Trash2,
 QrCode,
 CheckCircle2,
 RefreshCw,
 Printer,
 Pause,
 Play,
 Smartphone,
 Router,
 Bell,
 Sparkles,
 Send,
 MessageSquare,
 FileSpreadsheet,
 Download,
 RotateCcw,
 AlertTriangle,
 Clock,
 Check,
 Receipt,
 Calendar,
 CalendarPlus,
 Zap,
 ArrowRight,
 ShieldCheck,
 DollarSign,
 ArrowUpDown,
} from 'lucide-react';
import { Modal } from '../Modal';

/**
 * Real-time Active Expiry Countdown Widget for Client Profile
 */
const ClientProfileLiveCountdown: React.FC<{
 client: Client;
 onExtend: (days: number) => void;
 onCustomDate: (date: string) => void;
}> = ({ client, onExtend, onCustomDate }) => {
 const [countdown, setCountdown] = useState(() => getLiveCountdown(client.expiry));
 const [showCustomPicker, setShowCustomPicker] = useState(false);
 const [pickerDate, setPickerDate] = useState(client.expiry || '');

 useEffect(() => {
 setCountdown(getLiveCountdown(client.expiry));
 const interval = setInterval(() => {
 setCountdown(getLiveCountdown(client.expiry));
 }, 1000);
 return () => clearInterval(interval);
 }, [client.expiry]);

 const info = getClientExpiryInfo(client.expiry);

 return (
 <div
 className={`p-4 rounded border transition-all ${
 countdown.isExpired
 ? 'bg-rose-500/10 border-rose-500/40 text-rose-900 '
 : countdown.days <= 3
 ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 '
 : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 '
 }`}
 >
 {/* Header with status badge */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/10 pb-3 mb-3">
 <div className="flex items-center gap-2">
 <Clock className={`w-5 h-5 ${countdown.isExpired ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
 <div>
 <h4 className="text-sm font-bold flex items-center gap-2">
 <span>প্যাকেজ লাইভ এক্সপায়ারি কাউন্টডাউন (Live Expiry Countdown)</span>
 </h4>
 <p className="text-[11px] opacity-85">
 {countdown.isExpired
 ? '⚠️ মেয়াদ শেষ হওয়ায় ক্লায়েন্টের লাইন স্বয়ংক্রিয়ভাবে অফলাইন করা হয়েছে।'
 : 'প্যাকেজের অবশিষ্ট সময় রিয়েল-টাইমে সেকেন্ডসহ গণনা হচ্ছে।'}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <span
 className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-xs ${
 countdown.isExpired
 ? 'bg-rose-600 text-white animate-pulse'
 : countdown.days <= 3
 ? 'bg-amber-500 text-white'
 : 'bg-emerald-600 text-white'
 }`}
 >
 <span className="w-2 h-2 rounded-full bg-white animate-ping" />
 {countdown.isExpired ? '🚨 অফলাইন (EXPIRED / AUTO-OFFLINE)' : '🟢 লাইন সক্রিয় (ONLINE / ACTIVE)'}
 </span>
 </div>
 </div>

 {/* Numerical Countdown Grid */}
 {countdown.isExpired ? (
 <div className="p-3 bg-rose-600/15 rounded border border-rose-500/40 text-center mb-3">
 <span className="text-xs font-bold text-rose-700 block mb-1">
 {countdown.formattedText}
 </span>
 <span className="text-[11px] text-rose-600 font-semibold">
 নিচে মেয়াদ বাড়ানোর বাটনে ক্লিক করলে লাইন পুনরায় স্বয়ংক্রিয়ভাবে এক্টিভ ও অনলাইন হয়ে যাবে।
 </span>
 </div>
 ) : (
 <div className="grid grid-cols-4 gap-2 mb-3 text-center">
 <div className="bg-white/90 p-2.5 rounded border border-black/10 shadow-xs">
 <span className="text-lg sm:text-2xl font-mono font-extrabold text-slate-900 block">
 {countdown.days}
 </span>
 <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">দিন (Days)</span>
 </div>
 <div className="bg-white/90 p-2.5 rounded border border-black/10 shadow-xs">
 <span className="text-lg sm:text-2xl font-mono font-extrabold text-slate-900 block">
 {String(countdown.hours).padStart(2, '0')}
 </span>
 <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">ঘণ্টা (Hours)</span>
 </div>
 <div className="bg-white/90 p-2.5 rounded border border-black/10 shadow-xs">
 <span className="text-lg sm:text-2xl font-mono font-extrabold text-slate-900 block">
 {String(countdown.minutes).padStart(2, '0')}
 </span>
 <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">মিনিট (Mins)</span>
 </div>
 <div className="bg-white/90 p-2.5 rounded border border-black/10 shadow-xs">
 <span className="text-lg sm:text-2xl font-mono font-extrabold text-sky-600 block animate-pulse">
 {String(countdown.seconds).padStart(2, '0')}
 </span>
 <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">সেকেন্ড (Secs)</span>
 </div>
 </div>
 )}

 {/* Quick Date Control and Extension Section */}
 <div className="bg-white/95 p-3 rounded border border-black/10 space-y-2">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
 <span className="font-bold text-slate-800 flex items-center gap-1.5">
 ⚡ প্রোফাইল থেকে সরাসরি মেয়াদ বৃদ্ধি করুন (Quick Extend Validity):
 </span>
 <span className="text-[11px] font-mono text-slate-800">
 নির্ধারিত মেয়াদ: <strong className="text-slate-900 ">{client.expiry || 'N/A'}</strong>
 </span>
 </div>

 {/* 1-Click Extension Chips */}
 <div className="flex flex-wrap gap-1.5 pt-1">
 {[
 { label: '+৭ দিন', days: 7 },
 { label: '+১৫ দিন', days: 15 },
 { label: '+৩০ দিন (১ মাস)', days: 30 },
 { label: '+৬০ দিন (২ মাস)', days: 60 },
 { label: '+৯০ দিন (৩ মাস)', days: 90 },
 ].map((preset) => (
 <button
 key={preset.days}
 type="button"
 onClick={() => onExtend(preset.days)}
 className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95"
 >
 <span>{preset.label}</span>
 </button>
 ))}
 <button
 type="button"
 onClick={() => setShowCustomPicker(!showCustomPicker)}
 className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
 >
 📅 কাস্টম তারিখ
 </button>
 </div>

 {/* Custom date picker accordion */}
 {showCustomPicker && (
 <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 mt-2">
 <span className="text-xs font-semibold text-slate-900 ">নতুন তারিখ বেছে নিন:</span>
 <input
 type="date"
 value={pickerDate}
 onChange={(e) => setPickerDate(e.target.value)}
 className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono"
 />
 <button
 type="button"
 onClick={() => {
 if (pickerDate) {
 onCustomDate(pickerDate);
 setShowCustomPicker(false);
 }
 }}
 className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
 >
 সেভ করুন
 </button>
 </div>
 )}
 </div>
 </div>
 );
};

interface ClientsProps {
 clients: Client[];
 routers?: MikrotikRouter[];
 packages: Package[];
 bandwidthProfiles: BandwidthProfile[];
 daysProfiles?: DaysProfile[];
 hotspotRequests?: HotspotPackageRequest[];
 settings: AppSettings;
 routerConnected: boolean;
 onAddClient: (client: Client) => void;
 onUpdateClient: (client: Client) => void;
 onDeleteClient: (id: string) => void;
 onRenewClient: (id: string, months?: number, amount?: number, paymentMethod?: string) => void;
 onToggleStatus: (id: string) => void;
 onApproveRequest?: (id: string, createdUserId?: string) => void;
 onRejectRequest?: (id: string) => void;
 onSendSmsReminder?: (client: Client, messageText: string, channel: 'SMS' | 'WhatsApp' | 'Manual') => void;
 onGenerateInvoice?: (client: Client) => void;
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
 onHardReset?: () => void;
}

export const ClientsPage: React.FC<ClientsProps> = ({
 clients,
 routers = [],
 packages,
 bandwidthProfiles,
 daysProfiles = [],
 hotspotRequests = [],
 settings,
 routerConnected,
 onAddClient,
 onUpdateClient,
 onDeleteClient,
 onRenewClient,
 onToggleStatus,
 onApproveRequest,
 onRejectRequest,
 onSendSmsReminder,
 onGenerateInvoice,
 showToast,
 onHardReset,
}) => {
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');
 const [routerFilter, setRouterFilter] = useState('all');
 const [sortField, setSortField] = useState<'name' | 'id' | 'expiry' | 'price' | 'status'>('id');
 const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

 // Modal States
 const [addModalOpen, setAddModalOpen] = useState(false);
 const [editClient, setEditClient] = useState<Client | null>(null);
 const [viewClient, setViewClient] = useState<Client | null>(null);
 const [qrClient, setQrClient] = useState<Client | null>(null);
 const [deleteConfirmClient, setDeleteConfirmClient] = useState<Client | null>(null);
 const [smsReminderClient, setSmsReminderClient] = useState<Client | null>(null);
 const [renewPaymentClient, setRenewPaymentClient] = useState<Client | null>(null);
 const [renewPaymentMethod, setRenewPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank'>('Cash');
 const [renewPaymentAmount, setRenewPaymentAmount] = useState<number>(500);

 // Form states for New Client
 const [newName, setNewName] = useState('');
 const [newPhone, setNewPhone] = useState('');
 const [newRouter, setNewRouter] = useState(routers[0]?.name || 'Main Router');
 const [newPkg, setNewPkg] = useState(packages[0]?.name || 'Fiber 20');
 const [newPrice, setNewPrice] = useState(packages[0]?.price || '500');
 const [newBw, setNewBw] = useState(bandwidthProfiles[0]?.name || '20 Mbps');
 const [newDownloadSpeed, setNewDownloadSpeed] = useState(bandwidthProfiles[0]?.download || '20');
 const [newUploadSpeed, setNewUploadSpeed] = useState(bandwidthProfiles[0]?.upload || '10');
 const [newBurstSpeed, setNewBurstSpeed] = useState('30M/30M');
 const [newPriority, setNewPriority] = useState('8');
 const [newUserId, setNewUserId] = useState(`user${clients.length + 1}`);
 const [newPassword, setNewPassword] = useState(`pass${Math.floor(100 + Math.random() * 900)}`);
 const [newDeviceType, setNewDeviceType] = useState<'Mobile' | 'Router'>('Router');
 const [newExpiry, setNewExpiry] = useState(
 new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
 );
 const [newPhoto, setNewPhoto] = useState<string | null>(null);

 // Edit form states
 const [editName, setEditName] = useState('');
 const [editPhone, setEditPhone] = useState('');
 const [editRouter, setEditRouter] = useState('');
 const [editPassword, setEditPassword] = useState('');
 const [editPkg, setEditPkg] = useState('');
 const [editPrice, setEditPrice] = useState('');
 const [editBw, setEditBw] = useState('');
 const [editDownloadSpeed, setEditDownloadSpeed] = useState('');
 const [editUploadSpeed, setEditUploadSpeed] = useState('');
 const [editBurstSpeed, setEditBurstSpeed] = useState('30M/30M');
 const [editPriority, setEditPriority] = useState('8');
 const [editDeviceType, setEditDeviceType] = useState<'Mobile' | 'Router'>('Router');
 const [editStatus, setEditStatus] = useState<'online' | 'offline'>('online');
 const [editExpiry, setEditExpiry] = useState('');
 const [editPhoto, setEditPhoto] = useState<string | null>(null);
 const [editCustomDaysInput, setEditCustomDaysInput] = useState('30');

 // Quick Handlers for extending expiry from Profile modal
 const handleExtendFromProfile = (days: number) => {
 if (!viewClient) return;
 const newDate = addDaysToExpiry(viewClient.expiry, days);
 const updated: Client = { ...viewClient, expiry: newDate, status: 'online' };
 onUpdateClient(updated);
 setViewClient(updated);
 showToast(`গ্রাহক ${updated.name}-এর মেয়াদ আরও ${days} দিন বাড়ানো হয়েছে (${newDate}) এবং লাইন অনলাইন চালু করা হয়েছে!`, 'success');
 };

 const handleCustomDateFromProfile = (targetDate: string) => {
 if (!viewClient) return;
 const info = getClientExpiryInfo(targetDate);
 const updated: Client = {
 ...viewClient,
 expiry: targetDate,
 status: info.isExpired ? 'offline' : 'online',
 };
 onUpdateClient(updated);
 setViewClient(updated);
 showToast(`গ্রাহক ${updated.name}-এর নতুন মেয়াদ ${targetDate} নির্ধারণ করা হয়েছে!`, 'success');
 };

 // Filter logic
 const expiringClients = clients.filter((c) => getClientExpiryInfo(c.expiry).isExpiringSoon);

 const filteredClients = clients.filter((c) => {
 const matchesSearch =
 c.name.toLowerCase().includes(search.toLowerCase()) ||
 c.id.toLowerCase().includes(search.toLowerCase()) ||
 c.phone.includes(search) ||
 c.userId.toLowerCase().includes(search.toLowerCase());
 
 let matchesFilter = true;
 if (statusFilter === 'all') {
 matchesFilter = true;
 } else if (statusFilter === 'expiring') {
 matchesFilter = getClientExpiryInfo(c.expiry).isExpiringSoon;
 } else if (statusFilter === 'expired') {
 matchesFilter = getClientExpiryInfo(c.expiry).isExpired || c.status === 'expired';
 } else {
 matchesFilter = c.status === statusFilter;
 }

 let matchesRouter = true;
 if (routerFilter !== 'all') {
 matchesRouter = (c.router || '').toLowerCase() === routerFilter.toLowerCase();
 }

 return matchesSearch && matchesFilter && matchesRouter;
 });

 const handleSort = (field: 'name' | 'id' | 'expiry' | 'price' | 'status') => {
 if (sortField === field) {
 setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
 } else {
 setSortField(field);
 setSortDirection('asc');
 }
 };

 const sortedClients = [...filteredClients].sort((a, b) => {
 let comparison = 0;
 if (sortField === 'name') {
 comparison = a.name.localeCompare(b.name);
 } else if (sortField === 'id') {
 comparison = a.id.localeCompare(b.id);
 } else if (sortField === 'expiry') {
 comparison = (a.expiry || '').localeCompare(b.expiry || '');
 } else if (sortField === 'price') {
 const priceA = parseFloat(a.price || '0');
 const priceB = parseFloat(b.price || '0');
 comparison = priceA - priceB;
 } else if (sortField === 'status') {
 comparison = (a.status || '').localeCompare(b.status || '');
 }

 return sortDirection === 'asc' ? comparison : -comparison;
 });

 const handleExportClientsCSV = () => {
 if (filteredClients.length === 0) {
 showToast('No clients available to export', 'warning');
 return;
 }
 const headers = ['Client ID', 'Name', 'Phone', 'User ID', 'Device Type', 'Package', 'Price (BDT)', 'Bandwidth', 'Status', 'Expiry Date'];
 const rows = filteredClients.map((c) => [
 c.id,
 c.name,
 c.phone,
 c.userId,
 c.deviceType || 'Router',
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
 link.setAttribute('download', `NEXORA_Client_List_${new Date().toISOString().slice(0, 10)}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 showToast(`Exported ${filteredClients.length} clients to CSV!`, 'success');
 };

 // Handle Photo upload convert to Data URL with compression
 const handlePhotoUpload = async (
 e: React.ChangeEvent<HTMLInputElement>,
 setPhotoState: (url: string | null) => void
 ) => {
 const file = e.target.files?.[0];
 if (file) {
 try {
 const compressed = await compressImage(file, 250, 250, 0.7);
 setPhotoState(compressed);
 } catch (err) {
 console.error('Photo compression failed', err);
 const reader = new FileReader();
 reader.onload = (ev) => {
 setPhotoState(ev.target?.result as string);
 };
 reader.readAsDataURL(file);
 }
 }
 };

 const [activeRequestToApprove, setActiveRequestToApprove] = useState<HotspotPackageRequest | null>(null);

 const handlePrepareApproveRequest = (req: HotspotPackageRequest) => {
 setActiveRequestToApprove(req);
 setNewName(req.clientName);
 setNewPhone(req.phone);
 setNewPkg(req.package);
 setNewPrice(req.price);
 setNewBw(req.bandwidth);
 setNewDownloadSpeed(req.downloadSpeed || '20');
 setNewUploadSpeed(req.uploadSpeed || '10');
 setNewUserId(req.phone || `user${Math.floor(100 + Math.random() * 900)}`);
 setNewPassword(`pass${Math.floor(100 + Math.random() * 900)}`);
 setAddModalOpen(true);
 };

 const handleCreateClient = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newName.trim() || !newPhone.trim()) {
 showToast('Name and phone number are required.', 'error');
 return;
 }

 const maxNum = clients.reduce((max, c) => {
 const match = c.id.match(/\d+/);
 const num = match ? parseInt(match[0], 10) : 0;
 return num > max ? num : max;
 }, 0);
 const generatedId = `CL-${String(maxNum + 1).padStart(4, '0')}`;

 const clientToAdd: Client = {
 id: generatedId,
 name: newName.trim(),
 phone: newPhone.trim(),
 userId: newUserId.trim() || `user${maxNum + 1}`,
 password: newPassword.trim() || `pass${Math.floor(100 + Math.random() * 900)}`,
 package: newPkg,
 price: newPrice.trim() || '500',
 bandwidth: newBw,
 downloadSpeed: newDownloadSpeed.trim() || '20',
 uploadSpeed: newUploadSpeed.trim() || '10',
 status: 'online',
 expiry: newExpiry,
 router: newRouter || routers[0]?.name || 'Main Router',
 photo: newPhoto,
 deviceType: newDeviceType,
 burstSpeed: newBurstSpeed,
 priority: newPriority,
 };

 onAddClient(clientToAdd);

 if (activeRequestToApprove && onApproveRequest) {
 onApproveRequest(activeRequestToApprove.id, clientToAdd.userId);
 showToast(`Approved Hotspot Request for ${activeRequestToApprove.clientName}!`, 'success');
 setActiveRequestToApprove(null);
 } else {
 showToast(`Created client ${clientToAdd.name} (${generatedId})!`, 'success');
 }

 // Reset form
 setNewName('');
 setNewPhone('');
 setNewPassword(`pass${Math.floor(100 + Math.random() * 900)}`);
 setNewPhoto(null);
 setNewBurstSpeed('30M/30M');
 setNewPriority('8');
 setAddModalOpen(false);

 // Prompt QR & SMS modal for new client
 setQrClient(clientToAdd);
 };

 const handleOpenEdit = (c: Client) => {
 setEditClient(c);
 setEditName(c.name);
 setEditPhone(c.phone);
 setEditRouter(c.router || routers[0]?.name || 'Main Router');
 setEditPassword(c.password || `pass${Math.floor(100 + Math.random() * 900)}`);
 setEditPkg(c.package);
 setEditPrice(c.price || packages.find((p) => p.name === c.package)?.price || '500');
 setEditBw(c.bandwidth);
 setEditDownloadSpeed(c.downloadSpeed || '20');
 setEditUploadSpeed(c.uploadSpeed || '10');
 setEditBurstSpeed(c.burstSpeed || '30M/30M');
 setEditPriority(c.priority || '8');
 setEditDeviceType(c.deviceType || 'Router');
 setEditStatus(c.status === 'online' ? 'online' : 'offline');
 setEditExpiry(c.expiry);
 setEditPhoto(c.photo || null);
 };

 const handleSaveEdit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editClient) return;
 if (!editName.trim() || !editPhone.trim()) {
 showToast('Name and phone required.', 'error');
 return;
 }

 const updated: Client = {
 ...editClient,
 name: editName.trim(),
 phone: editPhone.trim(),
 router: editRouter || editClient.router || 'Main Router',
 password: editPassword.trim() || 'pass123',
 package: editPkg,
 price: editPrice.trim() || '500',
 bandwidth: editBw,
 downloadSpeed: editDownloadSpeed.trim() || '20',
 uploadSpeed: editUploadSpeed.trim() || '10',
 burstSpeed: editBurstSpeed,
 priority: editPriority,
 deviceType: editDeviceType,
 status: editStatus,
 expiry: editExpiry,
 photo: editPhoto,
 };

 onUpdateClient(updated);
 showToast(`Updated client ${updated.name}!`, 'success');
 setEditClient(null);
 };

 const handleDelete = (c: Client) => {
 onDeleteClient(c.id);
 showToast(`Deleted client ${c.name} (${c.id})`, 'success');
 setDeleteConfirmClient(null);
 };

 return (
 <div className="space-y-6">
 {/* Hotspot Package Requests Pending Card */}
 {hotspotRequests.filter((r) => r.status === 'pending').length > 0 && (
 <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded p-4 sm:p-5 text-slate-900 shadow-md space-y-3">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
 <div className="flex items-center gap-2.5">
 <span className="p-2 rounded bg-amber-500 text-white shadow-xs">
 <Bell className="w-5 h-5" />
 </span>
 <div>
 <h3 className="text-sm sm:text-base font-bold text-amber-900 flex items-center gap-2">
 <span>🔔 নতুন হটস্পট প্যাকেজ রিকুয়েস্ট ({hotspotRequests.filter((r) => r.status === 'pending').length}টি পেন্ডিং)</span>
 <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full">
 NEW
 </span>
 </h3>
 <p className="text-xs text-amber-800 ">
 ক্লায়েন্ট এক্সেস পয়েন্টে কানেক্ট হয়ে পোর্টালে ফর্ম পূরণ করেছে। নিচে "আইডি তৈরি করুন ও SMS পাঠান" বাটনে ক্লিক করে একাউন্ট এক্টিভ করুন।
 </p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {hotspotRequests
 .filter((r) => r.status === 'pending')
 .map((req) => (
 <div
 key={req.id}
 className="bg-white border border-amber-500/30 rounded p-3.5 space-y-2.5 shadow-xs"
 >
 <div className="flex justify-between items-start gap-2">
 <div>
 <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
 <Smartphone className="w-3.5 h-3.5 text-sky-500" />
 <span>{req.clientName}</span>
 </div>
 <div className="text-xs font-mono font-bold text-emerald-600 ">
 📞 {req.phone}
 </div>
 </div>

 <div className="text-right">
 <span className="text-xs font-bold text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20 block">
 {req.package}
 </span>
 <span className="text-xs font-mono font-extrabold text-amber-600 block mt-0.5">
 ৳{req.price} ({req.bandwidth})
 </span>
 </div>
 </div>

 <div className="flex items-center justify-between text-[11px] text-slate-800 border-t border-slate-100 pt-2">
 <span className="font-mono">MAC: {req.macAddress || 'Auto-Detect'}</span>
 <span>⏰ {req.requestedAt}</span>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <button
 onClick={() => handlePrepareApproveRequest(req)}
 className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
 >
 <Sparkles className="w-3.5 h-3.5 text-amber-300" />
 <span>ID তৈরি করুন ও SMS পাঠান</span>
 </button>
 {onRejectRequest && (
 <button
 onClick={() => onRejectRequest(req.id)}
 className="py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-semibold rounded-lg border border-rose-500/20 cursor-pointer transition-colors"
 >
 বাতিল
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Subscription Expiry Notification Banner (≤ 3 Days) */}
 {expiringClients.length > 0 && (
 <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded p-4 sm:p-5 text-slate-900 shadow-md space-y-3">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/20 pb-2.5">
 <div className="flex items-center gap-2.5">
 <span className="p-2 rounded bg-rose-500 text-white shadow-xs">
 <AlertTriangle className="w-5 h-5" />
 </span>
 <div>
 <h3 className="text-sm sm:text-base font-bold text-rose-900 flex items-center gap-2">
 <span>⚠️ সাবস্ক্রিপশন মেয়াদ শেষ নোটিফিকেশন ({expiringClients.length} জন গ্রাহক)</span>
 <span className="text-[10px] bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded-full">
 EXPIRING SOON
 </span>
 </h3>
 <p className="text-xs text-rose-800 ">
 নিচের গ্রাহকদের প্যাকেজের মেয়াদ ৩ দিন বা তার কম সময়ের মধ্যে শেষ হচ্ছে। তাদের সরাসরি এসএমএস রিমাইন্ডার পাঠিয়ে বিল সংগ্রহ নিশ্চিত করুন।
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setStatusFilter(statusFilter === 'expiring' ? 'all' : 'expiring')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
 statusFilter === 'expiring'
 ? 'bg-rose-600 text-white border-rose-600'
 : 'bg-white/80 text-rose-700 border-rose-500/30 hover:bg-rose-50'
 }`}
 >
 {statusFilter === 'expiring' ? '✓ Showing Expiring Only' : '🔍 Filter Expiring Clients'}
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {expiringClients.slice(0, 6).map((c) => {
 const info = getClientExpiryInfo(c.expiry);
 return (
 <div
 key={c.id}
 className="bg-white border border-rose-500/30 rounded p-3.5 space-y-2.5 shadow-xs flex flex-col justify-between"
 >
 <div>
 <div className="flex justify-between items-start gap-2 mb-1">
 <div>
 <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
 <span>{c.name}</span>
 <span className="text-[10px] font-mono text-slate-800">({c.userId})</span>
 </div>
 <div className="text-xs font-mono font-bold text-emerald-600 ">
 📞 {c.phone}
 </div>
 </div>
 <span className={`px-2 py-0.5 rounded-md text-[10px] ${info.badgeClass}`}>
 {info.badgeText}
 </span>
 </div>

 <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg mt-2">
 <span className="text-slate-800 font-semibold">{c.package}</span>
 <span className="font-mono font-bold text-emerald-600 ">
 ৳{c.price || '500'}
 </span>
 <span className="font-mono text-amber-600 font-semibold text-[10px]">
 📅 {c.expiry}
 </span>
 </div>
 </div>

 <button
 type="button"
 onClick={() => setSmsReminderClient(c)}
 className="w-full py-2 px-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
 >
 <MessageSquare className="w-3.5 h-3.5" />
 <span>Send SMS Reminder (মেসেজ পাঠান)</span>
 </button>
 </div>
 );
 })}
 </div>

 {expiringClients.length > 6 && (
 <div className="text-center pt-1">
 <button
 type="button"
 onClick={() => setStatusFilter('expiring')}
 className="text-xs text-rose-700 font-bold hover:underline cursor-pointer"
 >
 + আরও {expiringClients.length - 6} জন মেয়াদোত্তীর্ণ গ্রাহক দেখতে ক্লিক করুন
 </button>
 </div>
 )}
 </div>
 )}

 {/* Table Card Wrap */}
 <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
 {/* Header toolbar */}
 <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
 <Users className="w-5 h-5 text-sky-600 " /> All Clients
 </h3>

 <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
 {/* Search Input */}
 <div className="relative flex-1 sm:w-48">
 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-800" />
 <input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search clients..."
 className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 {/* Router Filter */}
 {routers.length > 0 && (
 <select
 value={routerFilter}
 onChange={(e) => setRouterFilter(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-sky-500/30 bg-white/80 text-xs text-sky-700 font-semibold focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="all">All Routers ({routers.length})</option>
 {routers.map((r) => (
 <option key={r.id} value={r.name}>
 {r.name}
 </option>
 ))}
 </select>
 )}

 {/* Filter */}
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="all">All Status</option>
 <option value="expiring">⚠️ Expiring Soon (≤ 3 Days)</option>
 <option value="online">Online</option>
 <option value="offline">Offline</option>
 <option value="expired">Expired</option>
 </select>

 {/* Sort Dropdown */}
 <select
 value={`${sortField}-${sortDirection}`}
 onChange={(e) => {
 const [field, dir] = e.target.value.split('-') as [any, any];
 setSortField(field);
 setSortDirection(dir);
 }}
 className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="id-asc">Sort: ID (Oldest First)</option>
 <option value="id-desc">Sort: ID (Newest First)</option>
 <option value="name-asc">Sort: Name (A-Z)</option>
 <option value="name-desc">Sort: Name (Z-A)</option>
 <option value="expiry-asc">Sort: Expiry (Soonest)</option>
 <option value="expiry-desc">Sort: Expiry (Latest)</option>
 <option value="price-asc">Sort: Price (Lowest)</option>
 <option value="price-desc">Sort: Price (Highest)</option>
 <option value="status-asc">Sort: Status (Online First)</option>
 <option value="status-desc">Sort: Status (Offline First)</option>
 </select>

 {/* Export CSV Button */}
 <button
 onClick={handleExportClientsCSV}
 className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
 title="Export filtered clients to CSV file"
 >
 <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Export CSV
 </button>

 {/* Hard Reset Button */}
 {onHardReset && (
 <button
 type="button"
 onClick={() => {
 if (window.confirm('আপনি কি নিশ্চিত যে সকল ক্লায়েন্ট লিস্ট ডাটা সম্পূর্ণ মুছে ফেলতে চান? (Hard Reset)')) {
 onHardReset();
 }
 }}
 className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
 title="Clear all client data"
 >
 <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
 <span>Hard Reset (ডাটা রিসেট)</span>
 </button>
 )}

 {/* Add Button */}
 <button
 onClick={() => {
 const maxNum = clients.reduce((max, c) => {
 const match = c.id.match(/\d+/);
 const num = match ? parseInt(match[0], 10) : 0;
 return num > max ? num : max;
 }, 0);
 setNewUserId(`user${maxNum + 1}`);
 setAddModalOpen(true);
 }}
 className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
 >
 <Plus className="w-4 h-4" /> Add Client
 </button>
 </div>
 </div>

 {/* Scrollable Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="bg-slate-100/50 border-b border-slate-200/80 text-slate-800 uppercase tracking-wider font-semibold text-[10px]">
 <th 
 className="p-3.5 pl-5 cursor-pointer select-none hover:text-sky-500 transition-colors" 
 onClick={() => handleSort('name')}
 >
 <div className="flex items-center gap-1">
 <span>Client</span>
 <ArrowUpDown className={`w-3 h-3 ${sortField === 'name' ? 'text-sky-500 font-bold' : 'opacity-40'}`} />
 </div>
 </th>
 <th 
 className="p-3.5 cursor-pointer select-none hover:text-sky-500 transition-colors" 
 onClick={() => handleSort('id')}
 >
 <div className="flex items-center gap-1">
 <span>ID / User</span>
 <ArrowUpDown className={`w-3 h-3 ${sortField === 'id' ? 'text-sky-500 font-bold' : 'opacity-40'}`} />
 </div>
 </th>
 <th className="p-3.5">Device Access</th>
 <th 
 className="p-3.5 cursor-pointer select-none hover:text-sky-500 transition-colors" 
 onClick={() => handleSort('price')}
 >
 <div className="flex items-center gap-1">
 <span>Package</span>
 <ArrowUpDown className={`w-3 h-3 ${sortField === 'price' ? 'text-sky-500 font-bold' : 'opacity-40'}`} />
 </div>
 </th>
 <th className="p-3.5">Bandwidth</th>
 <th className="p-3.5">Speed</th>
 <th className="p-3.5">Live Traffic Graph</th>
 <th 
 className="p-3.5 cursor-pointer select-none hover:text-sky-500 transition-colors" 
 onClick={() => handleSort('status')}
 >
 <div className="flex items-center gap-1">
 <span>Status</span>
 <ArrowUpDown className={`w-3 h-3 ${sortField === 'status' ? 'text-sky-500 font-bold' : 'opacity-40'}`} />
 </div>
 </th>
 <th 
 className="p-3.5 cursor-pointer select-none hover:text-sky-500 transition-colors" 
 onClick={() => handleSort('expiry')}
 >
 <div className="flex items-center gap-1">
 <span>Expiry</span>
 <ArrowUpDown className={`w-3 h-3 ${sortField === 'expiry' ? 'text-sky-500 font-bold' : 'opacity-40'}`} />
 </div>
 </th>
 <th className="p-3.5 pr-5 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {sortedClients.length === 0 ? (
 <tr>
 <td colSpan={10} className="p-8 text-center text-slate-800">
 No matching clients found.
 </td>
 </tr>
 ) : (
 sortedClients.map((c) => {
 const initials = c.name
 .split(' ')
 .map((n) => n[0])
 .join('')
 .toUpperCase()
 .slice(0, 2);
 const isMobile = c.deviceType === 'Mobile';
 const expiryInfo = getClientExpiryInfo(c.expiry);

 return (
 <tr
 key={c.id}
 className={`hover:bg-slate-50/50 transition-colors ${
 expiryInfo.isExpiringSoon ? 'bg-rose-500/[0.03] ' : ''
 }`}
 >
 <td className="p-3.5 pl-5">
 <div className="flex items-center gap-3">
 {c.photo ? (
 <img
 src={c.photo}
 alt={c.name}
 className="w-8 h-8 rounded-full object-cover border border-slate-200 "
 />
 ) : (
 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
 {initials}
 </div>
 )}
 <div>
 <div className="font-bold text-slate-900 flex items-center gap-1.5">
 <span>{c.name}</span>
 {expiryInfo.isExpiringSoon && (
 <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Expiring Soon" />
 )}
 </div>
 <div className="text-[11px] text-slate-800 font-mono">{c.phone}</div>
 </div>
 </div>
 </td>
 <td className="p-3.5 font-mono">
 <span className="text-slate-900 font-semibold">{c.id}</span>
 <div className="text-[11px] text-slate-800">{c.userId}</div>
 </td>
 <td className="p-3.5">
 <span
 className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
 isMobile
 ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
 : 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
 }`}
 >
 {isMobile ? (
 <>
 <Smartphone className="w-3 h-3" /> মোবাইল
 </>
 ) : (
 <>
 <Router className="w-3 h-3" /> রাউটার
 </>
 )}
 </span>
 </td>
 <td className="p-3.5">
 <div className="font-semibold text-sky-600 ">{c.package}</div>
 <div className="text-[11px] font-bold text-emerald-600 font-mono">
 ৳{c.price || packages.find((p) => p.name === c.package)?.price || '500'}
 </div>
 </td>
 <td className="p-3.5">
 <div className="font-semibold text-slate-800 ">{c.bandwidth}</div>
 <div className="flex flex-wrap gap-1 mt-0.5">
 {c.burstSpeed && c.burstSpeed !== '0M/0M' && (
 <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20">
 ⚡ {c.burstSpeed}
 </span>
 )}
 <span
 className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
 c.priority === '1'
 ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30'
 : 'bg-slate-100 text-slate-800 '
 }`}
 >
 {c.priority === '1' ? '👑 VIP (P-1)' : `P-${c.priority || '8'}`}
 </span>
 </div>
 </td>
 <td className="p-3.5 text-[11px]">
 ↓{c.downloadSpeed} / ↑{c.uploadSpeed} Mbps
 </td>
 <td className="p-3.5">
 <ClientBandwidthGraph client={c} compact={true} />
 </td>
 <td className="p-3.5">
 <button
 type="button"
 onClick={() => onToggleStatus(c.id)}
 className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize transition-all cursor-pointer hover:scale-105 active:scale-95 ${
 c.status === 'online'
 ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 hover:bg-emerald-500/25'
 : 'bg-rose-500/15 text-rose-600 border border-rose-500/25 hover:bg-rose-500/25'
 }`}
 title={`ক্লিক করে অনলাইন/অফলাইন টগল করুন (${c.status === 'online' ? 'অফলাইন করতে ক্লিক করুন' : 'অনলাইন করতে ক্লিক করুন'})`}
 >
 <span
 className={`w-1.5 h-1.5 rounded-full ${
 c.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
 }`}
 />
 <span>{c.status}</span>
 </button>
 </td>
 <td className="p-3.5">
 <div className="font-mono font-semibold text-slate-900 ">{c.expiry}</div>
 <div className="mt-1">
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] ${expiryInfo.badgeClass}`}>
 {expiryInfo.badgeText}
 </span>
 </div>
 </td>
 <td className="p-3.5 pr-5 text-right">
 <div className="flex items-center justify-end gap-1.5">
 {/* Send SMS Reminder Button */}
 {expiryInfo.isExpiringSoon ? (
 <button
 type="button"
 onClick={() => setSmsReminderClient(c)}
 className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
 expiryInfo.isExpired || expiryInfo.isExpiringToday
 ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
 : 'bg-amber-500 hover:bg-amber-600 text-white'
 }`}
 title={`Send SMS Reminder to ${c.name} (${c.phone})`}
 >
 <MessageSquare className="w-3.5 h-3.5" />
 <span>Send SMS Reminder</span>
 </button>
 ) : (
 <button
 type="button"
 onClick={() => setSmsReminderClient(c)}
 className="p-1.5 rounded-md hover:bg-slate-100 text-slate-800 hover:text-sky-600 transition-colors cursor-pointer"
 title={`Send SMS / WhatsApp to ${c.name}`}
 >
 <MessageSquare className="w-3.5 h-3.5" />
 </button>
 )}

 {onGenerateInvoice && (
 <button
 type="button"
 onClick={() => onGenerateInvoice(c)}
 className="p-1.5 rounded-md hover:bg-slate-100 text-slate-800 hover:text-emerald-600 transition-colors cursor-pointer"
 title="Generate Invoice / Billing"
 >
 <Receipt className="w-3.5 h-3.5" />
 </button>
 )}
 <button
 type="button"
 onClick={() => onToggleStatus(c.id)}
 className={`p-1.5 rounded-md hover:bg-slate-100 transition-all cursor-pointer hover:scale-110 active:scale-95 ${
 c.status === 'online'
 ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-500/10'
 : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10'
 }`}
 title={c.status === 'online' ? "লাইন সাময়িকভাবে বন্ধ করুন (Pause / Suspend Line)" : "লাইন চালু করুন (Play / Active Line)"}
 >
 {c.status === 'online' ? (
 <Pause className="w-3.5 h-3.5" />
 ) : (
 <Play className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
 )}
 </button>
 <button
 type="button"
 onClick={() => setViewClient(c)}
 className="p-1.5 rounded-md hover:bg-slate-100 text-slate-800 hover:text-sky-600 transition-colors cursor-pointer"
 title="View Details"
 >
 <Eye className="w-3.5 h-3.5" />
 </button>
 <button
 type="button"
 onClick={() => handleOpenEdit(c)}
 className="p-1.5 rounded-md hover:bg-slate-100 text-slate-800 hover:text-amber-600 transition-colors cursor-pointer"
 title="Edit Client"
 >
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 <button
 type="button"
 onClick={() => setQrClient(c)}
 className="p-1.5 rounded-md hover:bg-slate-100 text-slate-800 hover:text-teal-600 transition-colors cursor-pointer"
 title="QR Voucher"
 >
 <QrCode className="w-3.5 h-3.5" />
 </button>
 <button
 type="button"
 onClick={() => setDeleteConfirmClient(c)}
 className="p-1.5 rounded-md hover:bg-slate-100 text-slate-800 hover:text-rose-600 transition-colors cursor-pointer"
 title="Delete Client"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination Footer */}
 <div className="p-4 border-t border-slate-200/80 flex justify-between items-center text-xs text-slate-800">
 <div>
 Showing {filteredClients.length} of {clients.length} clients
 </div>
 </div>
 </div>

 {/* MODAL: ADD CLIENT */}
 <Modal isOpen={addModalOpen} title="Add New Client" onClose={() => setAddModalOpen(false)}>
 <form onSubmit={handleCreateClient} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Name *
 </label>
 <input
 type="text"
 required
 value={newName}
 onChange={(e) => setNewName(e.target.value)}
 placeholder="Full Client Name"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Phone *
 </label>
 <input
 type="text"
 required
 value={newPhone}
 onChange={(e) => setNewPhone(e.target.value)}
 placeholder="01712345678"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 {/* Router Selection */}
 {routers.length > 0 && (
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 MikroTik Router Node (রাউটার নোড) *
 </label>
 <select
 value={newRouter}
 onChange={(e) => setNewRouter(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-sky-500/40 bg-white text-xs font-semibold text-sky-700 focus:outline-none focus:border-[#3c8dbc]"
 >
 {routers.map((r) => (
 <option key={r.id} value={r.name}>
 {r.name} ({r.ip}) - {r.mode} ({r.location})
 </option>
 ))}
 </select>
 </div>
 )}

 <div>
 <label className="block text-xs font-bold text-slate-800 mb-1">
 Device Target Option (ব্যবহারের ধরন) *
 </label>
 <div className="grid grid-cols-2 gap-2 pt-1">
 <button
 type="button"
 onClick={() => setNewDeviceType('Mobile')}
 className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
 newDeviceType === 'Mobile'
 ? 'border-amber-500 bg-amber-500/10 text-amber-700 ring-2 ring-amber-500/30 font-bold'
 : 'border-slate-200 hover:bg-slate-50 text-slate-900 '
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <Smartphone className="w-4 h-4 text-amber-500" /> মোবাইল এক্সেস
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 শুধুমাত্র ১ টি মোবাইল কানেকশন পাবে।
 </p>
 </button>

 <button
 type="button"
 onClick={() => setNewDeviceType('Router')}
 className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
 newDeviceType === 'Router'
 ? 'border-sky-500 bg-sky-500/10 text-sky-700 ring-2 ring-sky-500/30 font-bold'
 : 'border-slate-200 hover:bg-slate-50 text-slate-900 '
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <Router className="w-4 h-4 text-sky-500" /> রাউটার এক্সেস
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 রাউটার কানেক্টেড সমস্ত ডিভাইস ইন্টারনেট পাবে।
 </p>
 </button>
 </div>
 </div>

 {/* PACKAGE & CUSTOM PRICE SETUP */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded bg-slate-50 border border-slate-200 ">
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 Package (প্যাকেজ নির্বাচন)
 </label>
 <select
 value={newPkg}
 onChange={(e) => {
 const val = e.target.value;
 setNewPkg(val);
 const selected = packages.find((p) => p.name === val);
 if (selected) {
 setNewPrice(selected.price);
 
 if (selected.speed) setNewDownloadSpeed(selected.speed.replace(/ mbps/i, '').trim());
 if (selected.upload) setNewUploadSpeed(selected.upload.replace(/ mbps/i, '').trim());
 if (selected.deviceType) setNewDeviceType(selected.deviceType);
 
 const cleanDl = selected.speed?.replace(/ mbps/i, '').trim();
 const cleanUl = selected.upload?.replace(/ mbps/i, '').trim();
 const bwMatch = bandwidthProfiles.find(b => b.name === selected.speed || (b.download === cleanDl && b.upload === cleanUl));
 if (bwMatch) {
 setNewBw(bwMatch.name);
 } else if (selected.speed || selected.upload) {
 setNewBw('Custom Speed');
 }
 
 if (selected.validity) {
 const validityMatch = daysProfiles.find(dp => dp.name === selected.validity || dp.days.toString() === selected.validity);
 if (validityMatch) {
 const totalDays = validityMatch.days + (validityMatch.graceDays || 0);
 const future = new Date(Date.now() + totalDays * 86400000);
 setNewExpiry(future.toISOString().split('T')[0]);
 } else {
 const validityNum = parseInt(selected.validity, 10);
 if (!isNaN(validityNum) && validityNum > 0) {
 const future = new Date(Date.now() + validityNum * 86400000);
 setNewExpiry(future.toISOString().split('T')[0]);
 }
 }
 }
 }
 }}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-semibold"
 >
 {packages.map((p) => (
 <option key={p.id} value={p.name}>
 {p.name} (ডিফল্ট: ৳{p.price})
 </option>
 ))}
 <option value="Custom Package">-- কাস্টম প্যাকেজ (Custom Package) --</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-bold text-emerald-600 mb-1 flex items-center justify-between">
 <span>Custom Package Price (কাস্টম প্যাকেজ প্রাইস) *</span>
 <span className="text-[10px] font-normal text-slate-800">৳ টাকা</span>
 </label>
 <div className="relative">
 <span className="absolute left-3 top-2 text-xs font-bold text-emerald-600 ">৳</span>
 <input
 type="number"
 value={newPrice}
 onChange={(e) => setNewPrice(e.target.value)}
 placeholder="e.g. 500"
 className="w-full pl-7 pr-3 py-2 rounded-lg border border-emerald-500/50 bg-white text-xs font-bold text-emerald-600 focus:outline-none focus:border-emerald-500 font-mono"
 />
 </div>
 <div className="flex flex-wrap gap-1 mt-1.5">
 {['300', '400', '500', '600', '800', '1000'].map((p) => (
 <button
 key={p}
 type="button"
 onClick={() => setNewPrice(p)}
 className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] font-bold text-emerald-700 border border-emerald-500/20 cursor-pointer transition-colors"
 >
 ৳{p}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* CUSTOM BANDWIDTH & SPEED PROFILE SETUP */}
 <div className="p-3.5 rounded bg-sky-950/10 border border-sky-500/30 space-y-3">
 <div className="flex justify-between items-center border-b border-sky-500/20 pb-2">
 <span className="text-xs font-bold text-sky-600 flex items-center gap-1.5">
 📶 Custom Bandwidth & Speeds (কাস্টম ব্যান্ডউইথ ও স্পিড)
 </span>
 <span className="text-[10px] font-bold text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
 Custom Client Speed
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label className="block text-[11px] font-bold text-slate-700 mb-1">
 Bandwidth Profile Name
 </label>
 <select
 value={newBw}
 onChange={(e) => {
 const val = e.target.value;
 setNewBw(val);
 const matched = bandwidthProfiles.find((b) => b.name === val);
 if (matched) {
 setNewDownloadSpeed(matched.download);
 setNewUploadSpeed(matched.upload);
 if (matched.burst) setNewBurstSpeed(matched.burst);
 if (matched.priority) setNewPriority(matched.priority);
 }
 }}
 className="w-full px-2.5 py-1.5 rounded-lg border border-sky-500/40 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-bold"
 >
 {bandwidthProfiles.map((b) => (
 <option key={b.id} value={b.name}>
 {b.name} (↓{b.download}M / ↑{b.upload}M)
 </option>
 ))}
 <option value="Custom Speed">-- কাস্টম স্পিড (Custom Speed) --</option>
 </select>
 </div>

 <div>
 <label className="block text-[11px] font-bold text-slate-700 mb-1">
 Download Speed (ডাউনলোড Mbps)
 </label>
 <input
 type="text"
 value={newDownloadSpeed}
 onChange={(e) => setNewDownloadSpeed(e.target.value)}
 placeholder="e.g. 20"
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-sky-600 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-[11px] font-bold text-slate-700 mb-1">
 Upload Speed (আপলোড Mbps)
 </label>
 <input
 type="text"
 value={newUploadSpeed}
 onChange={(e) => setNewUploadSpeed(e.target.value)}
 placeholder="e.g. 10"
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
 />
 </div>
 </div>

 {/* Quick Speed Presets */}
 <div className="flex flex-wrap items-center gap-1.5 pt-1">
 <span className="text-[10px] font-semibold text-slate-800">Quick Speed Presets:</span>
 {[
 { label: '5 Mbps', dl: '5', ul: '2' },
 { label: '10 Mbps', dl: '10', ul: '5' },
 { label: '20 Mbps', dl: '20', ul: '10' },
 { label: '30 Mbps', dl: '30', ul: '15' },
 { label: '50 Mbps', dl: '50', ul: '25' },
 { label: '100 Mbps', dl: '100', ul: '50' },
 ].map((preset) => (
 <button
 key={preset.label}
 type="button"
 onClick={() => {
 setNewBw(preset.label);
 setNewDownloadSpeed(preset.dl);
 setNewUploadSpeed(preset.ul);
 }}
 className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 border border-sky-500/20 text-[10px] font-bold transition-colors cursor-pointer"
 >
 {preset.label}
 </button>
 ))}
 </div>
 </div>

 {/* MIKROTIK QUEUE SPEED & PRIORITY ADVANCED CONFIGURATION */}
 <div className="p-3.5 rounded bg-white text-slate-800 border border-slate-200 space-y-3 shadow-inner">
 <div className="flex justify-between items-center border-b border-slate-200 pb-2">
 <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
 ⚡ MikroTik Queue Config (বার্স্ট স্পিড ও প্রায়োরিটি)
 </span>
 <span className="text-[10px] font-mono text-[#00a65a] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
 Live Dynamic Queue
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* BURST SPEED INPUT & PRESETS */}
 <div>
 <label className="block text-[11px] font-bold text-slate-900 mb-1">
 Burst Speed (বার্স্ট স্পিড)
 </label>
 <input
 type="text"
 value={newBurstSpeed}
 onChange={(e) => setNewBurstSpeed(e.target.value)}
 placeholder="e.g. 40M/40M"
 className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs text-sky-300 font-mono focus:outline-none focus:border-[#3c8dbc]"
 />
 <div className="flex flex-wrap gap-1 mt-1.5">
 {['10M/10M', '20M/20M', '30M/30M', '40M/40M', '50M/50M', 'None'].map((preset) => (
 <button
 key={preset}
 type="button"
 onClick={() => setNewBurstSpeed(preset === 'None' ? '0M/0M' : preset)}
 className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-900 border border-slate-300 text-[9px] font-mono transition-colors cursor-pointer"
 >
 {preset}
 </button>
 ))}
 </div>
 </div>

 {/* PRIORITY LEVEL DROPDOWN */}
 <div>
 <label className="block text-[11px] font-bold text-slate-900 mb-1">
 Priority Level (প্রায়োরিটি - queue priority 1-8)
 </label>
 <select
 value={newPriority}
 onChange={(e) => setNewPriority(e.target.value)}
 className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
 >
 <option value="1">1 - 👑 VIP Priority (ভিআইপি ক্লায়েন্ট - ১)</option>
 <option value="2">2 - 🌟 High Priority (২)</option>
 <option value="3">3 - ⭐ Medium High (৩)</option>
 <option value="4">4 - 🔷 Medium (৪)</option>
 <option value="5">5 - ⚡ Standard (৫)</option>
 <option value="6">6 - 🔹 Normal (৬)</option>
 <option value="7">7 - 🔸 Low Priority (৭)</option>
 <option value="8">8 - 🏠 Local Client Priority (লোকাল ক্লায়েন্ট - ৮)</option>
 </select>
 <p className="text-[10px] text-slate-800 mt-1">
 {newPriority === '1'
 ? '👑 VIP Client: সর্বোচ্চ ব্যান্ডউইথ প্রায়োরিটি ১ পাবে।'
 : newPriority === '8'
 ? '🏠 Local Client: সাধারণ লোকাল ক্লায়েন্ট স্ট্যান্ডার্ড প্রায়োরিটি ৮।'
 : `Priority Level ${newPriority} Queue Configured`}
 </p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 User ID / Hotspot User
 </label>
 <input
 type="text"
 value={newUserId}
 onChange={(e) => setNewUserId(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Hotspot Password (পাসওয়ার্ড)
 </label>
 <div className="flex gap-1.5">
 <input
 type="text"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 placeholder="pass123"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 <button
 type="button"
 onClick={() => setNewPassword(`pass${Math.floor(100 + Math.random() * 900)}`)}
 className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-900 font-semibold shrink-0 cursor-pointer"
 title="Generate Random"
 >
 🎲
 </button>
 </div>
 </div>
 </div>

 <div>
 <div className="flex justify-between items-center mb-1">
 <label className="block text-xs font-semibold text-slate-700 ">
 Days Profile & Validity / Expiry Date (মেয়াদের প্রোফাইল ও মেয়াদের তারিখ) *
 </label>
 {daysProfiles.length > 0 && (
 <span className="text-[10px] font-bold text-sky-600 ">
 ⚡ Auto-Calculate Expiry
 </span>
 )}
 </div>

 {/* Days Profile Select Dropdown */}
 {daysProfiles.length > 0 && (
 <div className="mb-2">
 <select
 onChange={(e) => {
 const val = e.target.value;
 if (!val) return;
 const pId = Number(val);
 const found = daysProfiles.find((dp) => dp.id === pId);
 if (found) {
 const totalDays = found.days + (found.graceDays || 0);
 const future = new Date(Date.now() + totalDays * 86400000);
 setNewExpiry(future.toISOString().split('T')[0]);
 showToast(`Expiry set for profile ${found.name}: ${found.days} Days`, 'info');
 }
 }}
 className="w-full px-3 py-2 rounded-lg border border-sky-500/30 bg-sky-50/50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="">-- মেয়াদের প্রোফাইল সিলেট করুন (Select Days Profile) --</option>
 {daysProfiles.map((dp) => (
 <option key={dp.id} value={dp.id}>
 {dp.name} — ({dp.days} দিন {dp.graceDays > 0 ? `+${dp.graceDays} দিন গ্রেস` : ''})
 </option>
 ))}
 </select>
 </div>
 )}

 {/* Quick Days Profiles Pill Selectors */}
 {daysProfiles.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mb-2">
 {daysProfiles.map((dp) => (
 <button
 key={dp.id}
 type="button"
 onClick={() => {
 const totalDays = dp.days + (dp.graceDays || 0);
 const future = new Date(Date.now() + totalDays * 86400000);
 setNewExpiry(future.toISOString().split('T')[0]);
 showToast(`Set expiry using profile: ${dp.name}`, 'info');
 }}
 className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 border border-sky-500/20 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
 >
 <span>{dp.name}</span>
 <span className="bg-sky-600 text-white px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono">
 {dp.days}D
 </span>
 </button>
 ))}
 </div>
 )}

 <input
 type="date"
 value={newExpiry}
 onChange={(e) => setNewExpiry(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Client Photo (Optional)
 </label>
 <input
 type="file"
 accept="image/*"
 onChange={(e) => handlePhotoUpload(e, setNewPhoto)}
 className="w-full text-xs text-slate-800 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/10 file:text-sky-600 hover:file:bg-sky-500/20"
 />
 {newPhoto && (
 <img
 src={newPhoto}
 alt="Preview"
 className="w-12 h-12 rounded-full object-cover mt-2 border border-slate-200"
 />
 )}
 </div>

 <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/80 ">
 <button
 type="button"
 onClick={() => setAddModalOpen(false)}
 className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
 >
 Save Client
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: EDIT CLIENT */}
 <Modal
 isOpen={Boolean(editClient)}
 title={editClient ? `Edit ${editClient.name}` : ''}
 onClose={() => setEditClient(null)}
 >
 <form onSubmit={handleSaveEdit} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Name
 </label>
 <input
 type="text"
 required
 value={editName}
 onChange={(e) => setEditName(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Phone
 </label>
 <input
 type="text"
 required
 value={editPhone}
 onChange={(e) => setEditPhone(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 {/* Router Selection */}
 {routers.length > 0 && (
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 MikroTik Router Node (রাউটার নোড) *
 </label>
 <select
 value={editRouter}
 onChange={(e) => setEditRouter(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-sky-500/40 bg-white text-xs font-semibold text-sky-700 focus:outline-none focus:border-[#3c8dbc]"
 >
 {routers.map((r) => (
 <option key={r.id} value={r.name}>
 {r.name} ({r.ip}) - {r.mode} ({r.location})
 </option>
 ))}
 </select>
 </div>
 )}

 <div>
 <label className="block text-xs font-bold text-slate-800 mb-1">
 Device Target Option (ব্যবহারের ধরন)
 </label>
 <div className="grid grid-cols-2 gap-2 pt-1">
 <button
 type="button"
 onClick={() => setEditDeviceType('Mobile')}
 className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
 editDeviceType === 'Mobile'
 ? 'border-amber-500 bg-amber-500/10 text-amber-700 ring-2 ring-amber-500/30 font-bold'
 : 'border-slate-200 hover:bg-slate-50 text-slate-900 '
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <Smartphone className="w-4 h-4 text-amber-500" /> মোবাইল এক্সেস
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 ১ টি মোবাইল সংযোগ।
 </p>
 </button>

 <button
 type="button"
 onClick={() => setEditDeviceType('Router')}
 className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
 editDeviceType === 'Router'
 ? 'border-sky-500 bg-sky-500/10 text-sky-700 ring-2 ring-sky-500/30 font-bold'
 : 'border-slate-200 hover:bg-slate-50 text-slate-900 '
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <Router className="w-4 h-4 text-sky-500" /> রাউটার এক্সেস
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 রাউটার শেয়ারড এক্সেস।
 </p>
 </button>
 </div>
 </div>

 {/* PACKAGE & CUSTOM PRICE SETUP */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded bg-slate-50 border border-slate-200 ">
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 Package (প্যাকেজ)
 </label>
 <select
 value={editPkg}
 onChange={(e) => {
 const val = e.target.value;
 setEditPkg(val);
 const selected = packages.find((p) => p.name === val);
 if (selected) {
 setEditPrice(selected.price);
 
 if (selected.speed) setEditDownloadSpeed(selected.speed.replace(/ mbps/i, '').trim());
 if (selected.upload) setEditUploadSpeed(selected.upload.replace(/ mbps/i, '').trim());
 if (selected.deviceType) setEditDeviceType(selected.deviceType);
 
 const cleanDl = selected.speed?.replace(/ mbps/i, '').trim();
 const cleanUl = selected.upload?.replace(/ mbps/i, '').trim();
 const bwMatch = bandwidthProfiles.find(b => b.name === selected.speed || (b.download === cleanDl && b.upload === cleanUl));
 if (bwMatch) {
 setEditBw(bwMatch.name);
 } else if (selected.speed || selected.upload) {
 setEditBw('Custom Speed');
 }
 }
 }}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-semibold"
 >
 {packages.map((p) => (
 <option key={p.id} value={p.name}>
 {p.name}
 </option>
 ))}
 <option value="Custom Package">-- কাস্টম প্যাকেজ (Custom Package) --</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-bold text-emerald-600 mb-1 flex items-center justify-between">
 <span>Custom Package Price (কাস্টম প্যাকেজ প্রাইস)</span>
 <span className="text-[10px] font-normal text-slate-800">৳ টাকা</span>
 </label>
 <div className="relative">
 <span className="absolute left-3 top-2 text-xs font-bold text-emerald-600 ">৳</span>
 <input
 type="number"
 value={editPrice}
 onChange={(e) => setEditPrice(e.target.value)}
 placeholder="e.g. 500"
 className="w-full pl-7 pr-3 py-2 rounded-lg border border-emerald-500/50 bg-white text-xs font-bold text-emerald-600 focus:outline-none focus:border-emerald-500 font-mono"
 />
 </div>
 <div className="flex flex-wrap gap-1 mt-1.5">
 {['300', '400', '500', '600', '800', '1000'].map((p) => (
 <button
 key={p}
 type="button"
 onClick={() => setEditPrice(p)}
 className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] font-bold text-emerald-700 border border-emerald-500/20 cursor-pointer transition-colors"
 >
 ৳{p}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* CUSTOM BANDWIDTH & SPEED PROFILE SETUP */}
 <div className="p-3.5 rounded bg-sky-950/10 border border-sky-500/30 space-y-3">
 <div className="flex justify-between items-center border-b border-sky-500/20 pb-2">
 <span className="text-xs font-bold text-sky-600 flex items-center gap-1.5">
 📶 Custom Bandwidth & Speeds (কাস্টম ব্যান্ডউইথ ও স্পিড)
 </span>
 <span className="text-[10px] font-bold text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
 Update Client Speeds
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label className="block text-[11px] font-bold text-slate-700 mb-1">
 Bandwidth Profile Name
 </label>
 <select
 value={editBw}
 onChange={(e) => {
 const val = e.target.value;
 setEditBw(val);
 const matched = bandwidthProfiles.find((b) => b.name === val);
 if (matched) {
 setEditDownloadSpeed(matched.download);
 setEditUploadSpeed(matched.upload);
 if (matched.burst) setEditBurstSpeed(matched.burst);
 if (matched.priority) setEditPriority(matched.priority);
 }
 }}
 className="w-full px-2.5 py-1.5 rounded-lg border border-sky-500/40 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-bold"
 >
 {bandwidthProfiles.map((b) => (
 <option key={b.id} value={b.name}>
 {b.name} (↓{b.download}M / ↑{b.upload}M)
 </option>
 ))}
 <option value="Custom Speed">-- কাস্টম স্পিড (Custom Speed) --</option>
 </select>
 </div>

 <div>
 <label className="block text-[11px] font-bold text-slate-700 mb-1">
 Download Speed (ডাউনলোড Mbps)
 </label>
 <input
 type="text"
 value={editDownloadSpeed}
 onChange={(e) => setEditDownloadSpeed(e.target.value)}
 placeholder="e.g. 20"
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-sky-600 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-[11px] font-bold text-slate-700 mb-1">
 Upload Speed (আপলোড Mbps)
 </label>
 <input
 type="text"
 value={editUploadSpeed}
 onChange={(e) => setEditUploadSpeed(e.target.value)}
 placeholder="e.g. 10"
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
 />
 </div>
 </div>

 {/* Quick Speed Presets */}
 <div className="flex flex-wrap items-center gap-1.5 pt-1">
 <span className="text-[10px] font-semibold text-slate-800">Quick Speed Presets:</span>
 {[
 { label: '5 Mbps', dl: '5', ul: '2' },
 { label: '10 Mbps', dl: '10', ul: '5' },
 { label: '20 Mbps', dl: '20', ul: '10' },
 { label: '30 Mbps', dl: '30', ul: '15' },
 { label: '50 Mbps', dl: '50', ul: '25' },
 { label: '100 Mbps', dl: '100', ul: '50' },
 ].map((preset) => (
 <button
 key={preset.label}
 type="button"
 onClick={() => {
 setEditBw(preset.label);
 setEditDownloadSpeed(preset.dl);
 setEditUploadSpeed(preset.ul);
 }}
 className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 border border-sky-500/20 text-[10px] font-bold transition-colors cursor-pointer"
 >
 {preset.label}
 </button>
 ))}
 </div>
 </div>

 {/* MIKROTIK QUEUE SPEED & PRIORITY ADVANCED CONFIGURATION */}
 <div className="p-3.5 rounded bg-white text-slate-800 border border-slate-200 space-y-3 shadow-inner">
 <div className="flex justify-between items-center border-b border-slate-200 pb-2">
 <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
 ⚡ MikroTik Queue Config (বার্স্ট স্পিড ও প্রায়োরিটি)
 </span>
 <span className="text-[10px] font-mono text-[#00a65a] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
 Update Queue
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* BURST SPEED INPUT & PRESETS */}
 <div>
 <label className="block text-[11px] font-bold text-slate-900 mb-1">
 Burst Speed (বার্স্ট স্পিড)
 </label>
 <input
 type="text"
 value={editBurstSpeed}
 onChange={(e) => setEditBurstSpeed(e.target.value)}
 placeholder="e.g. 40M/40M"
 className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs text-sky-300 font-mono focus:outline-none focus:border-[#3c8dbc]"
 />
 <div className="flex flex-wrap gap-1 mt-1.5">
 {['10M/10M', '20M/20M', '30M/30M', '40M/40M', '50M/50M', 'None'].map((preset) => (
 <button
 key={preset}
 type="button"
 onClick={() => setEditBurstSpeed(preset === 'None' ? '0M/0M' : preset)}
 className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-900 border border-slate-300 text-[9px] font-mono transition-colors cursor-pointer"
 >
 {preset}
 </button>
 ))}
 </div>
 </div>

 {/* PRIORITY LEVEL DROPDOWN */}
 <div>
 <label className="block text-[11px] font-bold text-slate-900 mb-1">
 Priority Level (প্রায়োরিটি - queue priority 1-8)
 </label>
 <select
 value={editPriority}
 onChange={(e) => setEditPriority(e.target.value)}
 className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
 >
 <option value="1">1 - 👑 VIP Priority (ভিআইপি ক্লায়েন্ট - ১)</option>
 <option value="2">2 - 🌟 High Priority (২)</option>
 <option value="3">3 - ⭐ Medium High (৩)</option>
 <option value="4">4 - 🔷 Medium (৪)</option>
 <option value="5">5 - ⚡ Standard (৫)</option>
 <option value="6">6 - 🔹 Normal (৬)</option>
 <option value="7">7 - 🔸 Low Priority (৭)</option>
 <option value="8">8 - 🏠 Local Client Priority (লোকাল ক্লায়েন্ট - ৮)</option>
 </select>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Status
 </label>
 <select
 value={editStatus}
 onChange={(e) => setEditStatus(e.target.value as 'online' | 'offline')}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="online">Online</option>
 <option value="offline">Offline</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Hotspot Password
 </label>
 <input
 type="text"
 required
 value={editPassword}
 onChange={(e) => setEditPassword(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
 />
 </div>
 </div>

 {/* Advanced Expiry Date Control & Extension Engine */}
 <div className="p-3.5 bg-sky-50/60 rounded border border-sky-500/30 space-y-3">
 <div className="flex justify-between items-center">
 <label className="block text-xs font-bold text-sky-900 flex items-center gap-1.5">
 <CalendarPlus className="w-4 h-4 text-sky-600 " />
 <span>মেয়াদ নিয়ন্ত্রণ ও বাড়ানোর প্যানেল (Expiry Control & Extension)</span>
 </label>
 {editExpiry && (
 <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${getClientExpiryInfo(editExpiry).badgeClass}`}>
 {getClientExpiryInfo(editExpiry).badgeText}
 </span>
 )}
 </div>

 {/* Quick Extension Chips */}
 <div>
 <span className="text-[11px] font-semibold text-slate-900 block mb-1.5">
 ⚡ দ্রুত মেয়াদ বাড়ান (Quick Extend From Today or Current):
 </span>
 <div className="flex flex-wrap gap-1.5">
 {[
 { label: '+৭ দিন', days: 7 },
 { label: '+১৫ দিন', days: 15 },
 { label: '+৩০ দিন (১ মাস)', days: 30 },
 { label: '+৬০ দিন (২ মাস)', days: 60 },
 { label: '+৯০ দিন (৩ মাস)', days: 90 },
 { label: '+১৮০ দিন (৬ মাস)', days: 180 },
 { label: '+৩৬৫ দিন (১ বছর)', days: 365 },
 ].map((item) => (
 <button
 key={item.days}
 type="button"
 onClick={() => {
 const newTarget = addDaysToExpiry(editExpiry || editClient?.expiry, item.days);
 setEditExpiry(newTarget);
 setEditStatus('online');
 showToast(`মেয়াদ আরও ${item.days} দিন বাড়ানো হয়েছে (${newTarget})`, 'info');
 }}
 className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
 >
 <span>{item.label}</span>
 </button>
 ))}
 <button
 type="button"
 onClick={() => {
 const todayStr = new Date().toISOString().split('T')[0];
 setEditExpiry(todayStr);
 showToast('মেয়াদ আজকের তারিখে সেট করা হয়েছে (আজই এক্সপায়ার হবে)', 'warning');
 }}
 className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 border border-rose-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
 >
 আজই শেষ (Today)
 </button>
 </div>
 </div>

 {/* Custom Day Adder */}
 <div className="flex items-center gap-2 pt-1">
 <span className="text-[11px] font-semibold text-slate-700 shrink-0">
 নির্দিষ্ট দিন যোগ করুন:
 </span>
 <input
 type="number"
 min="1"
 max="3650"
 value={editCustomDaysInput}
 onChange={(e) => setEditCustomDaysInput(e.target.value)}
 placeholder="যেমন: 45"
 className="w-20 px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono text-center"
 />
 <button
 type="button"
 onClick={() => {
 const num = parseInt(editCustomDaysInput, 10);
 if (isNaN(num) || num <= 0) {
 showToast('সঠিক দিনের সংখ্যা লিখুন', 'error');
 return;
 }
 const newTarget = addDaysToExpiry(editExpiry || editClient?.expiry, num);
 setEditExpiry(newTarget);
 setEditStatus('online');
 showToast(`${num} দিন মেয়াদ যোগ করা হয়েছে (${newTarget})`, 'success');
 }}
 className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
 >
 + দিন যোগ করুন
 </button>
 </div>

 {/* Days Profile Select Dropdown for Edit Form if configured */}
 {daysProfiles.length > 0 && (
 <div className="pt-1">
 <span className="text-[11px] font-semibold text-slate-900 block mb-1">
 অথবা মেয়াদের প্রোফাইল নির্বাচন করুন:
 </span>
 <select
 onChange={(e) => {
 const val = e.target.value;
 if (!val) return;
 const pId = Number(val);
 const found = daysProfiles.find((dp) => dp.id === pId);
 if (found) {
 const totalDays = found.days + (found.graceDays || 0);
 const future = new Date(Date.now() + totalDays * 86400000);
 const targetStr = future.toISOString().split('T')[0];
 setEditExpiry(targetStr);
 setEditStatus('online');
 showToast(`প্রোফাইল ${found.name} অনুযায়ী মেয়াদ নির্ধারণ: ${found.days} দিন`, 'info');
 }
 }}
 className="w-full px-3 py-1.5 rounded-lg border border-sky-500/40 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="">-- মেয়াদের প্রোফাইল দিয়ে সেট করুন --</option>
 {daysProfiles.map((dp) => (
 <option key={dp.id} value={dp.id}>
 {dp.name} ({dp.days} দিন {dp.graceDays > 0 ? `+${dp.graceDays} দিন গ্রেস` : ''})
 </option>
 ))}
 </select>
 </div>
 )}

 {/* Manual Date Input & Comparison Preview */}
 <div className="pt-2 border-t border-sky-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2">
 <div>
 <label className="block text-[11px] font-semibold text-slate-700 mb-1">
 📅 ক্যালেন্ডার থেকে সরাসরি তারিখ নির্বাচন:
 </label>
 <input
 type="date"
 value={editExpiry}
 onChange={(e) => {
 setEditExpiry(e.target.value);
 const info = getClientExpiryInfo(e.target.value);
 if (!info.isExpired) {
 setEditStatus('online');
 }
 }}
 className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono font-bold"
 />
 </div>

 <div className="bg-white/80 p-2 rounded-lg border border-slate-200 flex flex-col justify-center text-[11px]">
 <div className="flex justify-between">
 <span className="text-slate-800">মূল মেয়াদ:</span>
 <span className="font-mono text-slate-700 ">{editClient?.expiry || 'N/A'}</span>
 </div>
 <div className="flex justify-between font-bold">
 <span className="text-sky-600 ">নতুন মেয়াদ:</span>
 <span className="font-mono text-emerald-600 ">{editExpiry || 'N/A'}</span>
 </div>
 <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
 ✓ ভবিষ্যতে থাকলে সেভ করার সাথে সাথে লাইন অটো-অনলাইন হবে
 </div>
 </div>
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Update Photo
 </label>
 <input
 type="file"
 accept="image/*"
 onChange={(e) => handlePhotoUpload(e, setEditPhoto)}
 className="w-full text-xs text-slate-800 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/10 file:text-sky-600 hover:file:bg-sky-500/20"
 />
 {editPhoto && (
 <img
 src={editPhoto}
 alt="Preview"
 className="w-12 h-12 rounded-full object-cover mt-2 border border-slate-200"
 />
 )}
 </div>

 <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/80 ">
 <button
 type="button"
 onClick={() => setEditClient(null)}
 className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
 >
 Save Changes
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: VIEW CLIENT DETAILS */}
 <Modal
 isOpen={Boolean(viewClient)}
 title={viewClient ? `Client Profile: ${viewClient.name}` : ''}
 onClose={() => setViewClient(null)}
 maxWidth="max-w-3xl"
 >
 {viewClient && (
 <div className="space-y-5">
 {/* Real-time Expiry Countdown Engine & 1-Click Extension Bar */}
 <ClientProfileLiveCountdown
 client={viewClient}
 onExtend={handleExtendFromProfile}
 onCustomDate={handleCustomDateFromProfile}
 />

 {/* Live Bandwidth Graph Banner for Client */}
 <ClientBandwidthGraph client={viewClient} />

 <div className="flex flex-col md:flex-row gap-6 pt-2">
 <div className="flex-1 space-y-4">
 <div className="flex items-center gap-4">
 {viewClient.photo ? (
 <img
 src={viewClient.photo}
 alt={viewClient.name}
 className="w-14 h-14 rounded-full object-cover border border-slate-200"
 />
 ) : (
 <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
 {viewClient.name.slice(0, 2).toUpperCase()}
 </div>
 )}
 <div>
 <h3 className="text-lg font-bold text-slate-900 ">
 {viewClient.name}
 </h3>
 <p className="text-xs text-slate-800 font-mono">{viewClient.id}</p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3 text-xs">
 <div className="p-2.5 rounded-lg bg-slate-50 ">
 <span className="text-slate-800 block">Phone</span>
 <strong className="text-slate-900 font-mono">
 {viewClient.phone}
 </strong>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 ">
 <span className="text-slate-800 block">User ID</span>
 <strong className="text-slate-900 font-mono">
 {viewClient.userId}
 </strong>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 ">
 <span className="text-slate-800 block">Device Type</span>
 <strong className="text-amber-600 font-bold">
 {viewClient.deviceType === 'Mobile' ? '📱 Mobile Access' : '📶 Router Access'}
 </strong>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 ">
 <span className="text-slate-800 block">Package</span>
 <strong className="text-sky-600 font-bold">
 {viewClient.package}
 </strong>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 ">
 <span className="text-slate-800 block">Package Price (বিল পরিমাণ)</span>
 <strong className="text-emerald-600 font-bold font-mono">
 ৳{viewClient.price || '500'}
 </strong>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 ">
 <span className="text-slate-800 block">Bandwidth & Speed</span>
 <strong className="text-slate-900 font-bold">
 {viewClient.bandwidth} (↓{viewClient.downloadSpeed}M / ↑{viewClient.uploadSpeed}M)
 </strong>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 ">
 <span className="text-slate-800 block">Burst Speed (বার্স্ট স্পিড)</span>
 <strong className="text-sky-600 font-mono">
 {viewClient.burstSpeed || '30M/30M'}
 </strong>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 ">
 <span className="text-slate-800 block">Priority (প্রায়োরিটি)</span>
 <strong
 className={`font-bold flex items-center gap-1 ${
 viewClient.priority === '1'
 ? 'text-amber-500'
 : 'text-slate-900 '
 }`}
 >
 {viewClient.priority === '1'
 ? '👑 VIP Priority (1)'
 : viewClient.priority === '8' || !viewClient.priority
 ? '🏠 Local Client (8)'
 : `Priority ${viewClient.priority}`}
 </strong>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 ">
 <span className="text-slate-800 block">Status</span>
 <span
 className={`inline-flex items-center gap-1 font-semibold capitalize ${
 viewClient.status === 'online' ? 'text-teal-600' : 'text-slate-800'
 }`}
 >
 <CheckCircle2 className="w-3.5 h-3.5" /> {viewClient.status}
 </span>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 col-span-2">
 <span className="text-slate-800 block">Expiry</span>
 <strong className="text-slate-900 font-mono">
 {viewClient.expiry}
 </strong>
 </div>
 </div>
 </div>

 <div className="flex-1 md:border-l border-slate-200 md:pl-6 space-y-4">
 <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
 Management Actions
 </h4>
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => {
 setSmsReminderClient(viewClient);
 setViewClient(null);
 }}
 className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
 >
 <MessageSquare className="w-3.5 h-3.5" /> Send SMS Reminder (মেসেজ পাঠান)
 </button>

 <button
 onClick={() => {
 handleOpenEdit(viewClient);
 setViewClient(null);
 }}
 className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <Edit2 className="w-3.5 h-3.5" /> Edit Info
 </button>

 <button
 onClick={() => {
 onToggleStatus(viewClient.id);
 showToast(
 `${viewClient.name} status updated.`,
 'success'
 );
 setViewClient(null);
 }}
 className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 {viewClient.status === 'online' ? (
 <>
 <Pause className="w-3.5 h-3.5" /> Suspend
 </>
 ) : (
 <>
 <Play className="w-3.5 h-3.5" /> Activate
 </>
 )}
 </button>

 <button
 onClick={() => {
 const defaultAmount = parseInt(String(viewClient.price || packages.find((p) => p.name === viewClient.package)?.price || '500').replace(/[^\d]/g, ''), 10) || 500;
 setRenewPaymentAmount(defaultAmount);
 setRenewPaymentMethod('Cash');
 setRenewPaymentClient(viewClient);
 setViewClient(null);
 }}
 className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <RefreshCw className="w-3.5 h-3.5" /> Renew 30 Days
 </button>

 <button
 onClick={() => {
 setQrClient(viewClient);
 setViewClient(null);
 }}
 className="px-3 py-1.5 rounded-lg bg-white hover:bg-white text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <QrCode className="w-3.5 h-3.5" /> Voucher QR
 </button>
 </div>

 <div className="p-3 bg-slate-100 rounded space-y-1">
 <span className="text-[10px] text-slate-800 block uppercase font-semibold">
 Hotspot Voucher Auth Token
 </span>
 <code className="text-xs font-mono text-sky-600 font-bold break-all block">
 NEXORA-{viewClient.id}-
 {Math.random().toString(36).substring(2, 8).toUpperCase()}
 </code>
 </div>
 </div>
 </div>
 </div>
 )}
 </Modal>

 {/* MODAL: QR VOUCHER PRINT */}
 <Modal
 isOpen={Boolean(qrClient)}
 title={qrClient ? `Voucher: ${qrClient.name}` : ''}
 onClose={() => setQrClient(null)}
 maxWidth="max-w-md"
 >
 {qrClient && (() => {
 const hotspotDns = 'isp.net';
 const hotspotUser = qrClient.userId;
 const hotspotPass = qrClient.password || '1234';
 const isMobileLock = qrClient.deviceType === 'Mobile';
 const qrPayload = `http://${hotspotDns}/login?username=${encodeURIComponent(hotspotUser)}&password=${encodeURIComponent(hotspotPass)}&dns=${hotspotDns}&mac_bind=${isMobileLock ? '1' : '0'}`;

 return (
 <div className="text-center space-y-4">
 <div className="border-2 border-slate-200 rounded p-5 bg-white shadow-md space-y-3">
 <div className="text-lg font-extrabold text-sky-600 tracking-tight">
 {settings.appName || 'Nexora network'} <span className="text-xs text-slate-800 font-normal">ISP</span>
 </div>

 {/* Real Scannable QR Code */}
 <div className="p-3 bg-white rounded border border-slate-200 shadow-xs inline-block mx-auto">
 <QRCodeSVG
 value={qrPayload}
 size={160}
 level="H"
 includeMargin={false}
 />
 </div>

 <div className="text-[11px] font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200/80 text-left space-y-1">
 <div className="flex justify-between items-center text-xs">
 <span className="text-slate-800 font-bold">DNS Domain:</span>
 <span className="font-mono font-extrabold text-sky-600 ">{hotspotDns}</span>
 </div>
 <div className="flex justify-between items-center text-xs">
 <span className="text-slate-800 font-bold">Username (ইউজার):</span>
 <span className="font-mono font-bold text-slate-900 ">{hotspotUser}</span>
 </div>
 <div className="flex justify-between items-center text-xs">
 <span className="text-slate-800 font-bold">Password (পাসওয়ার্ড):</span>
 <span className="font-mono font-bold text-emerald-600 ">{hotspotPass}</span>
 </div>
 <div className="pt-1 text-[10px] text-slate-800 break-all font-mono">
 <span className="text-slate-800 font-bold">Hotspot Link:</span> {qrPayload}
 </div>
 </div>

 {/* Single Mobile MAC Lock Notice */}
 <div className={`p-2.5 rounded text-xs font-bold flex items-center justify-center gap-2 ${
 isMobileLock
 ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
 : 'bg-sky-500/10 text-sky-700 border border-sky-500/20'
 }`}>
 {isMobileLock ? (
 <>
 <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
 <span>🔒 ১ টি মাত্র মোবাইলে এক্টিভেট হবে (MAC Lock Locked)</span>
 </>
 ) : (
 <>
 <Router className="w-4 h-4 text-sky-500 shrink-0" />
 <span>📶 রাউটার কানেকশন (শেয়ারড এক্সেস)</span>
 </>
 )}
 </div>

 <div className="text-left text-xs divide-y divide-slate-100 space-y-1.5 pt-1">
 <div className="flex justify-between py-1">
 <span className="text-slate-800">Client Name</span>
 <strong className="text-slate-900 ">{qrClient.name}</strong>
 </div>
 <div className="flex justify-between py-1">
 <span className="text-slate-800">Account ID</span>
 <strong className="text-slate-900 font-mono">{qrClient.id}</strong>
 </div>
 <div className="flex justify-between py-1">
 <span className="text-slate-800">Package</span>
 <strong className="text-sky-600 ">{qrClient.package}</strong>
 </div>
 <div className="flex justify-between py-1">
 <span className="text-slate-800">Bandwidth</span>
 <strong className="text-slate-900 ">{qrClient.bandwidth}</strong>
 </div>
 <div className="flex justify-between py-1">
 <span className="text-slate-800">Validity Expiry</span>
 <strong className="text-slate-900 font-mono">{qrClient.expiry}</strong>
 </div>
 </div>

 <div className="text-[11px] text-slate-800 pt-1">
 Helpdesk Phone: {settings.phone}
 </div>
 </div>

 <div className="flex justify-center gap-2 pt-2">
 <button
 onClick={() => window.print()}
 className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
 >
 <Printer className="w-4 h-4" /> Print Voucher
 </button>
 <button
 onClick={() => setQrClient(null)}
 className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 transition-colors cursor-pointer"
 >
 Close
 </button>
 </div>
 </div>
 );
 })()}
 </Modal>

 {/* MODAL: DELETE CONFIRMATION */}
 <Modal
 isOpen={Boolean(deleteConfirmClient)}
 title="Confirm Delete Client"
 onClose={() => setDeleteConfirmClient(null)}
 maxWidth="max-w-sm"
 >
 {deleteConfirmClient && (
 <div className="space-y-4 text-center">
 <p className="text-xs text-slate-900 ">
 Are you sure you want to delete client <strong className="text-slate-900 ">{deleteConfirmClient.name}</strong> ({deleteConfirmClient.id})?
 </p>

 <div className="flex justify-center gap-2 pt-2">
 <button
 onClick={() => setDeleteConfirmClient(null)}
 className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 onClick={() => handleDelete(deleteConfirmClient)}
 className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
 >
 Delete Client
 </button>
 </div>
 </div>
 )}
 </Modal>

 {/* MODAL: RENEW PAYMENT */}
 <Modal
 isOpen={Boolean(renewPaymentClient)}
 title={renewPaymentClient ? `Renew Package for ${renewPaymentClient.name}` : 'Renew Package'}
 onClose={() => setRenewPaymentClient(null)}
 maxWidth="max-w-md"
 >
 {renewPaymentClient && (
 <div className="space-y-4">
 <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 text-sm text-slate-700 ">
 <p>You are about to renew <strong>{renewPaymentClient.package}</strong> for <strong>30 Days</strong>.</p>
 <p>This action will record a payment to the system.</p>
 </div>

 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 Payment Amount (৳)
 </label>
 <div className="relative">
 <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
 <input
 type="number"
 value={renewPaymentAmount || ''}
 onChange={(e) => setRenewPaymentAmount(Number(e.target.value))}
 className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 "
 placeholder="e.g. 500"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 Payment Method
 </label>
 <div className="grid grid-cols-3 gap-2">
 {['bKash', 'Nagad', 'Rocket', 'Cash', 'Bank'].map((method) => {
 const logoUrl = settings.paymentLogos?.[method.toLowerCase() as keyof typeof settings.paymentLogos];
 return (
 <button
 key={method}
 type="button"
 onClick={() => setRenewPaymentMethod(method as any)}
 className={`p-2 rounded-lg text-xs font-bold border flex flex-col items-center justify-center gap-2 transition-colors min-h-[70px] ${
 renewPaymentMethod === method
 ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm'
 : 'bg-white border-slate-200 text-slate-900 hover:border-sky-300 hover:shadow-sm'
 }`}
 >
 {logoUrl && (
 <div className="h-8 w-full flex items-center justify-center">
 <img src={logoUrl} alt={method} className="h-full max-w-full object-contain" />
 </div>
 )}
 <span>{method}</span>
 </button>
 );
 })}
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <button
 type="button"
 onClick={() => setRenewPaymentClient(null)}
 className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => {
 onRenewClient(renewPaymentClient.id, 1, renewPaymentAmount, renewPaymentMethod);
 showToast(`${renewPaymentClient.name} renewed for 30 days and payment recorded.`, 'success');
 setRenewPaymentClient(null);
 }}
 className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
 >
 <Check className="w-4 h-4" /> Save & Renew
 </button>
 </div>
 </div>
 )}
 </Modal>

 {/* MODAL: SMS SUBSCRIPTION REMINDER */}
 <SmsReminderModal
 client={smsReminderClient}
 settings={settings}
 isOpen={Boolean(smsReminderClient)}
 onClose={() => setSmsReminderClient(null)}
 onSmsSent={onSendSmsReminder}
 showToast={showToast}
 />
 </div>
 );
};
