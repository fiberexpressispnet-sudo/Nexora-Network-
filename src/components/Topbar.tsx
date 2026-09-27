import React, { useState } from 'react';
import { PageId, AppSettings, Client } from '../types';
import {
 Menu,
 Bell,
 Search,
 Activity,
 HelpCircle,
 User,
 ExternalLink,
 DollarSign,
 ArrowLeft,
 Lock,
 Plus,
 CreditCard,
 MapPin,
 FileSpreadsheet,
 Zap,
} from 'lucide-react';

interface TopbarProps {
 currentPage: PageId;
 onToggleSidebar: () => void;
 onNavigate: (page: PageId) => void;
 onGoBack?: () => void;
 unreadCount: number;
 isDark: boolean;
 onToggleTheme: () => void;
 settings?: AppSettings;
 clients?: Client[];
 onLock?: () => void;
 onOpenBillingModal?: () => void;
 onOpenImportWizard?: () => void;
 onOpenTownView?: () => void;
}

const pageTitles: Record<PageId, string> = {
 dashboard: 'FlowForge Dashboard',
 configuration: 'Configuration',
 clients: 'Client Management',
 billing: 'Billing & Invoicing',
 payments: 'Payments & Collections',
 subscriptions: 'Subscriptions & Renewals',
 'live-bandwidth': 'Live Bandwidth & MRTG',
 'support-tickets': 'Support Desk & Tickets',
 'sms-notifications': 'SMS & Multi-Channel Alerts',
 expenses: 'Expense & Profit Ledger',
 'network-map': 'Network & Fiber GIS Map',
 security: 'Security, 2FA & Backup',
 invoices: 'Customer Invoices & Print',
 'admin-profile': 'Admin Profile & Sessions',
 'mikrotik-configure': 'Mikrotik Server',
 'mikrotik-management': 'Mikrotik Management',
 'olt-management': 'OLT & PON Operations',
 'mikrotik-security': 'Mikrotik Security',
 'libreqos-integration': 'LibreQoS Traffic & QoE Engine',
 'network-diagram': 'Network Diagram',
 'support-ticketing': 'Support & Ticketing',
 purchase: 'Purchase & Procurement',
 inventory: 'Inventory & Stock',
 packages: 'Packages',
 bandwidth: 'Bandwidth Profiles',
 'days-profile': 'Days Profiles',
 hotspot: 'Hotspot',
 'hotspot-config': 'Hotspot Portal Config',
 reports: 'Reports & Analytics',
 notifications: 'Notifications',
 audit: 'Audit Logs',
 settings: 'System Settings',
};

export const Topbar: React.FC<TopbarProps> = ({
 currentPage,
 onToggleSidebar,
 onNavigate,
 onGoBack,
 unreadCount,
 settings,
 clients = [],
 onLock,
 onOpenBillingModal,
 onOpenImportWizard,
 onOpenTownView,
}) => {
 const title = pageTitles[currentPage] || 'Dashboard';
 const [searchTerm, setSearchTerm] = useState('');

 const filteredSearchClients = searchTerm
 ? clients.filter(
 (c) =>
 c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 c.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
 c.phone.includes(searchTerm)
 )
 : [];

 return (
 <header className="sticky top-0 z-[100] bg-[#3c8dbc] text-white px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-lg">
 {/* Left Title & Mobile Menu Toggle */}
 <div className="flex items-center gap-2 sm:gap-3 shrink-0">
 <button
 onClick={onToggleSidebar}
 className="p-2 rounded text-slate-800 hover:bg-[#367fa9] transition-colors cursor-pointer"
 aria-label="Toggle menu"
 >
 <Menu className="w-5 h-5" />
 </button>

 {currentPage !== 'dashboard' && onGoBack && (
 <button
 onClick={onGoBack}
 className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#367fa9] hover:bg-[#2b6688] text-white font-bold text-xs rounded border border-[#367fa9] transition-all cursor-pointer shadow-xs"
 title="Go Back to Previous Page"
 >
 <ArrowLeft className="w-4 h-4" />
 <span className="hidden sm:inline">Back</span>
 </button>
 )}

 <div className="flex items-center gap-2">
 {settings?.logo && (
 <img src={settings.logo} alt="Logo" className="w-7 h-7 object-contain rounded-md" />
 )}
 <div>
 <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight flex items-center gap-2">
 <span>{title}</span>
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white border border-blue-500 font-mono font-normal hidden md:inline">
 FlowForge Workspace
 </span>
 </h1>
 </div>
 </div>
 </div>

 {/* FlowForge Global Search Input */}
 <div className="hidden lg:flex items-center relative max-w-sm w-full mx-4">
 <div className="relative w-full">
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Search member ID, name, phone..."
 className="w-full bg-white/10 border border-white/20 rounded pl-9 pr-14 py-1.5 text-xs text-slate-800 placeholder-blue-200 focus:outline-none focus:border-white focus:bg-white focus:text-slate-800 focus:placeholder-slate-400 font-medium transition-colors shadow-inner"
 />
 <Search className="w-4 h-4 text-slate-800 absolute left-3 top-2" />
 <span className="absolute right-2.5 top-1.5 text-[10px] font-mono font-bold bg-slate-50 border border-slate-300 px-1.5 py-0.5 rounded text-slate-800">
 ⌘K
 </span>
 </div>

 {/* Dropdown search results */}
 {searchTerm && (
 <div className="absolute top-10 left-0 right-0 bg-white border border-slate-300 rounded shadow-2xl overflow-hidden z-[110] max-h-64 overflow-y-auto">
 {filteredSearchClients.length === 0 ? (
 <div className="p-4 text-xs text-slate-800 text-center">No subscribers found matching search query</div>
 ) : (
 filteredSearchClients.map((client, idx) => (
 <div
 key={client.id ? `${client.id}-${idx}` : idx}
 onClick={() => {
 onNavigate('clients');
 setSearchTerm('');
 }}
 className="p-3 hover:bg-slate-100 border-b border-slate-200 cursor-pointer flex items-center justify-between text-xs transition-colors"
 >
 <div>
 <div className="font-bold text-slate-800 flex items-center gap-2">
 <span>{client.name}</span>
 <span className="text-[10px] text-indigo-300 font-mono">({client.userId})</span>
 </div>
 <div className="text-[10px] text-slate-800 font-mono mt-0.5">
 {client.phone} • {client.package} ({client.bandwidth})
 </div>
 </div>
 <span
 className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
 client.status === 'online'
 ? 'bg-emerald-500/20 text-emerald-300'
 : 'bg-rose-500/20 text-rose-300'
 }`}
 >
 {client.status}
 </span>
 </div>
 ))
 )}
 </div>
 )}
 </div>

 {/* Right Quick Action Header Buttons */}
 <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs">
 {/* FlowForge Quick Town View Trigger */}
 {onOpenTownView && (
 <button
 type="button"
 onClick={onOpenTownView}
 className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-900 hover:text-white font-bold transition-all cursor-pointer"
 title="Town & Zone Filter"
 >
 <MapPin className="w-3.5 h-3.5 text-indigo-400" />
 <span>Town View</span>
 </button>
 )}

 {/* FlowForge Quick Import Trigger */}
 {onOpenImportWizard && (
 <button
 type="button"
 onClick={onOpenImportWizard}
 className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-900 hover:text-white font-bold transition-all cursor-pointer"
 title="Import Clients from CSV/Excel"
 >
 <FileSpreadsheet className="w-3.5 h-3.5 text-[#00a65a]" />
 <span>Import</span>
 </button>
 )}

 {/* FlowForge Quick Collect Bill Button */}
 <button
 type="button"
 onClick={() => {
 if (onOpenBillingModal) {
 onOpenBillingModal();
 } else {
 onNavigate('billing');
 }
 }}
 className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/20 text-xs"
 >
 <CreditCard className="w-3.5 h-3.5" />
 <span className="hidden sm:inline">Collect Bill</span>
 <span className="sm:hidden">Bill</span>
 </button>

 {/* Notifications */}
 <button
 onClick={() => onNavigate('notifications')}
 className="relative p-2 rounded bg-slate-100 hover:bg-slate-700 text-slate-900 hover:text-white transition-colors cursor-pointer border border-slate-300/60"
 title="Notifications"
 >
 <Bell className="w-4 h-4" />
 {unreadCount > 0 && (
 <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-slate-900" />
 )}
 </button>

 {/* Lock Screen Button */}
 {onLock && (
 <button
 onClick={onLock}
 className="p-2 rounded bg-slate-100 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer border border-indigo-500/30 shadow-xs"
 title="Lock Screen"
 >
 <Lock className="w-3.5 h-3.5" />
 </button>
 )}

 {/* Profile Avatar */}
 <div
 onClick={() => onNavigate('settings')}
 className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shadow-md cursor-pointer hover:opacity-90 transition-opacity border border-indigo-400/30"
 title="Admin Profile"
 >
 A
 </div>
 </div>
 </header>
 );
};
