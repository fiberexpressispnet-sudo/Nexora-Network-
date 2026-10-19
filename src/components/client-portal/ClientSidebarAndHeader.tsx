import React, { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  User,
  Package as PackageIcon,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  FileText,
  Activity,
  Wifi,
  Radio,
  MessageSquare,
  Bot,
  Bell,
  UserCircle,
  Lock,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { Client, AppSettings, NotificationItem } from "../../types";
import { getClientExpiryInfo } from "../../lib/expiryUtils";

export type ClientNavTab =
  | "dashboard"
  | "account"
  | "my-package"
  | "renew"
  | "buy-package"
  | "payments"
  | "invoices"
  | "bandwidth"
  | "network"
  | "onu"
  | "tickets"
  | "telegram"
  | "notifications"
  | "profile"
  | "password";

interface ClientSidebarProps {
  activeTab: ClientNavTab;
  onSelectTab: (tab: ClientNavTab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  client: Client;
  settings: AppSettings;
  onLogout: () => void;
  unreadNotificationsCount: number;
}

export const ClientSidebar: React.FC<ClientSidebarProps> = ({
  activeTab,
  onSelectTab,
  sidebarOpen,
  setSidebarOpen,
  client,
  settings,
  onLogout,
  unreadNotificationsCount,
}) => {
  const expiryInfo = getClientExpiryInfo(client.expiry);
  const isExpired = expiryInfo.isExpired || client.status === "expired";
  const isSuspended = client.status === "suspended";
  const isOnline = client.status === "online" && !isExpired && !isSuspended;

  const navItems: {
    id: ClientNavTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    section?: string;
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "MAIN MENU" },
    { id: "account", label: "My Account", icon: User },
    { id: "my-package", label: "My Package", icon: PackageIcon },
    { id: "renew", label: "Renew Package", icon: RefreshCw },
    { id: "buy-package", label: "Buy Package", icon: ShoppingBag },
    { id: "payments", label: "Payment History", icon: CreditCard, section: "BILLING & FINANCE" },
    { id: "invoices", label: "Invoice", icon: FileText },
    { id: "bandwidth", label: "Live Bandwidth", icon: Activity, section: "NETWORK & FIBER" },
    { id: "network", label: "Network Status", icon: Wifi },
    { id: "onu", label: "ONU / Optical Info", icon: Radio },
    { id: "tickets", label: "Support Tickets", icon: MessageSquare, section: "SUPPORT & SETTINGS" },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { id: "profile", label: "Profile", icon: UserCircle },
    { id: "password", label: "Change Password", icon: Lock },
  ];

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[265px] bg-[#0f172a] text-slate-300 transform transition-transform duration-300 ease-in-out flex flex-col shrink-0 border-r border-slate-800/80 shadow-xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Brand Header */}
        <div className="h-16 px-5 bg-[#0b1120] border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {settings?.logo ? (
              <img
                src={settings.logo}
                alt="Nexora Logo"
                className="w-9 h-9 rounded-xl object-contain bg-white/10 p-1 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md shrink-0">
                N
              </div>
            )}
            <div className="min-w-0">
              <div className="text-white font-bold text-sm tracking-tight truncate">
                {settings?.companyName || settings?.appName || "Nexora Network ISP"}
              </div>
              <div className="text-[11px] font-medium text-blue-400 tracking-wide">
                Client Panel
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logged-in Client Mini Card */}
        <div className="p-4 mx-3 mt-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 ring-2 ring-slate-700">
            {client.photo ? (
              <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
            ) : (
              <span>{(client.name || "C").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-semibold text-xs truncate">{client.name}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">ID: {client.userId}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline
                    ? "bg-emerald-400 animate-pulse"
                    : isExpired
                      ? "bg-amber-400"
                      : "bg-rose-500"
                }`}
              />
              <span
                className={
                  isOnline
                    ? "text-emerald-400"
                    : isExpired
                      ? "text-amber-400"
                      : "text-rose-400"
                }
              >
                {isOnline ? "Active" : isExpired ? "Expired" : isSuspended ? "Suspended" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <React.Fragment key={item.id}>
                {item.section && (
                  <div className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    {item.section}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-white" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Bottom Logout Button */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0b1120]">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

interface ClientTopHeaderProps {
  client: Client;
  settings: AppSettings;
  activeTab: ClientNavTab;
  onSelectTab: (tab: ClientNavTab) => void;
  onToggleSidebar: () => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  onMarkNotificationsRead: () => void;
  lang: "EN" | "BN";
  onToggleLang: () => void;
}

export const ClientTopHeader: React.FC<ClientTopHeaderProps> = ({
  client,
  settings,
  onSelectTab,
  onToggleSidebar,
  onLogout,
  notifications,
  onMarkNotificationsRead,
  lang,
  onToggleLang,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-xs">
      {/* Left: Hamburger + Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer lg:hidden"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {settings?.companyName || settings?.appName || "Nexora Network ISP"}
          </span>
          <span className="hidden sm:inline-block text-slate-300">·</span>
          <span className="hidden sm:inline-block text-xs font-medium text-slate-500">
            Customer Self-Care Portal
          </span>
        </div>
      </div>

      {/* Right: Language, Notifications, Client Identity Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Selector */}
        <button
          type="button"
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{lang}</span>
        </button>

        {/* Notification Icon & Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen(!notifOpen);
              if (!notifOpen && unreadCount > 0) {
                onMarkNotificationsRead();
              }
            }}
            className="relative p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    onSelectTab("notifications");
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="px-4 py-2.5 hover:bg-slate-50 text-xs">
                      <p className="text-slate-800 font-medium leading-snug">{n.text}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Client Identity & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
              {client.photo ? (
                <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
              ) : (
                <span>{(client.name || "C").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                {client.name}
              </div>
              <div className="text-[10px] font-mono text-slate-500 leading-tight">
                {client.userId}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900 truncate">{client.name}</div>
                <div className="text-[11px] font-mono text-slate-500 truncate">
                  ID: {client.userId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onSelectTab("profile");
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <UserCircle className="w-4 h-4 text-slate-400" />
                <span>My Profile</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onSelectTab("account");
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>Account</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onSelectTab("password");
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Change Password</span>
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
