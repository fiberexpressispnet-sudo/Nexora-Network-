import React, { useState, useEffect } from 'react';
import { PageId, Client, AppSettings } from '../../types';
import {
 DollarSign,
 Users,
 Network,
 Calendar,
 Layers,
 HelpCircle,
 CheckSquare,
 ArrowUpRight,
 ArrowDownRight,
 ShoppingCart,
 Boxes,
 Briefcase,
 Sliders,
 Plus,
 Search,
 Download,
 CheckCircle2,
 Clock,
 Trash2,
 Edit3,
 X,
 Save,
 Check,
 AlertCircle,
 Server,
 Zap,
 ShieldCheck,
 MessageSquare,
 Send,
 Radio,
 Activity,
 FileText,
 UserPlus,
 RefreshCw,
 SlidersHorizontal,
 Wrench,
 MapPin,
 TrendingUp,
 PieChart,
 Tag,
 Globe,
 HardDrive,
 PackageCheck,
 Cpu,
 Smartphone,
 CreditCard,
 Building,
 Key,
 ShieldAlert,
 Award,
 CalendarDays,
 UserCheck,
 Headphones,
 RotateCcw,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface IspModuleProps {
 pageId: PageId;
 clients: Client[];
 settings: AppSettings;
 showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
 uid?: string;
}

export interface ModuleRecord {
 id: string;
 name: string;
 category: string;
 details: string;
 status: 'Active' | 'Pending' | 'Archived';
 date: string;
 value: string;
}

const defaultRecordsMap: Record<string, ModuleRecord[]> = {
 configuration: [
 { id: 'CFG-01', name: 'Mikrotik NAS Router Gateway', category: 'Gateway', details: 'CCR1036-12G-4S+ at 192.168.88.1', status: 'Active', date: '2026-08-01', value: 'Port 8728' },
 { id: 'CFG-02', name: 'SMS Alert Gateway API', category: 'SMS', details: 'Bangladesh SMS Hub API Integration', status: 'Active', date: '2026-08-01', value: '2,900 SMS' },
 { id: 'CFG-03', name: 'Primary PPPoE IP Pool', category: 'Network', details: 'Subnet: 172.16.0.0/20 (4,096 IPs)', status: 'Active', date: '2026-08-01', value: '4096 Hosts' },
 { id: 'CFG-04', name: 'Hotspot DHCP Server', category: 'Hotspot', details: 'Subnet: 10.5.50.0/24 (VLAN 50)', status: 'Active', date: '2026-08-01', value: '254 Hosts' },
 ],
 'hr-payroll': [
 { id: 'EMP-01', name: 'Md. Jahangir Alam', category: 'Network Engineer', details: 'Core Mikrotik & BGP Routing Specialist', status: 'Active', date: '2026-08-01', value: '৳45,000' },
 { id: 'EMP-02', name: 'Mehedi Hasan', category: 'Field Technician', details: 'Fiber Splicing & On-Site LOS Repairs', status: 'Active', date: '2026-08-01', value: '৳25,000' },
 { id: 'EMP-03', name: 'Tanvir Hossain', category: 'Support Executive', details: 'Customer Help Desk & Billing Support', status: 'Active', date: '2026-08-01', value: '৳22,000' },
 { id: 'EMP-04', name: 'Ariful Islam', category: 'Hotspot Field Ops', details: 'Hotspot Zone Maintenance & Voucher Sales', status: 'Pending', date: '2026-08-01', value: '৳28,000' },
 ],
 'network-diagram': [
 { id: 'NET-01', name: 'POP-01 Central Hub Core OLT', category: 'Core OLT', details: 'EPON 8-Port OLT with 10G Fiber Uplink', status: 'Active', date: '2026-08-01', value: '-18.2 dBm' },
 { id: 'NET-02', name: 'Zone A Primary Splitter 1:16', category: 'Splitter', details: 'Armored Trunk Cable at 2.1 KM', status: 'Active', date: '2026-08-01', value: '15/16 ONUs' },
 { id: 'NET-03', name: 'Zone B Splicing Hub 1:8', category: 'Distribution', details: 'Aerial Fiber Trunk at 4.8 KM', status: 'Active', date: '2026-08-01', value: '11/12 ONUs' },
 ],
 'leave-management': [
 { id: 'LEV-01', name: 'Md. Jahangir Alam', category: 'Casual Leave', details: 'Personal Family Function (Approved)', status: 'Active', date: '2026-08-15', value: '2 Days' },
 { id: 'LEV-02', name: 'Mehedi Hasan', category: 'Medical Leave', details: 'Fever & Recovery Rest (Approved)', status: 'Active', date: '2026-08-10', value: '3 Days' },
 { id: 'LEV-03', name: 'Tanvir Hossain', category: 'Casual Leave', details: 'Weekend Extension (Pending Approval)', status: 'Pending', date: '2026-08-22', value: '1 Day' },
 ],
 'mac-reseller': [
 { id: 'MAC-01', name: 'Uttara Speed Network', category: 'Sub-Reseller', details: '42 Clients Allocated (Tariff ৳350/10Mbps)', status: 'Active', date: '2026-08-01', value: '৳50,000' },
 { id: 'MAC-02', name: 'Mirpur SpeedNet Reseller', category: 'Sub-Reseller', details: '18 Clients Allocated (Tariff ৳380/10Mbps)', status: 'Active', date: '2026-08-01', value: '৳25,000' },
 { id: 'MAC-03', name: 'Gulshan FastLink Partner', category: 'Sub-Reseller', details: '28 Clients Allocated (Tariff ৳320/10Mbps)', status: 'Active', date: '2026-08-01', value: '৳40,000' },
 ],
 'events-holidays': [
 { id: 'EVT-01', name: 'Independence Day Holiday', category: 'Holiday', details: 'Official Public Holiday (Support desk emergency rotation)', status: 'Active', date: '2026-03-26', value: 'All Staff' },
 { id: 'EVT-02', name: 'Scheduled Core Router Maintenance', category: 'Maintenance', details: 'Firmware Update on Core Mikrotik (2:00 AM - 5:00 AM)', status: 'Pending', date: '2026-08-25', value: 'Network Team' },
 { id: 'EVT-03', name: 'Quarterly ISP Staff Meeting', category: 'Internal', details: 'Quarterly Target Review & Bonus Announcement', status: 'Active', date: '2026-09-01', value: 'HQ Office' },
 ],
 'support-ticketing': [
 { id: 'TCK-01', name: 'Red LOS Light on Client ONU', category: 'Urgent', details: 'Sector 10 Road 4 - Cut fiber drop wire near pole', status: 'Pending', date: '2026-08-19', value: 'High Priority' },
 { id: 'TCK-02', name: 'Slow YouTube Streaming Issue', category: 'Normal', details: 'Checked Mikrotik queue and MTU - resolved', status: 'Active', date: '2026-08-19', value: 'Normal Priority' },
 { id: 'TCK-03', name: 'New Router Setup & WiFi Name Change', category: 'Low', details: 'Client requested dual-band SSID config', status: 'Active', date: '2026-08-18', value: 'Completed' },
 ],
 'task-management': [
 { id: 'TSK-01', name: 'Fiber Splicing at Main Junction', category: 'Field Work', details: 'Assigned: Mehedi Hasan (120m cable splice)', status: 'Pending', date: '2026-08-19', value: 'In Progress' },
 { id: 'TSK-02', name: 'Power Adapter Replacement POP 2', category: 'Maintenance', details: 'Assigned: Tanvir Hossain (12V 5A adapter)', status: 'Active', date: '2026-08-18', value: 'Completed' },
 { id: 'TSK-03', name: 'New ONU Installation for VIP Client', category: 'Installation', details: 'Client: Dr. Rafiqul Islam (Flat 4B)', status: 'Active', date: '2026-08-19', value: 'Completed' },
 ],
 'bandwidth-buy': [
 { id: 'BWB-01', name: 'BSCCL Submarine Cable Upstream', category: 'IIG Upstream', details: '10 Gbps Dedicated Line (BGP Peer 103.140.88.1)', status: 'Active', date: '2026-08-01', value: '৳1,80,000/mo' },
 { id: 'BWB-02', name: 'Tata Communications IP Transit', category: 'Transit', details: '256 Public IP Subnet (103.140.88.0/24)', status: 'Active', date: '2026-08-01', value: '৳45,000/mo' },
 { id: 'BWB-03', name: 'Fiber@Home NTTN Transmission Link', category: 'NTTN', details: '10G Dark Fiber Transmission Ring', status: 'Active', date: '2026-08-01', value: '৳35,000/mo' },
 ],
 'bandwidth-sale': [
 { id: 'BWS-01', name: 'City Bank Limited BDIX Peering', category: 'Corporate SLA', details: '2 Gbps Dedicated Peering SLA with 99.9% uptime', status: 'Active', date: '2026-08-01', value: '৳65,000/mo' },
 { id: 'BWS-02', name: 'Local Cable Operator Wholesale Feed', category: 'Wholesale', details: '1.5 Gbps Shared Feed for Sub-ISP Zone 4', status: 'Active', date: '2026-08-01', value: '৳50,000/mo' },
 { id: 'BWS-03', name: 'Apex Garments Ltd Corporate Link', category: 'Corporate', details: '50 Mbps 1:1 Dedicated Bandwidth + 4 Public IPs', status: 'Active', date: '2026-08-01', value: '৳28,000/mo' },
 ],
 purchase: [
 { id: 'PUR-01', name: '24-Core Armored Fiber Cable Drums', category: 'Cables', details: 'Vendor: FiberFox Ltd (10 Drums / 10,000m)', status: 'Active', date: '2026-08-12', value: '৳85,000' },
 { id: 'PUR-02', name: 'AC1200 Dual Band WiFi Routers', category: 'Hardware', details: 'Vendor: TP-Link Distributor (100 Units)', status: 'Pending', date: '2026-08-18', value: '৳1,20,000' },
 { id: 'PUR-03', name: 'GPON Gigabit ONUs (ZTE Chipset)', category: 'ONU', details: 'Vendor: C-Data Official (200 Units)', status: 'Active', date: '2026-08-05', value: '৳1,50,000' },
 ],
 inventory: [
 { id: 'INV-01', name: 'GPON Single-Port Gigabit ONU', category: 'ONU', details: 'ZTE Chipset, 1 GE Port, SC/UPC Optical', status: 'Active', date: '2026-08-01', value: '85 Units' },
 { id: 'INV-02', name: 'SC/UPC Fiber Patch Cords (3m)', category: 'Consumables', details: 'Simplex Single Mode 3.0mm Yellow', status: 'Active', date: '2026-08-01', value: '450 Pcs' },
 { id: 'INV-03', name: '10G SFP+ Optical Transceiver 10KM', category: 'Transceivers', details: '1310nm Single Mode LC Duplex', status: 'Pending', date: '2026-08-01', value: '16 Pcs' },
 { id: 'INV-04', name: 'Fiber Joint Closure Enclosure 24-Core', category: 'Hardware', details: 'Dome Type Waterproof IP68', status: 'Active', date: '2026-08-01', value: '32 Pcs' },
 ],
 assets: [
 { id: 'AST-01', name: 'Mikrotik CCR1036-12G-4S+ Core Router', category: 'Router', details: 'Rack Mounted at Central Server Room POP 1', status: 'Active', date: '2026-08-01', value: '৳1,50,000' },
 { id: 'AST-02', name: 'Fujikura 60S+ Core Fusion Splicer', category: 'Tools', details: 'Fiber Splicing Machine with Cleaver CT-30', status: 'Active', date: '2026-08-01', value: '৳1,10,000' },
 { id: 'AST-03', name: 'Yokogawa AQ7280 Optical OTDR Meter', category: 'Testing', details: 'Dual Wavelength 1310/1550nm Range 60KM', status: 'Active', date: '2026-08-01', value: '৳85,000' },
 { id: 'AST-04', name: '5KVA Online Pure Sine Wave UPS', category: 'Power', details: 'Central POP Backup Battery Bank (4 Hours)', status: 'Active', date: '2026-08-01', value: '৳75,000' },
 ],
};

export const IspDigitalModulePage: React.FC<IspModuleProps> = ({
 pageId,
 clients,
 settings,
 showToast,
 uid,
}) => {
 const [records, setRecords] = useState<ModuleRecord[]>(() => {
 try {
 const saved = localStorage.getItem(`isp_module_records_${pageId}`);
 if (saved) {
 const parsed = JSON.parse(saved);
 if (Array.isArray(parsed) && parsed.length > 0) {
 return parsed;
 }
 }
 } catch (e) {
 console.error(e);
 }
 return defaultRecordsMap[pageId] || [];
 });

 const [searchTerm, setSearchTerm] = useState('');
 const [activeTab, setActiveTab] = useState<'all' | 'Active' | 'Pending' | 'Archived'>('all');
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [editingRecord, setEditingRecord] = useState<ModuleRecord | null>(null);

 // Form states
 const [formData, setFormData] = useState({
 name: '',
 category: '',
 details: '',
 status: 'Active' as 'Active' | 'Pending' | 'Archived',
 value: '',
 });

 // Save to local storage on record updates
 useEffect(() => {
 try {
 localStorage.setItem(`isp_module_records_${pageId}`, JSON.stringify(records));
 } catch (e) {
 console.error(e);
 }
 }, [records, pageId]);

 const moduleTitles: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
 configuration: {
 title: 'System & Router Configuration',
 subtitle: 'Manage global ISP system parameters, NAS routers, IP pools, VLANs, and SMS Gateways',
 icon: <Sliders className="w-6 h-6 text-[#3c8dbc]" />,
 },
 billing: {
 title: 'Billing & Invoicing Panel',
 subtitle: 'Automated invoice generation, client payment collection, and ledger records',
 icon: <DollarSign className="w-6 h-6 text-[#00a65a]" />,
 },
 'hr-payroll': {
 title: 'HR & Payroll Management',
 subtitle: 'Staff profiles, attendance, salary sheets, monthly disbursement, and role permissions',
 icon: <Users className="w-6 h-6 text-blue-400" />,
 },
 'network-diagram': {
 title: 'Network & Fiber Topology Diagram',
 subtitle: 'Interactive map of OLT, Splitters, Fiber Cores, Ping latency, and POP locations',
 icon: <Network className="w-6 h-6 text-purple-400" />,
 },
 'leave-management': {
 title: 'Staff Leave Management',
 subtitle: 'Employee leave applications, casual/medical balances, and approval workflows',
 icon: <CalendarDays className="w-6 h-6 text-amber-400" />,
 },
 'mac-reseller': {
 title: 'MAC Reseller Panel',
 subtitle: 'Sub-reseller balance, client allocation, commission rates, and credit recharges',
 icon: <Layers className="w-6 h-6 text-indigo-400" />,
 },
 'events-holidays': {
 title: 'Events & Official Holidays',
 subtitle: 'ISP operational schedule, official public holidays, and maintenance outage announcements',
 icon: <Calendar className="w-6 h-6 text-rose-400" />,
 },
 'support-ticketing': {
 title: 'Support & Help Desk Ticketing',
 subtitle: 'Client complaint tickets, priority levels, technician assignment, and resolution logs',
 icon: <HelpCircle className="w-6 h-6 text-sky-400" />,
 },
 'task-management': {
 title: 'Field Team Task Management',
 subtitle: 'Technician task dispatch, line repairs, fiber splicing jobs, and status tracking',
 icon: <CheckSquare className="w-6 h-6 text-[#00a65a]" />,
 },
 'bandwidth-buy': {
 title: 'IIG Bandwidth Buy Management',
 subtitle: 'Upstream vendor IP, Tata/Airtel/Submarine cable purchase logs, and Gbps capacity',
 icon: <ArrowDownRight className="w-6 h-6 text-orange-400" />,
 },
 'bandwidth-sale': {
 title: 'BDIX & Corporate Bandwidth Sale',
 subtitle: 'Corporate client contracts, dedicated bandwidth allocations, and 99.9% SLA monitoring',
 icon: <ArrowUpRight className="w-6 h-6 text-teal-400" />,
 },
 purchase: {
 title: 'Procurement & Purchase Orders',
 subtitle: 'Equipment buying, vendor invoices, fiber cable roll orders, and approvals',
 icon: <ShoppingCart className="w-6 h-6 text-amber-400" />,
 },
 inventory: {
 title: 'ISP Inventory & Stock Store',
 subtitle: 'Onu, Routers, SC Patch cords, Fiber cables, and SFP module stock visualizer',
 icon: <Boxes className="w-6 h-6 text-[#3c8dbc]" />,
 },
 assets: {
 title: 'Company Asset Management',
 subtitle: 'Physical assets, Mikrotik routers, OLTs, Fusion splicers, OTDRs, and asset valuation',
 icon: <Briefcase className="w-6 h-6 text-slate-900" />,
 },
 };

 const currentModule = moduleTitles[pageId] || {
 title: 'ISP Digital Module',
 subtitle: 'Manage ISP operational data and system workflows',
 icon: <Sliders className="w-6 h-6 text-[#3c8dbc]" />,
 };

 // Filter records
 const filteredRecords = records.filter((rec) => {
 const matchesSearch =
 rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
 rec.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
 rec.details.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesTab = activeTab === 'all' || rec.status === activeTab;
 return matchesSearch && matchesTab;
 });

 // Export CSV function
 const handleExportCSV = () => {
 if (records.length === 0) {
 showToast('No records available to export', 'warning');
 return;
 }
 const headers = ['ID', 'Name/Title', 'Category', 'Details', 'Status', 'Date', 'Value'];
 const rows = records.map((r) => [r.id, r.name, r.category, r.details, r.status, r.date, r.value]);
 const csvContent =
 'data:text/csv;charset=utf-8,' +
 [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');

 const encodedUri = encodeURI(csvContent);
 const link = document.createElement('a');
 link.setAttribute('href', encodedUri);
 link.setAttribute('download', `${pageId}_export_${new Date().toISOString().slice(0, 10)}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 showToast(`Exported ${records.length} records to CSV file!`, 'success');
 };

 // Add new record
 const handleAddRecord = (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.name.trim()) {
 showToast('Please enter a title or name', 'warning');
 return;
 }
 const newRec: ModuleRecord = {
 id: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
 name: formData.name,
 category: formData.category || 'General',
 details: formData.details || 'Operational record',
 status: formData.status,
 date: new Date().toISOString().slice(0, 10),
 value: formData.value || 'N/A',
 };
 setRecords([newRec, ...records]);
 setFormData({ name: '', category: '', details: '', status: 'Active', value: '' });
 setIsAddModalOpen(false);
 showToast(`New entry "${newRec.name}" added successfully!`, 'success');
 };

 // Edit record
 const handleUpdateRecord = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingRecord) return;
 setRecords(records.map((r) => (r.id === editingRecord.id ? editingRecord : r)));
 setEditingRecord(null);
 showToast(`Record ${editingRecord.id} updated!`, 'success');
 };

 // Delete record
 const handleDeleteRecord = (id: string) => {
 if (window.confirm('Are you sure you want to delete this record?')) {
 setRecords(records.filter((r) => r.id !== id));
 showToast(`Record ${id} deleted`, 'info');
 }
 };

 // Toggle status
 const handleToggleStatus = (id: string) => {
 setRecords(
 records.map((r) => {
 if (r.id === id) {
 const nextStatus = r.status === 'Active' ? 'Pending' : r.status === 'Pending' ? 'Archived' : 'Active';
 return { ...r, status: nextStatus };
 }
 return r;
 })
 );
 showToast('Record status updated!', 'info');
 };

 const activeCount = records.filter((r) => r.status === 'Active').length;
 const pendingCount = records.filter((r) => r.status === 'Pending').length;
 const archivedCount = records.filter((r) => r.status === 'Archived').length;

 return (
 <div className="space-y-6 text-slate-800 animate-page-enter">
 {/* Dynamic Page Header */}
 <div className="bg-slate-50 border border-slate-300 rounded p-5 shadow-md text-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-3 bg-white border border-slate-300 rounded shadow-inner">
 {currentModule.icon}
 </div>
 <div>
 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
 <span>{currentModule.title}</span>
 </h2>
 <p className="text-xs text-slate-900">{currentModule.subtitle}</p>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <button
 type="button"
 onClick={() => {
 if (window.confirm(`Are you sure you want to reset "${currentModule.title}" data and start fresh? (Hard Reset)`)) {
 setRecords([]);
 localStorage.removeItem(`isp_module_records_${pageId}`);
 if (uid) {
 setDoc(doc(db, 'users', uid, 'appData', `isp_module_records_${pageId}`), { value: [] }).catch(console.error);
 }
 showToast(`"${currentModule.title}" data has been reset.`, 'success');
 }
 }}
 className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-lg border border-rose-500/40 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
 title="Hard Reset: Clear all data for this module"
 >
 <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
 <span>Hard Reset (Reset Data)</span>
 </button>

 <button
 onClick={handleExportCSV}
 className="px-3.5 py-2 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-all"
 >
 <Download className="w-4 h-4" />
 <span>Export CSV</span>
 </button>

 <button
 onClick={() => setIsAddModalOpen(true)}
 className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-sky-600 hover:brightness-110 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
 >
 <Plus className="w-4 h-4" />
 <span>Add New Entry</span>
 </button>
 </div>
 </div>

 {/* Control Bar: Search & Filter Tabs */}
 <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
 <div className="relative w-full sm:max-w-xs">
 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-800" />
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Search records or IDs..."
 className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#3c8dbc] font-medium"
 />
 </div>

 <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
 {(['all', 'Active', 'Pending', 'Archived'] as const).map((tab) => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={`px-3.5 py-1.5 text-xs font-bold rounded-lg capitalize cursor-pointer transition-all ${
 activeTab === tab
 ? 'bg-cyan-500 text-slate-950 shadow-sm'
 : 'bg-slate-100 text-slate-900 hover:bg-slate-200 '
 }`}
 >
 {tab === 'all' ? `All (${records.length})` : `${tab} (${records.filter(r => r.status === tab).length})`}
 </button>
 ))}
 </div>
 </div>

 {/* Module Overview Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-1">
 <div className="text-xs text-slate-800 font-bold uppercase tracking-wider">Total Records</div>
 <div className="text-2xl font-black text-slate-900 ">{records.length}</div>
 <div className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
 <CheckCircle2 className="w-3.5 h-3.5" /> 100% Active Management
 </div>
 </div>

 <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-1">
 <div className="text-xs text-slate-800 font-bold uppercase tracking-wider">Active Operational</div>
 <div className="text-2xl font-black text-emerald-600 ">{activeCount}</div>
 <div className="text-[11px] text-slate-800 font-normal">Running entries</div>
 </div>

 <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-1">
 <div className="text-xs text-slate-800 font-bold uppercase tracking-wider">Pending Action</div>
 <div className="text-2xl font-black text-amber-500">{pendingCount}</div>
 <div className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
 <Clock className="w-3.5 h-3.5" /> Pending Review
 </div>
 </div>

 <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-1">
 <div className="text-xs text-slate-800 font-bold uppercase tracking-wider">Archived</div>
 <div className="text-2xl font-black text-slate-800">{archivedCount}</div>
 <div className="text-[11px] text-slate-800 font-normal">Past/Historical logs</div>
 </div>
 </div>

 {/* Domain-Specific Visual Canvas & Dedicated Interactive Panels */}

 {/* 1. Configuration Panel */}
 {pageId === 'configuration' && (
 <div className="bg-white border border-cyan-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-[#3c8dbc] flex items-center gap-2">
 <Sliders className="w-4 h-4 text-[#3c8dbc]" />
 <span>Core ISP System Configuration & Router API Hub</span>
 </h3>
 <span className="text-xs bg-emerald-500/20 text-[#00a65a] px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
 Mikrotik API: Connected (Port 8728)
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
 <div className="bg-slate-100 border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="font-bold text-sky-400 flex items-center justify-between">
 <span>NAS Router Gateway</span>
 <span className="text-[10px] bg-sky-500/20 px-1.5 py-0.5 rounded">CCR1036</span>
 </div>
 <div className="text-slate-900 space-y-1 text-[11px]">
 <div>• Gateway IP: 192.168.88.1</div>
 <div>• API Port: 8728 (SSL 8729)</div>
 <div>• RADIUS Secret: ********</div>
 <button
 onClick={() => showToast('Pinging NAS Router 192.168.88.1... Response: 0.6ms (OK)', 'success')}
 className="mt-2 w-full py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-[10px] cursor-pointer"
 >
 Test Mikrotik API Sync
 </button>
 </div>
 </div>

 <div className="bg-slate-100 border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="font-bold text-[#00a65a] flex items-center justify-between">
 <span>SMS Alert Gateway</span>
 <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded">bKash/SMS API</span>
 </div>
 <div className="text-slate-900 space-y-1 text-[11px]">
 <div>• Provider: Bangladesh SMS Hub</div>
 <div>• Sender ID: FIBER-EXPRESS</div>
 <div>• Balance: ৳1,450.00 (2,900 SMS)</div>
 <button
 onClick={() => showToast('SMS Gateway Connection Test Successful! Balance: 2,900 SMS', 'success')}
 className="mt-2 w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] cursor-pointer"
 >
 Send Test SMS Alert
 </button>
 </div>
 </div>

 <div className="bg-slate-100 border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="font-bold text-purple-400 flex items-center justify-between">
 <span>PPPoE & IP Pool Subnets</span>
 <span className="text-[10px] bg-purple-500/20 px-1.5 py-0.5 rounded">DHCP / Pool</span>
 </div>
 <div className="text-slate-900 space-y-1 text-[11px]">
 <div>• Primary Pool: 172.16.0.1/20</div>
 <div>• Hotspot Pool: 10.5.50.1/24</div>
 <div>• Active Leases: 1,240 IPs</div>
 <button
 onClick={() => showToast('Flushed Stale DHCP Leases. 14 Free IPs recovered.', 'info')}
 className="mt-2 w-full py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-[10px] cursor-pointer"
 >
 Flush Stale Leases
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* 2. HR & Payroll Panel */}
 {pageId === 'hr-payroll' && (
 <div className="bg-white border border-amber-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
 <Briefcase className="w-4 h-4 text-amber-400" />
 <span>HR Management & Automated Monthly Staff Payroll</span>
 </h3>
 <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-mono">
 Total Staff: {records.length > 0 ? '4' : '0'} Members
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-slate-800 font-medium">Monthly Payroll Budget</div>
 <div className="text-lg font-black text-amber-400">
 {records.length > 0 ? '৳1,20,000' : '৳0'} / mo
 </div>
 <div className="text-[10px] text-slate-800">Fixed Staff Compensation</div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-slate-800 font-medium">Salary Disbursed (August)</div>
 <div className="text-lg font-black text-[#00a65a]">
 {records.length > 0 ? '৳92,000 (3 Paid)' : '৳0 (0 Paid)'}
 </div>
 <div className="text-[10px] text-[#00a65a]">via bKash Corporate Payroll</div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-slate-800 font-medium">Pending Salary</div>
 <div className="text-lg font-black text-rose-400">
 {records.length > 0 ? '৳28,000 (1 Pending)' : '৳0 (0 Pending)'}
 </div>
 <div className="text-[10px] text-rose-400 font-bold">
 {records.length > 0 ? 'Ariful Islam (Hotspot Mgr)' : 'No pending payroll'}
 </div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 flex flex-col justify-between">
 <div className="text-slate-800 font-medium">Quick Payroll Action</div>
 <button
 disabled={records.length === 0}
 onClick={() => showToast('Disbursed ৳28,000 salary to Ariful Islam via bKash Corporate Payroll!', 'success')}
 className={`w-full py-1.5 font-extrabold rounded text-xs cursor-pointer shadow ${
 records.length > 0
 ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
 : 'bg-slate-700 text-slate-800 cursor-not-allowed'
 }`}
 >
 Disburse Pending Payroll
 </button>
 </div>
 </div>
 </div>
 )}

 {/* 3. Network Diagram Panel */}
 {pageId === 'network-diagram' && (
 <div className="bg-white border border-cyan-500/30 rounded p-5 text-slate-800 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-[#3c8dbc] flex items-center gap-2">
 <Radio className="w-4 h-4 animate-pulse text-[#00a65a]" />
 <span>Interactive Fiber Topology & EPON/GPON OLT Core Visualizer</span>
 </h3>
 <span className="text-xs bg-emerald-500/20 text-[#00a65a] px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
 {records.length > 0 ? 'OLT Status: Online (-19.5 dBm)' : 'OLT Status: Offline (No Data)'}
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
 {records.length > 0 ? (
 <>
 <div className="bg-slate-100 border border-slate-300 p-3 rounded-lg space-y-2">
 <div className="font-bold text-sky-400 flex items-center justify-between">
 <span>[POP Station #1 - Central]</span>
 <span className="text-[10px] bg-sky-500/20 px-1.5 py-0.5 rounded">Core OLT</span>
 </div>
 <div className="text-slate-900 space-y-1 text-[11px]">
 <div>• EPON 8-Port OLT (10G Fiber)</div>
 <div>• IP: 10.10.0.1 (0.8 ms ping)</div>
 <div>• Signal Power: -18.2 dBm</div>
 <div className="text-[#00a65a] font-bold">• Active Subscribers: 342 ONUs</div>
 </div>
 </div>

 <div className="bg-slate-100 border border-slate-300 p-3 rounded-lg space-y-2">
 <div className="font-bold text-purple-400 flex items-center justify-between">
 <span>[Zone A Splitter Box 1:16]</span>
 <span className="text-[10px] bg-purple-500/20 px-1.5 py-0.5 rounded">Primary Joint</span>
 </div>
 <div className="text-slate-900 space-y-1 text-[11px]">
 <div>• Fiber Trunk: 24-Core Armored</div>
 <div>• Distance: 2.1 KM from Hub</div>
 <div>• Signal Loss: -1.2 dBm</div>
 <div className="text-[#00a65a] font-bold">• Active ONUs: 15 / 16</div>
 </div>
 </div>

 <div className="bg-slate-100 border border-slate-300 p-3 rounded-lg space-y-2">
 <div className="font-bold text-amber-400 flex items-center justify-between">
 <span>[Zone B Splicing Hub]</span>
 <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded">Distribution</span>
 </div>
 <div className="text-slate-900 space-y-1 text-[11px]">
 <div>• Fiber Cable: 12-Core Aerial</div>
 <div>• Distance: 4.8 KM from Hub</div>
 <div>• Power Loss: -2.4 dBm</div>
 <div className="text-amber-400 font-bold">• Active ONUs: 11 / 12</div>
 </div>
 </div>
 </>
 ) : (
 <div className="col-span-3 text-center text-slate-800 py-4 bg-white rounded border border-slate-300 border-dashed">
 No active network topology elements mapped.
 </div>
 )}
 </div>

 {/* OLT PON Ports Matrix */}
 {records.length > 0 && (
 <div className="border-t border-slate-200 pt-3">
 <div className="text-xs font-bold text-slate-900 mb-2">OLT 8-Port PON Optical Signal Dashboard:</div>
 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-[11px]">
 {[
 { port: 'PON 1', dbm: '-18.2', ONUs: '42', status: 'Optimal' },
 { port: 'PON 2', dbm: '-19.1', ONUs: '38', status: 'Optimal' },
 { port: 'PON 3', dbm: '-20.4', ONUs: '45', status: 'Good' },
 { port: 'PON 4', dbm: '-21.8', ONUs: '50', status: 'Check' },
 { port: 'PON 5', dbm: '-18.9', ONUs: '36', status: 'Optimal' },
 { port: 'PON 6', dbm: '-19.6', ONUs: '41', status: 'Optimal' },
 { port: 'PON 7', dbm: '-22.5', ONUs: '48', status: 'Check' },
 { port: 'PON 8', dbm: '-17.8', ONUs: '42', status: 'Optimal' },
 ].map((p) => (
 <div key={p.port} className="bg-white p-2 rounded border border-slate-300 text-center space-y-0.5">
 <div className="font-bold text-[#3c8dbc]">{p.port}</div>
 <div className={Number(p.dbm.replace('-', '')) > 21 ? 'text-amber-400 font-bold' : 'text-[#00a65a] font-bold'}>
 {p.dbm} dBm
 </div>
 <div className="text-[10px] text-slate-800">{p.ONUs} ONUs</div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* 4. Leave Management Panel */}
 {pageId === 'leave-management' && (
 <div className="bg-white border border-emerald-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-[#00a65a] flex items-center gap-2">
 <CalendarDays className="w-4 h-4 text-[#00a65a]" />
 <span>Employee Leave Balance & Request Manager</span>
 </h3>
 <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
 Annual Policy 2026
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
 {records.length > 0 ? (
 <>
 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-slate-800 font-medium">Casual Leave (CL)</div>
 <div className="text-lg font-black text-sky-400">12 Days Remaining</div>
 <div className="text-[10px] text-slate-800">Max 14 Days / Year</div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-slate-800 font-medium">Sick Leave (SL)</div>
 <div className="text-lg font-black text-[#00a65a]">10 Days Remaining</div>
 <div className="text-[10px] text-slate-800">Max 14 Days / Year</div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-slate-800 font-medium">Earned Leave (EL)</div>
 <div className="text-lg font-black text-purple-400">15 Days Accumulated</div>
 <div className="text-[10px] text-slate-800">Encashable at Year End</div>
 </div>
 </>
 ) : (
 <div className="col-span-3 text-center text-slate-800 py-4 bg-white rounded border border-slate-300 border-dashed">
 No leave records exist for the current period.
 </div>
 )}
 </div>
 </div>
 )}

 {/* 5. MAC Reseller Panel */}
 {pageId === 'mac-reseller' && (
 <div className="bg-white border border-sky-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
 <UserCheck className="w-4 h-4 text-sky-400" />
 <span>Sub-Reseller Management & Credit Recharge Portal</span>
 </h3>
 <span className="text-xs bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-500/30 font-mono">
 Resellers Active: {records.length > 0 ? '2' : '0'}
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
 {records.length > 0 ? (
 <>
 <div className="bg-white border border-slate-300 p-4 rounded-lg space-y-2">
 <div className="flex items-center justify-between font-bold text-sky-400">
 <span>Uttara Network Reseller</span>
 <span className="text-[10px] bg-emerald-500/20 text-[#00a65a] px-2 py-0.5 rounded">Active</span>
 </div>
 <div className="text-slate-900 text-[11px] space-y-1">
 <div>• Reseller Credit Balance: <span className="text-[#00a65a] font-bold">৳50,000</span></div>
 <div>• Total Subscribers Managed: 42 Clients</div>
 <div>• Wholesale Bandwidth Tariff: ৳350 / 10 Mbps</div>
 </div>
 <button
 onClick={() => showToast('Added ৳10,000 Credit to Uttara Network Reseller!', 'success')}
 className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-xs cursor-pointer"
 >
 + Top-Up ৳10,000 Credit
 </button>
 </div>

 <div className="bg-white border border-slate-300 p-4 rounded-lg space-y-2">
 <div className="flex items-center justify-between font-bold text-purple-400">
 <span>Mirpur SpeedNet Reseller</span>
 <span className="text-[10px] bg-emerald-500/20 text-[#00a65a] px-2 py-0.5 rounded">Active</span>
 </div>
 <div className="text-slate-900 text-[11px] space-y-1">
 <div>• Reseller Credit Balance: <span className="text-[#00a65a] font-bold">৳25,000</span></div>
 <div>• Total Subscribers Managed: 18 Clients</div>
 <div>• Wholesale Bandwidth Tariff: ৳380 / 10 Mbps</div>
 </div>
 <button
 onClick={() => showToast('Added ৳5,000 Credit to Mirpur SpeedNet Reseller!', 'success')}
 className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-xs cursor-pointer"
 >
 + Top-Up ৳5,000 Credit
 </button>
 </div>
 </>
 ) : (
 <div className="col-span-2 text-center text-slate-800 py-4 bg-white rounded border border-slate-300 border-dashed">
 No active sub-resellers registered yet.
 </div>
 )}
 </div>
 </div>
 )}

 {/* 6. Events & Holidays Panel */}
 {pageId === 'events-holidays' && (
 <div className="bg-white border border-indigo-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
 <Calendar className="w-4 h-4 text-indigo-400" />
 <span>ISP Calendar, Public Holidays & Maintenance Maintenance Schedules</span>
 </h3>
 <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-mono">
 Year 2026
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
 {records.length > 0 ? (
 <>
 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-2">
 <div className="font-bold text-indigo-300 flex items-center justify-between">
 <span>Independence Day Holiday</span>
 <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">26 March 2026</span>
 </div>
 <p className="text-slate-800 text-[11px]">
 Support desk on emergency helpline rotation. Billing desk closed.
 </p>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-2">
 <div className="font-bold text-amber-300 flex items-center justify-between">
 <span>Planned Core Router Maintenance</span>
 <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">25 August 2026</span>
 </div>
 <p className="text-slate-800 text-[11px]">
 Scheduled 2:00 AM - 5:00 AM low-traffic window firmware update on Core Mikrotik CCR.
 </p>
 <button
 onClick={() => showToast('Emergency Maintenance Broadcast SMS queued for 1,240 subscribers!', 'info')}
 className="w-full py-1 bg-amber-500 text-slate-950 font-bold rounded text-[11px] cursor-pointer"
 >
 Broadcast Maintenance SMS to Clients
 </button>
 </div>
 </>
 ) : (
 <div className="col-span-2 text-center text-slate-800 py-4 bg-white rounded border border-slate-300 border-dashed">
 No upcoming events or holidays scheduled.
 </div>
 )}
 </div>
 </div>
 )}

 {/* 7. Support & Ticketing Panel */}
 {pageId === 'support-ticketing' && (
 <div className="bg-white border border-rose-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
 <Headphones className="w-4 h-4 text-rose-400" />
 <span>Customer Support Desk & Field Technician Dispatch SLA</span>
 </h3>
 <span className="text-xs bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30 font-mono">
 Average SLA: 42 Mins
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-slate-800 font-medium">Critical Red LOS Light</div>
 <div className="text-lg font-black text-rose-400">1 Urgent Ticket</div>
 <div className="text-[10px] text-rose-300">Damaged cable near Main Road</div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-slate-800 font-medium">Speed Complaint</div>
 <div className="text-lg font-black text-amber-400">1 Ticket In Progress</div>
 <div className="text-[10px] text-amber-300">Checking Router MTU / Queue</div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-slate-800 font-medium">Resolved Today</div>
 <div className="text-lg font-black text-[#00a65a]">8 Tickets Cleared</div>
 <div className="text-[10px] text-emerald-300">100% Client Satisfaction</div>
 </div>
 </div>
 </div>
 )}

 {/* 8. Task Management Panel */}
 {pageId === 'task-management' && (
 <div className="bg-white border border-blue-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
 <CheckSquare className="w-4 h-4 text-blue-400" />
 <span>Field Lineman & Fiber Splicing Task Execution Board</span>
 </h3>
 <span className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30 font-mono">
 Technicians Dispatched: 2
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
 <div className="bg-white border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="flex items-center justify-between font-bold text-amber-400">
 <span>[TSK-501] Fiber Cable Splice at Zone 3</span>
 <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">In Progress</span>
 </div>
 <div className="text-slate-900 text-[11px] space-y-1">
 <div>• Assigned: Mehedi Hasan (Field Tech)</div>
 <div>• Material Used: 120m Fiber Cable, 2 Joint Enclosures</div>
 <div>• Target Completion: Today 4:00 PM</div>
 </div>
 <button
 onClick={() => showToast('Task TSK-501 marked as Verified & Completed!', 'success')}
 className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs cursor-pointer"
 >
 Mark Task Completed & Verified
 </button>
 </div>

 <div className="bg-white border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="flex items-center justify-between font-bold text-[#00a65a]">
 <span>[TSK-502] Power Adapter Replacement POP 2</span>
 <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">Done</span>
 </div>
 <div className="text-slate-900 text-[11px] space-y-1">
 <div>• Assigned: Tanvir Hossain</div>
 <div>• Material Used: 12V 5A High Power Adapter</div>
 <div>• Status: Completed & Voltage Tested</div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* 9. Bandwidth Buy Panel */}
 {pageId === 'bandwidth-buy' && (
 <div className="bg-white border border-cyan-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-[#3c8dbc] flex items-center gap-2">
 <TrendingUp className="w-4 h-4 text-[#3c8dbc]" />
 <span>Upstream IIG Bandwidth Procurement & BGP Link Monitor</span>
 </h3>
 <span className="text-xs bg-cyan-500/20 text-[#3c8dbc] px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-mono">
 Total Upstream: 10 Gbps Link
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
 <div className="bg-white border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="flex items-center justify-between font-bold text-sky-400">
 <span>BSCCL Submarine Cable Upstream</span>
 <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">BGP Established</span>
 </div>
 <div className="text-slate-900 text-[11px] space-y-1">
 <div>• Capacity: 10 Gbps Dedicated Line</div>
 <div>• Monthly Cost: ৳1,80,000 / mo</div>
 <div>• Latency to Singapore: 22.4 ms</div>
 </div>
 </div>

 <div className="bg-white border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="flex items-center justify-between font-bold text-[#00a65a]">
 <span>Tata Communications IP Transit</span>
 <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">Active Subnet</span>
 </div>
 <div className="text-slate-900 text-[11px] space-y-1">
 <div>• IP Subnet: 103.140.88.0/24 (256 Public IPs)</div>
 <div>• Monthly Cost: ৳45,000 / mo</div>
 <div>• Latency to India BGP: 18.1 ms</div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* 10. Bandwidth Sale Panel */}
 {pageId === 'bandwidth-sale' && (
 <div className="bg-white border border-teal-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
 <Tag className="w-4 h-4 text-teal-400" />
 <span>Corporate SLA Bandwidth Wholesale & BDIX Peering Sales</span>
 </h3>
 <span className="text-xs bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30 font-mono">
 Peering Sales: ৳1,15,000 / mo
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
 <div className="bg-white border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="flex items-center justify-between font-bold text-teal-300">
 <span>City Bank BDIX Peering SLA</span>
 <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">2 Gbps Link</span>
 </div>
 <div className="text-slate-900 text-[11px] space-y-1">
 <div>• Contract: Dedicated BDIX Peering Feed</div>
 <div>• Monthly Revenue: ৳65,000 / mo</div>
 <div>• Peak Usage: 1.82 Gbps (91%)</div>
 </div>
 </div>

 <div className="bg-white border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="flex items-center justify-between font-bold text-sky-300">
 <span>Local Cable Operator Sub-ISP Feed</span>
 <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">1.5 Gbps Feed</span>
 </div>
 <div className="text-slate-900 text-[11px] space-y-1">
 <div>• Contract: Shared Wholesale Feed</div>
 <div>• Monthly Revenue: ৳50,000 / mo</div>
 <div>• Peak Usage: 1.25 Gbps (83%)</div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* 11. Purchase Panel */}
 {pageId === 'purchase' && (
 <div className="bg-white border border-violet-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-violet-400 flex items-center gap-2">
 <ShoppingCart className="w-4 h-4 text-violet-400" />
 <span>Procurement Requisitions & Hardware Purchase Orders</span>
 </h3>
 <span className="text-xs bg-violet-500/20 text-violet-300 px-2.5 py-0.5 rounded-full border border-violet-500/30 font-mono">
 Pending Requisitions: 1
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
 <div className="bg-white border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="flex items-center justify-between font-bold text-violet-300">
 <span>[PUR-901] 24-Core Fiber Cable Drums</span>
 <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">Delivered</span>
 </div>
 <div className="text-slate-900 text-[11px] space-y-1">
 <div>• Vendor: FiberFox Bangladesh Ltd.</div>
 <div>• Quantity: 10 Drums (10,000 meters)</div>
 <div>• Total Cost: ৳85,000</div>
 </div>
 </div>

 <div className="bg-white border border-slate-300 p-3.5 rounded-lg space-y-2">
 <div className="flex items-center justify-between font-bold text-amber-300">
 <span>[PUR-902] AC1200 Dual Band Routers</span>
 <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">Pending Approval</span>
 </div>
 <div className="text-slate-900 text-[11px] space-y-1">
 <div>• Vendor: TP-Link Official Distributor</div>
 <div>• Quantity: 100 Units</div>
 <div>• Estimated Cost: ৳1,20,000</div>
 </div>
 <button
 onClick={() => showToast('Purchase Order PUR-902 Approved! Sent to Supplier.', 'success')}
 className="w-full py-1.5 bg-amber-500 text-slate-950 font-bold rounded text-xs cursor-pointer"
 >
 Approve Requisition Order
 </button>
 </div>
 </div>
 </div>
 )}

 {/* 12. Inventory Panel */}
 {pageId === 'inventory' && (
 <div className="bg-white border border-teal-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
 <Boxes className="w-4 h-4 text-teal-400" />
 <span>Central Warehouse Stock Store & Consumable Inventory</span>
 </h3>
 <span className="text-xs bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30 font-mono">
 Warehouse: Central Store
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-2">
 <div className="flex justify-between font-bold text-sky-400">
 <span>GPON Single-Band ONU</span>
 <span>85 Units</span>
 </div>
 <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
 <div className="bg-sky-400 h-full w-[85%]"></div>
 </div>
 <div className="text-[10px] text-slate-800">Stock Status: Optimal</div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-2">
 <div className="flex justify-between font-bold text-[#00a65a]">
 <span>SC/UPC Patch Cords (3m)</span>
 <span>450 Pcs</span>
 </div>
 <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
 <div className="bg-emerald-400 h-full w-[90%]"></div>
 </div>
 <div className="text-[10px] text-slate-800">Stock Status: High</div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-2">
 <div className="flex justify-between font-bold text-amber-400">
 <span>10G SFP Transceivers</span>
 <span>16 Pcs</span>
 </div>
 <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
 <div className="bg-amber-400 h-full w-[40%]"></div>
 </div>
 <div className="text-[10px] text-amber-400 font-bold">Low Stock Alert! Reorder Soon</div>
 </div>
 </div>
 </div>
 )}

 {/* 13. Assets Panel */}
 {pageId === 'assets' && (
 <div className="bg-white border border-blue-500/30 rounded p-5 text-slate-800 space-y-4 shadow-lg">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
 <Building className="w-4 h-4 text-blue-400" />
 <span>Capital Equipment Asset Register & Health Maintenance</span>
 </h3>
 <span className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30 font-mono">
 Total Assets Value: {records.length > 0 ? '৳3,45,000' : '৳0'}
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
 {records.length > 0 ? (
 <>
 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-sky-400 font-bold">Mikrotik CCR1036-12G-4S+</div>
 <div className="text-slate-900 text-[11px]">Valuation: ৳1,50,000</div>
 <div className="text-[10px] text-[#00a65a] font-bold">• Core Rack Mounted (Healthy)</div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-purple-400 font-bold">Fusion Splicing Machine</div>
 <div className="text-slate-900 text-[11px]">Valuation: ৳1,10,000</div>
 <div className="text-[10px] text-[#00a65a] font-bold">• Model 60S+ (Calibration Good)</div>
 </div>

 <div className="bg-white p-3.5 rounded-lg border border-slate-300 space-y-1">
 <div className="text-amber-400 font-bold">OTDR Optical Testing Meter</div>
 <div className="text-slate-900 text-[11px]">Valuation: ৳85,000</div>
 <div className="text-[10px] text-[#00a65a] font-bold">• 1310/1550nm (Battery 88%)</div>
 </div>
 </>
 ) : (
 <div className="col-span-3 text-center text-slate-800 py-4 bg-white rounded border border-slate-300 border-dashed">
 No active capital assets found in register.
 </div>
 )}
 </div>
 </div>
 )}

 {/* Main Data Table View */}
 <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
 <div className="p-4 border-b border-slate-200 flex items-center justify-between">
 <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
 <span>{currentModule.title} Records</span>
 <span className="text-xs bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-800 font-mono font-bold">
 Showing {filteredRecords.length} of {records.length}
 </span>
 </h3>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-xs text-left text-slate-900 ">
 <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200 ">
 <tr>
 <th className="px-4 py-3">Record ID</th>
 <th className="px-4 py-3">Title / Name</th>
 <th className="px-4 py-3">Category</th>
 <th className="px-4 py-3">Details</th>
 <th className="px-4 py-3">Value / Cost</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200 ">
 {filteredRecords.length === 0 ? (
 <tr>
 <td colSpan={7} className="px-4 py-8 text-center text-slate-800">
 No entries found matching your search or filter.
 </td>
 </tr>
 ) : (
 filteredRecords.map((item) => (
 <tr key={item.id} className="hover:bg-slate-50 transition-colors">
 <td className="px-4 py-3 font-mono font-bold text-cyan-600 ">{item.id}</td>
 <td className="px-4 py-3 font-bold text-slate-900 ">{item.name}</td>
 <td className="px-4 py-3">
 <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded font-semibold text-[11px]">
 {item.category}
 </span>
 </td>
 <td className="px-4 py-3 font-mono text-slate-900 max-w-xs truncate">
 {item.details}
 </td>
 <td className="px-4 py-3 font-bold text-emerald-600 font-mono">
 {item.value}
 </td>
 <td className="px-4 py-3">
 <button
 onClick={() => handleToggleStatus(item.id)}
 className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${
 item.status === 'Active'
 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20'
 : item.status === 'Pending'
 ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20'
 : 'bg-slate-500/10 text-slate-800 border border-slate-500/30 hover:bg-slate-500/20'
 }`}
 title="Click to toggle status"
 >
 {item.status}
 </button>
 </td>
 <td className="px-4 py-3 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <button
 onClick={() => setEditingRecord(item)}
 className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer transition-colors"
 title="Edit record"
 >
 <Edit3 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => handleDeleteRecord(item.id)}
 className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded font-bold cursor-pointer transition-colors"
 title="Delete record"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Add Entry Modal */}
 {isAddModalOpen && (
 <div className="fixed inset-0 z-[200] bg-white backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded max-w-md w-full p-5 space-y-4 shadow-md">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
 <Plus className="w-5 h-5 text-cyan-500" />
 <span>Add Record in {currentModule.title}</span>
 </h3>
 <button
 onClick={() => setIsAddModalOpen(false)}
 className="p-1 rounded-lg text-slate-800 hover:bg-slate-100 cursor-pointer"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleAddRecord} className="space-y-3 text-xs">
 <div>
 <label className="block text-slate-700 font-bold mb-1">
 Title / Name *
 </label>
 <input
 type="text"
 required
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 placeholder="e.g. Core Fiber Joint #4 or Monthly Invoice"
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-slate-700 font-bold mb-1">
 Category
 </label>
 <input
 type="text"
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
 placeholder="e.g. Fiber Core, Billing, Support"
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-slate-700 font-bold mb-1">
 Value / Amount
 </label>
 <input
 type="text"
 value={formData.value}
 onChange={(e) => setFormData({ ...formData, value: e.target.value })}
 placeholder="e.g. ৳15,000 or 50 Units"
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div>
 <label className="block text-slate-700 font-bold mb-1">
 Description / Details
 </label>
 <textarea
 rows={3}
 value={formData.details}
 onChange={(e) => setFormData({ ...formData, details: e.target.value })}
 placeholder="Additional specification, address, or remarks..."
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-slate-700 font-bold mb-1">
 Status
 </label>
 <select
 value={formData.status}
 onChange={(e) =>
 setFormData({ ...formData, status: e.target.value as 'Active' | 'Pending' | 'Archived' })
 }
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="Active">Active</option>
 <option value="Pending">Pending</option>
 <option value="Archived">Archived</option>
 </select>
 </div>

 <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setIsAddModalOpen(false)}
 className="px-3.5 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-extrabold cursor-pointer shadow-md"
 >
 Save Record
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Edit Entry Modal */}
 {editingRecord && (
 <div className="fixed inset-0 z-[200] bg-white backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded max-w-md w-full p-5 space-y-4 shadow-md">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
 <Edit3 className="w-5 h-5 text-cyan-500" />
 <span>Edit Record ({editingRecord.id})</span>
 </h3>
 <button
 onClick={() => setEditingRecord(null)}
 className="p-1 rounded-lg text-slate-800 hover:bg-slate-100 cursor-pointer"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleUpdateRecord} className="space-y-3 text-xs">
 <div>
 <label className="block text-slate-700 font-bold mb-1">
 Title / Name
 </label>
 <input
 type="text"
 required
 value={editingRecord.name}
 onChange={(e) => setEditingRecord({ ...editingRecord, name: e.target.value })}
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-slate-700 font-bold mb-1">
 Category
 </label>
 <input
 type="text"
 value={editingRecord.category}
 onChange={(e) => setEditingRecord({ ...editingRecord, category: e.target.value })}
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-slate-700 font-bold mb-1">
 Value / Amount
 </label>
 <input
 type="text"
 value={editingRecord.value}
 onChange={(e) => setEditingRecord({ ...editingRecord, value: e.target.value })}
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div>
 <label className="block text-slate-700 font-bold mb-1">
 Description / Details
 </label>
 <textarea
 rows={3}
 value={editingRecord.details}
 onChange={(e) => setEditingRecord({ ...editingRecord, details: e.target.value })}
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-slate-700 font-bold mb-1">
 Status
 </label>
 <select
 value={editingRecord.status}
 onChange={(e) =>
 setEditingRecord({
 ...editingRecord,
 status: e.target.value as 'Active' | 'Pending' | 'Archived',
 })
 }
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="Active">Active</option>
 <option value="Pending">Pending</option>
 <option value="Archived">Archived</option>
 </select>
 </div>

 <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setEditingRecord(null)}
 className="px-3.5 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-extrabold cursor-pointer shadow-md"
 >
 Update Record
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
