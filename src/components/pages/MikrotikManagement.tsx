import React, { useState } from 'react';
import {
 Server,
 Wifi,
 Shield,
 Network,
 ListFilter,
 Download,
 RefreshCw,
 Power,
 Plus,
 Trash2,
 Search,
 Terminal,
 CheckCircle2,
 AlertTriangle,
 Link as LinkIcon,
 Unlink,
 Activity,
 Cpu,
 Clock,
 HardDrive,
 Users,
 Edit2,
 Eye,
 MessageSquare,
 QrCode,
 Check,
 ChevronRight,
 Settings as SettingsIcon,
 Tag,
 Radio,
 Sliders,
 Play,
 Pause,
 Printer,
 Smartphone,
 Router as RouterIcon,
 ShieldAlert,
 Zap,
 HelpCircle,
} from 'lucide-react';
import {
 Client,
 MikrotikRouter,
 Package,
 BandwidthProfile,
 DaysProfile,
 AppSettings,
} from '../../types';
import { Modal } from '../Modal';
import { SmsReminderModal } from '../SmsReminderModal';
import { getClientExpiryInfo } from '../../lib/expiryUtils';
import { QRCodeSVG } from 'qrcode.react';
import { compressImage } from '../../lib/imageUtils';
import { BandwidthMonitor } from '../BandwidthMonitor';
import { LiveNetworkTraffic } from '../LiveNetworkTraffic';

interface MikrotikManagementProps {
 routers: MikrotikRouter[];
 selectedRouterId?: string;
 onSelectRouter?: (id: string) => void;
 onAddRouter?: (router: MikrotikRouter) => void;
 onUpdateRouter?: (router: MikrotikRouter) => void;
 onDeleteRouter?: (id: string) => void;
 onToggleRouterConnection?: (id: string) => void;
 clients: Client[];
 packages?: Package[];
 bandwidthProfiles?: BandwidthProfile[];
 daysProfiles?: DaysProfile[];
 settings?: AppSettings;
 onAddClient: (client: Client) => void;
 onUpdateClient: (client: Client) => void;
 onDeleteClient: (id: string) => void;
 onToggleClientStatus: (id: string) => void;
 onSendSmsReminder?: (client: Client, messageText: string, channel: 'SMS' | 'WhatsApp' | 'Manual') => void;
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

const isPrivateIp = (host: string): boolean => {
 if (!host) return false;
 const clean = host.trim().toLowerCase();
 if (clean === 'localhost' || clean === '127.0.0.1') return true;
 if (clean.startsWith('10.')) return true;
 if (clean.startsWith('192.168.')) return true;
 
 const parts = clean.split('.');
 if (parts.length === 4) {
 const first = parseInt(parts[0], 10);
 const second = parseInt(parts[1], 10);
 if (first === 172 && second >= 16 && second <= 31) {
 return true;
 }
 }
 return false;
};

export const MikrotikManagementPage: React.FC<MikrotikManagementProps> = ({
 routers = [],
 selectedRouterId,
 onSelectRouter,
 onAddRouter,
 onUpdateRouter,
 onDeleteRouter,
 onToggleRouterConnection,
 clients = [],
 packages = [],
 bandwidthProfiles = [],
 daysProfiles = [],
 settings,
 onAddClient,
 onUpdateClient,
 onDeleteClient,
 onToggleClientStatus,
 onSendSmsReminder,
 showToast,
}) => {
 // Active Router selection
 const [internalSelectedId, setInternalSelectedId] = useState<string>(
 selectedRouterId || routers[0]?.id || 'mk-01'
 );

 const activeRouterId = selectedRouterId || internalSelectedId;
 const currentRouter =
 routers.find((r) => r.id === activeRouterId) ||
 routers[0] || {
 id: 'mk-01',
 name: 'Main Core Router (CCR1036)',
 ip: '192.168.1.1',
 apiPort: 8728,
 apiSslPort: 8729,
 username: 'admin',
 connected: true,
 model: 'CCR1036-12G-4S',
 location: 'Central Datacenter',
 mode: 'Core',
 cpu: '12%',
 ram: '128 MB / 512 MB',
 uptime: '14 days, 06:22:10',
 };

 const handleSelectRouter = (id: string) => {
 setInternalSelectedId(id);
 if (onSelectRouter) {
 onSelectRouter(id);
 }
 const found = routers.find((r) => r.id === id);
 if (found) {
 showToast(`Switched to MikroTik: ${found.name} (${found.ip})`, 'info');
 }
 };

 const [activeTab, setActiveTab] = useState<
 'clients' | 'interfaces' | 'ip' | 'dhcp' | 'firewall' | 'queues' | 'system'
 >('clients');

 const [clientSearchQuery, setClientSearchQuery] = useState('');
 const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'online' | 'offline' | 'expiring' | 'expired'>('all');
 const [searchQuery, setSearchQuery] = useState('');

 // Router Management Modals
 const [isAddRouterOpen, setIsAddRouterOpen] = useState(false);
 const [isEditRouterOpen, setIsEditRouterOpen] = useState(false);
 const [isDeleteRouterOpen, setIsDeleteRouterOpen] = useState(false);
 const [isConnectionGuideOpen, setIsConnectionGuideOpen] = useState(false);

 // Router Form States
 const [routerFormName, setRouterFormName] = useState('');
 const [routerFormIp, setRouterFormIp] = useState('');
 const [routerFormPort, setRouterFormPort] = useState(8728);
 const [routerFormSslPort, setRouterFormSslPort] = useState(8729);
 const [routerFormUser, setRouterFormUser] = useState('admin');
 const [routerFormPass, setRouterFormPass] = useState('');
 const [routerFormLocation, setRouterFormLocation] = useState('');
 const [routerFormModel, setRouterFormModel] = useState('RB4011iGS+RM');
 const [routerFormMode, setRouterFormMode] = useState<'Hotspot' | 'PPPoE' | 'Hybrid' | 'Core'>('Hybrid');

 // Client Management Modals inside MikroTik Management
 const [isAddClientOpen, setIsAddClientOpen] = useState(false);
 const [editClientData, setEditClientData] = useState<Client | null>(null);
 const [deleteClientData, setDeleteClientData] = useState<Client | null>(null);
 const [viewClientData, setViewClientData] = useState<Client | null>(null);
 const [qrClientData, setQrClientData] = useState<Client | null>(null);
 const [smsReminderClient, setSmsReminderClient] = useState<Client | null>(null);

 // New Client Form States
 const [newClientName, setNewClientName] = useState('');
 const [newClientPhone, setNewClientPhone] = useState('');
 const [newClientUserId, setNewClientUserId] = useState('');
 const [newClientPassword, setNewClientPassword] = useState('');
 const [newClientPkg, setNewClientPkg] = useState(packages[0]?.name || 'Fiber 20');
 const [newClientPrice, setNewClientPrice] = useState(packages[0]?.price || '500');
 const [newClientBw, setNewClientBw] = useState(bandwidthProfiles[0]?.name || '20 Mbps');
 const [newClientDl, setNewClientDl] = useState(bandwidthProfiles[0]?.download || '20');
 const [newClientUl, setNewClientUl] = useState(bandwidthProfiles[0]?.upload || '10');
 const [newClientBurst, setNewClientBurst] = useState('30M/30M');
 const [newClientPriority, setNewClientPriority] = useState('8');
 const [newClientDevice, setNewClientDevice] = useState<'Mobile' | 'Router'>('Router');
 const [newClientExpiry, setNewClientExpiry] = useState(
 new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
 );
 const [newClientPhoto, setNewClientPhoto] = useState<string | null>(null);

 // Edit Client Form States
 const [editName, setEditName] = useState('');
 const [editPhone, setEditPhone] = useState('');
 const [editPassword, setEditPassword] = useState('');
 const [editPkg, setEditPkg] = useState('');
 const [editPrice, setEditPrice] = useState('');
 const [editBw, setEditBw] = useState('');
 const [editDl, setEditDl] = useState('');
 const [editUl, setEditUl] = useState('');
 const [editBurst, setEditBurst] = useState('30M/30M');
 const [editPriority, setEditPriority] = useState('8');
 const [editDevice, setEditDevice] = useState<'Mobile' | 'Router'>('Router');
 const [editExpiry, setEditExpiry] = useState('');
 const [editRouterName, setEditRouterName] = useState('');
 const [editPhoto, setEditPhoto] = useState<string | null>(null);

 // Filter clients for THIS specific router
 // If client's router matches router.name or router.id, or if router matches 'all'/'Main Router'
 const routerClients = clients.filter((c) => {
 const rName = (c.router || '').toLowerCase();
 const targetName = (currentRouter.name || '').toLowerCase();
 const targetId = (currentRouter.id || '').toLowerCase();

 // Matching logic
 if (rName === targetName || rName === targetId) return true;
 if (rName.includes(currentRouter.ip)) return true;
 if (currentRouter.isDefault && (!c.router || rName === 'main router' || rName === 'default')) return true;
 if (routers.length === 1) return true;
 return false;
 });

 const filteredRouterClients = routerClients.filter((c) => {
 const matchesSearch =
 c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
 c.userId.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
 c.phone.includes(clientSearchQuery) ||
 c.package.toLowerCase().includes(clientSearchQuery.toLowerCase());

 if (!matchesSearch) return false;

 if (clientStatusFilter === 'all') return true;
 if (clientStatusFilter === 'online') return c.status === 'online';
 if (clientStatusFilter === 'offline') return c.status === 'offline';
 if (clientStatusFilter === 'expiring') return getClientExpiryInfo(c.expiry).isExpiringSoon;
 if (clientStatusFilter === 'expired') return getClientExpiryInfo(c.expiry).isExpired || c.status === 'expired';
 return true;
 });

 const onlineClientCount = routerClients.filter((c) => c.status === 'online').length;
 const offlineClientCount = routerClients.filter((c) => c.status === 'offline').length;
 const expiringClientCount = routerClients.filter((c) => getClientExpiryInfo(c.expiry).isExpiringSoon).length;

 // Interfaces data
 const [interfaces, setInterfaces] = useState([
 { name: 'ether1-wan', type: 'ether', rx: '42.5 Mbps', tx: '18.2 Mbps', status: 'running' },
 { name: 'ether2-lan', type: 'ether', rx: '12.8 Mbps', tx: '35.1 Mbps', status: 'running' },
 { name: 'ether3-hotspot', type: 'ether', rx: '28.1 Mbps', tx: '14.0 Mbps', status: 'running' },
 { name: 'sfp-plus1-core', type: 'sfp-plus', rx: '85.4 Mbps', tx: '62.0 Mbps', status: 'running' },
 { name: 'wlan1-wifi', type: 'wlan', rx: '5.2 Mbps', tx: '8.4 Mbps', status: 'disabled' },
 ]);

 // IP Addresses
 const [ipList, setIpList] = useState([
 { address: '103.14.22.10/30', network: '103.14.22.8', interface: 'ether1-wan' },
 { address: '192.168.1.1/24', network: '192.168.1.0', interface: 'ether2-lan' },
 { address: '10.5.5.1/24', network: '10.5.5.0', interface: 'ether3-hotspot' },
 ]);

 // DHCP Leases
 const [dhcpLeases, setDhcpLeases] = useState([
 { ip: '192.168.1.100', mac: 'AA:BB:CC:11:22:33', host: 'Ahmed-Phone', status: 'bound', expires: '23h 12m' },
 { ip: '192.168.1.101', mac: 'AA:BB:CC:44:55:66', host: 'Fatima-Laptop', status: 'bound', expires: '18h 45m' },
 { ip: '10.5.5.50', mac: 'AA:BB:CC:77:88:99', host: 'Hotspot-User1', status: 'bound', expires: '2h 05m' },
 ]);

 // Firewall Rules
 const [firewallRules, setFirewallRules] = useState([
 { chain: 'input', action: 'accept', src: '192.168.1.0/24', comment: 'Allow LAN to Router' },
 { chain: 'forward', action: 'drop', src: '0.0.0.0/0', comment: 'Drop Invalid Packets' },
 { chain: 'srcnat', action: 'masquerade', src: '10.5.5.0/24', comment: 'NAT Hotspot Traffic' },
 ]);

 // Simple Queues
 const [queues, setQueues] = useState([
 { name: 'queue-client1', target: '192.168.1.100', limit: '20M/10M' },
 { name: 'queue-client2', target: '192.168.1.101', limit: '30M/15M' },
 { name: 'queue-hotspot', target: '10.5.5.0/24', limit: '100M/50M' },
 ]);

 // Modal States for Network Ops
 const [isAddIpOpen, setIsAddIpOpen] = useState(false);
 const [newIpAddress, setNewIpAddress] = useState('');
 const [newIpNetwork, setNewIpNetwork] = useState('');
 const [newIpInterface, setNewIpInterface] = useState('ether2-lan');

 const [isAddFirewallOpen, setIsAddFirewallOpen] = useState(false);
 const [newFwChain, setNewFwChain] = useState<'input' | 'forward' | 'srcnat'>('forward');
 const [newFwAction, setNewFwAction] = useState<'accept' | 'drop' | 'masquerade'>('accept');
 const [newFwSrc, setNewFwSrc] = useState('');
 const [newFwComment, setNewFwComment] = useState('');

 const [isAddQueueOpen, setIsAddQueueOpen] = useState(false);
 const [newQueueName, setNewQueueName] = useState('');
 const [newQueueTarget, setNewQueueTarget] = useState('');
 const [newQueueLimit, setNewQueueLimit] = useState('10M/5M');

 // Ping tool
 const [pingHost, setPingHost] = useState('8.8.8.8');
 const [pingLogs, setPingLogs] = useState<string[]>([]);
 const [isPinging, setIsPinging] = useState(false);

 // Router Handlers
 const handleOpenAddRouter = () => {
 setRouterFormName('');
 setRouterFormIp('');
 setRouterFormPort(8728);
 setRouterFormSslPort(8729);
 setRouterFormUser('admin');
 setRouterFormPass('');
 setRouterFormLocation('');
 setRouterFormModel('RB4011iGS+RM');
 setRouterFormMode('Hybrid');
 setIsAddRouterOpen(true);
 };

 const handleSaveNewRouter = (e: React.FormEvent) => {
 e.preventDefault();
 if (!routerFormName.trim() || !routerFormIp.trim()) {
 showToast('Router name and IP address are required', 'error');
 return;
 }

 const newId = `mk-${Date.now().toString().slice(-4)}`;
 const newRouterObj: MikrotikRouter = {
 id: newId,
 name: routerFormName.trim(),
 ip: routerFormIp.trim(),
 apiPort: Number(routerFormPort) || 8728,
 apiSslPort: Number(routerFormSslPort) || 8729,
 username: routerFormUser.trim() || 'admin',
 password: routerFormPass,
 connected: true,
 location: routerFormLocation.trim() || 'Zone POP',
 model: routerFormModel,
 version: 'RouterOS v7.12.1',
 cpu: '10%',
 uptime: '1 day, 02:15:00',
 ram: '128 MB / 1024 MB',
 activeUsers: 0,
 mode: routerFormMode,
 isDefault: routers.length === 0,
 };

 if (onAddRouter) {
 onAddRouter(newRouterObj);
 }
 handleSelectRouter(newId);
 setIsAddRouterOpen(false);
 showToast(`MikroTik Router "${newRouterObj.name}" added successfully!`, 'success');
 };

 const handleOpenEditRouter = () => {
 setRouterFormName(currentRouter.name);
 setRouterFormIp(currentRouter.ip);
 setRouterFormPort(currentRouter.apiPort);
 setRouterFormSslPort(currentRouter.apiSslPort);
 setRouterFormUser(currentRouter.username);
 setRouterFormPass(currentRouter.password || '');
 setRouterFormLocation(currentRouter.location || '');
 setRouterFormModel(currentRouter.model || 'CCR1036-12G-4S');
 setRouterFormMode(currentRouter.mode || 'Core');
 setIsEditRouterOpen(true);
 };

 const handleSaveEditRouter = (e: React.FormEvent) => {
 e.preventDefault();
 const updatedRouter: MikrotikRouter = {
 ...currentRouter,
 name: routerFormName.trim(),
 ip: routerFormIp.trim(),
 apiPort: Number(routerFormPort) || 8728,
 apiSslPort: Number(routerFormSslPort) || 8729,
 username: routerFormUser.trim() || 'admin',
 password: routerFormPass,
 location: routerFormLocation.trim(),
 model: routerFormModel,
 mode: routerFormMode,
 };

 if (onUpdateRouter) {
 onUpdateRouter(updatedRouter);
 }
 setIsEditRouterOpen(false);
 showToast(`MikroTik Router "${updatedRouter.name}" configuration updated!`, 'success');
 };

 const handleDeleteCurrentRouter = () => {
 if (routers.length <= 1) {
 showToast('Cannot delete the only configured MikroTik router!', 'warning');
 setIsDeleteRouterOpen(false);
 return;
 }
 if (onDeleteRouter) {
 onDeleteRouter(currentRouter.id);
 }
 const remaining = routers.filter((r) => r.id !== currentRouter.id);
 if (remaining[0]) {
 handleSelectRouter(remaining[0].id);
 }
 setIsDeleteRouterOpen(false);
 showToast(`Router "${currentRouter.name}" deleted`, 'warning');
 };

 // Client Handlers
 const handleOpenAddClient = () => {
 setNewClientName('');
 setNewClientPhone('');
 setNewClientUserId(`user_${Math.floor(100 + Math.random() * 900)}`);
 setNewClientPassword(`pass${Math.floor(100 + Math.random() * 900)}`);
 setNewClientPkg(packages[0]?.name || 'Fiber 20');
 setNewClientPrice(packages[0]?.price || '500');
 setNewClientBw(bandwidthProfiles[0]?.name || '20 Mbps');
 setNewClientDl(bandwidthProfiles[0]?.download || '20');
 setNewClientUl(bandwidthProfiles[0]?.upload || '10');
 setNewClientBurst('30M/30M');
 setNewClientPriority('8');
 setNewClientDevice('Router');
 setNewClientExpiry(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
 setNewClientPhoto(null);
 setIsAddClientOpen(true);
 };

 const handleSaveNewClient = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newClientName.trim() || !newClientPhone.trim()) {
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
 name: newClientName.trim(),
 phone: newClientPhone.trim(),
 userId: newClientUserId.trim() || `user${maxNum + 1}`,
 password: newClientPassword.trim() || `pass${Math.floor(100 + Math.random() * 900)}`,
 package: newClientPkg,
 price: newClientPrice.trim() || '500',
 bandwidth: newClientBw,
 downloadSpeed: newClientDl.trim() || '20',
 uploadSpeed: newClientUl.trim() || '10',
 status: 'online',
 expiry: newClientExpiry,
 router: currentRouter.name, // Assigned to this selected router!
 photo: newClientPhoto,
 deviceType: newClientDevice,
 burstSpeed: newClientBurst,
 priority: newClientPriority,
 };

 onAddClient(clientToAdd);
 setIsAddClientOpen(false);
 showToast(`Client ${clientToAdd.name} added to MikroTik "${currentRouter.name}"!`, 'success');
 };

 const handleOpenEditClient = (c: Client) => {
 setEditClientData(c);
 setEditName(c.name);
 setEditPhone(c.phone);
 setEditPassword(c.password || '');
 setEditPkg(c.package);
 setEditPrice(c.price || '500');
 setEditBw(c.bandwidth);
 setEditDl(c.downloadSpeed || '20');
 setEditUl(c.uploadSpeed || '10');
 setEditBurst(c.burstSpeed || '30M/30M');
 setEditPriority(c.priority || '8');
 setEditDevice(c.deviceType || 'Router');
 setEditExpiry(c.expiry);
 setEditRouterName(c.router || currentRouter.name);
 setEditPhoto(c.photo || null);
 };

 const handleSaveEditClient = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editClientData) return;

 const updated: Client = {
 ...editClientData,
 name: editName.trim(),
 phone: editPhone.trim(),
 password: editPassword.trim(),
 package: editPkg,
 price: editPrice.trim() || '500',
 bandwidth: editBw,
 downloadSpeed: editDl.trim() || '20',
 uploadSpeed: editUl.trim() || '10',
 burstSpeed: editBurst,
 priority: editPriority,
 deviceType: editDevice,
 expiry: editExpiry,
 router: editRouterName,
 photo: editPhoto,
 };

 onUpdateClient(updated);
 setEditClientData(null);
 showToast(`Client ${updated.name} profile updated successfully!`, 'success');
 };

 const handleDeleteClient = () => {
 if (!deleteClientData) return;
 onDeleteClient(deleteClientData.id);
 showToast(`Client ${deleteClientData.name} removed from router!`, 'warning');
 setDeleteClientData(null);
 };

 // Ping Tool Execution
 const handleRunPing = () => {
 setIsPinging(true);
 setPingLogs([`PING ${pingHost} from MikroTik ${currentRouter.ip} (56 data bytes)...`]);
 let count = 0;
 const interval = setInterval(() => {
 count++;
 const ms = Math.floor(2 + Math.random() * 15);
 setPingLogs((prev) => [...prev, `64 bytes from ${pingHost}: icmp_seq=${count} ttl=118 time=${ms}ms`]);
 if (count >= 5) {
 clearInterval(interval);
 setIsPinging(false);
 setPingLogs((prev) => [
 ...prev,
 `--- ${pingHost} ping statistics ---`,
 `5 packets transmitted, 5 received, 0% packet loss, avg time 6.4ms`,
 ]);
 }
 }, 500);
 };

 return (
 <div className="space-y-6">
 {/* 1. TOP MULTI-ROUTER SWITCHER BAR */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 sm:p-5 shadow-sm space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
 <div className="flex items-center gap-2.5">
 <div className="p-2.5 rounded bg-sky-500/10 text-sky-600 ">
 <Server className="w-5 h-5" />
 </div>
 <div>
 <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
 <span>Multi-MikroTik Routers Hub</span>
 <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20">
 {routers.length} Configured
 </span>
 </h2>
 <p className="text-xs text-slate-800">
 যে কোন মাইক্রোটিক রাউটারে ক্লিক করে সেটির ইন্টারফেস, ট্রাফিক এবং ক্লায়েন্ট ম্যানেজ করুন।
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={handleOpenAddRouter}
 className="px-3.5 py-1.5 rounded bg-gradient-to-r from-sky-600 to-cyan-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
 >
 <Plus className="w-4 h-4" /> Add MikroTik Router
 </button>
 </div>
 </div>

 {/* Horizontal Routers Selector Grid/Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {routers.map((router) => {
 const isSelected = router.id === currentRouter.id;
 const rClientCount = clients.filter((c) => {
 const rName = (c.router || '').toLowerCase();
 return (
 rName === (router.name || '').toLowerCase() ||
 rName === (router.id || '').toLowerCase() ||
 rName.includes(router.ip) ||
 (router.isDefault && (!c.router || rName === 'main router'))
 );
 }).length;

 return (
 <div
 key={router.id}
 onClick={() => handleSelectRouter(router.id)}
 className={`relative p-3.5 rounded border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
 isSelected
 ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/40 shadow-md'
 : 'bg-white/50 border-slate-200 hover:bg-slate-100/60 '
 }`}
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-2">
 <div
 className={`w-3 h-3 rounded-full shrink-0 ${
 router.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
 }`}
 />
 <div>
 <h4 className="text-xs font-bold text-slate-900 leading-tight">
 {router.name}
 </h4>
 <p className="text-[11px] font-mono text-slate-800 mt-0.5">
 {router.ip}:{router.apiPort}
 </p>
 {!router.connected && router.errorReason && (
 <div className="mt-1 text-[10px] font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/15 inline-block">
 Error: {router.errorReason}
 </div>
 )}
 </div>
 </div>

 <span
 className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
 router.mode === 'Hotspot'
 ? 'bg-amber-500/15 text-amber-600 '
 : router.mode === 'PPPoE'
 ? 'bg-indigo-500/15 text-indigo-600 '
 : router.mode === 'Core'
 ? 'bg-emerald-500/15 text-emerald-600 '
 : 'bg-sky-500/15 text-sky-600 '
 }`}
 >
 {router.mode || 'Hybrid'}
 </span>
 </div>

 <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60 text-slate-800">
 <span className="flex items-center gap-1">
 <Users className="w-3 h-3 text-sky-500" />
 <strong>{rClientCount}</strong> Clients
 </span>
 <span className="font-mono text-[10px] text-slate-800">
 {router.model || 'RouterBoard'}
 </span>
 {isSelected && (
 <span className="text-[10px] font-bold text-sky-600 flex items-center gap-0.5">
 <Check className="w-3 h-3" /> Active
 </span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* 2. ACTIVE ROUTER LIVE DASHBOARD HEADER */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="flex items-center gap-3.5">
 <div
 className={`p-3 rounded ${
 currentRouter.connected
 ? 'bg-teal-500/15 text-teal-600 border border-teal-500/30'
 : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
 }`}
 >
 <Server className="w-7 h-7" />
 </div>
 <div>
 <div className="flex flex-wrap items-center gap-2">
 <h3 className="text-base sm:text-lg font-black text-slate-900 ">
 {currentRouter.name}
 </h3>
 <span
 className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
 currentRouter.connected
 ? 'bg-teal-500/15 text-teal-600 border border-teal-500/30'
 : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
 }`}
 >
 <span
 className={`w-1.5 h-1.5 rounded-full ${
 currentRouter.connected ? 'bg-teal-500 animate-ping' : 'bg-rose-500'
 }`}
 />
 {currentRouter.connected ? 'Connected & Live' : 'Disconnected'}
 </span>
 {!currentRouter.connected && currentRouter.errorReason && (
 <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1 font-mono">
 <ShieldAlert className="w-3.5 h-3.5" />
 Reason: {currentRouter.errorReason}
 </span>
 )}
 <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-900 ">
 {currentRouter.model || 'MikroTik CCR'}
 </span>
 </div>
 <p className="text-xs text-slate-800 font-mono mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
 <span>IP: <strong>{currentRouter.ip}:{currentRouter.apiPort}</strong></span>
 <span>•</span>
 <span>User: <strong>{currentRouter.username}</strong></span>
 {currentRouter.location && (
 <>
 <span>•</span>
 <span>Location: <strong>{currentRouter.location}</strong></span>
 </>
 )}
 </p>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
 <button
 onClick={() => setIsConnectionGuideOpen(true)}
 className="px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
 title="MikroTik Connection Assistant & Troubleshooting"
 >
 <HelpCircle className="w-3.5 h-3.5 text-amber-500" /> Connect Guide & DDNS
 </button>

 <button
 onClick={handleOpenEditRouter}
 className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
 >
 <Edit2 className="w-3.5 h-3.5" /> Edit Router
 </button>

 {onToggleRouterConnection && (
 <button
 onClick={() => onToggleRouterConnection(currentRouter.id)}
 className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
 currentRouter.connected
 ? 'bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 border border-rose-500/30'
 : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
 }`}
 >
 {currentRouter.connected ? (
 <>
 <Unlink className="w-3.5 h-3.5" /> Disconnect API
 </>
 ) : (
 <>
 <LinkIcon className="w-3.5 h-3.5" /> Connect Now
 </>
 )}
 </button>
 )}

 {routers.length > 1 && (
 <button
 onClick={() => setIsDeleteRouterOpen(true)}
 className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 transition-colors cursor-pointer"
 title="Delete Router"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 </div>

 {/* PRIVATE IP DIAGNOSTIC ALERT */}
 {!currentRouter.connected && isPrivateIp(currentRouter.ip) && (
 <div className="bg-amber-500/10 border border-amber-500/30 rounded p-4 flex flex-col sm:flex-row gap-3.5 items-start">
 <div className="p-2.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/25 mt-0.5 shrink-0">
 <ShieldAlert className="w-5 h-5" />
 </div>
 <div className="space-y-1.5 flex-1">
 <h4 className="text-sm font-black text-amber-900 ">
 স্থানীয় IP নেটওয়ার্ক সতর্কতা (Private IP Subnet Detected)
 </h4>
 <p className="text-xs text-slate-900 leading-relaxed">
 আপনার রাউটারের আইপি (<strong className="font-mono text-amber-700 ">{currentRouter.ip}</strong>) একটি লোকাল সাবনেট এর অংশ। যেহেতু এই বিলিং ও আইএসপি প্যানেলটি একটি ক্লাউড কনটেইনারে (Cloud Run) হোস্ট করা আছে, ক্লাউড সার্ভারটি সরাসরি আপনার ঘরের বা অফিসের ভেতরের লোকাল আইপিতে পৌঁছাতে পারবে না।
 </p>
 <div className="pt-2 flex flex-wrap gap-2 text-xs">
 <span className="font-bold text-slate-700 ">সমাধানসমূহ:</span>
 <span className="bg-white px-2.5 py-1 rounded-md shadow-2xs text-slate-900 border border-slate-200/60 flex items-center gap-1 font-semibold">
 <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
 আপনার রাউটারে Public WAN IP এবং Port Forwarding (8728) সেটআপ করুন।
 </span>
 <span className="bg-white px-2.5 py-1 rounded-md shadow-2xs text-slate-900 border border-slate-200/60 flex items-center gap-1 font-semibold">
 <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
 অথবা অফলাইনে টেস্ট করার জন্য <strong>Router Simulator Mode</strong> সক্রিয় করুন।
 </span>
 </div>
 </div>
 </div>
 )}

 {/* 3. ROUTER LIVE HARDWARE METRICS */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 shadow-xs">
 <div className="flex justify-between items-center text-slate-800 mb-1">
 <span className="text-xs font-medium">Router CPU Load</span>
 <Cpu className="w-4 h-4 text-sky-500" />
 </div>
 <div className="text-lg font-bold text-slate-900 font-mono">
 {currentRouter.cpu || '12%'}
 </div>
 <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
 <div className="bg-sky-500 h-full w-[12%]" />
 </div>
 </div>

 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 shadow-xs">
 <div className="flex justify-between items-center text-slate-800 mb-1">
 <span className="text-xs font-medium">RAM Allocation</span>
 <HardDrive className="w-4 h-4 text-teal-500" />
 </div>
 <div className="text-lg font-bold text-slate-900 font-mono">
 {currentRouter.ram || '128 / 512 MB'}
 </div>
 <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
 <div className="bg-teal-500 h-full w-[25%]" />
 </div>
 </div>

 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 shadow-xs">
 <div className="flex justify-between items-center text-slate-800 mb-1">
 <span className="text-xs font-medium">Clients on this Router</span>
 <Users className="w-4 h-4 text-purple-500" />
 </div>
 <div className="text-lg font-bold text-slate-900 font-mono">
 {routerClients.length} Total
 </div>
 <div className="flex items-center gap-2 text-[10px] mt-1">
 <span className="text-emerald-500 font-bold">🟢 {onlineClientCount} Online</span>
 <span className="text-slate-800">🔴 {offlineClientCount} Offline</span>
 </div>
 </div>

 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 shadow-xs">
 <div className="flex justify-between items-center text-slate-800 mb-1">
 <span className="text-xs font-medium">Router Uptime</span>
 <Clock className="w-4 h-4 text-amber-500" />
 </div>
 <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono truncate">
 {currentRouter.uptime || '14 days, 06:22:10'}
 </div>
 <p className="text-[10px] text-teal-600 font-semibold mt-1">
 {currentRouter.version || 'RouterOS v7.12'}
 </p>
 </div>
 </div>

 {/* 4. DEDICATED LIVE NETWORK TRAFFIC VISUALIZER (Recharts) */}
 <LiveNetworkTraffic
 routerConfig={{
 ip: currentRouter.ip,
 port: String(currentRouter.apiPort || (currentRouter as any).port || 8728),
 user: currentRouter.username,
 password: currentRouter.password,
 connected: currentRouter.connected,
 }}
 onConnectRouter={() =>
 onToggleRouterConnection && onToggleRouterConnection(currentRouter.id)
 }
 />

 {/* 5. MAIN MULTI-TAB PANEL */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded shadow-sm overflow-hidden">
 {/* Navigation Tabs Header */}
 <div className="flex overflow-x-auto border-b border-slate-200/80 bg-slate-100/50 p-1.5 gap-1">
 {[
 { id: 'clients', label: `Router Clients (${currentRouter.name})`, icon: Users, count: routerClients.length },
 { id: 'interfaces', label: 'Interfaces & Traffic', icon: Wifi, count: interfaces.length },
 { id: 'ip', label: 'IP Addresses', icon: Network, count: ipList.length },
 { id: 'dhcp', label: 'DHCP Leases', icon: Server, count: dhcpLeases.length },
 { id: 'firewall', label: 'Firewall & NAT', icon: Shield, count: firewallRules.length },
 { id: 'queues', label: 'Simple Queues', icon: ListFilter, count: queues.length },
 { id: 'system', label: 'System Diagnostics', icon: Power, count: null },
 ].map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as any)}
 className={`px-3.5 py-2 rounded text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
 isActive
 ? 'bg-sky-600 text-white shadow-xs'
 : 'text-slate-900 hover:bg-slate-200/60 '
 }`}
 >
 <Icon className="w-3.5 h-3.5" />
 <span>{tab.label}</span>
 {tab.count !== null && (
 <span
 className={`px-1.5 py-0.2 text-[10px] rounded-md font-mono ${
 isActive
 ? 'bg-white/20 text-slate-800'
 : 'bg-slate-200 text-slate-900 '
 }`}
 >
 {tab.count}
 </span>
 )}
 </button>
 );
 })}
 </div>

 {/* TAB 1: CLIENTS CONNECTED TO THIS MIKROTIK ROUTER */}
 {activeTab === 'clients' && (
 <div className="p-4 sm:p-5 space-y-4">
 {/* Filter Bar & Search */}
 <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded border border-slate-200/60 ">
 <div className="flex flex-wrap items-center gap-2 flex-1">
 <div className="relative flex-1 min-w-[200px] max-w-sm">
 <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-800" />
 <input
 type="text"
 value={clientSearchQuery}
 onChange={(e) => setClientSearchQuery(e.target.value)}
 placeholder={`Search clients in ${currentRouter.name}...`}
 className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-medium"
 />
 </div>

 <select
 value={clientStatusFilter}
 onChange={(e) => setClientStatusFilter(e.target.value as any)}
 className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-[#3c8dbc] font-semibold"
 >
 <option value="all">All Clients ({routerClients.length})</option>
 <option value="online">🟢 Online ({onlineClientCount})</option>
 <option value="offline">🔴 Offline ({offlineClientCount})</option>
 <option value="expiring">⚠️ Expiring Soon (≤ 3 Days)</option>
 <option value="expired">🚨 Expired</option>
 </select>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={handleOpenAddClient}
 className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:brightness-110 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
 >
 <Plus className="w-3.5 h-3.5" /> Add Client to this Router
 </button>
 </div>
 </div>

 {/* Clients Table for this Router */}
 <div className="overflow-x-auto rounded border border-slate-200 ">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[10px] font-bold">
 <th className="py-3 px-3">Client Info</th>
 <th className="py-3 px-3">User ID / Phone</th>
 <th className="py-3 px-3">Package & Speed</th>
 <th className="py-3 px-3">Status</th>
 <th className="py-3 px-3">Expiry Date</th>
 <th className="py-3 px-3 text-right">Actions (সম্পাদনা ও ডিলিট)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredRouterClients.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-8 text-center text-slate-800 text-xs">
 <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
 এই মাইক্রোটিক রাউটারে ({currentRouter.name}) কোনো ক্লায়েন্ট পাওয়া যায়নি।
 <br />
 <button
 onClick={handleOpenAddClient}
 className="mt-2 text-sky-500 hover:underline font-bold"
 >
 + Add First Client Now
 </button>
 </td>
 </tr>
 ) : (
 filteredRouterClients.map((client) => {
 const expiryInfo = getClientExpiryInfo(client.expiry);
 return (
 <tr
 key={client.id}
 className="hover:bg-slate-50/60 transition-colors"
 >
 {/* Client Info */}
 <td className="py-2.5 px-3">
 <div className="flex items-center gap-2.5">
 {client.photo ? (
 <img
 src={client.photo}
 alt={client.name}
 className="w-8 h-8 rounded-full object-cover border border-slate-200 "
 />
 ) : (
 <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-600 font-black flex items-center justify-center text-xs">
 {client.name.slice(0, 1).toUpperCase()}
 </div>
 )}
 <div>
 <div className="font-bold text-slate-900 ">
 {client.name}
 </div>
 <div className="text-[10px] text-slate-800 font-mono">
 ID: {client.id} • {client.deviceType || 'Router'}
 </div>
 </div>
 </div>
 </td>

 {/* User ID / Phone */}
 <td className="py-2.5 px-3 font-mono">
 <div className="text-slate-800 font-bold">
 {client.userId}
 </div>
 <div className="text-[10px] text-slate-800">{client.phone}</div>
 </td>

 {/* Package & Bandwidth */}
 <td className="py-2.5 px-3">
 <div className="font-semibold text-slate-800 ">
 {client.package}
 </div>
 <div className="text-[10px] text-sky-600 font-mono">
 ↓{client.downloadSpeed || client.bandwidth} / ↑{client.uploadSpeed || '10'} Mbps
 </div>
 </td>

 {/* Status */}
 <td className="py-2.5 px-3">
 <div className="flex items-center gap-1.5">
 <span
 className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
 client.status === 'online'
 ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
 : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
 }`}
 >
 <span
 className={`w-1.5 h-1.5 rounded-full ${
 client.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'
 }`}
 />
 {client.status}
 </span>

 <button
 onClick={() => onToggleClientStatus(client.id)}
 className="p-1 rounded hover:bg-slate-200 text-slate-800 hover:text-slate-900 transition-colors cursor-pointer"
 title={client.status === 'online' ? 'Disable Client' : 'Enable Client'}
 >
 {client.status === 'online' ? (
 <Pause className="w-3 h-3 text-amber-500" />
 ) : (
 <Play className="w-3 h-3 text-emerald-500" />
 )}
 </button>
 </div>
 </td>

 {/* Expiry Date */}
 <td className="py-2.5 px-3">
 <div className="font-mono text-slate-800 ">
 {client.expiry}
 </div>
 {expiryInfo.isExpiringSoon && (
 <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/15 text-rose-600 inline-block mt-0.5">
 {expiryInfo.isExpired ? '⚠️ Expired' : `⏰ ${expiryInfo.daysLeft} Days Left`}
 </span>
 )}
 </td>

 {/* Actions: Edit, Delete, SMS, View, QR */}
 <td className="py-2.5 px-3 text-right">
 <div className="flex items-center justify-end gap-1">
 {/* Send SMS Reminder */}
 <button
 onClick={() => setSmsReminderClient(client)}
 className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 transition-colors cursor-pointer"
 title="Send SMS Reminder"
 >
 <MessageSquare className="w-3.5 h-3.5" />
 </button>

 {/* View Details */}
 <button
 onClick={() => setViewClientData(client)}
 className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 transition-colors cursor-pointer"
 title="View Profile"
 >
 <Eye className="w-3.5 h-3.5" />
 </button>

 {/* QR Voucher */}
 <button
 onClick={() => setQrClientData(client)}
 className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 transition-colors cursor-pointer"
 title="QR Code Voucher"
 >
 <QrCode className="w-3.5 h-3.5" />
 </button>

 {/* Edit Client */}
 <button
 onClick={() => handleOpenEditClient(client)}
 className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 transition-colors cursor-pointer"
 title="Edit Client"
 >
 <Edit2 className="w-3.5 h-3.5" />
 </button>

 {/* Delete Client */}
 <button
 onClick={() => setDeleteClientData(client)}
 className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 transition-colors cursor-pointer"
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
 </div>
 )}

 {/* TAB 2: INTERFACES */}
 {activeTab === 'interfaces' && (
 <div className="p-4 sm:p-5 space-y-6">
 {/* Recharts-Powered Live Network Traffic Component with Tab Switcher */}
 <LiveNetworkTraffic
 routerConfig={{
 ip: currentRouter.ip,
 port: String(currentRouter.apiPort || (currentRouter as any).port || 8728),
 user: currentRouter.username,
 password: currentRouter.password,
 connected: currentRouter.connected,
 }}
 onConnectRouter={() =>
 onToggleRouterConnection && onToggleRouterConnection(currentRouter.id)
 }
 />

 <div className="overflow-x-auto rounded border border-slate-200 ">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[10px] font-bold">
 <th className="py-3 px-3">Interface Name</th>
 <th className="py-3 px-3">Type</th>
 <th className="py-3 px-3">Download (Rx)</th>
 <th className="py-3 px-3">Upload (Tx)</th>
 <th className="py-3 px-3">Status</th>
 <th className="py-3 px-3 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {interfaces.map((i) => (
 <tr key={i.name} className="hover:bg-slate-50/50 ">
 <td className="py-3 font-bold text-slate-900 font-mono">
 {i.name}
 </td>
 <td className="py-3 uppercase text-[10px] text-slate-800 font-semibold">{i.type}</td>
 <td className="py-3 font-mono text-teal-600 font-bold">↓ {i.rx}</td>
 <td className="py-3 font-mono text-sky-600 font-bold">↑ {i.tx}</td>
 <td className="py-3">
 <span
 className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
 i.status === 'running'
 ? 'bg-teal-500/10 text-teal-600 '
 : 'bg-slate-200 text-slate-800'
 }`}
 >
 {i.status}
 </span>
 </td>
 <td className="py-3 text-right">
 <button
 onClick={() => {
 setInterfaces((prev) =>
 prev.map((item) =>
 item.name === i.name
 ? { ...item, status: item.status === 'running' ? 'disabled' : 'running' }
 : item
 )
 );
 showToast(`Interface ${i.name} state updated`, 'info');
 }}
 className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
 i.status === 'running'
 ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
 : 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20'
 }`}
 >
 {i.status === 'running' ? 'Disable' : 'Enable'}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB 3: IP ADDRESSES */}
 {activeTab === 'ip' && (
 <div className="p-4 sm:p-5 space-y-4">
 <div className="flex justify-between items-center">
 <h4 className="text-xs font-bold text-slate-700 ">
 MikroTik /ip address List
 </h4>
 <button
 onClick={() => setIsAddIpOpen(true)}
 className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
 >
 <Plus className="w-3.5 h-3.5" /> Add IP Address
 </button>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[10px] font-semibold">
 <th className="pb-3">IP / Subnet Mask</th>
 <th className="pb-3">Network</th>
 <th className="pb-3">Assigned Interface</th>
 <th className="pb-3 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {ipList.map((ip) => (
 <tr key={ip.address} className="hover:bg-slate-50/50 ">
 <td className="py-3 font-mono font-bold text-slate-900 ">
 {ip.address}
 </td>
 <td className="py-3 font-mono text-slate-800">{ip.network}</td>
 <td className="py-3 font-mono text-sky-600 ">{ip.interface}</td>
 <td className="py-3 text-right">
 <button
 onClick={() => {
 setIpList((prev) => prev.filter((i) => i.address !== ip.address));
 showToast(`IP ${ip.address} removed`, 'warning');
 }}
 className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB 4: DHCP LEASES */}
 {activeTab === 'dhcp' && (
 <div className="p-4 sm:p-5 overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[10px] font-semibold">
 <th className="pb-3">Assigned IP</th>
 <th className="pb-3">MAC Address</th>
 <th className="pb-3">Host Name</th>
 <th className="pb-3">Status</th>
 <th className="pb-3">Expires In</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {dhcpLeases.map((d) => (
 <tr key={d.mac} className="hover:bg-slate-50/50 ">
 <td className="py-3 font-mono font-bold text-slate-900 ">{d.ip}</td>
 <td className="py-3 font-mono text-slate-800">{d.mac}</td>
 <td className="py-3 font-semibold text-slate-800 ">{d.host}</td>
 <td className="py-3">
 <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 ">
 {d.status}
 </span>
 </td>
 <td className="py-3 font-mono text-slate-800">{d.expires}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {/* TAB 5: FIREWALL */}
 {activeTab === 'firewall' && (
 <div className="p-4 sm:p-5 space-y-4">
 <div className="flex justify-between items-center">
 <h4 className="text-xs font-bold text-slate-700 ">
 MikroTik Firewall Filter & NAT Rules
 </h4>
 <button
 onClick={() => setIsAddFirewallOpen(true)}
 className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
 >
 <Plus className="w-3.5 h-3.5" /> Add Firewall Rule
 </button>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[10px] font-semibold">
 <th className="pb-3">Chain</th>
 <th className="pb-3">Action</th>
 <th className="pb-3">Src. Address</th>
 <th className="pb-3">Comment / Purpose</th>
 <th className="pb-3 text-right">Delete</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {firewallRules.map((rule, idx) => (
 <tr key={idx} className="hover:bg-slate-50/50 ">
 <td className="py-3 font-mono font-bold text-purple-600 ">{rule.chain}</td>
 <td className="py-3 uppercase font-bold text-xs">{rule.action}</td>
 <td className="py-3 font-mono text-slate-800">{rule.src}</td>
 <td className="py-3 text-slate-700 ">{rule.comment}</td>
 <td className="py-3 text-right">
 <button
 onClick={() => {
 setFirewallRules((prev) => prev.filter((_, i) => i !== idx));
 showToast('Firewall rule deleted', 'warning');
 }}
 className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB 6: QUEUES */}
 {activeTab === 'queues' && (
 <div className="p-4 sm:p-5 space-y-4">
 <div className="flex justify-between items-center">
 <h4 className="text-xs font-bold text-slate-700 ">
 MikroTik Simple Queues (ব্যান্ডউইথ শেপিং)
 </h4>
 <button
 onClick={() => setIsAddQueueOpen(true)}
 className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
 >
 <Plus className="w-3.5 h-3.5" /> Add Simple Queue
 </button>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[10px] font-semibold">
 <th className="pb-3">Queue Name</th>
 <th className="pb-3">Target Subnet / IP</th>
 <th className="pb-3">Max Limit (Upload/Download)</th>
 <th className="pb-3 text-right">Delete</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {queues.map((q) => (
 <tr key={q.name} className="hover:bg-slate-50/50 ">
 <td className="py-3 font-bold text-slate-900 font-mono">{q.name}</td>
 <td className="py-3 font-mono text-slate-800">{q.target}</td>
 <td className="py-3 font-mono font-bold text-emerald-600 ">{q.limit}</td>
 <td className="py-3 text-right">
 <button
 onClick={() => {
 setQueues((prev) => prev.filter((item) => item.name !== q.name));
 showToast(`Queue ${q.name} deleted`, 'warning');
 }}
 className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB 7: SYSTEM UTILS */}
 {activeTab === 'system' && (
 <div className="p-4 sm:p-5 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Ping Test */}
 <div className="p-4 rounded bg-slate-50 border border-slate-200 space-y-3">
 <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
 <Terminal className="w-4 h-4 text-sky-500" /> RouterOS Ping Utility
 </h4>
 <div className="flex gap-2">
 <input
 type="text"
 value={pingHost}
 onChange={(e) => setPingHost(e.target.value)}
 placeholder="8.8.8.8 or 192.168.1.1"
 className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
 />
 <button
 onClick={handleRunPing}
 disabled={isPinging}
 className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
 >
 <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
 {isPinging ? 'Pinging...' : 'Send Ping'}
 </button>
 </div>

 {pingLogs.length > 0 && (
 <div className="p-3 bg-slate-50 text-[#00a65a] rounded-lg font-mono text-[11px] space-y-0.5 max-h-40 overflow-y-auto">
 {pingLogs.map((log, i) => (
 <div key={i}>{log}</div>
 ))}
 </div>
 )}
 </div>

 {/* Maintenance Tools */}
 <div className="p-4 rounded bg-slate-50 border border-slate-200 space-y-3">
 <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
 <SettingsIcon className="w-4 h-4 text-amber-500" /> Router Operations
 </h4>
 <div className="flex flex-col gap-2">
 <button
 onClick={() => {
 const backupName = `MikroTik_${currentRouter.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.backup`;
 const element = document.createElement('a');
 const file = new Blob(['# MikroTik RouterOS Backup\n'], { type: 'text/plain' });
 element.href = URL.createObjectURL(file);
 element.download = backupName;
 document.body.appendChild(element);
 element.click();
 document.body.removeChild(element);
 showToast(`Backup exported for ${currentRouter.name}`, 'success');
 }}
 className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold flex items-center justify-between text-slate-800 cursor-pointer"
 >
 <span>Download Binary Backup (.backup)</span>
 <Download className="w-3.5 h-3.5" />
 </button>

 <button
 onClick={() => {
 if (window.confirm(`Are you sure you want to reboot ${currentRouter.name}?`)) {
 showToast(`Reboot signal sent to ${currentRouter.name}`, 'warning');
 }
 }}
 className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer"
 >
 <span>Reboot MikroTik Router Board</span>
 <Power className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* ========================================================= */}
 {/* MODALS SECTION */}
 {/* ========================================================= */}

 {/* MODAL: ADD MIKROTIK ROUTER */}
 <Modal
 isOpen={isAddRouterOpen}
 onClose={() => setIsAddRouterOpen(false)}
 title="Add New MikroTik Router (নতুন মাইক্রোটিক রাউটার যুক্ত করুন)"
 >
 <form onSubmit={handleSaveNewRouter} className="space-y-4 text-xs">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Router Name / Identifier *
 </label>
 <input
 type="text"
 required
 value={routerFormName}
 onChange={(e) => setRouterFormName(e.target.value)}
 placeholder="e.g. Branch-3 PPPoE Router"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Router IP Address *
 </label>
 <input
 type="text"
 required
 value={routerFormIp}
 onChange={(e) => setRouterFormIp(e.target.value)}
 placeholder="192.168.10.1"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 API Port
 </label>
 <input
 type="number"
 value={routerFormPort}
 onChange={(e) => setRouterFormPort(Number(e.target.value))}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Router Mode
 </label>
 <select
 value={routerFormMode}
 onChange={(e) => setRouterFormMode(e.target.value as any)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
 >
 <option value="Hybrid">Hybrid (PPPoE + Hotspot)</option>
 <option value="Hotspot">Hotspot Gateway</option>
 <option value="PPPoE">PPPoE Server</option>
 <option value="Core">Core Gateway</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 API Username
 </label>
 <input
 type="text"
 required
 value={routerFormUser}
 onChange={(e) => setRouterFormUser(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 API Password
 </label>
 <input
 type="password"
 value={routerFormPass}
 onChange={(e) => setRouterFormPass(e.target.value)}
 placeholder="••••••••"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Hardware Model
 </label>
 <input
 type="text"
 value={routerFormModel}
 onChange={(e) => setRouterFormModel(e.target.value)}
 placeholder="e.g. RB4011 / CCR2004"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Physical Location / POP
 </label>
 <input
 type="text"
 value={routerFormLocation}
 onChange={(e) => setRouterFormLocation(e.target.value)}
 placeholder="e.g. Sector 10 Tower"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setIsAddRouterOpen(false)}
 className="px-4 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold hover:bg-slate-100 "
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm"
 >
 Add MikroTik Router
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: EDIT MIKROTIK ROUTER */}
 <Modal
 isOpen={isEditRouterOpen}
 onClose={() => setIsEditRouterOpen(false)}
 title={`Edit Router: ${currentRouter.name}`}
 >
 <form onSubmit={handleSaveEditRouter} className="space-y-4 text-xs">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Router Name
 </label>
 <input
 type="text"
 required
 value={routerFormName}
 onChange={(e) => setRouterFormName(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Router IP
 </label>
 <input
 type="text"
 required
 value={routerFormIp}
 onChange={(e) => setRouterFormIp(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 API Port
 </label>
 <input
 type="number"
 value={routerFormPort}
 onChange={(e) => setRouterFormPort(Number(e.target.value))}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 API Username
 </label>
 <input
 type="text"
 required
 value={routerFormUser}
 onChange={(e) => setRouterFormUser(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 API Password
 </label>
 <input
 type="password"
 value={routerFormPass}
 onChange={(e) => setRouterFormPass(e.target.value)}
 placeholder="••••••••"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setIsEditRouterOpen(false)}
 className="px-4 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm"
 >
 Save Changes
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: DELETE ROUTER CONFIRMATION */}
 <Modal
 isOpen={isDeleteRouterOpen}
 onClose={() => setIsDeleteRouterOpen(false)}
 title="Delete MikroTik Router"
 >
 <div className="space-y-4 text-xs">
 <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-rose-700 flex items-start gap-2.5">
 <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
 <div>
 <p className="font-bold">Are you sure you want to remove this router?</p>
 <p className="mt-1 text-[11px]">
 Router: <strong>{currentRouter.name} ({currentRouter.ip})</strong>
 </p>
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setIsDeleteRouterOpen(false)}
 className="px-4 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleDeleteCurrentRouter}
 className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
 >
 Confirm Delete
 </button>
 </div>
 </div>
 </Modal>

 {/* MODAL: ADD CLIENT TO THIS ROUTER */}
 <Modal
 isOpen={isAddClientOpen}
 onClose={() => setIsAddClientOpen(false)}
 title={`Add New Client to ${currentRouter.name}`}
 >
 <form onSubmit={handleSaveNewClient} className="space-y-4 text-xs">
 <div className="p-2.5 rounded bg-sky-50 border border-sky-500/30 flex items-center justify-between">
 <span className="font-bold text-sky-700 ">
 Assigned MikroTik Router:
 </span>
 <span className="px-2.5 py-0.5 rounded-full bg-sky-600 text-white font-bold font-mono text-[11px]">
 {currentRouter.name}
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Client Full Name *
 </label>
 <input
 type="text"
 required
 value={newClientName}
 onChange={(e) => setNewClientName(e.target.value)}
 placeholder="e.g. মোঃ করিম উদ্দিন"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Phone Number (মোবাইল) *
 </label>
 <input
 type="tel"
 required
 value={newClientPhone}
 onChange={(e) => setNewClientPhone(e.target.value)}
 placeholder="01XXXXXXXXX"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Package (প্যাকেজ)
 </label>
 <select
 value={newClientPkg}
 onChange={(e) => {
 setNewClientPkg(e.target.value);
 const sel = packages.find((p) => p.name === e.target.value);
 if (sel) setNewClientPrice(sel.price);
 }}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
 >
 {packages.map((p) => (
 <option key={p.id} value={p.name}>
 {p.name} (৳{p.price})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Monthly Price (৳ টাকা)
 </label>
 <input
 type="number"
 value={newClientPrice}
 onChange={(e) => setNewClientPrice(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono font-bold"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 PPPoE/Hotspot User ID
 </label>
 <input
 type="text"
 value={newClientUserId}
 onChange={(e) => setNewClientUserId(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Password
 </label>
 <input
 type="text"
 value={newClientPassword}
 onChange={(e) => setNewClientPassword(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Expiry Date (মেয়াদের তারিখ)
 </label>
 <input
 type="date"
 value={newClientExpiry}
 onChange={(e) => setNewClientExpiry(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Device Access Type
 </label>
 <select
 value={newClientDevice}
 onChange={(e) => setNewClientDevice(e.target.value as any)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
 >
 <option value="Router">Full Router Access</option>
 <option value="Mobile">Single Mobile Device</option>
 </select>
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setIsAddClientOpen(false)}
 className="px-4 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm"
 >
 Add Client to {currentRouter.name}
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: EDIT CLIENT */}
 <Modal
 isOpen={Boolean(editClientData)}
 onClose={() => setEditClientData(null)}
 title={`Edit Client: ${editClientData?.name}`}
 >
 <form onSubmit={handleSaveEditClient} className="space-y-4 text-xs">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Client Name *
 </label>
 <input
 type="text"
 required
 value={editName}
 onChange={(e) => setEditName(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Phone Number *
 </label>
 <input
 type="tel"
 required
 value={editPhone}
 onChange={(e) => setEditPhone(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Assigned MikroTik Router
 </label>
 <select
 value={editRouterName}
 onChange={(e) => setEditRouterName(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-bold"
 >
 {routers.map((r) => (
 <option key={r.id} value={r.name}>
 {r.name} ({r.ip})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Password
 </label>
 <input
 type="text"
 value={editPassword}
 onChange={(e) => setEditPassword(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Package
 </label>
 <select
 value={editPkg}
 onChange={(e) => {
 setEditPkg(e.target.value);
 const sel = packages.find((p) => p.name === e.target.value);
 if (sel) setEditPrice(sel.price);
 }}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
 >
 {packages.map((p) => (
 <option key={p.id} value={p.name}>
 {p.name} (৳{p.price})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Price (৳ টাকা)
 </label>
 <input
 type="number"
 value={editPrice}
 onChange={(e) => setEditPrice(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono font-bold"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Expiry Date
 </label>
 <input
 type="date"
 value={editExpiry}
 onChange={(e) => setEditExpiry(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Device Access Type
 </label>
 <select
 value={editDevice}
 onChange={(e) => setEditDevice(e.target.value as any)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
 >
 <option value="Router">Full Router Access</option>
 <option value="Mobile">Single Mobile Device</option>
 </select>
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setEditClientData(null)}
 className="px-4 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm"
 >
 Update Client
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: DELETE CLIENT CONFIRMATION */}
 <Modal
 isOpen={Boolean(deleteClientData)}
 onClose={() => setDeleteClientData(null)}
 title="Delete Client from Router"
 >
 <div className="space-y-4 text-xs">
 <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-700 flex items-start gap-3">
 <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
 <div>
 <p className="font-bold">
 Are you sure you want to delete client "{deleteClientData?.name}"?
 </p>
 <p className="mt-1 text-[11px] text-slate-900 ">
 User ID: <strong>{deleteClientData?.userId}</strong> • Phone: <strong>{deleteClientData?.phone}</strong>
 <br />
 Router: <strong>{deleteClientData?.router || currentRouter.name}</strong>
 </p>
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setDeleteClientData(null)}
 className="px-4 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleDeleteClient}
 className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
 >
 Confirm Delete Client
 </button>
 </div>
 </div>
 </Modal>

 {/* MODAL: VIEW CLIENT PROFILE */}
 <Modal
 isOpen={Boolean(viewClientData)}
 onClose={() => setViewClientData(null)}
 title={`Client Details: ${viewClientData?.name}`}
 >
 {viewClientData && (
 <div className="space-y-4 text-xs">
 <div className="flex items-center gap-3 p-3 bg-slate-50 rounded">
 {viewClientData.photo ? (
 <img
 src={viewClientData.photo}
 alt={viewClientData.name}
 className="w-12 h-12 rounded-full object-cover border-2 border-sky-500"
 />
 ) : (
 <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-base">
 {viewClientData.name.slice(0, 1)}
 </div>
 )}
 <div>
 <h3 className="text-sm font-bold text-slate-900 ">
 {viewClientData.name}
 </h3>
 <p className="text-slate-800 font-mono text-[11px]">
 ID: {viewClientData.id} • {viewClientData.phone}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 text-[11px]">
 <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 ">
 <span className="text-slate-800">User ID:</span>
 <p className="font-bold text-slate-800 font-mono">
 {viewClientData.userId}
 </p>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 ">
 <span className="text-slate-800">Password:</span>
 <p className="font-bold text-slate-800 font-mono">
 {viewClientData.password || 'N/A'}
 </p>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 ">
 <span className="text-slate-800">Package:</span>
 <p className="font-bold text-slate-800 ">
 {viewClientData.package} (৳{viewClientData.price || '500'})
 </p>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 ">
 <span className="text-slate-800">Bandwidth:</span>
 <p className="font-bold text-sky-600 font-mono">
 ↓{viewClientData.downloadSpeed || viewClientData.bandwidth} / ↑{viewClientData.uploadSpeed || '10'} Mbps
 </p>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 ">
 <span className="text-slate-800">MikroTik Router:</span>
 <p className="font-bold text-slate-800 ">
 {viewClientData.router || currentRouter.name}
 </p>
 </div>
 <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 ">
 <span className="text-slate-800">Expiry Date:</span>
 <p className="font-bold text-slate-800 font-mono">
 {viewClientData.expiry}
 </p>
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <button
 onClick={() => {
 setSmsReminderClient(viewClientData);
 setViewClientData(null);
 }}
 className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
 >
 <MessageSquare className="w-3.5 h-3.5" /> Send SMS Reminder
 </button>
 <button
 onClick={() => setViewClientData(null)}
 className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold"
 >
 Close
 </button>
 </div>
 </div>
 )}
 </Modal>

 {/* MODAL: QR CODE VOUCHER */}
 <Modal
 isOpen={Boolean(qrClientData)}
 onClose={() => setQrClientData(null)}
 title="Client QR Code Voucher"
 >
 {qrClientData && (
 <div className="text-center space-y-3">
 <div className="p-4 bg-white rounded inline-block shadow-inner border border-slate-200">
 <QRCodeSVG
 value={`http://${currentRouter.ip}/login?user=${encodeURIComponent(
 qrClientData.userId
 )}&password=${encodeURIComponent(qrClientData.password || '')}`}
 size={180}
 />
 </div>
 <div>
 <h4 className="font-bold text-slate-900 ">{qrClientData.name}</h4>
 <p className="text-xs font-mono text-slate-800">ID: {qrClientData.userId}</p>
 </div>
 </div>
 )}
 </Modal>

 {/* MODAL: SMS REMINDER */}
 <SmsReminderModal
 client={smsReminderClient}
 settings={settings}
 isOpen={Boolean(smsReminderClient)}
 onClose={() => setSmsReminderClient(null)}
 onSmsSent={onSendSmsReminder}
 showToast={showToast}
 />

 {/* MODAL: MIKROTIK CONNECTION ASSISTANT & TROUBLESHOOTING */}
 <Modal
 isOpen={isConnectionGuideOpen}
 onClose={() => setIsConnectionGuideOpen(false)}
 title="MikroTik Router Connection Assistant & DDNS Guide"
 >
 <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
 {/* Explanation Header */}
 <div className="p-4 rounded bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
 <h4 className="font-extrabold text-amber-900 text-sm flex items-center gap-2">
 <span>⚠️ কেন লোকাল আইপি (যেমন 192.168.88.1) সরাসরি ক্লাউড অ্যাপে কানেক্ট হয় না?</span>
 </h4>
 <p className="text-amber-800 leading-relaxed">
 এই ISP বিলিং অ্যাপটি ইন্টারনেটের সুরক্ষিত ক্লাউড সার্ভারে চলে। আপনার লোকাল রাউটারের <strong>192.168.88.1</strong> বা <strong>10.x.x.x</strong> হলো আপনার নিজস্ব অফিস/হোম নেটওয়ার্কের প্রাইভেট আইপি। ইন্টারনেট ক্লাউড থেকে সরাসরি লোকাল প্রাইভেট আইপিতে ঢুকতে পারে না।
 </p>
 </div>

 {/* Solution 1: Free MikroTik Cloud DDNS */}
 <div className="p-4 rounded bg-sky-500/10 border border-sky-500/30 space-y-3">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">1</div>
 <h5 className="font-bold text-slate-900 text-sm">
 পদ্ধতি ১: MikroTik Cloud DDNS (সম্পূর্ণ ফ্রি ও সহজ)
 </h5>
 </div>
 <p className="text-xs text-slate-900 ">
 WinBox এর <strong>Terminal</strong> ওপেন করে নিচের ৪ লাইনের কমান্ড কপি-পেস্ট করে Enter চাপুন:
 </p>
 <div className="bg-white text-[#00a65a] p-3 rounded-lg font-mono text-[11px] select-all border border-slate-200">
 /ip service enable api<br/>
 /ip service set api port=8728<br/>
 /ip cloud set ddns-enabled=yes update-time=yes<br/>
 /ip cloud print
 </div>
 <p className="text-[11px] text-slate-800">
 Terminal এ <strong>dns-name</strong> আসবে (যেমন: <code className="text-sky-600 font-bold">6c3b01xxxxxx.sn.mynetname.net</code>)। এই ডোমেনটি আপনার এই অ্যাপের রাউটার IP বক্সে পেস্ট করে সেভ করুন!
 </p>
 </div>

 {/* Solution 2: Public Real IP */}
 <div className="p-4 rounded bg-indigo-500/10 border border-indigo-500/30 space-y-2">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">2</div>
 <h5 className="font-bold text-slate-900 text-sm">
 পদ্ধতি ২: Real Public IP ব্যবহার করা
 </h5>
 </div>
 <p className="text-xs text-slate-900 ">
 আপনার আপস্ট্রিম আইকোর/আইএসপি থেকে পাওয়া রিয়েল পাবলিক আইপি রাউটার আইপিতে বসিয়ে দিন এবং WinBox এর <code>IP -&gt; Services -&gt; api</code> (Port 8728) অন রাখুন।
 </p>
 </div>

 {/* Solution 3: Staging Mode */}
 <div className="p-4 rounded bg-teal-500/10 border border-teal-500/30 space-y-2">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">3</div>
 <h5 className="font-bold text-slate-900 text-sm">
 পদ্ধতি ৩: অফলাইন স্টেজিং / সিমুলেশন মোড
 </h5>
 </div>
 <p className="text-xs text-slate-900 ">
 যদি আপনার কাছে এখনই পাবলিক আইপি না থাকে, আপনি নিশ্চিন্তে এই ডেমো/স্টেজিং মোডে ক্লায়েন্ট ম্যানেজ, বিল তৈরি, হটস্পট ভাউচার এবং ট্রাফিক গ্রাফ টেস্ট করতে পারবেন।
 </p>
 </div>

 <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 ">
 <button
 onClick={() => {
 if (onUpdateRouter) {
 onUpdateRouter({
 ...currentRouter,
 connected: true,
 isDefault: true,
 });
 }
 setIsConnectionGuideOpen(false);
 showToast(`Router "${currentRouter.name}" কে অফলাইন স্টেজিং মোডে কানেক্ট করা হয়েছে!`, 'success');
 }}
 className="px-3 py-2 rounded bg-teal-600/15 hover:bg-teal-600/25 border border-teal-500/40 text-teal-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
 >
 <Zap className="w-3.5 h-3.5 text-teal-500" /> স্টেজিং মোডে কানেক্ট করুন (Force Connect)
 </button>

 <button
 onClick={() => setIsConnectionGuideOpen(false)}
 className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
 >
 বুঝেছি (Got It)
 </button>
 </div>
 </div>
 </Modal>
 </div>
 );
};
