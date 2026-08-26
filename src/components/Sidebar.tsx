import React from 'react';
import { PageId, AppSettings } from '../types';
import {
 LayoutDashboard,
 Settings as SettingsIcon,
 Users,
 CreditCard,
 Server,
 ShieldCheck,
 Briefcase,
 Share2,
 CalendarDays,
 UserCheck,
 Calendar,
 Headphones,
 CheckSquare,
 TrendingUp,
 Tag,
 Boxes,
 Building,
 Tags,
 Gauge,
 Wifi,
 BarChart2,
 Bell,
 History,
 Phone,
 MessageSquare,
 Radio,
 Sparkles,
 Zap,
} from 'lucide-react';

interface SidebarProps {
 currentPage: PageId;
 onNavigate: (page: PageId) => void;
 isOpen: boolean;
 onClose: () => void;
 unreadNotifications: number;
 settings: AppSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
 currentPage,
 onNavigate,
 isOpen,
 onClose,
 unreadNotifications,
 settings,
}) => {
 // Core System Sections
 const coreMenuItems: { id: PageId; label: string; icon: React.ElementType; badge?: number }[] = [
 { id: 'dashboard', label: 'FlowForge Dashboard', icon: LayoutDashboard },
 { id: 'clients', label: 'Client Management', icon: Users },
 { id: 'packages', label: 'Packages & Bandwidth', icon: Tags },
 { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
 { id: 'subscriptions', label: 'Subscriptions & Renewals', icon: CalendarDays },
 { id: 'invoices', label: 'Official Invoices & Print', icon: Building },
 ];

 const networkMenuItems: { id: PageId; label: string; icon: React.ElementType }[] = [
 { id: 'mikrotik-management', label: 'MikroTik Management', icon: Server },
 { id: 'live-bandwidth', label: 'Live Bandwidth Monitor', icon: Gauge },
 { id: 'network-map', label: 'Network & Fiber GIS Map', icon: Share2 },
 { id: 'hotspot', label: 'Hotspot Management', icon: Wifi },
 { id: 'mikrotik-security', label: 'DNS Security & Firewall', icon: ShieldCheck },
 ];

 const supportOpsMenuItems: { id: PageId; label: string; icon: React.ElementType }[] = [
 { id: 'support-tickets', label: 'Support Desk & Tickets', icon: Headphones },
 { id: 'sms-notifications', label: 'SMS & Multi-Channel Alerts', icon: MessageSquare },
 { id: 'expenses', label: 'Expense & Profit Ledger', icon: TrendingUp },
 { id: 'inventory', label: 'Inventory & Equipment', icon: Boxes },
 ];

 const ispDigitalModules: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: 'configuration', label: 'Configuration', icon: SettingsIcon },
  ]

 const systemMenuItems: { id: PageId; label: string; icon: React.ElementType; badge?: number }[] = [
 { id: 'reports', label: 'Financial & Client Reports', icon: BarChart2 },
 { id: 'security', label: 'Security, 2FA & Backup', icon: ShieldCheck },
 { id: 'admin-profile', label: 'Admin Profile & Devices', icon: Users },
 { id: 'notifications', label: 'Alerts & Orders', icon: Bell, badge: unreadNotifications },
 { id: 'audit', label: 'System Audit Logs', icon: History },
 { id: 'settings', label: 'System Settings', icon: SettingsIcon },
 ];

 const renderLink = (item: { id: PageId; label: string; icon: React.ElementType; badge?: number }) => {
 const Icon = item.icon;
 const isActive = currentPage === item.id;
 return (
 <button
 key={item.id}
 type="button"
 onClick={() => {
 onNavigate(item.id);
 onClose();
 }}
 className={`w-full flex items-center gap-3 px-4 py-3 rounded-none text-xs font-semibold transition-all mb-1 cursor-pointer text-left ${
 isActive
 ? 'bg-[#1e282c] text-white font-semibold border-l-4 border-[#3c8dbc]'
 : 'text-[#b8c7ce] hover:bg-[#1e282c] hover:text-white border-l-4 border-transparent'
 }`}
 >
 <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-slate-800' : 'text-[#b8c7ce]'}`} />
 <span className="flex-1 truncate">{item.label}</span>
 {item.badge !== undefined && item.badge > 0 && (
 <span className="bg-[#00c0ef] text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ml-auto shadow-xs">
 {item.badge}
 </span>
 )}
 </button>
 );
 };

 return (
 <>
 {/* Mobile Backdrop */}
 {isOpen && (
 <div
 onClick={onClose}
 className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs z-[999] lg:hidden"
 />
 )}

 <aside
 className={`fixed top-0 left-0 h-screen w-[270px] bg-[#222d32] border-r-0 z-[1000] overflow-y-auto transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${
 isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
 }`}
 >
 {/* FlowForge Brand Header */}
 <div className="p-4 border-b-0 bg-[#367fa9] text-white flex items-center justify-between">
 <div className="flex items-center gap-2.5 overflow-hidden">
 <div className="w-10 h-10 rounded-none bg-white/20 flex items-center justify-center text-slate-800 font-black shadow-lg shadow-indigo-500/20 shrink-0 overflow-hidden text-sm">
 {settings.logo ? (
 <img src={settings.logo} alt="Logo" className="w-full h-full object-contain p-0.5" />
 ) : (
 <Zap className="w-5 h-5 text-slate-800" />
 )}
 </div>
 <div className="truncate">
 <div className="flex items-center gap-1.5">
 <h1 className="text-sm font-bold text-slate-800 tracking-tight truncate">
 {settings.appName || 'FlowForge ISP'}
 </h1>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
 <span className="text-[10px] text-blue-100 font-mono font-semibold tracking-wider">
 FLOWFORGE OS v2.5
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Menu Navigation */}
 <nav className="p-3 flex-1 overflow-y-auto space-y-4">
 {/* Section 1: Core System */}
 <div>
 <div className="text-[10px] uppercase tracking-wider text-[#b8c7ce] px-3 pb-1.5 font-bold font-mono flex items-center justify-between">
 <span>CORE WORKSPACE</span>
 <span className="text-[9px] bg-[#00c0ef]/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono">PRIMARY</span>
 </div>
 {coreMenuItems.map(renderLink)}
 </div>

 {/* Section 2: Network & Live Traffic */}
 <div className="pt-2 ">
 <div className="text-[10px] uppercase tracking-wider text-[#b8c7ce] px-3 pb-1.5 font-bold font-mono">
 NETWORK &amp; INFRA
 </div>
 {networkMenuItems.map(renderLink)}
 </div>

 {/* Section 3: Support, SMS & Expenses */}
 <div className="pt-2 ">
 <div className="text-[10px] uppercase tracking-wider text-[#b8c7ce] px-3 pb-1.5 font-bold font-mono">
 SUPPORT &amp; OPERATIONS
 </div>
 {supportOpsMenuItems.map(renderLink)}
 </div>

 {/* Section 4: ISP Digital ERP Modules */}
 <div className="pt-2 ">
 <div className="text-[10px] uppercase tracking-wider text-[#b8c7ce] px-3 pb-1.5 font-bold font-mono flex items-center justify-between">
 <span>DIGITAL ERP</span>
 <span className="text-[9px] bg-gray-600 text-white px-1.5 py-0.2 rounded font-mono">9 MODULES</span>
 </div>
 {ispDigitalModules.map(renderLink)}
 </div>

 {/* Section 5: Reports & Admin Security */}
 <div className="pt-2 ">
 <div className="text-[10px] uppercase tracking-wider text-[#b8c7ce] px-3 pb-1.5 font-bold font-mono">
 REPORTS &amp; AUDIT
 </div>
 {systemMenuItems.map(renderLink)}
 </div>
 </nav>

 {/* Sidebar Footer with Status Pill */}
 <div className="p-3.5 bg-[#1a2226] space-y-2 text-xs text-slate-800">
 <div className="p-2 rounded-none bg-[#222d32] border border-[#1a2226] flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
 <span className="text-[11px] font-bold text-slate-900">MikroTik Cloud</span>
 </div>
 <span className="text-[10px] font-mono font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md">
 LIVE
 </span>
 </div>

 <div className="flex items-center justify-between text-[10px] text-[#b8c7ce] font-mono pt-1">
 <span>Support: {settings.phone}</span>
 </div>
 </div>
 </aside>
 </>
 );
};
