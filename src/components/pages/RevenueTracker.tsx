import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart2,
  Search,
  Download,
  Filter,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Smartphone,
  CreditCard,
  Users,
  ChevronRight,
  Award,
  Layers,
  ArrowUpRight,
  Zap,
  Printer,
  History,
  Check,
  Building2,
  Wallet,
  RotateCcw,
  Wifi,
} from "lucide-react";
import { Client, Package, PaymentRecord, AppSettings } from "../../types";

interface RevenueTrackerProps {
  payments: PaymentRecord[];
  clients: Client[];
  packages: Package[];
  settings?: AppSettings;
  onAddPayment: (record: Omit<PaymentRecord, "id">) => void;
  showToast: (
    msg: string,
    type: "info" | "success" | "error" | "warning",
  ) => void;
  onHardReset?: () => void;
}

export const RevenueTrackerPage: React.FC<RevenueTrackerProps> = ({
  payments,
  clients,
  packages,
  settings,
  onAddPayment,
  showToast,
  onHardReset,
}) => {
  const [activeTab, setActiveTab] = useState<"running" | "yearly" | "all_tx">(
    "running",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Selected month for 1-Year Archive tab (default to current month '2026-08')
  const currentDate = new Date();
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`; // "2026-08"
  const [selectedArchiveMonth, setSelectedArchiveMonth] =
    useState<string>(currentMonthKey);

  // Selected day bar for inspection
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(
    currentDate.getDate(),
  );

  // Modal State for New Recharge Entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [newPackage, setNewPackage] = useState(
    packages[0]?.name || "30 Mbps Starter",
  );
  const [newAmount, setNewAmount] = useState(packages[0]?.price || "800");
  const [newMethod, setNewMethod] = useState<
    "bKash" | "Nagad" | "Rocket" | "Cash" | "Bank" | "Hotspot Portal"
  >("bKash");
  const [newType, setNewType] = useState<
    | "Broadband Renewal"
    | "New Client Activation"
    | "Hotspot Voucher"
    | "Corporate Bill"
  >("Broadband Renewal");
  const [newCollector, setNewCollector] = useState("Admin");
  const [newDateKey, setNewDateKey] = useState(
    new Date().toISOString().slice(0, 10),
  );

  // Auto fill amount when package changes
  const handlePackageChange = (pkgName: string) => {
    setNewPackage(pkgName);
    const p = packages.find((x) => x.name === pkgName);
    if (p) setNewAmount(p.price);
  };

  const handleSelectClient = (clientId: string) => {
    const c = clients.find((x) => x.id === clientId);
    if (c) {
      setNewClientName(c.name);
      setNewUserId(c.userId);
      setNewPackage(c.package);
      const rawPrice = c.price;
      const parsedPrice = parseInt(
        String(rawPrice || "").replace(/[^\d]/g, ""),
        10,
      );
      if (parsedPrice && !isNaN(parsedPrice) && parsedPrice > 0) {
        setNewAmount(String(parsedPrice));
      } else {
        const p = packages.find((x) => x.name === c.package);
        if (p) setNewAmount(p.price);
      }
    }
  };

  const handleSubmitRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newAmount) {
      showToast(
        "Please enter valid subscriber name and payment amount",
        "warning",
      );
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const fullTimestamp = `${newDateKey} ${timeStr}`;
    const monthKey = newDateKey.slice(0, 7);

    onAddPayment({
      clientName: newClientName,
      userId: newUserId || "HOTSPOT_USER",
      package: newPackage,
      amount: parseFloat(newAmount) || 0,
      paymentMethod: newMethod,
      transactionType: newType,
      collector: newCollector,
      timestamp: fullTimestamp,
      dateKey: newDateKey,
      monthKey: monthKey,
      status: "Completed",
    });

    setIsModalOpen(false);
    setNewClientName("");
    setNewUserId("");
    showToast(
      `✅ ৳${newAmount} recharge payment recorded successfully!`,
      "success",
    );
  };

  // Helper to determine strictly completed payments
  const isCompleted = (p: PaymentRecord) => {
    if (!p) return false;
    const statusLower = String(p.status || "").toLowerCase().trim();
    if (
      statusLower.includes("pending") ||
      statusLower.includes("refund") ||
      statusLower.includes("reject") ||
      statusLower.includes("cancel") ||
      statusLower.includes("fail")
    ) {
      return false;
    }
    return true;
  };

  // Clean & Deduplicate payments array to eliminate double-counted entries
  const cleanPayments = useMemo(() => {
    if (!payments || payments.length === 0) return [];

    const seenIds = new Set<string>();
    const seenTrxKeys = new Set<string>();
    const result: PaymentRecord[] = [];

    for (const p of payments) {
      if (!p || !p.id) continue;

      if (!isCompleted(p)) continue;

      // 1. Check ID uniqueness
      if (seenIds.has(p.id)) continue;

      // 2. Extract transaction ID if present in notes or id
      const trxMatch =
        p.notes?.match(/TrxID:\s*([^\s|]+)/i)?.[1]?.toLowerCase() ||
        (p.id.startsWith("PAY-") || p.id.startsWith("TXN-")
          ? null
          : p.id.toLowerCase());
      if (trxMatch && trxMatch.length > 3) {
        if (seenTrxKeys.has(trxMatch)) continue;
        seenTrxKeys.add(trxMatch);
      }

      // 3. Prevent duplicate double-click logs (same client/userId + amount + dateKey + package)
      const userKey = (p.userId || p.clientName || "").toLowerCase().trim();
      const dateKey =
        p.dateKey || (p.timestamp ? p.timestamp.slice(0, 10) : "");
      const compositeKey = `${userKey}_${p.amount}_${dateKey}_${(p.package || "").toLowerCase()}`;
      if (compositeKey && userKey) {
        if (seenTrxKeys.has(compositeKey)) continue;
        seenTrxKeys.add(compositeKey);
      }

      seenIds.add(p.id);
      result.push(p);
    }

    return result;
  }, [payments]);

  // --- RUNNING MONTH COMPUTATIONS ---
  const runningMonthPayments = useMemo(() => {
    return cleanPayments.filter((p) => p.monthKey === currentMonthKey);
  }, [cleanPayments, currentMonthKey]);

  const runningMonthTotal = useMemo(() => {
    return runningMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [runningMonthPayments]);

  const todayStr = currentDate.toISOString().slice(0, 10);
  const todayTotal = useMemo(() => {
    return cleanPayments
      .filter((p) => p.dateKey === todayStr)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [cleanPayments, todayStr]);

  const todayTransactionsCount = useMemo(() => {
    return cleanPayments.filter((p) => p.dateKey === todayStr).length;
  }, [cleanPayments, todayStr]);

  // Method Breakdown
  const methodStats = useMemo(() => {
    const stats: Record<string, number> = {
      bKash: 0,
      Nagad: 0,
      Cash: 0,
      Rocket: 0,
      "Hotspot Portal": 0,
      Bank: 0,
    };
    runningMonthPayments.forEach((p) => {
      stats[p.paymentMethod] = (stats[p.paymentMethod] || 0) + p.amount;
    });
    return stats;
  }, [runningMonthPayments]);

  // Daily Breakdown for Current Month (Days 1 to 31)
  const daysInCurrentMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate();
  const dailyDataRunningMonth = useMemo<
    Record<number, { total: number; count: number }>
  >(() => {
    const map: Record<number, { total: number; count: number }> = {};
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      map[d] = { total: 0, count: 0 };
    }
    runningMonthPayments.forEach((p) => {
      const dayNum = parseInt(p.dateKey.split("-")[2] || "1", 10);
      if (map[dayNum]) {
        map[dayNum].total += p.amount;
        map[dayNum].count += 1;
      }
    });
    return map;
  }, [runningMonthPayments, daysInCurrentMonth]);

  // Max daily amount in current month for scaling bar graph
  const maxDailyAmountRunningMonth = useMemo(() => {
    let max = 1;
    (
      Object.values(dailyDataRunningMonth) as { total: number; count: number }[]
    ).forEach((d) => {
      if (d.total > max) max = d.total;
    });
    return max;
  }, [dailyDataRunningMonth]);

  // Peak revenue day in current month
  const peakDayRunningMonth = useMemo(() => {
    let peakDay = 1;
    let maxVal = 0;
    (
      Object.entries(dailyDataRunningMonth) as [
        string,
        { total: number; count: number },
      ][]
    ).forEach(([day, data]) => {
      if (data.total > maxVal) {
        maxVal = data.total;
        peakDay = parseInt(day, 10);
      }
    });
    return { day: peakDay, amount: maxVal };
  }, [dailyDataRunningMonth]);

  // --- 1-YEAR HISTORICAL ARCHIVE COMPUTATIONS ---
  // Generate list of 12 past months (e.g., 2026-08 down to 2025-09)
  const past12MonthsList = useMemo(() => {
    const list: {
      monthKey: string;
      monthName: string;
      total: number;
      count: number;
    }[] = [];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const fullMonthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    for (let i = 0; i < 12; i++) {
      const d = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mName = `${fullMonthNames[d.getMonth()]} ${d.getFullYear()}`;

      const mPayments = cleanPayments.filter((p) => p.monthKey === mKey);
      const total = mPayments.reduce((acc, p) => acc + p.amount, 0);

      list.push({
        monthKey: mKey,
        monthName: mName,
        total: total,
        count: mPayments.length,
      });
    }
    return list; // Latest month first
  }, [cleanPayments, currentDate]);

  const yearlyTotalRevenue = useMemo(() => {
    return past12MonthsList.reduce((acc, m) => acc + m.total, 0);
  }, [past12MonthsList]);

  const maxYearlyMonthAmount = useMemo(() => {
    let max = 1;
    past12MonthsList.forEach((m) => {
      if (m.total > max) max = m.total;
    });
    return max;
  }, [past12MonthsList]);

  // Archive Selected Month Computation
  const selectedArchiveMonthPayments = useMemo(() => {
    return cleanPayments.filter((p) => p.monthKey === selectedArchiveMonth);
  }, [cleanPayments, selectedArchiveMonth]);

  const selectedArchiveMonthTotal = useMemo(() => {
    return selectedArchiveMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [selectedArchiveMonthPayments]);

  const selectedArchiveMonthDaysCount = useMemo(() => {
    const [year, month] = selectedArchiveMonth.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  }, [selectedArchiveMonth]);

  const selectedArchiveMonthDailyData = useMemo<
    Record<number, { total: number; count: number }>
  >(() => {
    const map: Record<number, { total: number; count: number }> = {};
    for (let d = 1; d <= selectedArchiveMonthDaysCount; d++) {
      map[d] = { total: 0, count: 0 };
    }
    selectedArchiveMonthPayments.forEach((p) => {
      const dayNum = parseInt(p.dateKey.split("-")[2] || "1", 10);
      if (map[dayNum]) {
        map[dayNum].total += p.amount;
        map[dayNum].count += 1;
      }
    });
    return map;
  }, [selectedArchiveMonthPayments, selectedArchiveMonthDaysCount]);

  const maxDailyInSelectedArchive = useMemo(() => {
    let max = 1;
    (
      Object.values(selectedArchiveMonthDailyData) as {
        total: number;
        count: number;
      }[]
    ).forEach((d) => {
      if (d.total > max) max = d.total;
    });
    return max;
  }, [selectedArchiveMonthDailyData]);

  // Filtered Transactions List
  const filteredTransactionsList = useMemo(() => {
    let targetList =
      activeTab === "running"
        ? runningMonthPayments
        : activeTab === "yearly"
          ? selectedArchiveMonthPayments
          : cleanPayments;

    return targetList.filter((p) => {
      const matchesSearch =
        p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.package.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMethod =
        methodFilter === "all" || p.paymentMethod === methodFilter;
      const matchesType =
        typeFilter === "all" || p.transactionType === typeFilter;

      return matchesSearch && matchesMethod && matchesType;
    });
  }, [
    activeTab,
    runningMonthPayments,
    selectedArchiveMonthPayments,
    payments,
    searchQuery,
    methodFilter,
    typeFilter,
  ]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTransactionsList.length === 0) {
      showToast("No transaction data available to export", "warning");
      return;
    }
    const headers = [
      "Txn ID",
      "Client Name",
      "User ID",
      "Package",
      "Amount (BDT)",
      "Payment Method",
      "Type",
      "Collector",
      "Date Time",
    ];
    const rows = filteredTransactionsList.map((p) => [
      p.id,
      p.clientName,
      p.userId,
      p.package,
      p.amount,
      p.paymentMethod,
      p.transactionType,
      p.collector,
      p.timestamp,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) => e.map((x) => `"${x}"`).join(",")),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `NexoraNetwork_Revenue_Report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(
      `✅ ${filteredTransactionsList.length}transactions CSV report downloaded successfully!`,
      "success",
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action */}
      <div className="bg-gradient-to-r from-sky-900/40 via-indigo-900/40 to-slate-900/60 backdrop-blur-xl border border-sky-500/20 rounded p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-extrabold text-xs uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4 animate-pulse text-amber-400" />
              <span>Real-Time ISP Billing &amp; Financial Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-[#00a65a] bg-emerald-500/20 p-1 rounded" />
              <span>Live Income Graph & 1-Year Recharge Tracker</span>
            </h2>
            <p className="text-xs text-slate-900 mt-1 max-w-2xl">
              View daily client activations, live automatic recharge graphs,
              income sources, and 12-month transaction history.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onHardReset && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to permanently clear all billing & payment history data? (Hard Reset)",
                    )
                  ) {
                    onHardReset();
                  }
                }}
                className="px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Clear all payment and billing history"
              >
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span>Hard Reset (Reset Data)</span>
              </button>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>➕ Record New Recharge</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#00a65a]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-300/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab("running")}
            className={`px-4 py-2 rounded text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "running"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25 ring-2 ring-sky-300/40"
                : "bg-slate-50 text-slate-900 hover:bg-slate-200 hover:text-slate-800"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>
              📊 Current Month Revenue ({past12MonthsList[0]?.monthName})
            </span>
          </button>

          <button
            onClick={() => setActiveTab("yearly")}
            className={`px-4 py-2 rounded text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "yearly"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25 ring-2 ring-sky-300/40"
                : "bg-slate-50 text-slate-900 hover:bg-slate-200 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>🗓️ 1-Year Archive (12 Months History)</span>
          </button>

          <button
            onClick={() => setActiveTab("all_tx")}
            className={`px-4 py-2 rounded text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "all_tx"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25 ring-2 ring-sky-300/40"
                : "bg-slate-50 text-slate-900 hover:bg-slate-200 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>📋 All-Time Transaction History ({payments.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: RUNNING MONTH LIVE REVENUE & DAILY GRAPH */}
      {/* ========================================================= */}
      {activeTab === "running" && (
        <div className="space-y-6">
          {/* Running Month Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Running Month Income */}
            <div className="bg-gradient-to-br from-emerald-900/30 via-slate-900/70 to-slate-900/90 backdrop-blur-xl border border-emerald-500/30 rounded p-5 shadow-lg relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#00a65a] uppercase tracking-wider">
                    Current Month Gross Revenue
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    ৳{runningMonthTotal.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/20 text-[#00a65a] rounded">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-300 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {runningMonthPayments.length} recharge transactions completed
                </span>
              </div>
            </div>

            {/* Today's Income */}
            <div className="bg-gradient-to-br from-sky-900/30 via-slate-900/70 to-slate-900/90 backdrop-blur-xl border border-sky-500/30 rounded p-5 shadow-lg relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Today Total Collection
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    ৳{todayTotal.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-sky-500/20 text-sky-400 rounded animate-pulse">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-sky-300 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Today a total of {todayTransactionsCount} subscribers
                  recharged
                </span>
              </div>
            </div>

            {/* Total Recharged Subscribers */}
            <div className="bg-gradient-to-br from-indigo-900/30 via-slate-900/70 to-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded p-5 shadow-lg relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Recharged Subscribers Count
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {runningMonthPayments.length} Clients
                  </div>
                </div>
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Avg Recharge: ৳
                  {runningMonthPayments.length
                    ? Math.round(
                        runningMonthTotal / runningMonthPayments.length,
                      )
                    : 0}
                </span>
              </div>
            </div>

            {/* Peak Revenue Day */}
            <div className="bg-gradient-to-br from-amber-900/30 via-slate-900/70 to-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded p-5 shadow-lg relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Peak Revenue Day
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {peakDayRunningMonth.day} Date
                  </div>
                </div>
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded">
                  <Award className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-300 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  Collected on that day: ৳
                  {peakDayRunningMonth.amount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* LIVE DAILY REVENUE GRAPH (1 to 31 Days) */}
          <div className="bg-white backdrop-blur-xl border border-slate-200 rounded p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-sky-400" />
                  <span>
                    Daily Income Graph of Current Month (
                    {past12MonthsList[0]?.monthName})
                  </span>
                </h3>
                <p className="text-xs text-slate-800">
                  Click any daily bar to view that day collection breakdown.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-sky-500 rounded-xs shadow-xs" />
                  <span className="text-slate-900">Regular Day</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-amber-400 rounded-xs shadow-xs animate-pulse" />
                  <span className="text-amber-300 font-bold">
                    Today ({currentDate.getDate()} Date)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-500 rounded-xs shadow-xs" />
                  <span className="text-emerald-300 font-bold">
                    Peak Collection Day
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Day Bars Visualizer */}
            <div className="pt-6 pb-2">
              <div className="h-56 flex items-end gap-1.5 sm:gap-2 px-2 overflow-x-auto">
                {(
                  Object.entries(dailyDataRunningMonth) as [
                    string,
                    { total: number; count: number },
                  ][]
                ).map(([dayStr, data]) => {
                  const dayNum = parseInt(dayStr, 10);
                  const isToday = dayNum === currentDate.getDate();
                  const isPeak =
                    dayNum === peakDayRunningMonth.day && data.total > 0;
                  const isSelected = selectedDayNum === dayNum;
                  const heightPercent =
                    maxDailyAmountRunningMonth > 0
                      ? (data.total / maxDailyAmountRunningMonth) * 100
                      : 0;

                  return (
                    <div
                      key={dayNum}
                      onClick={() => setSelectedDayNum(dayNum)}
                      className="flex-1 min-w-[22px] flex flex-col items-center gap-1 group cursor-pointer transition-all"
                    >
                      {/* Amount Tooltip on Hover / Select */}
                      <div
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md transition-all whitespace-nowrap ${
                          isSelected
                            ? "bg-sky-400 text-slate-950 opacity-100 scale-105"
                            : "bg-white text-slate-900 opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        ৳
                        {data.total >= 1000
                          ? `${(data.total / 1000).toFixed(1)}k`
                          : data.total}
                      </div>

                      {/* Bar Container */}
                      <div className="w-full bg-slate-100 rounded-t-lg h-44 flex items-end p-0.5 relative overflow-hidden">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 relative ${
                            isToday
                              ? "bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                              : isPeak
                                ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                                : isSelected
                                  ? "bg-gradient-to-t from-sky-600 to-sky-300"
                                  : data.total > 0
                                    ? "bg-gradient-to-t from-sky-700 to-cyan-500 group-hover:from-sky-500 group-hover:to-cyan-400 opacity-80 group-hover:opacity-100"
                                    : "bg-slate-700/40 h-1"
                          }`}
                          style={{
                            height: `${Math.max(heightPercent, data.total > 0 ? 8 : 2)}%`,
                          }}
                        >
                          {isToday && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-200 animate-pulse rounded-t-md" />
                          )}
                        </div>
                      </div>

                      {/* Day Label */}
                      <span
                        className={`text-[11px] font-bold ${
                          isToday
                            ? "text-amber-400 font-black underline decoration-amber-400"
                            : isSelected
                              ? "text-sky-400 font-extrabold"
                              : "text-slate-800 group-hover:text-slate-700"
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Info Banner */}
            {selectedDayNum !== null && (
              <div className="bg-slate-100 border border-sky-500/20 rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-sky-500/20 text-sky-400 rounded font-bold">
                    📅 {selectedDayNum} {past12MonthsList[0]?.monthName}
                  </span>
                  <span className="text-slate-900 font-semibold">
                    Total Collection:{" "}
                    <strong className="text-[#00a65a] text-sm font-black">
                      ৳
                      {(
                        dailyDataRunningMonth[selectedDayNum]?.total || 0
                      ).toLocaleString()}
                    </strong>{" "}
                    ({dailyDataRunningMonth[selectedDayNum]?.count || 0}{" "}
                    transactions)
                  </span>
                </div>

                <div className="text-slate-800 text-[11px]">
                  {selectedDayNum === currentDate.getDate() ? (
                    <span className="text-amber-300 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                      ⚡ Today (Running Day)
                    </span>
                  ) : (
                    <span>Click on any date to inspect daily breakdown</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Sources Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="bg-white border border-slate-200 rounded p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-pink-500" />
                  <span>bKash (bKash)</span>
                </h4>
                <span className="text-xs font-bold text-slate-800">
                  ৳{(methodStats.bKash || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 rounded-full"
                  style={{
                    width: `${runningMonthTotal ? ((methodStats.bKash || 0) / runningMonthTotal) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-800 block text-right font-medium">
                {runningMonthTotal
                  ? (
                      ((methodStats.bKash || 0) / runningMonthTotal) *
                      100
                    ).toFixed(1)
                  : 0}
                % Collection
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-500" />
                  <span>Nagad (Nagad)</span>
                </h4>
                <span className="text-xs font-bold text-slate-800">
                  ৳{(methodStats.Nagad || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${runningMonthTotal ? ((methodStats.Nagad || 0) / runningMonthTotal) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-800 block text-right font-medium">
                {runningMonthTotal
                  ? (
                      ((methodStats.Nagad || 0) / runningMonthTotal) *
                      100
                    ).toFixed(1)
                  : 0}
                % Collection
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span>Rocket (Rocket)</span>
                </h4>
                <span className="text-xs font-bold text-slate-800">
                  ৳{(methodStats.Rocket || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${runningMonthTotal ? ((methodStats.Rocket || 0) / runningMonthTotal) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-800 block text-right font-medium">
                {runningMonthTotal
                  ? (
                      ((methodStats.Rocket || 0) / runningMonthTotal) *
                      100
                    ).toFixed(1)
                  : 0}
                % Collection
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#00a65a]" />
                  <span>Hand Cash (Hand)</span>
                </h4>
                <span className="text-xs font-bold text-slate-800">
                  ৳{(methodStats.Cash || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${runningMonthTotal ? ((methodStats.Cash || 0) / runningMonthTotal) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-800 block text-right font-medium">
                {runningMonthTotal
                  ? (
                      ((methodStats.Cash || 0) / runningMonthTotal) *
                      100
                    ).toFixed(1)
                  : 0}
                % Collection
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-[#3c8dbc]" />
                  <span>Hotspot (Voucher)</span>
                </h4>
                <span className="text-xs font-bold text-slate-800">
                  ৳{(methodStats["Hotspot Portal"] || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full"
                  style={{
                    width: `${runningMonthTotal ? ((methodStats["Hotspot Portal"] || 0) / runningMonthTotal) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-800 block text-right font-medium">
                {runningMonthTotal
                  ? (
                      ((methodStats["Hotspot Portal"] || 0) /
                        runningMonthTotal) *
                      100
                    ).toFixed(1)
                  : 0}
                % Collection
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>Bank (Bank)</span>
                </h4>
                <span className="text-xs font-bold text-slate-800">
                  ৳{(methodStats.Bank || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{
                    width: `${runningMonthTotal ? ((methodStats.Bank || 0) / runningMonthTotal) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-800 block text-right font-medium">
                {runningMonthTotal
                  ? (
                      ((methodStats.Bank || 0) / runningMonthTotal) *
                      100
                    ).toFixed(1)
                  : 0}
                % Collection
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: 1-YEAR HISTORICAL ARCHIVE (12 MONTHS) */}
      {/* ========================================================= */}
      {activeTab === "yearly" && (
        <div className="space-y-6">
          {/* Yearly Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-900/30 via-slate-900/70 to-slate-900/90 border border-indigo-500/30 rounded p-5 shadow-lg space-y-1">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Annual Gross Revenue (1 Year)
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800">
                ৳{yearlyTotalRevenue.toLocaleString()}
              </div>
              <span className="text-[11px] text-indigo-300 block font-semibold">
                12 Months Combined Total Collection
              </span>
            </div>

            <div className="bg-gradient-to-br from-emerald-900/30 via-slate-900/70 to-slate-900/90 border border-emerald-500/30 rounded p-5 shadow-lg space-y-1">
              <span className="text-xs font-bold text-[#00a65a] uppercase tracking-wider">
                Monthly Average Collection (Monthly Average)
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800">
                ৳{Math.round(yearlyTotalRevenue / 12).toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-300 block font-semibold">
                Average monthly income
              </span>
            </div>

            <div className="bg-gradient-to-br from-amber-900/30 via-slate-900/70 to-slate-900/90 border border-amber-500/30 rounded p-5 shadow-lg space-y-1">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Selected Month Revenue ({selectedArchiveMonth})
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800">
                ৳{selectedArchiveMonthTotal.toLocaleString()}
              </div>
              <span className="text-[11px] text-amber-300 block font-semibold">
                {selectedArchiveMonthPayments.length} transactions recorded
              </span>
            </div>
          </div>

          {/* 12-MONTH REVENUE COMPARISON BAR CHART */}
          <div className="bg-white backdrop-blur-xl border border-slate-200 rounded p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  <span>12-Month Financial Comparison Graph</span>
                </h3>
                <p className="text-xs text-slate-800">
                  Click any month bar to load detailed monthly analytics.
                </p>
              </div>

              <div className="text-xs text-sky-400 font-extrabold bg-sky-500/10 px-3 py-1.5 rounded border border-sky-500/30">
                Archive Period: 12 Months
              </div>
            </div>

            {/* 12 Month Bars Chart */}
            <div className="pt-6 pb-2">
              <div className="h-56 flex items-end gap-2 sm:gap-3 px-2 overflow-x-auto">
                {past12MonthsList.map((m) => {
                  const isSelected = selectedArchiveMonth === m.monthKey;
                  const heightPercent =
                    maxYearlyMonthAmount > 0
                      ? (m.total / maxYearlyMonthAmount) * 100
                      : 0;

                  return (
                    <div
                      key={m.monthKey}
                      onClick={() => setSelectedArchiveMonth(m.monthKey)}
                      className="flex-1 min-w-[50px] flex flex-col items-center gap-1.5 group cursor-pointer"
                    >
                      {/* Amount Tooltip */}
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md transition-all whitespace-nowrap ${
                          isSelected
                            ? "bg-emerald-400 text-slate-950 opacity-100 scale-105 shadow-md"
                            : "bg-white text-slate-900 opacity-80 group-hover:opacity-100"
                        }`}
                      >
                        ৳{(m.total / 1000).toFixed(0)}k
                      </span>

                      {/* Bar Container */}
                      <div className="w-full bg-slate-100 rounded-t-xl h-44 flex items-end p-1 relative overflow-hidden">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 relative ${
                            isSelected
                              ? "bg-gradient-to-t from-emerald-600 via-teal-400 to-sky-300 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                              : m.total > 0
                                ? "bg-gradient-to-t from-indigo-700 to-sky-500 group-hover:from-indigo-600 group-hover:to-sky-400 opacity-80 group-hover:opacity-100"
                                : "bg-slate-700/30 h-2"
                          }`}
                          style={{ height: `${Math.max(heightPercent, 5)}%` }}
                        />
                      </div>

                      {/* Month Label */}
                      <span
                        className={`text-[11px] font-bold text-center leading-tight ${
                          isSelected
                            ? "text-[#00a65a] font-extrabold underline"
                            : "text-slate-800 group-hover:text-slate-700"
                        }`}
                      >
                        {m.monthName.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PAST MONTH ARCHIVE SELECTOR & DAILY BREAKDOWN */}
          <div className="bg-white backdrop-blur-xl border border-slate-200 rounded p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded font-bold">
                  🗓️ Viewing History
                </span>
                <select
                  value={selectedArchiveMonth}
                  onChange={(e) => setSelectedArchiveMonth(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:outline-none focus:border-[#3c8dbc] cursor-pointer"
                >
                  {past12MonthsList.map((m) => (
                    <option key={m.monthKey} value={m.monthKey}>
                      {m.monthName} (Revenue: ৳{m.total.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-[#00a65a] font-bold">
                Total Collection: ৳{selectedArchiveMonthTotal.toLocaleString()}{" "}
                ({selectedArchiveMonthPayments.length} entries)
              </div>
            </div>

            {/* Daily Breakdown for Selected Archive Month */}
            <div className="pt-2">
              <h4 className="text-xs font-extrabold text-slate-900 mb-3">
                {selectedArchiveMonth} Month Daily Collection Graph:
              </h4>

              <div className="h-44 flex items-end gap-1 px-1 overflow-x-auto">
                {(
                  Object.entries(selectedArchiveMonthDailyData) as [
                    string,
                    { total: number; count: number },
                  ][]
                ).map(([dayStr, data]) => {
                  const dayNum = parseInt(dayStr, 10);
                  const heightPercent =
                    maxDailyInSelectedArchive > 0
                      ? (data.total / maxDailyInSelectedArchive) * 100
                      : 0;

                  return (
                    <div
                      key={dayNum}
                      className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group"
                    >
                      <div className="w-full bg-slate-100 rounded-t-md h-32 flex items-end p-0.5">
                        <div
                          className={`w-full rounded-t-xs transition-all ${
                            data.total > 0
                              ? "bg-gradient-to-t from-indigo-600 to-sky-400 opacity-80 group-hover:opacity-100"
                              : "bg-slate-700/20 h-1"
                          }`}
                          style={{
                            height: `${Math.max(heightPercent, data.total > 0 ? 8 : 2)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-800 font-semibold">
                        {dayNum}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TRANSACTIONS TABLE LIST (WORKS FOR RUNNING / YEARLY / ALL) */}
      {/* ========================================================= */}
      <div className="bg-white backdrop-blur-xl border border-slate-200 rounded p-5 sm:p-6 shadow-md space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#00a65a]" />
              <span>
                {activeTab === "running"
                  ? "Current Month Revenue Sources & Transactions"
                  : activeTab === "yearly"
                    ? `${selectedArchiveMonth} Month Transaction History`
                    : "All-Time Recharge Transactions"}
              </span>
            </h3>
            <p className="text-xs text-slate-800 mt-0.5">
              Total {filteredTransactionsList.length} recharge records shown
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-800 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Client Name / ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3c8dbc] w-44 sm:w-52"
              />
            </div>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#3c8dbc] cursor-pointer"
            >
              <option value="all">All Payment Methods</option>
              <option value="bKash">bKash (bKash)</option>
              <option value="Nagad">Nagad (Nagad)</option>
              <option value="Rocket">Rocket (Rocket)</option>
              <option value="Cash">Hand Cash (Hand/Cash)</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Hotspot Portal">Hotspot Portal</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#3c8dbc] cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="Broadband Renewal">Broadband Recharge</option>
              <option value="Hotspot Voucher">Hotspot Voucher</option>
              <option value="New Client Activation">New Connection</option>
              <option value="Corporate Bill">Corporate Bill</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-800 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Txn ID / Time</th>
                <th className="py-3 px-3">Client Details</th>
                <th className="py-3 px-3">Package</th>
                <th className="py-3 px-3">Payment Source</th>
                <th className="py-3 px-3">Type / Collector</th>
                <th className="py-3 px-3 text-right">Amount (BDT)</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-slate-700 font-medium">
              {filteredTransactionsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-800">
                    No transaction records found.
                  </td>
                </tr>
              ) : (
                filteredTransactionsList.map((p) => (
                  <tr key={p.id} className="hover:bg-white transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{p.id}</div>
                      <div className="text-[10px] text-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-800" />
                        <span>{p.timestamp}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">
                        {p.clientName}
                      </div>
                      <div className="text-[10px] text-sky-400 font-mono">
                        User ID: {p.userId}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {p.package}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                          p.paymentMethod === "bKash"
                            ? "bg-pink-500/20 text-pink-300 border border-pink-500/40"
                            : p.paymentMethod === "Nagad"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : p.paymentMethod === "Rocket"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                : p.paymentMethod === "Cash"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : p.paymentMethod === "Hotspot Portal"
                                    ? "bg-cyan-500/20 text-[#3c8dbc] border border-cyan-500/40"
                                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                        }`}
                      >
                        {p.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-slate-900 font-semibold">
                        {p.transactionType}
                      </div>
                      <div className="text-[10px] text-slate-800">
                        Collector: {p.collector}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <span className="text-sm font-black text-[#00a65a]">
                        ৳{p.amount.toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-[#00a65a] border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{p.status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD RECHARGE / PAYMENT RECORD */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-white backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-sky-500/30 rounded p-6 max-w-lg w-full shadow-md space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#00a65a]" />
                <span>New Client Recharge / Payment Entry</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-800 hover:text-slate-800 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRecharge} className="space-y-3 text-xs">
              {/* Select Existing Client or Custom Entry */}
              <div>
                <label className="block text-slate-900 font-semibold mb-1">
                  Select Existing Client (Optional)
                </label>
                <select
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 font-medium focus:outline-none focus:border-[#3c8dbc]"
                >
                  <option value="">
                    -- Or enter name & ID manually below --
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.userId}) - {c.package}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-900 font-semibold mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
                  />
                </div>

                <div>
                  <label className="block text-slate-900 font-semibold mb-1">
                    User ID / Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FE-88017"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-900 font-semibold mb-1">
                    Select Package
                  </label>
                  <select
                    value={newPackage}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.name}>
                        {pkg.name} (৳{pkg.price})
                      </option>
                    ))}
                    <option value="Custom Voucher">
                      Custom Hotspot Voucher
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-900 font-semibold mb-1">
                    Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="800"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 font-extrabold text-[#00a65a] focus:outline-none focus:border-[#3c8dbc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-slate-900 font-semibold mb-1">
                    Payment Method (Source)
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {(
                      [
                        "bKash",
                        "Nagad",
                        "Rocket",
                        "Cash",
                        "Bank",
                        "Hotspot Portal",
                      ] as const
                    ).map((method) => {
                      // Hotspot portal doesn't map to a logo key properly without a fallback, but others do
                      const logoUrl =
                        method === "Hotspot Portal"
                          ? null
                          : settings?.paymentLogos?.[
                              method.toLowerCase() as keyof typeof settings.paymentLogos
                            ];
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setNewMethod(method as any)}
                          className={`p-2 rounded-lg font-bold border flex flex-col items-center justify-center gap-2 transition-colors min-h-[60px] ${
                            newMethod === method
                              ? "bg-emerald-900/50 border-emerald-500 text-[#00a65a] shadow-sm"
                              : "bg-white border-slate-300 text-slate-800 hover:border-emerald-500/50 hover:shadow-sm"
                          }`}
                        >
                          {logoUrl && (
                            <div className="h-6 w-full flex items-center justify-center">
                              <img
                                src={logoUrl}
                                alt={method}
                                className="h-full max-w-full object-contain"
                              />
                            </div>
                          )}
                          <span className="text-[9px] sm:text-[10px] leading-tight text-center">
                            {method}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-900 font-semibold mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
                  >
                    <option value="Broadband Renewal">
                      Broadband Recharge
                    </option>
                    <option value="Hotspot Voucher">Hotspot Voucher</option>
                    <option value="New Client Activation">
                      New Client Activation
                    </option>
                    <option value="Corporate Bill">Corporate Bill</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-900 font-semibold mb-1">
                    Recharge Date
                  </label>
                  <input
                    type="date"
                    value={newDateKey}
                    onChange={(e) => setNewDateKey(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
                  />
                </div>

                <div>
                  <label className="block text-slate-900 font-semibold mb-1">
                    Collector Name
                  </label>
                  <input
                    type="text"
                    value={newCollector}
                    onChange={(e) => setNewCollector(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-200 text-slate-900 rounded font-bold transition-colors cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-extrabold transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  ⚡ Submit & Add to Graph
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
