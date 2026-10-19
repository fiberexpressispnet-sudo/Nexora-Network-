import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Client,
  PaymentRecord,
  HotspotUser,
  HotspotPackageRequest,
  OnlinePackageOrder,
  RouterConfig,
  AppSettings,
  PageId,
  Invoice,
  MikrotikRouter,
  ExpenseItem,
} from '../../types';
import {
  Users,
  Wifi,
  WifiOff,
  UserCheck,
  UserPlus,
  UserMinus,
  UserX,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  CreditCard,
  Radio,
  Server,
  Box,
  RefreshCw,
  Calendar,
  ShieldCheck,
  Receipt,
  Eye,
  Plus,
  FileSpreadsheet,
  MapPin,
  ArrowRight,
  Bell,
  ShoppingCart,
  Sun,
  Moon,
  Activity,
  FileText,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { getClientExpiryInfo } from '../../lib/expiryUtils';
import { BillingModal } from '../flowforge/BillingModal';
import { ImportWizard } from '../flowforge/ImportWizard';
import { MemberLedgerModal } from '../flowforge/MemberLedgerModal';
import { TownViewModal } from '../flowforge/TownViewModal';

interface DashboardProps {
  clients: Client[];
  payments: PaymentRecord[];
  invoices?: Invoice[];
  routers?: MikrotikRouter[];
  adminProfile?: {
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
  };
  isDark?: boolean;
  onToggleTheme?: () => void;
  hotspotUsers: HotspotUser[];
  hotspotRequests?: HotspotPackageRequest[];
  onlineOrders?: OnlinePackageOrder[];
  routerConfig: RouterConfig;
  settings: AppSettings;
  onConnectRouter: () => void;
  onDisconnectRouter: () => void;
  onNavigate: (page: PageId) => void;
  onApproveRequest?: (id: string, createdUserId?: string) => void;
  onRejectRequest?: (id: string) => void;
  onApproveOnlineOrder?: (orderId: string) => void;
  onHardResetAll?: () => void;
  onCollectPayment?: (payment: any) => void;
  onBulkImportClients?: (clients: Client[]) => void;
}

type CardColorVariant =
  | 'cyan'
  | 'teal'
  | 'emerald'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'red'
  | 'blue'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'slate';

const CARD_THEMES: Record<
  CardColorVariant,
  {
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
    valueColor: string;
    labelColor: string;
    decorCircle: string;
  }
> = {
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-50/90 via-white to-sky-50/60',
    border: 'border-cyan-200/80 hover:border-cyan-300',
    iconBg: 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-cyan-500/10',
  },
  teal: {
    bg: 'bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/60',
    border: 'border-teal-200/80 hover:border-teal-300',
    iconBg: 'bg-teal-500 text-white shadow-sm shadow-teal-500/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-teal-500/10',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-50/90 via-white to-green-50/60',
    border: 'border-emerald-200/80 hover:border-emerald-300',
    iconBg: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-emerald-500/10',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50/90 via-white to-violet-50/60',
    border: 'border-purple-200/80 hover:border-purple-300',
    iconBg: 'bg-purple-600 text-white shadow-sm shadow-purple-600/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-purple-500/10',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-50/90 via-white to-rose-50/60',
    border: 'border-pink-200/80 hover:border-pink-300',
    iconBg: 'bg-pink-500 text-white shadow-sm shadow-pink-500/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-pink-500/10',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50/90 via-white to-amber-50/60',
    border: 'border-orange-200/80 hover:border-orange-300',
    iconBg: 'bg-orange-500 text-white shadow-sm shadow-orange-500/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-orange-500/10',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-50/90 via-white to-rose-50/60',
    border: 'border-red-200/80 hover:border-red-300',
    iconBg: 'bg-red-500 text-white shadow-sm shadow-red-500/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-red-500/10',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/60',
    border: 'border-blue-200/80 hover:border-blue-300',
    iconBg: 'bg-blue-600 text-white shadow-sm shadow-blue-600/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-blue-500/10',
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/60',
    border: 'border-indigo-200/80 hover:border-indigo-300',
    iconBg: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-indigo-500/10',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50/90 via-white to-yellow-50/60',
    border: 'border-amber-200/80 hover:border-amber-300',
    iconBg: 'bg-amber-500 text-white shadow-sm shadow-amber-500/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-amber-500/10',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50/90 via-white to-pink-50/60',
    border: 'border-rose-200/80 hover:border-rose-300',
    iconBg: 'bg-rose-500 text-white shadow-sm shadow-rose-500/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-rose-500/10',
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-50/95 via-white to-slate-100/60',
    border: 'border-slate-200/90 hover:border-slate-300',
    iconBg: 'bg-slate-700 text-white shadow-sm shadow-slate-700/20',
    iconColor: 'text-white',
    valueColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    decorCircle: 'bg-slate-500/10',
  },
};

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  variant: CardColorVariant;
  onClick?: () => void;
  ariaLabel?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  variant,
  onClick,
  ariaLabel,
}) => {
  const theme = CARD_THEMES[variant];

  return (
    <div
      role={onClick ? 'button' : 'region'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel || `${label}: ${value}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative overflow-hidden rounded-[18px] border ${theme.border} ${theme.bg} p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
        onClick ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600' : ''
      }`}
    >
      {/* Subtle decorative background circle */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-5 -bottom-5 h-24 w-24 rounded-full ${theme.decorCircle}`}
      />
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-xs sm:text-[13px] font-semibold tracking-tight ${theme.labelColor} truncate`}>
            {label}
          </p>
          <p className={`mt-1.5 text-2xl sm:text-[26px] font-extrabold tracking-tight font-mono ${theme.valueColor} truncate`}>
            {value}
          </p>
          {subtext && (
            <p className="mt-1 text-[11px] font-medium text-slate-500 truncate">
              {subtext}
            </p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl ${theme.iconBg} transition-transform duration-200 group-hover:scale-105`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  clients = [],
  payments = [],
  invoices = [],
  routers = [],
  adminProfile,
  isDark,
  onToggleTheme,
  hotspotUsers = [],
  hotspotRequests = [],
  onlineOrders = [],
  routerConfig,
  settings,
  onNavigate,
  onHardResetAll,
  onCollectPayment,
  onBulkImportClients,
}) => {
  // Modals state (preserving all existing dashboard modal capabilities)
  const [selectedClientForBilling, setSelectedClientForBilling] = useState<Client | null>(null);
  const [selectedClientForLedger, setSelectedClientForLedger] = useState<Client | null>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showTownView, setShowTownView] = useState(false);

  // Live clock & refresh state
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshTick((prev) => prev + 1);
    setLastUpdated(new Date());
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  }, []);

  const currencySymbol = settings?.currency || '৳';
  const brandName = settings?.appName || settings?.companyName || 'Nexora Network ISP';

  // Read real expenses & network topology records from existing localStorage keys
  const storedExpenses = useMemo<ExpenseItem[]>(() => {
    try {
      const raw = localStorage.getItem('isp_expenses');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }, [refreshTick]);

  const storedNetworkRecords = useMemo<any[]>(() => {
    try {
      const raw = localStorage.getItem('isp_module_records_network-diagram');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }, [refreshTick]);

  // Date & Month keys
  const dateContext = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    const yest = new Date(year, month, date - 1);
    const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

    const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const lastM = new Date(year, month - 1, 1);
    const lastMonthKey = `${lastM.getFullYear()}-${String(lastM.getMonth() + 1).padStart(2, '0')}`;

    const thirtyDaysAgoMs = new Date(year, month, date - 30).getTime();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const monthShortName = now.toLocaleString('en-US', { month: 'short' });

    return {
      todayStr,
      yesterdayStr,
      currentMonthKey,
      lastMonthKey,
      thirtyDaysAgoMs,
      daysInCurrentMonth,
      monthShortName,
      year,
      month,
    };
  }, [currentTime]);

  // Helper predicates for real payment classification
  const isCompletedPayment = useCallback((p: PaymentRecord) => {
    if (!p) return false;
    const st = String(p.status || '').toLowerCase();
    return st === 'completed' || st === 'approved' || st === 'paid';
  }, []);

  const isHotspotPayment = useCallback((p: PaymentRecord) => {
    if (!p) return false;
    return (
      p.transactionType === 'Hotspot Voucher' ||
      p.paymentMethod === 'Hotspot Portal' ||
      String(p.package || '').toLowerCase().includes('hotspot')
    );
  }, []);

  // ============================================================================
  // SECTION 1, 2, 3 METRICS (100% Real Data Calculations)
  // ============================================================================
  const metrics = useMemo(() => {
    const {
      todayStr,
      yesterdayStr,
      currentMonthKey,
      lastMonthKey,
      thirtyDaysAgoMs,
    } = dateContext;

    // --- Section 1: PPP / Home Statistics ---
    const totalClients = clients.length;
    let totalActiveNow = 0;
    let totalOnline = 0;
    let totalOffline = 0;
    let todayExpiring = 0;
    let totalSuspended = 0;
    let leftClients = 0;

    clients.forEach((c) => {
      const expInfo = getClientExpiryInfo(c.expiry);
      if (c.status === 'online') {
        totalOnline++;
      }
      if (c.status === 'offline' || c.status === 'expired') {
        totalOffline++;
      }
      if (c.status === 'suspended') {
        totalSuspended++;
      }
      if (c.status === 'online' || (!expInfo.isExpired && c.status !== 'suspended' && c.status !== 'expired')) {
        totalActiveNow++;
      }
      if (expInfo.isExpiringToday || (c.expiry && c.expiry.trim().startsWith(todayStr))) {
        todayExpiring++;
      }

      // Check if client is expired for more than 30 days ("Left Client")
      if (c.expiry) {
        const parsedExp = new Date(c.expiry);
        if (!isNaN(parsedExp.getTime()) && parsedExp.getTime() < thirtyDaysAgoMs && expInfo.isExpired) {
          leftClients++;
        }
      }
    });

    // This Month Join & Last Month Join (from real New Client Activation payments + online orders)
    const thisMonthJoinSet = new Set<string>();
    const lastMonthJoinSet = new Set<string>();

    payments.forEach((p) => {
      if (!p) return;
      if (p.transactionType === 'New Client Activation' && isCompletedPayment(p)) {
        if (p.monthKey === currentMonthKey && p.userId) {
          thisMonthJoinSet.add(p.userId.toLowerCase());
        } else if (p.monthKey === lastMonthKey && p.userId) {
          lastMonthJoinSet.add(p.userId.toLowerCase());
        }
      }
    });

    onlineOrders.forEach((o) => {
      if (!o || o.status !== 'approved') return;
      const createdMonth = (o.createdAt || '').slice(0, 7);
      if (createdMonth === currentMonthKey && o.userId) {
        thisMonthJoinSet.add(o.userId.toLowerCase());
      } else if (createdMonth === lastMonthKey && o.userId) {
        lastMonthJoinSet.add(o.userId.toLowerCase());
      }
    });

    const thisMonthJoin = thisMonthJoinSet.size;
    const lastMonthJoin = lastMonthJoinSet.size;

    // Due Clients calculation (clients with unpaid/overdue invoices OR expired unpaid status)
    const paidUserIdsThisMonth = new Set<string>();
    payments.forEach((p) => {
      if (isCompletedPayment(p) && p.monthKey === currentMonthKey && p.userId) {
        paidUserIdsThisMonth.add(p.userId.toLowerCase());
      }
    });

    const dueClientIds = new Set<string>();
    invoices.forEach((inv) => {
      if (inv && (inv.status === 'pending' || inv.status === 'overdue') && Number(inv.dueAmount) > 0) {
        dueClientIds.add((inv.userId || inv.clientId || inv.id).toLowerCase());
      }
    });
    clients.forEach((c) => {
      const expInfo = getClientExpiryInfo(c.expiry);
      const uKey = (c.userId || c.id).toLowerCase();
      if ((expInfo.isExpired || c.status === 'expired') && !paidUserIdsThisMonth.has(uKey)) {
        dueClientIds.add(uKey);
      }
    });
    const dueClientsCount = dueClientIds.size;

    // Home Sales (Today & Yesterday)
    let todayHomeSales = 0;
    let yesterdayHomeSales = 0;

    // Hotspot Sales (Today, Yesterday, Last 30 Days)
    let todayHotspotSales = 0;
    let yesterdayHotspotSales = 0;
    let last30DaysHotspotSales = 0;

    // Monthly Sales & Online This Month
    let thisMonthSales = 0;
    let lastMonthSales = 0;
    let onlineThisMonthCount = 0;

    payments.forEach((p) => {
      if (!isCompletedPayment(p)) return;
      const amt = Number(p.amount) || 0;
      const pDate = (p.dateKey || '').trim();
      const pMonth = (p.monthKey || pDate.slice(0, 7)).trim();
      const hotspot = isHotspotPayment(p);

      if (pMonth === currentMonthKey) {
        thisMonthSales += amt;
        if (p.paymentMethod && p.paymentMethod !== 'Cash') {
          onlineThisMonthCount++;
        }
      } else if (pMonth === lastMonthKey) {
        lastMonthSales += amt;
      }

      if (hotspot) {
        if (pDate === todayStr) todayHotspotSales += amt;
        if (pDate === yesterdayStr) yesterdayHotspotSales += amt;
        if (pDate) {
          const dTime = new Date(pDate).getTime();
          if (!isNaN(dTime) && dTime >= thirtyDaysAgoMs) {
            last30DaysHotspotSales += amt;
          }
        } else if (pMonth === currentMonthKey) {
          last30DaysHotspotSales += amt;
        }
      } else {
        if (pDate === todayStr) todayHomeSales += amt;
        if (pDate === yesterdayStr) yesterdayHomeSales += amt;
      }
    });

    // --- Section 2: Hotspot Users ---
    const hotspotClientCount = hotspotUsers.length;
    const hotspotActiveNow = hotspotUsers.filter((u) => u.status === 'active').length;
    const hotspotExpired = hotspotUsers.filter((u) => u.status === 'expired').length;

    // --- Section 3: Expenses, Profit, POP & Box ---
    let thisMonthExpenseTotal = 0;
    let lastMonthExpenseTotal = 0;
    storedExpenses.forEach((exp) => {
      if (!exp) return;
      const mKey = exp.monthKey || (exp.date || '').slice(0, 7);
      const amt = Number(exp.amount) || 0;
      if (mKey === currentMonthKey) thisMonthExpenseTotal += amt;
      else if (mKey === lastMonthKey) lastMonthExpenseTotal += amt;
    });

    const thisMonthProfit = thisMonthSales - thisMonthExpenseTotal;
    const lastMonthProfit = lastMonthSales - lastMonthExpenseTotal;

    // POP & Box counts from real routers & network records
    const popFromRecords = storedNetworkRecords.filter((r) => {
      const cat = String(r.category || r.type || '').toLowerCase();
      return cat.includes('pop') || cat.includes('olt') || cat.includes('core');
    }).length;
    const totalPop = routers.length + popFromRecords;

    const totalBox = storedNetworkRecords.filter((r) => {
      const cat = String(r.category || r.type || r.name || '').toLowerCase();
      return cat.includes('splitter') || cat.includes('box') || cat.includes('distribution');
    }).length;

    return {
      totalClients,
      totalActiveNow,
      totalOnline,
      totalOffline,
      thisMonthJoin,
      lastMonthJoin,
      todayExpiring,
      totalSuspended,
      leftClients,
      dueClientsCount,
      todayHomeSales,
      yesterdayHomeSales,
      hotspotClientCount,
      hotspotActiveNow,
      hotspotExpired,
      todayHotspotSales,
      yesterdayHotspotSales,
      last30DaysHotspotSales,
      thisMonthSales,
      lastMonthSales,
      thisMonthProfit,
      lastMonthProfit,
      onlineThisMonthCount,
      totalPop,
      totalBox,
    };
  }, [
    clients,
    payments,
    invoices,
    hotspotUsers,
    onlineOrders,
    routers,
    storedExpenses,
    storedNetworkRecords,
    dateContext,
    isCompletedPayment,
    isHotspotPayment,
  ]);

  // ============================================================================
  // SECTION 4 — LATEST ACTIVITY (Latest Invoices, Upcoming Expire, Latest Expired)
  // ============================================================================
  const latestInvoicesList = useMemo(() => {
    if (invoices && invoices.length > 0) {
      return [...invoices]
        .sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''))
        .slice(0, 6)
        .map((inv) => ({
          id: inv.id,
          invoiceNo: inv.invoiceNumber || inv.id,
          customer: inv.clientName || inv.userId || 'N/A',
          userId: inv.userId || '',
          amount: Number(inv.totalAmount) || 0,
          status: inv.status,
          date: inv.issueDate || inv.billingMonth || '',
        }));
    }
    // Fallback to real payment records if no standalone invoice documents exist
    if (payments && payments.length > 0) {
      return [...payments]
        .slice(0, 6)
        .map((p, idx) => ({
          id: p.id || `pay-${idx}`,
          invoiceNo: p.id?.startsWith('INV') ? p.id : `INV-${String(p.id || idx + 1).slice(-6).toUpperCase()}`,
          customer: p.clientName || p.userId || 'N/A',
          userId: p.userId || '',
          amount: Number(p.amount) || 0,
          status: isCompletedPayment(p) ? 'paid' : 'pending',
          date: p.dateKey || p.timestamp || '',
        }));
    }
    return [];
  }, [invoices, payments, isCompletedPayment]);

  const { upcomingExpireList, latestExpiredList } = useMemo(() => {
    const upcoming: Array<{
      client: Client;
      username: string;
      bill: number;
      expiryStr: string;
      daysLeft: number;
    }> = [];

    const expired: Array<{
      client: Client;
      username: string;
      bill: number;
      expiryStr: string;
      timestampMs: number;
    }> = [];

    clients.forEach((c) => {
      if (!c) return;
      const expInfo = getClientExpiryInfo(c.expiry);
      const bill = Number(c.price) || 0;
      const username = c.userId || c.name || 'N/A';

      if (expInfo.isExpired || c.status === 'expired') {
        const ts = c.expiry ? new Date(c.expiry).getTime() : 0;
        expired.push({
          client: c,
          username,
          bill,
          expiryStr: c.expiry || 'Expired',
          timestampMs: isNaN(ts) ? 0 : ts,
        });
      } else if (c.expiry) {
        upcoming.push({
          client: c,
          username,
          bill,
          expiryStr: c.expiry,
          daysLeft: expInfo.daysLeft,
        });
      }
    });

    upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
    expired.sort((a, b) => b.timestampMs - a.timestampMs);

    return {
      upcomingExpireList: upcoming.slice(0, 5),
      latestExpiredList: expired.slice(0, 5),
    };
  }, [clients]);

  // ============================================================================
  // SECTION 5 — SALES ANALYTICS (This Month Daily Chart)
  // ============================================================================
  const salesAnalyticsData = useMemo(() => {
    const { year, month, daysInCurrentMonth, monthShortName, currentMonthKey } = dateContext;

    const dailyMap = new Map<string, { dayLabel: string; sales: number; newUsers: number }>();

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const label = `${String(d).padStart(2, '0')} ${monthShortName}`;
      dailyMap.set(dayKey, { dayLabel: label, sales: 0, newUsers: 0 });
    }

    payments.forEach((p) => {
      if (!isCompletedPayment(p)) return;
      const dKey = (p.dateKey || '').trim();
      if (dailyMap.has(dKey)) {
        const entry = dailyMap.get(dKey)!;
        entry.sales += Number(p.amount) || 0;
        if (p.transactionType === 'New Client Activation') {
          entry.newUsers += 1;
        }
      } else if (p.monthKey === currentMonthKey) {
        // If dateKey is missing but monthKey matches current month, place on day 1
        const fallbackKey = `${currentMonthKey}-01`;
        if (dailyMap.has(fallbackKey)) {
          const entry = dailyMap.get(fallbackKey)!;
          entry.sales += Number(p.amount) || 0;
          if (p.transactionType === 'New Client Activation') {
            entry.newUsers += 1;
          }
        }
      }
    });

    onlineOrders.forEach((o) => {
      if (!o || o.status !== 'approved') return;
      const dKey = (o.createdAt || '').slice(0, 10);
      if (dailyMap.has(dKey)) {
        const entry = dailyMap.get(dKey)!;
        entry.newUsers += 1;
      }
    });

    const chartPoints = Array.from(dailyMap.values());
    const hasAnyActivity = chartPoints.some((pt) => pt.sales > 0 || pt.newUsers > 0);

    return { chartPoints, hasAnyActivity };
  }, [payments, onlineOrders, dateContext, isCompletedPayment]);

  // ============================================================================
  // SECTION 6 — TOP DUE CLIENTS
  // ============================================================================
  const topDueClients = useMemo(() => {
    const { currentMonthKey } = dateContext;

    // Map due amounts from unpaid invoices first
    const invoiceDueByUser = new Map<string, number>();
    invoices.forEach((inv) => {
      if (inv && (inv.status === 'pending' || inv.status === 'overdue') && Number(inv.dueAmount) > 0) {
        const key = (inv.userId || inv.clientId || '').toLowerCase();
        if (key) {
          invoiceDueByUser.set(key, (invoiceDueByUser.get(key) || 0) + Number(inv.dueAmount));
        }
      }
    });

    const paidThisMonthSet = new Set<string>();
    payments.forEach((p) => {
      if (isCompletedPayment(p) && p.monthKey === currentMonthKey && p.userId) {
        paidThisMonthSet.add(p.userId.toLowerCase());
      }
    });

    const list: Array<{
      client: Client;
      username: string;
      monthlyBill: number;
      dueAmount: number;
    }> = [];

    clients.forEach((c) => {
      if (!c) return;
      const uKey = (c.userId || c.id || '').toLowerCase();
      const monthlyBill = Number(c.price) || 0;
      const invDue = invoiceDueByUser.get(uKey) || 0;
      const expInfo = getClientExpiryInfo(c.expiry);
      const isUnpaidExpired = (expInfo.isExpired || c.status === 'expired') && !paidThisMonthSet.has(uKey);

      const dueAmount = invDue > 0 ? invDue : isUnpaidExpired ? monthlyBill : 0;

      if (dueAmount > 0) {
        list.push({
          client: c,
          username: c.userId || c.name,
          monthlyBill,
          dueAmount,
        });
      }
    });

    return list.sort((a, b) => b.dueAmount - a.dueAmount).slice(0, 10);
  }, [clients, invoices, payments, dateContext, isCompletedPayment]);

  const pendingOnlineOrdersCount = onlineOrders.filter((o) => o.status === 'pending').length;
  const pendingHotspotRequestsCount = hotspotRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6 text-slate-900 pb-8 max-w-full overflow-x-hidden">
      {/* ====================================================================
          TOP DASHBOARD HEADER
      ==================================================================== */}
      <header className="rounded-[20px] bg-white border border-slate-200/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Branding & Session Metadata */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            {settings?.logo ? (
              <img
                src={settings.logo}
                alt={brandName}
                className="h-12 w-12 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-xs"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-sm shadow-sky-600/20">
                <Wifi className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 truncate">
                  {brandName}
                </h1>
                <span className="text-xs font-mono text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs font-mono font-semibold text-sky-700">
                  ISP ID: NX-{routerConfig?.ip ? routerConfig.ip.split('.').slice(-2).join('') : '2026'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                  <Calendar className="h-3.5 w-3.5 text-sky-600" />
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">
                  Admin: <strong className="font-semibold text-slate-700">{adminProfile?.name || 'System Admin'}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      routerConfig?.connected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  NAS: {routerConfig?.ip || '192.168.88.1'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Refresh, Theme & Quick Operational Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              aria-label="Refresh dashboard data"
              title={`Last updated: ${lastUpdated.toLocaleTimeString()}`}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600"
            >
              <RefreshCw className={`h-4 w-4 text-sky-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label="Toggle color theme"
                title="Toggle color theme"
                className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600"
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-700" />}
                <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowTownView(true)}
              aria-label="Open Town View"
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600"
            >
              <MapPin className="h-4 w-4 text-sky-600" />
              <span>Town View</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImportWizard(true)}
              aria-label="Import Subscriber Data"
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('clients')}
              aria-label="Add New Client"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600"
            >
              <Plus className="h-4 w-4" />
              <span>Add Client</span>
            </button>

            {onHardResetAll && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to perform a full system reset?')) {
                    onHardResetAll();
                  }
                }}
                aria-label="Full System Reset"
                title="Full System Reset"
                className="min-h-[40px] px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Pending Action Banners (Preserved from existing workflow) */}
      {pendingOnlineOrdersCount > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-cyan-50 via-sky-50 to-emerald-50 border border-cyan-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white shrink-0">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {pendingOnlineOrdersCount} Pending Online Package Order(s) Awaiting Approval
              </h2>
              <p className="text-xs text-slate-600">
                Subscribers submitted payment TrxIDs via online portal. Verify and activate lines.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <span>Verify Orders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {pendingHotspotRequestsCount > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {pendingHotspotRequestsCount} Pending Hotspot Voucher Request(s)
              </h2>
              <p className="text-xs text-slate-600">
                Subscribers requested voucher activation via Hotspot captive portal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('hotspot')}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Review Requests</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ====================================================================
          SECTION 1 — PPP / HOME STATISTICS (12 Metric Cards, 3-Column Desktop)
      ==================================================================== */}
      <section
        aria-labelledby="ppp-home-stats-heading"
        className="rounded-[22px] bg-white border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2
              id="ppp-home-stats-heading"
              className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2"
            >
              <Users className="h-5 w-5 text-cyan-600" />
              <span>PPP / Home Statistics</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer Accounts, Renewals &amp; Expired Subscriptions
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('clients')}
            className="self-start sm:self-auto text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Manage Subscribers</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          <MetricCard
            label="Total Clients"
            value={metrics.totalClients}
            subtext="Registered PPPoE / Home accounts"
            icon={<Users className="h-5 w-5" />}
            variant="cyan"
            onClick={() => onNavigate('clients')}
          />
          <MetricCard
            label="Total Active Now"
            value={metrics.totalActiveNow}
            subtext="Valid subscription accounts"
            icon={<UserCheck className="h-5 w-5" />}
            variant="teal"
            onClick={() => onNavigate('clients')}
          />
          <MetricCard
            label="Total Online"
            value={metrics.totalOnline}
            subtext="Connected sessions right now"
            icon={<Wifi className="h-5 w-5" />}
            variant="emerald"
            onClick={() => onNavigate('clients')}
          />
          <MetricCard
            label="Total Offline"
            value={metrics.totalOffline}
            subtext="Disconnected or expired lines"
            icon={<WifiOff className="h-5 w-5" />}
            variant="rose"
            onClick={() => onNavigate('clients')}
          />
          <MetricCard
            label="This Month Join"
            value={metrics.thisMonthJoin}
            subtext={`New activations (${dateContext.currentMonthKey})`}
            icon={<UserPlus className="h-5 w-5" />}
            variant="purple"
            onClick={() => onNavigate('clients')}
          />
          <MetricCard
            label="Last Month Join"
            value={metrics.lastMonthJoin}
            subtext={`Joined in ${dateContext.lastMonthKey}`}
            icon={<UserPlus className="h-5 w-5" />}
            variant="indigo"
            onClick={() => onNavigate('clients')}
          />
          <MetricCard
            label="Today Expiring"
            value={metrics.todayExpiring}
            subtext="Subscriptions expiring today"
            icon={<Clock className="h-5 w-5" />}
            variant="orange"
            onClick={() => onNavigate('subscriptions')}
          />
          <MetricCard
            label="Total Suspended"
            value={metrics.totalSuspended}
            subtext="Administratively locked lines"
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="amber"
            onClick={() => onNavigate('clients')}
          />
          <MetricCard
            label="Left Client"
            value={metrics.leftClients}
            subtext="Inactive > 30 days"
            icon={<UserMinus className="h-5 w-5" />}
            variant="slate"
            onClick={() => onNavigate('clients')}
          />
          <MetricCard
            label="Due Client"
            value={metrics.dueClientsCount}
            subtext="Unpaid / overdue accounts"
            icon={<UserX className="h-5 w-5" />}
            variant="red"
            onClick={() => onNavigate('billing')}
          />
          <MetricCard
            label="Today Home Sales"
            value={`${currencySymbol}${metrics.todayHomeSales.toLocaleString()}`}
            subtext={`Collected today (${dateContext.todayStr})`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="blue"
            onClick={() => onNavigate('reports')}
          />
          <MetricCard
            label="Yesterday Home Sales"
            value={`${currencySymbol}${metrics.yesterdayHomeSales.toLocaleString()}`}
            subtext={`Collected (${dateContext.yesterdayStr})`}
            icon={<CreditCard className="h-5 w-5" />}
            variant="pink"
            onClick={() => onNavigate('reports')}
          />
        </div>
      </section>

      {/* ====================================================================
          SECTION 2 — HOTSPOT STATISTICS (6 Metric Cards, 3-Column Desktop)
      ==================================================================== */}
      <section
        aria-labelledby="hotspot-stats-heading"
        className="rounded-[22px] bg-white border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2
              id="hotspot-stats-heading"
              className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2"
            >
              <Radio className="h-5 w-5 text-purple-600" />
              <span>Hotspot Statistics</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hotspot Users, Active Vouchers &amp; Sales
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('hotspot')}
            className="self-start sm:self-auto text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Hotspot Zone</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          <MetricCard
            label="Hotspot Client"
            value={metrics.hotspotClientCount}
            subtext="Total hotspot voucher users"
            icon={<Users className="h-5 w-5" />}
            variant="purple"
            onClick={() => onNavigate('hotspot')}
          />
          <MetricCard
            label="Hotspot Active Now"
            value={metrics.hotspotActiveNow}
            subtext="Currently active vouchers"
            icon={<Wifi className="h-5 w-5" />}
            variant="emerald"
            onClick={() => onNavigate('hotspot')}
          />
          <MetricCard
            label="Hotspot Expired"
            value={metrics.hotspotExpired}
            subtext="Expired voucher sessions"
            icon={<Clock className="h-5 w-5" />}
            variant="rose"
            onClick={() => onNavigate('hotspot')}
          />
          <MetricCard
            label="Today Hotspot Sales"
            value={`${currencySymbol}${metrics.todayHotspotSales.toLocaleString()}`}
            subtext="Today's voucher collections"
            icon={<DollarSign className="h-5 w-5" />}
            variant="cyan"
            onClick={() => onNavigate('hotspot')}
          />
          <MetricCard
            label="Yesterday Hotspot Sales"
            value={`${currencySymbol}${metrics.yesterdayHotspotSales.toLocaleString()}`}
            subtext="Yesterday's voucher sales"
            icon={<CreditCard className="h-5 w-5" />}
            variant="orange"
            onClick={() => onNavigate('hotspot')}
          />
          <MetricCard
            label="Last 30 Days Hotspot Sales"
            value={`${currencySymbol}${metrics.last30DaysHotspotSales.toLocaleString()}`}
            subtext="30-day cumulative hotspot revenue"
            icon={<TrendingUp className="h-5 w-5" />}
            variant="pink"
            onClick={() => onNavigate('hotspot')}
          />
        </div>
      </section>

      {/* ====================================================================
          SECTION 3 — OTHERS & FINANCIAL STATISTICS (7 Cards, 3-Column Desktop)
      ==================================================================== */}
      <section
        aria-labelledby="financial-stats-heading"
        className="rounded-[22px] bg-white border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2
              id="financial-stats-heading"
              className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2"
            >
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <span>Others &amp; Financial Statistics</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monthly Revenues, Net Profit &amp; Infrastructure POPs
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="self-start sm:self-auto text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Financial Reports</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          <MetricCard
            label="This Month Sales"
            value={`${currencySymbol}${metrics.thisMonthSales.toLocaleString()}`}
            subtext={`Total revenue (${dateContext.currentMonthKey})`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="emerald"
            onClick={() => onNavigate('reports')}
          />
          <MetricCard
            label="Last Month Sales"
            value={`${currencySymbol}${metrics.lastMonthSales.toLocaleString()}`}
            subtext={`Total revenue (${dateContext.lastMonthKey})`}
            icon={<CreditCard className="h-5 w-5" />}
            variant="cyan"
            onClick={() => onNavigate('reports')}
          />
          <MetricCard
            label="This Month Profit"
            value={`${currencySymbol}${metrics.thisMonthProfit.toLocaleString()}`}
            subtext="Sales minus recorded expenses"
            icon={<TrendingUp className="h-5 w-5" />}
            variant="teal"
            onClick={() => onNavigate('expenses')}
          />
          <MetricCard
            label="Last Month Profit"
            value={`${currencySymbol}${metrics.lastMonthProfit.toLocaleString()}`}
            subtext={`Net profit (${dateContext.lastMonthKey})`}
            icon={<Activity className="h-5 w-5" />}
            variant="purple"
            onClick={() => onNavigate('expenses')}
          />
          <MetricCard
            label="Online This Month"
            value={metrics.onlineThisMonthCount}
            subtext="Digital & gateway transactions"
            icon={<ShieldCheck className="h-5 w-5" />}
            variant="blue"
            onClick={() => onNavigate('billing')}
          />
          <MetricCard
            label="Total POP"
            value={metrics.totalPop}
            subtext="Active NAS routers & OLT POPs"
            icon={<Server className="h-5 w-5" />}
            variant="orange"
            onClick={() => onNavigate('mikrotik-management')}
          />
          <MetricCard
            label="Total Box"
            value={metrics.totalBox}
            subtext="Distribution & splitter TJ boxes"
            icon={<Box className="h-5 w-5" />}
            variant="pink"
            onClick={() => onNavigate('network-map')}
          />
        </div>
      </section>

      {/* ====================================================================
          SECTION 4 — LATEST ACTIVITY (2-Column Responsive Grid)
      ==================================================================== */}
      <section aria-label="Latest Activity" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Latest Invoices */}
        <div className="rounded-[22px] bg-white border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-sky-600" />
                  <span>Latest Invoices</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recent billing &amp; payment records
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('billing')}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestInvoicesList.length > 0 ? (
                    latestInvoicesList.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-sky-700 whitespace-nowrap">
                          {inv.invoiceNo}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 truncate max-w-[180px]">
                            {inv.customer}
                          </div>
                          {inv.date && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              {inv.date}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                          {currencySymbol}
                          {inv.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-xs text-slate-500">
                        No invoice records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Expire & Latest Expired */}
        <div className="space-y-6">
          {/* Top Right Card: Upcoming Expire */}
          <div className="rounded-[22px] bg-white border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span>Upcoming Expire</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Subscribers approaching renewal date
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('subscriptions')}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Subscriptions</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Bill</th>
                    <th className="py-2.5 px-3 text-right">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upcomingExpireList.length > 0 ? (
                    upcomingExpireList.map((item, idx) => (
                      <tr
                        key={item.client.id || idx}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 truncate max-w-[160px]">
                            {item.username}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                            {item.client.name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {currencySymbol}
                          {item.bill.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                          <div className="font-bold text-amber-600">{item.expiryStr}</div>
                          <div className="text-[10px] text-slate-500">
                            {item.daysLeft === 0 ? 'Today' : `${item.daysLeft}d left`}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-xs text-slate-500">
                        No upcoming expiring subscriptions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Right Card: Latest Expired */}
          <div className="rounded-[22px] bg-white border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  <span>Latest Expired</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recently expired customer accounts
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('subscriptions')}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Renew Lines</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Bill</th>
                    <th className="py-2.5 px-3 text-right">Expired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestExpiredList.length > 0 ? (
                    latestExpiredList.map((item, idx) => (
                      <tr
                        key={item.client.id || idx}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 truncate max-w-[160px]">
                            {item.username}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                            {item.client.name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {currencySymbol}
                          {item.bill.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                          {item.expiryStr}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-xs text-slate-500">
                        No expired accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 5 — SALES ANALYTICS ("This Month Daily")
      ==================================================================== */}
      <section
        aria-labelledby="sales-analytics-heading"
        className="rounded-[22px] bg-white border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2
              id="sales-analytics-heading"
              className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2"
            >
              <Activity className="h-5 w-5 text-indigo-600" />
              <span>Sales Analytics</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              This Month Daily ({dateContext.currentMonthKey})
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              Sales ({currencySymbol})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              New Users
            </span>
          </div>
        </div>

        {salesAnalyticsData.hasAnyActivity || clients.length > 0 ? (
          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={salesAnalyticsData.chartPoints}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorUsersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  minTickGap={20}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9333ea' }}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSalesGrad)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="newUsers"
                  name="New Users"
                  stroke="#9333ea"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsersGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex flex-col items-center justify-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 p-6 text-center">
            <Activity className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-700">No Sales Recorded This Month Yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Daily sales and new user activations will automatically populate here as transactions are recorded.
            </p>
          </div>
        )}
      </section>

      {/* ====================================================================
          SECTION 6 — TOP DUE CLIENTS
      ==================================================================== */}
      <section
        aria-labelledby="top-due-clients-heading"
        className="rounded-[22px] bg-white border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2
              id="top-due-clients-heading"
              className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2"
            >
              <CreditCard className="h-5 w-5 text-rose-600" />
              <span>Top Due Clients</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Subscribers sorted by highest outstanding balance
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('billing')}
            className="self-start sm:self-auto text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Billing &amp; Invoices</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3 w-12">#</th>
                <th className="py-3 px-3">Username</th>
                <th className="py-3 px-3">Monthly Bill</th>
                <th className="py-3 px-3">Due</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topDueClients.length > 0 ? (
                topDueClients.map((entry, idx) => (
                  <tr
                    key={entry.client.id || idx}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">
                        {entry.username}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {entry.client.name} · {entry.client.package}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {currencySymbol}
                      {entry.monthlyBill.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-rose-600 whitespace-nowrap">
                      {currencySymbol}
                      {entry.dueAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedClientForLedger(entry.client)}
                          aria-label={`View client ${entry.username}`}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-sky-600" />
                          <span>View</span>
                        </button>
                        {onCollectPayment && (
                          <button
                            type="button"
                            onClick={() => setSelectedClientForBilling(entry.client)}
                            aria-label={`Collect payment from ${entry.username}`}
                            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Collect</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-slate-500">
                    No overdue client balances found. All active subscribers are up to date!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ====================================================================
          EXISTING FLOWFORGE MODALS (Preserved for full compatibility)
      ==================================================================== */}
      <BillingModal
        isOpen={!!selectedClientForBilling}
        onClose={() => setSelectedClientForBilling(null)}
        client={selectedClientForBilling}
        onConfirmPayment={(payment) => {
          if (onCollectPayment) {
            onCollectPayment(payment);
          }
        }}
        currencySymbol={currencySymbol}
      />

      <MemberLedgerModal
        isOpen={!!selectedClientForLedger}
        onClose={() => setSelectedClientForLedger(null)}
        client={selectedClientForLedger}
        payments={payments}
        invoices={invoices}
        currencySymbol={currencySymbol}
      />

      <ImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onImportClients={(imported) => {
          if (onBulkImportClients) {
            onBulkImportClients(imported);
          }
        }}
      />

      <TownViewModal
        isOpen={showTownView}
        onClose={() => setShowTownView(false)}
        clients={clients}
        payments={payments}
        onSelectClient={(c) => {
          setSelectedClientForLedger(c);
          setShowTownView(false);
        }}
        currencySymbol={currencySymbol}
      />
    </div>
  );
};
