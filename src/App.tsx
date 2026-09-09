import React, { useState, useEffect, useRef } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  signInAnonymously,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
} from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import {
  LogIn,
  RefreshCw,
  ArrowLeft,
  Home,
  ChevronRight,
  RotateCcw,
  Globe,
  Users,
  Shield,
  ShoppingBag,
  Zap,
  Sparkles,
  Wifi,
} from "lucide-react";
import {
  PageId,
  Client,
  Package,
  BandwidthProfile,
  DaysProfile,
  HotspotUser,
  HotspotPackageRequest,
  AppSettings,
  RouterConfig,
  NotificationItem,
  AuditLog,
  ToastMessage,
  PaymentRecord,
  MikrotikRouter,
  Invoice,
  BroadbandRenewalRequest,
  OnlinePackageOrder,
} from "./types";
import {
  initialClients,
  initialPackages,
  initialBandwidthProfiles,
  initialDaysProfiles,
  initialHotspotUsers,
  initialHotspotRequests,
  initialSettings,
  initialRouterConfig,
  initialNotifications,
  initialAuditLogs,
  initialPayments,
  initialRouters,
  initialInvoices,
  cleanPackageName,
} from "./data/initialData";

import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { ToastContainer } from "./components/Toast";

import { Dashboard } from "./components/pages/Dashboard";
import { ClientsPage } from "./components/pages/Clients";
import { BillingPage } from "./components/pages/BillingPage";
import { PackagesPage } from "./components/pages/Packages";
import { BandwidthPage } from "./components/pages/Bandwidth";
import { DaysProfilePage } from "./components/pages/DaysProfile";
import { MikrotikConfigurePage } from "./components/pages/MikrotikConfigure";
import { MikrotikManagementPage } from "./components/pages/MikrotikManagement";
import { MikrotikSecurityPage } from "./components/pages/MikrotikSecurity";
import { HotspotPage } from "./components/pages/Hotspot";
import {
  HotspotConfigPage,
  buildDynamicHotspotHtml,
} from "./components/pages/HotspotConfig";
import { ReportsPage } from "./components/pages/Reports";
import { NotificationsPage } from "./components/pages/Notifications";
import { AuditLogsPage } from "./components/pages/AuditLogs";
import { SettingsPage } from "./components/pages/Settings";
import { IspDigitalModulePage } from "./components/pages/IspDigitalModules";
import { RevenueTrackerPage } from "./components/pages/RevenueTracker";
import { SubscriptionsPage } from "./components/pages/SubscriptionsPage";
import { LiveBandwidthPage } from "./components/pages/LiveBandwidthPage";
import { SupportTicketsPage } from "./components/pages/SupportTicketsPage";
import { SmsNotificationPage } from "./components/pages/SmsNotificationPage";
import { ExpensesPage } from "./components/pages/ExpensesPage";
import { NetworkCoverageMap } from "./components/pages/NetworkCoverageMap";
import { SecurityPage } from "./components/pages/SecurityPage";
import { InvoicePrintPage } from "./components/pages/InvoicePrintPage";
import { AdminProfilePage } from "./components/pages/AdminProfilePage";
import { ClientLoginScreen } from "./components/pages/ClientLoginScreen";
import { ClientDashboard } from "./components/pages/ClientDashboard";
import { BuyPackagePortal } from "./components/pages/BuyPackagePortal";
import { IntroScreen } from "./components/IntroScreen";
import { TechBackground, TouchSparkleOverlay } from "./components/TechEffects";
import { PinLockScreen } from "./components/PinLockScreen";
import { getClientExpiryInfo, addDaysToExpiry, parseValidityDays, findPackageByDetails } from "./lib/expiryUtils";
import { BillingModal } from "./components/flowforge/BillingModal";
import { ImportWizard } from "./components/flowforge/ImportWizard";
import { TownViewModal } from "./components/flowforge/TownViewModal";
import { sanitizeForStorage } from "./lib/storageUtils";

const writeTimeouts: Record<string, any> = {};
const firstTimeInitAttempted = new Set<string>();

function usePersistentState<T>(
  key: string,
  initialValue: T,
  uid: string,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      if (parsed === null || parsed === undefined) return initialValue;
      return sanitizeForStorage(parsed) as T;
    } catch {
      return initialValue;
    }
  });

  const stateRef = useRef<T>(state);
  stateRef.current = state;
  const getInitialUpdatedAt = (): number => {
    try {
      const saved = localStorage.getItem(`${key}_updatedAt`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  };
  const lastLocalUpdatedAtRef = useRef<number>(getInitialUpdatedAt());

  // Immediate synchronous LocalStorage write + Instant Backend DB write + Debounced Firestore sync
  const setPersistentState: React.Dispatch<React.SetStateAction<T>> = (
    value,
  ) => {
    let nextVal: T;
    if (typeof value === "function") {
      nextVal = (value as (prev: T) => T)(stateRef.current);
    } else {
      nextVal = value;
    }

    const sanitized = sanitizeForStorage(nextVal);

    // Deep value equality check to completely prevent redundant updates & write-stream loops
    const currentStr = JSON.stringify(stateRef.current);
    const nextStr = JSON.stringify(sanitized);
    if (currentStr === nextStr) {
      return;
    }

    const now = Date.now();
    lastLocalUpdatedAtRef.current = now;
    stateRef.current = sanitized;
    setState(sanitized);

    try {
      localStorage.setItem(key, nextStr);
      localStorage.setItem(`${key}_updatedAt`, now.toString());
    } catch (e) {
      try {
        localStorage.removeItem("nexora_audit_logs");
        localStorage.setItem(key, nextStr);
        localStorage.setItem(`${key}_updatedAt`, now.toString());
      } catch {
        // ignore
      }
    }

    // Cancel any pending debounced writes to conserve quota
    if (writeTimeouts[key]) {
      clearTimeout(writeTimeouts[key]);
    }

    // 1. Instantly Sync with local/server backend database with explicit timestamp
    fetch("/api/db/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: sanitized, updatedAt: now }),
    }).catch((err) => console.warn("Backend db/set sync warning:", err));

    // 2. Sync with Firebase Firestore (Short debounce)
    writeTimeouts[key] = setTimeout(() => {
      delete writeTimeouts[key];
      const docRef = doc(db, "ispWorkspace", "mainData", "collections", key);
      setDoc(docRef, { value: sanitized, updatedAt: now }).catch((err) => {
        console.warn(`Firestore save error for ${key}:`, err);
      });

      if (uid && uid !== "nexora_network_admin") {
        setDoc(doc(db, "users", uid, "appData", key), {
          value: sanitized,
          updatedAt: now,
        }).catch(() => {});
      }
    }, 300);
  };

  // Realtime Sync Listener across devices/tabs & page refreshes (Dual API: Express Backend Polling + Firestore Snapshot fallback)
  useEffect(() => {
    let active = true;

    // Helper to process fetched data from either server or Firestore
    const applyRemoteData = (remoteVal: any, remoteUpdatedAt: number) => {
      if (!active || remoteVal === undefined || remoteVal === null) return;

      // Only guard if we have a pending local write in progress
      if (writeTimeouts[key]) {
        return;
      }

      // If local state is newer than the remote record, reject stale remote cache
      if (remoteUpdatedAt && remoteUpdatedAt < lastLocalUpdatedAtRef.current) {
        return;
      }

      const currentStr = JSON.stringify(stateRef.current);
      const remoteStr = JSON.stringify(remoteVal);
      if (currentStr !== remoteStr) {
        stateRef.current = remoteVal;
        lastLocalUpdatedAtRef.current = remoteUpdatedAt || Date.now();
        setState(remoteVal as T);
        try {
          localStorage.setItem(key, remoteStr);
          localStorage.setItem(
            `${key}_updatedAt`,
            (remoteUpdatedAt || Date.now()).toString(),
          );
        } catch {
          // ignore
        }
      }
    };

    // A. Express Backend Database sync (Fast, zero-quota, cross-device reliable)
    const syncWithBackend = () => {
      fetch(`/api/db/get?key=${key}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.value !== null) {
            applyRemoteData(data.value, data.updatedAt || 0);
          } else if (data.success && data.value === null) {
            // First time initializer fallback
            const initialData = sanitizeForStorage(stateRef.current);
            fetch("/api/db/set", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key, value: initialData, updatedAt: Date.now() }),
            }).catch(() => {});
          }
        })
        .catch((err) => console.warn("Backend db/get sync warning:", err));
    };

    // Initial load
    syncWithBackend();

    // Poll backend database every 3 seconds for lightweight, zero-quota real-time updates
    const pollInterval = setInterval(syncWithBackend, 3000);

    // B. Firebase Firestore snapshot sync (Parallel Backup)
    const docRef = doc(db, "ispWorkspace", "mainData", "collections", key);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.metadata.hasPendingWrites) {
          return;
        }

        if (snap.exists()) {
          const cloudVal = snap.data().value;
          const cloudUpdatedAt = snap.data().updatedAt || 0;
          applyRemoteData(cloudVal, cloudUpdatedAt);
        } else {
          // Guard first-time initialization to prevent looping
          if (!firstTimeInitAttempted.has(key)) {
            firstTimeInitAttempted.add(key);
            const initialData = sanitizeForStorage(stateRef.current);
            setDoc(docRef, { value: initialData, updatedAt: Date.now() }).catch(
              (err) => {
                console.warn(
                  `First-time initialization failed for ${key}:`,
                  err,
                );
              },
            );
          }
        }
      },
      (err) => {
        console.warn(`Firestore onSnapshot error for ${key}:`, err);
      },
    );

    return () => {
      active = false;
      clearInterval(pollInterval);
      unsub();
      if (writeTimeouts[key]) {
        clearTimeout(writeTimeouts[key]);
      }
    };
  }, [key]);

  return [state, setPersistentState];
}

export function MainApp({
  uid,
  onLockApp,
}: {
  uid: string;
  onLockApp?: () => void;
}) {
  const [showIntro, setShowIntro] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");
  const [pageHistory, setPageHistory] = useState<PageId[]>(["dashboard"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (page: PageId) => {
    if (page !== currentPage) {
      setPageHistory((prev) => [...prev, page]);
      setCurrentPage(page);
    }
  };

  const handleGoBack = () => {
    if (pageHistory.length > 1) {
      const newHistory = [...pageHistory];
      newHistory.pop();
      const prevPage = newHistory[newHistory.length - 1] || "dashboard";
      setPageHistory(newHistory);
      setCurrentPage(prevPage);
    } else {
      setCurrentPage("dashboard");
    }
  };
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("nexora_dark");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [clients, setClients] = usePersistentState<Client[]>(
    "nexora_clients",
    initialClients,
    uid,
  );
  const hasAutoOfflinedRef = useRef(false);
  const [packages, setPackages] = usePersistentState<Package[]>(
    "nexora_packages",
    initialPackages,
    uid,
  );

  // Auto-migration & De-duplication: Clean names, remove duplicate packages, and append missing ones
  useEffect(() => {
    if (!packages) return;

    if (
      (packages.length === 5 && packages[0]?.name === "Fiber 10") ||
      packages.length === 0
    ) {
      setPackages(initialPackages);
      return;
    }

    let mutated = false;
    // 1. Clean names first
    const cleaned = packages.map((p) => {
      const cleanName = cleanPackageName(p.name);
      if (p.name !== cleanName) {
        mutated = true;
        return { ...p, name: cleanName };
      }
      return p;
    });

    // 2. De-duplicate by both ID and Name to ensure absolutely unique packages
    const uniquePkgs: Package[] = [];
    const seenIds = new Set<number>();
    const seenNames = new Set<string>();

    for (const pkg of cleaned) {
      if (!seenIds.has(pkg.id) && !seenNames.has(pkg.name)) {
        uniquePkgs.push(pkg);
        seenIds.add(pkg.id);
        seenNames.add(pkg.name);
      } else {
        mutated = true;
      }
    }

    // 3. Make sure all initialPackages are present
    const missing = initialPackages.filter(
      (initPkg) => !uniquePkgs.some((pkg) => pkg.name === initPkg.name || pkg.id === initPkg.id)
    );
    if (missing.length > 0) {
      uniquePkgs.push(...missing);
      mutated = true;
    }

    if (mutated) {
      setPackages(uniquePkgs);
    }
  }, [packages, setPackages]);

  // Auto-migration: Clean any "DFNHOB-" prefixes from saved clients' assigned packages
  useEffect(() => {
    if (clients && clients.some((c) => c.package && c.package.startsWith("DFNHOB"))) {
      setClients((prev) => {
        if (!prev) return prev;
        return prev.map((c) => ({
          ...c,
          package: cleanPackageName(c.package),
        }));
      });
    }
  }, [clients, setClients]);

  const [bandwidthProfiles, setBandwidthProfiles] = usePersistentState<
    BandwidthProfile[]
  >("nexora_bandwidth", initialBandwidthProfiles, uid);
  const [daysProfiles, setDaysProfiles] = usePersistentState<DaysProfile[]>(
    "nexora_days_profiles",
    initialDaysProfiles,
    uid,
  );
  const [hotspotUsers, setHotspotUsers] = usePersistentState<HotspotUser[]>(
    "nexora_hotspot_users",
    initialHotspotUsers,
    uid,
  );
  const [hotspotRequests, setHotspotRequests] = usePersistentState<
    HotspotPackageRequest[]
  >("nexora_hotspot_requests", initialHotspotRequests, uid);
  const [settings, setSettings] = usePersistentState<AppSettings>(
    "nexora_settings",
    initialSettings,
    uid,
  );
  const [adminProfile, setAdminProfile] = usePersistentState<any>(
    "nexora_admin_profile",
    {
      name: "Md. Al-Amin (System Admin)",
      role: "Super Administrator / NOC Lead",
      email: "admin@nexoranetwork.net",
      phone: "+880 1711-223344",
      address: "Dhaka, Bangladesh",
      avatar: null,
      twoFactor: true,
      timezone: "Asia/Dhaka (GMT+6)",
    },
    uid,
  );
  const [routerConfig, setRouterConfig] = usePersistentState<RouterConfig>(
    "nexora_router_config",
    initialRouterConfig,
    uid,
  );
  const [notifications, setNotifications] = usePersistentState<
    NotificationItem[]
  >("nexora_notifications", initialNotifications, uid);
  const [auditLogs, setAuditLogs] = usePersistentState<AuditLog[]>(
    "nexora_audit_logs",
    initialAuditLogs,
    uid,
  );
  const [payments, setPayments] = usePersistentState<PaymentRecord[]>(
    "nexora_payments",
    initialPayments,
    uid,
  );
  const [invoices, setInvoices] = usePersistentState<Invoice[]>(
    "nexora_invoices",
    initialInvoices,
    uid,
  );
  const [routers, setRouters] = usePersistentState<MikrotikRouter[]>(
    "nexora_routers",
    initialRouters,
    uid,
  );
  const [renewalRequests, setRenewalRequests] = usePersistentState<
    BroadbandRenewalRequest[]
  >("nexora_renewal_requests", [], uid);
  const [onlineOrders, setOnlineOrders] = usePersistentState<
    OnlinePackageOrder[]
  >("nexora_online_orders", [], uid);
  const [selectedRouterId, setSelectedRouterId] = useState<string>(
    initialRouters[0]?.id || "mk-01",
  );

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [canAutoGenerateInvoices, setCanAutoGenerateInvoices] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCanAutoGenerateInvoices(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Ensure every client has a unique ID to prevent key collisions
  useEffect(() => {
    if (!clients || clients.length === 0) return;
    const seen = new Set<string>();
    let hasDupes = false;
    const clean: Client[] = clients.map((c, idx) => {
      const idStr = String(c.id || "");
      if (!c.id || seen.has(idStr)) {
        hasDupes = true;
        const newId = c.id
          ? `${c.id}_${idx}_${Math.random().toString(36).substring(2, 6)}`
          : `CLI-${Date.now()}-${idx}`;
        seen.add(newId);
        return { ...c, id: newId };
      }
      seen.add(idStr);
      return c;
    });
    if (hasDupes) {
      setClients(clean);
    }
  }, [clients, setClients]);

  // Clean up duplicate payment records & clear pending payments once completed
  useEffect(() => {
    if (!payments || payments.length === 0) return;

    const seenIds = new Set<string>();
    const seenTrxKeys = new Set<string>();
    let modified = false;

    // Collect completed payment transaction keys
    const completedList = payments.filter(
      (p) =>
        p &&
        p.status !== "Pending" &&
        p.status !== "Pending Approval" &&
        p.status !== "Refunded" &&
        p.status !== "Rejected",
    );

    for (const c of completedList) {
      const trx = c.notes?.match(/TrxID:\s*([^\s|]+)/i)?.[1]?.toLowerCase();
      if (trx) seenTrxKeys.add(trx);
      if (c.userId && c.amount && c.dateKey) {
        seenTrxKeys.add(
          `${c.userId.toLowerCase()}_${c.amount}_${c.dateKey}`,
        );
      }
    }

    const clean: PaymentRecord[] = [];
    for (const p of payments) {
      if (!p || !p.id) {
        modified = true;
        continue;
      }

      // Check ID duplicate
      if (seenIds.has(p.id)) {
        modified = true;
        continue;
      }

      const isPending =
        p.status === "Pending" || p.status === "Pending Approval";

      if (isPending) {
        const pTrx = p.notes
          ?.match(/TrxID:\s*([^\s|]+)/i)?.[1]
          ?.toLowerCase();
        const pComposite =
          p.userId && p.amount && p.dateKey
            ? `${p.userId.toLowerCase()}_${p.amount}_${p.dateKey}`
            : null;

        // Clear out pending record if completed payment exists for same trx or same user+amount+date
        if (
          (pTrx && seenTrxKeys.has(pTrx)) ||
          (pComposite && seenTrxKeys.has(pComposite))
        ) {
          modified = true;
          continue;
        }
      }

      // Check duplicate completed payments
      if (!isPending) {
        const pTrx = p.notes
          ?.match(/TrxID:\s*([^\s|]+)/i)?.[1]
          ?.toLowerCase();

        if (pTrx && seenTrxKeys.has(`completed_trx_${pTrx}`)) {
          modified = true;
          continue;
        }

        if (pTrx) seenTrxKeys.add(`completed_trx_${pTrx}`);
      }

      seenIds.add(p.id);
      clean.push(p);
    }

    if (modified) {
      setPayments(clean);
    }
  }, [payments, setPayments]);

  // FlowForge Global Modals
  const [globalBillingModalOpen, setGlobalBillingModalOpen] = useState(false);
  const [globalImportWizardOpen, setGlobalImportWizardOpen] = useState(false);
  const [globalTownViewOpen, setGlobalTownViewOpen] = useState(false);
  const [selectedLedgerClient, setSelectedLedgerClient] =
    useState<Client | null>(null);

  // Online Package Order Handlers (Payment Verification & Router Activation)
  const handleApproveOnlineOrder = async (orderId: string) => {
    const order = onlineOrders.find((o) => o.id === orderId);
    if (!order) return;

    const orderPrice = parseFloat(order.price) || 500;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // 1. Find client or create new client in database
    let existingClient = clients.find(
      (c) => c.id === order.clientId || c.userId === order.userId,
    );
    let updatedClient: Client;

    if (existingClient) {
      const pkg = findPackageByDetails(packages, order.packageName, orderPrice);
      const validityDays = parseValidityDays(pkg?.validity, order.packageName, orderPrice);

      const isPendingOrExpired =
        existingClient.status === "pending_approval" ||
        existingClient.status === "offline" ||
        getClientExpiryInfo(existingClient.expiry).isExpired;

      const baseExpiryStr = isPendingOrExpired ? undefined : existingClient.expiry;
      const newExpiry = addDaysToExpiry(baseExpiryStr, validityDays);

      updatedClient = {
        ...existingClient,
        package: order.packageName,
        bandwidth: order.bandwidth,
        downloadSpeed: order.bandwidth,
        uploadSpeed: pkg?.upload || existingClient.uploadSpeed || "10 Mbps",
        price: String(orderPrice),
        status: "online",
        expiry: newExpiry,
        password: order.password || existingClient.password || "123456",
        photo: order.photo || existingClient.photo,
      };

      setClients((prev) =>
        prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)),
      );
    } else {
      const pkg = findPackageByDetails(packages, order.packageName, orderPrice);
      const validityDays = parseValidityDays(pkg?.validity, order.packageName, orderPrice);
      const newExpiry = addDaysToExpiry(undefined, validityDays);
      updatedClient = {
        id: order.clientId || `CLI-${Date.now()}`,
        name: order.clientName,
        phone: order.phone,
        userId: order.userId,
        password: order.password || "123456",
        package: order.packageName,
        bandwidth: order.bandwidth,
        downloadSpeed: order.bandwidth,
        uploadSpeed: "10 Mbps",
        status: "online",
        expiry: newExpiry,
        router: order.targetRouter || (routers[0]?.name || "Core MikroTik Gateway"),
        deviceType: order.connectionType === "Hotspot" ? "Mobile" : "Router",
        price: String(orderPrice),
        priority: "8",
        photo: order.photo,
      };
      setClients((prev) => {
        const filtered = prev.filter(
          (c) => c.id !== updatedClient.id && c.userId !== updatedClient.userId,
        );
        return [updatedClient, ...filtered];
      });
    }

    // 2. Upload / Sync with MikroTik Router API
    const targetRouter =
      routers.find((r) => r.name === order.targetRouter) ||
      routers.find((r) => r.name === updatedClient.router) ||
      routers.find((r) => r.id === selectedRouterId) ||
      routers[0];

    syncClientToMikrotik(updatedClient, targetRouter);

    // 3. Mark Online Order as Approved
    setOnlineOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "approved",
              approvedAt: `${dateStr} ${timeStr}`,
            }
          : o,
      ),
    );

    // 4. Record Payment in ledger - Replace matching pending record with completed payment
    setPayments((prev) => {
      const isMatchingPending = (p: PaymentRecord) => {
        const isPend =
          p.status === "Pending" || p.status === "Pending Approval";
        if (!isPend) return false;
        if (p.userId === order.userId || p.clientName === order.clientName)
          return true;
        if (
          order.transactionId &&
          (p.notes?.includes(order.transactionId) ||
            p.id === order.transactionId)
        )
          return true;
        if (order.orderNumber && p.notes?.includes(order.orderNumber))
          return true;
        return false;
      };

      const pendingMatch = prev.find(isMatchingPending);

      const paymentRec: PaymentRecord = {
        id: pendingMatch
          ? pendingMatch.id
          : `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        clientName: order.clientName,
        userId: order.userId,
        package: order.packageName,
        amount: orderPrice,
        paymentMethod:
          order.paymentMethod === "Cash"
            ? "Cash"
            : (order.paymentMethod as any),
        transactionType: "New Client Activation",
        collector: "Admin Approved",
        timestamp: `${dateStr} ${timeStr}`,
        dateKey: dateStr,
        monthKey: dateStr.slice(0, 7),
        status: "Completed",
        notes: `Admin Approved Order ${order.orderNumber}. TrxID: ${order.transactionId}. Router Upload Done.`,
      };

      const remaining = prev.filter((p) => !isMatchingPending(p));
      return [paymentRec, ...remaining];
    });

    // 5. Send automated confirmation SMS log
    try {
      const smsLog = {
        id: `SMS-${Math.floor(1000 + Math.random() * 9000)}`,
        recipientName: order.clientName,
        phone: order.phone,
        type: "Order Approved",
        message: `Dear ${order.clientName}, your package ${order.packageName} is approved & active! Login User: ${order.userId}, Pass: ${order.password || "123456"}. Enjoy Nexora Internet!`,
        sentAt: new Date().toLocaleString(),
        status: "Delivered",
      };
      const localLogs = localStorage.getItem("isp_sms_logs");
      const currentLogs = localLogs ? JSON.parse(localLogs) : [];
      localStorage.setItem(
        "isp_sms_logs",
        JSON.stringify([smsLog, ...currentLogs]),
      );
      fetch("/api/db/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "isp_sms_logs",
          value: [smsLog, ...currentLogs],
        }),
      }).catch(() => {});
    } catch {}

    addAuditLog(
      "Approve Online Order",
      `Approved ${order.orderNumber} for ${order.clientName} (TrxID: ${order.transactionId})`,
    );
    showToast(
      `✅ ${order.clientName} এর প্যাকেজ অনুমোদন করা হয়েছে ও মাইক্রোটিকে এক্টিভ হয়েছে!`,
      "success",
    );
  };

  const handleRejectOnlineOrder = (orderId: string) => {
    const order = onlineOrders.find((o) => o.id === orderId);
    if (!order) return;

    setOnlineOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "rejected",
              rejectionReason: "Invalid TrxID or Admin Rejected",
            }
          : o,
      ),
    );

    setClients((prev) =>
      prev.map((c) =>
        c.id === order.clientId || c.userId === order.userId
          ? { ...c, status: "suspended" }
          : c,
      ),
    );

    addAuditLog(
      "Reject Online Order",
      `Rejected ${order.orderNumber} (${order.clientName})`,
    );
    showToast(
      `প্যাকেজ ক্রয় রিকোয়েস্ট (${order.orderNumber}) বাতিল করা হয়েছে।`,
      "info",
    );
  };

  // Invoice Handlers
  const handleAddInvoice = (newInvoice: Invoice) => {
    setInvoices((prev) => [newInvoice, ...prev]);
    addAuditLog(
      "Create Invoice",
      `${newInvoice.invoiceNumber} - ${newInvoice.clientName} (৳${newInvoice.totalAmount})`,
    );
  };

  const handleUpdateInvoice = (updated: Invoice) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === updated.id ? updated : inv)),
    );
    addAuditLog("Update Invoice", updated.invoiceNumber);
  };

  const handleDeleteInvoice = (id: string) => {
    const target = invoices.find((i) => i.id === id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    addAuditLog("Delete Invoice", target?.invoiceNumber || id);
  };

  const handleRecordInvoicePayment = (
    invoiceId: string,
    paidAmount: number,
    method: "bKash" | "Nagad" | "Rocket" | "Cash" | "Bank" | "Online Gateway",
    trxId?: string,
    collector: string = "Admin",
    extendExpiry: boolean = true,
  ) => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const fullTimestamp = `${dateStr} ${timeStr}`;
    const newPaidTotal = (target.paidAmount || 0) + paidAmount;
    const newDue = Math.max(0, target.totalAmount - newPaidTotal);
    const newStatus: "paid" | "pending" | "overdue" =
      newDue <= 0 ? "paid" : target.status;

    // Update invoice
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            paidAmount: newPaidTotal,
            dueAmount: newDue,
            status: newStatus,
            paymentMethod: method,
            transactionId: trxId || inv.transactionId,
            paidAt: fullTimestamp,
          };
        }
        return inv;
      }),
    );

    // Also record transaction in payments ledger for RevenueTracker
    const paymentRec: PaymentRecord = {
      id: `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: target.clientName,
      userId: target.userId,
      package: target.package,
      amount: paidAmount,
      paymentMethod: (method === "Online Gateway" ? "bKash" : method) as any,
      transactionType: "Broadband Renewal",
      collector: collector || "Admin",
      timestamp: fullTimestamp,
      dateKey: dateStr,
      monthKey: dateStr.slice(0, 7),
      status: "Completed",
      notes: `Invoice: ${target.invoiceNumber}${trxId ? ` | TrxID: ${trxId}` : ""}`,
    };
    setPayments((prev) => [paymentRec, ...prev]);

    // Optionally extend client expiry by package validity days if paid in full
    if (extendExpiry && newDue <= 0 && target.clientId) {
      setClients((prev) =>
        prev.map((c) => {
          if (c.id === target.clientId) {
            const pkg = findPackageByDetails(packages, c.package, c.price);
            const validityDays = parseValidityDays(pkg?.validity, c.package, c.price);

            const isPendingOrExpired =
              c.status === "pending_approval" ||
              c.status === "offline" ||
              getClientExpiryInfo(c.expiry).isExpired;

            const baseExpiryStr = isPendingOrExpired ? undefined : c.expiry;
            const newExp = addDaysToExpiry(baseExpiryStr, validityDays);
            return {
              ...c,
              expiry: newExp,
              status: "online",
            };
          }
          return c;
        }),
      );
    }

    addAuditLog(
      "Record Payment",
      `${target.invoiceNumber} - ৳${paidAmount} via ${method}`,
    );
  };

  const handleBulkGenerateInvoices = (
    month: string,
    issueDate: string,
    dueDate: string,
    selectedClientIds?: string[],
  ) => {
    const targetClients = selectedClientIds
      ? clients.filter((c) => selectedClientIds.includes(c.id))
      : clients;

    const newInvoices: Invoice[] = targetClients.map((client, idx) => {
      const pkg = packages.find((p) => p.name === client.package);
      const rawPrice = client.price || pkg?.price || "500";
      const parsedPrice =
        parseInt(String(rawPrice).replace(/[^\d]/g, ""), 10) || 500;
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${month.replace("-", "")}-${randomNum}`;

      return {
        id: `inv-${Date.now()}-${idx}-${randomNum}`,
        invoiceNumber,
        clientId: client.id,
        clientName: client.name,
        userId: client.userId,
        phone: client.phone,
        address: settings.address || "",
        router: client.router || "Main Router",
        package: client.package,
        speed: client.downloadSpeed
          ? `${client.downloadSpeed} Mbps`
          : client.bandwidth,
        billingMonth: month,
        issueDate,
        dueDate,
        items: [
          {
            id: `item-${Date.now()}-${idx}`,
            description: `${client.package} Subscription (${client.bandwidth || "Standard"}) - ${month}`,
            quantity: 1,
            unitPrice: parsedPrice,
            total: parsedPrice,
          },
        ],
        subtotal: parsedPrice,
        discount: 0,
        tax: 0,
        totalAmount: parsedPrice,
        paidAmount: 0,
        dueAmount: parsedPrice,
        status: "pending",
        notes: "Monthly broadband internet subscription bill.",
        remindersSentCount: 0,
      };
    });

    setInvoices((prev) => [...newInvoices, ...prev]);
    addAuditLog(
      "Bulk Generate Invoices",
      `${newInvoices.length} invoices generated for ${month}`,
    );
  };

  const handleSendInvoiceReminder = (
    invoiceId: string,
    channel: "sms" | "whatsapp" | "gateway",
  ) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const target = invoices.find((i) => i.id === invoiceId);

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            remindersSentCount: (inv.remindersSentCount || 0) + 1,
            lastReminderSentAt: dateStr,
          };
        }
        return inv;
      }),
    );

    if (target) {
      addAuditLog(
        "Payment Reminder Sent",
        `${target.invoiceNumber} (${target.clientName}) via ${channel.toUpperCase()}`,
      );
    }
  };

  // Multi-MikroTik Router Handlers
  const handleAddRouter = (newRouter: MikrotikRouter) => {
    setRouters((prev) => [...prev, newRouter]);
    showToast(
      `New MikroTik Router "${newRouter.name}" added successfully!`,
      "success",
    );
    addAuditLog("Add Router Node", `${newRouter.name} (${newRouter.ip})`);
  };

  const handleUpdateRouter = (updated: MikrotikRouter) => {
    const prevRouter = routers.find((r) => r.id === updated.id);
    setRouters((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (prevRouter && prevRouter.name !== updated.name) {
      setClients((prevClients) =>
        prevClients.map((c) => {
          if (
            c.router === prevRouter.name ||
            c.router === prevRouter.id ||
            c.router?.toLowerCase() === prevRouter.name.toLowerCase()
          ) {
            return { ...c, router: updated.name };
          }
          return c;
        }),
      );
    }
    showToast(
      `MikroTik Router "${updated.name}" configuration updated!`,
      "success",
    );
    addAuditLog("Update Router Node", updated.name);
  };

  const handleDeleteRouter = (id: string) => {
    const target = routers.find((r) => r.id === id);
    setRouters((prev) => prev.filter((r) => r.id !== id));
    if (selectedRouterId === id) {
      const remaining = routers.filter((r) => r.id !== id);
      if (remaining.length > 0) {
        setSelectedRouterId(remaining[0].id);
      }
    }
    showToast(`MikroTik Router "${target?.name || id}" removed!`, "warning");
    addAuditLog("Delete Router Node", id);
  };

  const handleToggleRouterConnection = async (
    id: string,
    forceConnect = false,
  ) => {
    const targetRouter = routers.find((r) => r.id === id);
    if (!targetRouter) return;

    if (targetRouter.connected && !forceConnect) {
      // Disconnecting
      setRouters((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, connected: false, errorReason: "" } : r,
        ),
      );
      showToast(`Router "${targetRouter.name}" disconnected`, "info");
      addAuditLog("Disconnect Router", targetRouter.name);
      return;
    }

    if (forceConnect) {
      setRouters((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                connected: true,
                isDemo: true,
                errorReason: "",
                uptime: "14 days, 06:22:10",
                version: "RouterOS v7.12",
                cpu: "10%",
                ram: "128 MB / 1024 MB",
              }
            : r,
        ),
      );
      showToast(
        `MikroTik Router "${targetRouter.name}" connected in Staging/Offline Mode!`,
        "success",
      );
      addAuditLog("Connect Router (Staging)", targetRouter.name);
      return;
    }

    // Connecting: Perform real socket handshake & authentication check
    showToast(
      `Verifying authentication with MikroTik (${targetRouter.ip}:${targetRouter.apiPort || 8728})...`,
      "info",
    );

    try {
      const isDemoRouter = Boolean(
        targetRouter.isDemo ||
        targetRouter.name.toLowerCase().includes("demo") ||
        targetRouter.ip === "demo.mikrotik.local" ||
        targetRouter.ip === "127.0.0.1",
      );

      const res = await fetch("/api/mikrotik/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: targetRouter.ip,
          port: targetRouter.apiPort || 8728,
          username: targetRouter.username,
          password: targetRouter.password,
          isDemo: isDemoRouter,
        }),
      });

      const data = await res.json();

      if (data.connected) {
        setRouters((prev) =>
          prev.map((r) => {
            if (r.id === id) {
              return {
                ...r,
                connected: true,
                uptime: data.router?.uptime || r.uptime,
                version: data.router?.version || r.version,
                cpu: data.router?.cpuLoad || r.cpu,
                ram: data.router?.ramUsage || r.ram,
                errorReason: "",
              };
            }
            return r;
          }),
        );

        if (data.isDemo) {
          showToast(
            `MikroTik connected in Staging/Simulator Mode`,
            "success",
          );
        } else {
          showToast(
            `MikroTik Router "${targetRouter.name}" (${targetRouter.ip}) successfully authenticated & connected!`,
            "success",
          );
        }
        addAuditLog(
          "Connect Router",
          `${targetRouter.name} (${targetRouter.ip})`,
          "Success",
        );
      } else {
        const isPriv = targetRouter.ip?.startsWith("192.168.") || targetRouter.ip?.startsWith("10.") || targetRouter.ip === "127.0.0.1";
        setRouters((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  connected: false,
                  errorReason: data.errorClass || (isPriv ? "Private LAN IP" : "Connection Failed"),
                }
              : r,
          ),
        );
        showToast(
          isPriv
            ? `Private IP (${targetRouter.ip}) unreachable from cloud. Click "Connect (Staging Mode)" or configure MikroTik Cloud DDNS.`
            : `Connection failed: ${data.error || "Could not connect to MikroTik router IP."}`,
          "error",
        );
        addAuditLog(
          "Connect Router Attempt",
          `${targetRouter.name} (${targetRouter.ip})`,
          "Failed",
        );
      }
    } catch (err: any) {
      setRouters((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, connected: false, errorReason: "Timeout" } : r,
        ),
      );
      showToast(
        `Connection error: ${err.message || "Could not establish network socket"}`,
        "error",
      );
    }
  };

  // Dark Mode side effect
  useEffect(() => {
    localStorage.setItem("nexora_dark", JSON.stringify(isDark));
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Automated live status polling from MikroTik Router Board (Maintains Router connection state without muting client subscription)
  useEffect(() => {
    const connectedRouter = routers.find((r) => r.connected);
    if (!connectedRouter) return;

    const checkActiveSessions = async () => {
      try {
        const res = await fetch("/api/mikrotik/active-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ router: connectedRouter }),
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.activeUsers)) {
          if (!connectedRouter.connected) {
            setRouters((prev) =>
              prev.map((r) =>
                r.id === connectedRouter.id ? { ...r, connected: true } : r,
              ),
            );
          }
        }
      } catch (err) {
        console.warn("MikroTik Live Status Polling failed:", err);
      }
    };

    checkActiveSessions();
    const interval = setInterval(checkActiveSessions, 30000);
    return () => clearInterval(interval);
  }, [routers, setRouters]);

  // Toast Helper
  const showToast = (
    message: string,
    type: "info" | "success" | "error" | "warning" = "info",
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addAuditLog = (
    action: string,
    target: string,
    result: "Success" | "Failed" = "Success",
  ) => {
    const log: AuditLog = {
      id: Math.random().toString(36).substring(2, 9),
      admin: "admin",
      action,
      target,
      time: new Date().toLocaleString(),
      ip: "127.0.0.1",
      result,
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  // Router Connection Actions
  const handleConnectRouter = () => {
    setRouterConfig((prev) => ({ ...prev, connected: true }));
    showToast(`Connected to MikroTik Router at ${routerConfig.ip}`, "success");
    addAuditLog("Connected Router", routerConfig.ip);
  };

  const handleDisconnectRouter = () => {
    setRouterConfig((prev) => ({ ...prev, connected: false }));
    showToast("Disconnected from MikroTik Router", "warning");
    addAuditLog("Disconnected Router", routerConfig.ip);
  };

  // MikroTik Router API Live Synchronization Helpers
  const syncClientToMikrotik = async (
    client: Client,
    targetRouter?: MikrotikRouter,
  ) => {
    const router =
      targetRouter ||
      routers.find((r) => r.name === client.router) ||
      routers.find((r) => r.id === selectedRouterId) ||
      routers[0];
    if (!router) {
      showToast(
        "⚠️ No active router configuration found. Client saved to local database.",
        "warning",
      );
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch("/api/mikrotik/sync-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ router, client }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        showToast(
          `Subscriber ${client.name} (${client.userId}) saved in billing portal database.`,
          "info",
        );
        return;
      }

      const data = await res.json();
      if (data.success) {
        showToast(
          `⚡ Subscriber ${client.name} (${client.userId}) successfully synced & activated on MikroTik (${router.name})!`,
          "success",
        );
        addAuditLog("MikroTik API Sync", `${client.name} - Sync & Active`);

        // Auto-mark router connected since the query succeeded
        if (!router.connected) {
          setRouters((prev) =>
            prev.map((r) =>
              r.id === router.id ? { ...r, connected: true } : r,
            ),
          );
        }
      } else {
        showToast(
          `Subscriber ${client.name} (${client.userId}) saved in portal. ${data.error || "Router API offline"}`,
          "info",
        );
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === "AbortError";
      console.warn("MikroTik Sync Note:", isAbort ? "Request timeout" : err.message);
      showToast(
        `Subscriber ${client.name} (${client.userId}) saved in billing portal database.`,
        "info",
      );
    }
  };

  const toggleClientOnMikrotik = async (
    userId: string,
    enabled: boolean,
    targetRouter?: MikrotikRouter,
    clientData?: Client,
  ) => {
    const client = clientData || clients.find((c) => c.userId === userId);
    const router =
      targetRouter ||
      (client ? routers.find((r) => r.name === client.router) : null) ||
      routers.find((r) => r.id === selectedRouterId) ||
      routers[0];
    if (!router) {
      showToast(
        `Subscriber status updated to ${enabled ? "ONLINE" : "OFFLINE"} in local database.`,
        "info",
      );
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch("/api/mikrotik/toggle-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ router, userId, enabled, client }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        if (data.toggledCount) {
          showToast(
            `⚡ MikroTik Router: Subscriber ${client?.name || userId} line ${enabled ? "ACTIVATED" : "PAUSED/DISABLED"} on router!`,
            enabled ? "success" : "info",
          );
        }
        addAuditLog(
          "MikroTik API Toggle",
          `${userId} - ${enabled ? "Online (Enabled)" : "Offline (Disabled)"}`,
        );

        // Auto-mark router connected if actual hardware responded
        if (data.toggledCount && !router.connected && !router.isDemo) {
          setRouters((prev) =>
            prev.map((r) =>
              r.id === router.id ? { ...r, connected: true } : r,
            ),
          );
        }
      } else {
        showToast(
          `Subscriber ${client?.name || userId} status saved. ${data.message || data.error || ""}`,
          "info",
        );
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === "AbortError";
      console.warn("MikroTik Toggle Note:", isAbort ? "Request timeout" : err.message);
      showToast(
        `Subscriber ${client?.name || userId} line set to ${enabled ? "ONLINE" : "OFFLINE"} (saved in billing portal).`,
        "info",
      );
    }
  };

  // Helper to log payment automatically
  const autoLogPayment = (
    client: Client,
    type: "New Client Activation" | "Broadband Renewal",
  ) => {
    const rawPrice =
      client.price ||
      packages.find((p) => p.name === client.package)?.price ||
      "500";
    const amount = parseInt(String(rawPrice).replace(/[^\d]/g, ""), 10) || 500;
    if (amount <= 0) return;

    const now = new Date();
    const newPayment: PaymentRecord = {
      id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      clientName: client.name,
      userId: client.userId,
      package: client.package,
      amount: amount,
      paymentMethod: "Cash",
      transactionType: type,
      collector: "Auto Billed",
      timestamp: now.toLocaleString(),
      dateKey: now.toISOString().slice(0, 10),
      monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      status: "Completed",
    };
    setPayments((prev) => [newPayment, ...prev]);
  };

  // Client CRUD
  const handleAddClient = (client: Client) => {
    setClients((prev) => [client, ...prev]);
    addAuditLog("Create Client", client.name);
    autoLogPayment(client, "New Client Activation");
    syncClientToMikrotik(client);
  };

  const handleUpdateClient = (updated: Client) => {
    let finalClient = { ...updated };

    // Auto-activate client if a valid future expiry date is set
    const info = getClientExpiryInfo(finalClient.expiry);
    if (!info.isExpired && finalClient.status === "expired") {
      finalClient.status = "online";
    }

    setClients((prev) =>
      prev.map((c) =>
        String(c.id) === String(finalClient.id)
          ? finalClient
          : c,
      ),
    );
    addAuditLog("Update Client Expiry/Details", finalClient.name);
    
    const targetRouter =
      routers.find((r) => r.name === finalClient.router) ||
      routers.find((r) => r.id === selectedRouterId) ||
      routers[0];
    syncClientToMikrotik(finalClient, targetRouter);

    // If client is set to offline or online, toggle on router immediately
    toggleClientOnMikrotik(
      finalClient.userId,
      finalClient.status === "online",
      targetRouter,
      finalClient,
    );
  };

  const handleDeleteClient = (id: string) => {
    const target = clients.find((c) => String(c.id) === String(id) || c.userId === id);
    setClients((prev) => prev.filter((c) => String(c.id) !== String(id) && c.userId !== id));
    if (target) {
      addAuditLog("Delete Client", target.name);
      // Remove permanently from MikroTik router
      const targetRouter =
        routers.find((r) => r.name === target.router) ||
        routers.find((r) => r.id === selectedRouterId) ||
        routers[0];

      fetch("/api/mikrotik/delete-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ router: targetRouter, userId: target.userId }),
      }).catch((err) => console.warn("MikroTik delete client warning:", err));

      toggleClientOnMikrotik(target.userId, false, targetRouter);
    }
  };

  const handleRenewClient = (
    id: string,
    months: number = 1,
    amount?: number,
    paymentMethod?: string,
  ) => {
    const targetClient = clients.find((c) => c.id === id);
    if (!targetClient) return;

    const pkg = findPackageByDetails(packages, targetClient.package, targetClient.price);
    const validityDays = parseValidityDays(pkg?.validity, targetClient.package, targetClient.price);
    
    let daysToAdd = 30;
    // Check if months is a fractional/decimal number (from BillingModal custom options)
    if (months % 1 !== 0) {
      daysToAdd = Math.round(months * 30);
    } else {
      // If it's a whole number of months (like 1, 2, 3)
      if (months === 1) {
        // Direct Renew button uses months=1, we should extend by the package's actual validity
        daysToAdd = validityDays;
      } else {
        daysToAdd = Math.round(months * validityDays);
      }
    }

    const isPendingOrExpired =
      targetClient.status === "pending_approval" ||
      targetClient.status === "offline" ||
      getClientExpiryInfo(targetClient.expiry).isExpired;

    const baseExpiryStr = isPendingOrExpired ? undefined : targetClient.expiry;
    const newExp = addDaysToExpiry(baseExpiryStr, daysToAdd);

    const updatedClient: Client = {
      ...targetClient,
      expiry: newExp,
      status: "online",
    };

    if (amount !== undefined && paymentMethod) {
      const nowTime = new Date();
      const newPayment: PaymentRecord = {
        id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        clientName: targetClient.name,
        userId: targetClient.userId,
        package: targetClient.package,
        amount: amount,
        paymentMethod: paymentMethod as any,
        transactionType: "Broadband Renewal",
        collector: "Admin Portal",
        timestamp: nowTime.toLocaleString(),
        dateKey: nowTime.toISOString().slice(0, 10),
        monthKey: `${nowTime.getFullYear()}-${String(nowTime.getMonth() + 1).padStart(2, "0")}`,
        status: "Completed",
      };
      setPayments((prevP) => [newPayment, ...prevP]);
    } else {
      autoLogPayment(targetClient, "Broadband Renewal");
    }

    setClients((prev) => prev.map((c) => (c.id === id ? updatedClient : c)));
    addAuditLog("Renew Subscription", id);
    syncClientToMikrotik(updatedClient);
  };

  const handleCollectPayment = (paymentData: {
    clientId: string;
    amount: number;
    months?: number;
    validityMonths?: number;
    paymentMethod: string;
    transactionId?: string;
    discount?: number;
    notes?: string;
  }) => {
    const finalMonths = paymentData.months !== undefined ? paymentData.months : (paymentData.validityMonths !== undefined ? paymentData.validityMonths : 1);
    handleRenewClient(
      paymentData.clientId,
      finalMonths,
      paymentData.amount,
      paymentData.paymentMethod,
    );
    showToast(
      `✅ Payment of ৳${paymentData.amount} recorded & subscriber renewed!`,
      "success",
    );
  };

  const handleBulkImportClients = (importedList: Client[]) => {
    setClients((prev) => [...importedList, ...prev]);
    addAuditLog("Bulk CSV Import", `${importedList.length} clients imported`);
    showToast(
      `🚀 Successfully imported ${importedList.length} clients!`,
      "success",
    );
  };

  const handleToggleStatus = (id: string, clientObj?: Client) => {
    // 1. Synchronously locate target client
    const target =
      clientObj ||
      clients.find(
        (c) =>
          String(c.id).trim() === String(id).trim() ||
          String(c.userId).trim() === String(id).trim() ||
          String(c.phone).trim() === String(id).trim(),
      );
    if (!target) {
      console.warn("Client not found for toggle status with id:", id);
      showToast("Subscriber record not found for toggle", "error");
      return;
    }

    const newStatus: "online" | "offline" =
      target.status === "online" ? "offline" : "online";
    let expiry = target.expiry;

    // Auto-renew expired or pending clients by package validity days when manually toggled to 'online'
    const info = getClientExpiryInfo(target.expiry);
    const isPendingOrExpired =
      target.status === "pending_approval" ||
      info.isExpired;

    if (newStatus === "online" && isPendingOrExpired) {
      const pkg = findPackageByDetails(packages, target.package, target.price);
      const validityDays = parseValidityDays(pkg?.validity, target.package, target.price);
      expiry = addDaysToExpiry(undefined, validityDays);
      showToast(
        `🔄 Client ${target.name} activated! Expiry set to ${expiry} (${validityDays} days)`,
        "success",
      );
    }

    const updatedClient: Client = {
      ...target,
      status: newStatus,
      expiry,
    };

    // 2. Synchronously update local client state
    setClients((prev) =>
      prev.map((c) =>
        c.id === target.id
          ? updatedClient
          : c,
      ),
    );

    addAuditLog(
      "Toggle Client Status",
      `${updatedClient.name} (${updatedClient.userId}) -> ${newStatus.toUpperCase()}`,
    );

    showToast(
      `⚡ ${updatedClient.name}: Line is now ${newStatus === "online" ? "ONLINE (Active)" : "OFFLINE (Suspended/Paused)"}`,
      newStatus === "online" ? "success" : "info",
    );

    // 3. Immediately trigger MikroTik router update
    const targetRouter =
      routers.find((r) => r.name === updatedClient.router) ||
      routers.find((r) => r.id === selectedRouterId) ||
      routers[0];

    toggleClientOnMikrotik(
      updatedClient.userId,
      newStatus === "online",
      targetRouter,
      updatedClient,
    );
  };

  // Real-time Billing & Invoice Reconciliation Engine
  useEffect(() => {
    if (
      !invoices ||
      !payments ||
      invoices.length === 0 ||
      payments.length === 0
    )
      return;

    let changed = false;
    const updatedInvoices = invoices.map((inv) => {
      // If invoice is already paid, nothing to reconcile
      if (inv.status === "paid" || inv.dueAmount <= 0) return inv;

      // Find if there is a Completed payment record for this client and billing month
      const matchingPayment = payments.find(
        (pay) =>
          pay.userId === inv.userId &&
          pay.monthKey === inv.billingMonth &&
          pay.status === "Completed",
      );

      if (matchingPayment) {
        changed = true;
        const newPaidTotal = (inv.paidAmount || 0) + matchingPayment.amount;
        const newDue = Math.max(0, inv.totalAmount - newPaidTotal);
        return {
          ...inv,
          paidAmount: newPaidTotal,
          dueAmount: newDue,
          status: newDue <= 0 ? ("paid" as const) : inv.status,
          paymentMethod: matchingPayment.paymentMethod as any,
          transactionId: matchingPayment.id,
          paidAt: matchingPayment.timestamp,
        };
      }
      return inv;
    });

    if (changed) {
      setInvoices(updatedInvoices);
      showToast(
        "🔄 Real-time billing sync: New payment recorded and linked to invoice!",
        "success",
      );
    }
  }, [payments, invoices, setInvoices]);

  // Auto-generate Monthly Invoices for Registered Clients
  useEffect(() => {
    if (!canAutoGenerateInvoices || !clients || clients.length === 0) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Find clients who do NOT have an invoice for the current month
    const clientsWithoutInvoice = clients.filter((client) => {
      return !invoices.some(
        (inv) =>
          inv.clientId === client.id && inv.billingMonth === currentMonth,
      );
    });

    if (clientsWithoutInvoice.length > 0) {
      const issueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-10`;

      const newInvoices: Invoice[] = clientsWithoutInvoice.map(
        (client, idx) => {
          const pkg = packages.find((p) => p.name === client.package);
          const rawPrice = client.price || pkg?.price || "500";
          const parsedPrice =
            parseInt(String(rawPrice).replace(/[^\d]/g, ""), 10) || 500;
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          const invoiceNumber = `INV-${currentMonth.replace("-", "")}-${randomNum}`;

          return {
            id: `inv-${Date.now()}-${idx}-${randomNum}`,
            invoiceNumber,
            clientId: client.id,
            clientName: client.name,
            userId: client.userId,
            phone: client.phone || "",
            address: settings.address || "",
            router: client.router || "Main Router",
            package: client.package,
            speed: client.downloadSpeed
              ? `${client.downloadSpeed} Mbps`
              : client.bandwidth,
            billingMonth: currentMonth,
            issueDate,
            dueDate,
            items: [
              {
                id: `item-${Date.now()}-${idx}`,
                description: `${client.package} Subscription (${client.bandwidth || "Standard"}) - ${currentMonth}`,
                quantity: 1,
                unitPrice: parsedPrice,
                total: parsedPrice,
              },
            ],
            subtotal: parsedPrice,
            discount: 0,
            tax: 0,
            totalAmount: parsedPrice,
            paidAmount: 0,
            dueAmount: parsedPrice,
            status: "pending",
            notes: "Monthly broadband internet subscription bill.",
            remindersSentCount: 0,
          };
        },
      );

      setInvoices((prev) => [...newInvoices, ...prev]);
      addAuditLog(
        "Auto Generate Invoices",
        `${newInvoices.length} billing statements auto-generated for ${currentMonth}`,
      );
      showToast(
        `📊 Monthly bills generated in real-time for ${newInvoices.length} subscribers!`,
        "info",
      );
    }
  }, [
    canAutoGenerateInvoices,
    clients,
    invoices,
    packages,
    settings.address,
    setInvoices,
  ]);

  // Automated Subscription Expiry Notification & Auto-Offline System
  useEffect(() => {
    if (!clients || clients.length === 0) return;

    // Check for clients whose expiry passed and are still marked 'online' -> auto-offline
    const expiredOnline = clients.filter((c) => {
      const info = getClientExpiryInfo(c.expiry);
      return info.isExpired && c.status === "online";
    });

    if (expiredOnline.length > 0 && !hasAutoOfflinedRef.current) {
      hasAutoOfflinedRef.current = true;
      setClients((prev) =>
        prev.map((c) => {
          const info = getClientExpiryInfo(c.expiry);
          if (info.isExpired && c.status === "online") {
            return { ...c, status: "offline" };
          }
          return c;
        }),
      );
      showToast(
        `⚠️ ${expiredOnline.length} subscribers lines set offline automatically due to expired packages!`,
        "warning",
      );
      addAuditLog(
        "Auto-Disconnect Expired Lines",
        `${expiredOnline.length} Clients Auto-Deactivated`,
      );
    }

    const expiringClients = clients.filter((c) => {
      const info = getClientExpiryInfo(c.expiry);
      return info.isExpiringSoon;
    });

    if (expiringClients.length === 0) return;

    setNotifications((prev) => {
      const existingTexts = new Set(prev.map((n) => n.text));
      const newNotifs: NotificationItem[] = [];

      expiringClients.forEach((c) => {
        const info = getClientExpiryInfo(c.expiry);
        let notifText = "";
        let icon = "⏰";

        if (info.isExpired) {
          notifText = `⚠️ Expiry Alert: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || "500"}, expired on ${c.expiry} (Line Auto-Offline)!`;
          icon = "🚨";
        } else if (info.isExpiringToday) {
          notifText = `🚨 Expires Today: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || "500"}, send SMS reminder immediately!`;
          icon = "🚨";
        } else if (info.daysLeft === 1) {
          notifText = `⚠️ 1 Day Left: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || "500"}, expiring tomorrow (${c.expiry})!`;
          icon = "⚠️";
        } else {
          notifText = `⏰ ${info.daysLeft} Days Left: ${c.name} (${c.userId}) - Package ${c.package}, Bill ৳${c.price || "500"}, expires on ${c.expiry}.`;
          icon = "⏰";
        }

        if (!existingTexts.has(notifText)) {
          newNotifs.push({
            id: Date.now() + Math.floor(Math.random() * 10000),
            icon,
            text: notifText,
            time: "Auto-Alert",
            read: false,
          });
        }
      });

      if (newNotifs.length > 0) {
        return [...newNotifs, ...prev];
      }
      return prev;
    });
  }, [clients]);

  const handleSendSmsReminder = (
    client: Client,
    messageText: string,
    channel: "SMS" | "WhatsApp" | "Manual",
  ) => {
    addAuditLog(
      `Sent ${channel} Expiry Reminder`,
      `${client.name} (${client.phone})`,
    );
  };

  // Package CRUD
  const handleAddPackage = (pkg: Package) => {
    const updated = [...packages, pkg];
    setPackages(updated);
    addAuditLog("Create Package", pkg.name);

    // Auto sync to hotspot login page
    try {
      const html = buildDynamicHotspotHtml(updated, settings);
      localStorage.setItem("nexora_hotspot_html", html);
    } catch (e) {
      // ignore
    }
    showToast(
      `⚡ Package "${pkg.name}" created and synced to MikroTik Hotspot portal!`,
      "success",
    );
  };

  const handleUpdatePackage = (pkg: Package) => {
    const updated = packages.map((p) => (p.id === pkg.id ? pkg : p));
    setPackages(updated);
    addAuditLog("Update Package", pkg.name);

    try {
      const html = buildDynamicHotspotHtml(updated, settings);
      localStorage.setItem("nexora_hotspot_html", html);
    } catch (e) {
      // ignore
    }
    showToast(
      `⚡ Package "${pkg.name}" updated and synced to Hotspot portal!`,
      "info",
    );
  };

  const handleDeletePackage = (id: number) => {
    const target = packages.find((p) => p.id === id);
    const updated = packages.filter((p) => p.id !== id);
    setPackages(updated);
    addAuditLog("Delete Package", String(id));

    try {
      const html = buildDynamicHotspotHtml(updated, settings);
      localStorage.setItem("nexora_hotspot_html", html);
    } catch (e) {
      // ignore
    }
    if (target) {
      showToast(`Package "${target.name}" removed and synced.`, "warning");
    }
  };

  // Bandwidth CRUD
  const handleAddBandwidth = (b: BandwidthProfile) => {
    setBandwidthProfiles((prev) => [...prev, b]);
    addAuditLog("Create Bandwidth Profile", b.name);
  };

  const handleUpdateBandwidth = (b: BandwidthProfile) => {
    setBandwidthProfiles((prev) => prev.map((p) => (p.id === b.id ? b : p)));
    addAuditLog("Update Bandwidth Profile", b.name);
  };

  const handleDeleteBandwidth = (id: number) => {
    setBandwidthProfiles((prev) => prev.filter((p) => p.id !== id));
    addAuditLog("Delete Bandwidth Profile", String(id));
  };

  // Days Profile CRUD
  const handleAddDaysProfile = (dp: DaysProfile) => {
    if (dp.isDefault) {
      setDaysProfiles((prev) => prev.map((p) => ({ ...p, isDefault: false })));
    }
    setDaysProfiles((prev) => [...prev, dp]);
    addAuditLog("Create Days Profile", dp.name);
  };

  const handleUpdateDaysProfile = (dp: DaysProfile) => {
    setDaysProfiles((prev) =>
      prev.map((p) => {
        if (dp.isDefault && p.id !== dp.id) {
          return { ...p, isDefault: false };
        }
        return p.id === dp.id ? dp : p;
      }),
    );
    addAuditLog("Update Days Profile", dp.name);
  };

  const handleDeleteDaysProfile = (id: number) => {
    setDaysProfiles((prev) => prev.filter((p) => p.id !== id));
    addAuditLog("Delete Days Profile", String(id));
  };

  // Hotspot User Actions
  const handleAddHotspotUser = (user: HotspotUser) => {
    setHotspotUsers((prev) => [user, ...prev]);
    addAuditLog("Add Hotspot User", user.username);
  };

  const handleDisconnectHotspotUser = (mac: string) => {
    setHotspotUsers((prev) => prev.filter((u) => u.mac !== mac));
    addAuditLog("Disconnect Hotspot User", mac);
  };

  // Hotspot Package Request Handlers
  const handleAddHotspotRequest = (
    req: Omit<HotspotPackageRequest, "id" | "requestedAt" | "status">,
  ) => {
    const newReq: HotspotPackageRequest = {
      ...req,
      id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
      requestedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "pending",
    };
    setHotspotRequests((prev) => [newReq, ...prev]);

    const newNotif: NotificationItem = {
      id: Date.now(),
      icon: "⚡",
      text: `New Hotspot Request: ${req.clientName} (${req.phone}) - ${req.package} [৳${req.price}]`,
      time: "Just Now",
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(
      `🔔 New Hotspot Request received! ${req.clientName} (${req.phone})`,
      "success",
    );
    addAuditLog("Hotspot Package Request", req.clientName);
  };

  const handleAddPayment = (payment: Omit<PaymentRecord, "id">) => {
    const newRecord: PaymentRecord = {
      ...payment,
      id: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    };
    setPayments((prev) => [newRecord, ...prev]);
    addAuditLog(
      "Recharge Payment",
      `${newRecord.clientName} (৳${newRecord.amount})`,
    );
  };

  const handleApproveHotspotRequest = (
    reqId: string,
    createdUserId?: string,
  ) => {
    const targetReq = hotspotRequests.find((r) => r.id === reqId);
    setHotspotRequests((prev) =>
      prev.map((r) =>
        r.id === reqId ? { ...r, status: "approved", createdUserId } : r,
      ),
    );

    if (targetReq) {
      const now = new Date();
      const dateKey = now.toISOString().slice(0, 10);
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const targetUserId = createdUserId || targetReq.phone;
      const targetRouter =
        routers.find((r) => r.id === selectedRouterId) ||
        routers.find((r) => r.mode === "Hotspot" || r.mode === "Hybrid") ||
        routers[0];

      // Provision hotspot client on MikroTik
      if (targetRouter) {
        const hsPkg = findPackageByDetails(packages, targetReq.package, targetReq.price);
        const hsValidityDays = parseValidityDays(hsPkg?.validity, targetReq.package, targetReq.price);
        const hsExpiryDate = addDaysToExpiry(undefined, hsValidityDays);

        const hotspotClientObj: Client = {
          id: `CLI-HS-${Date.now()}`,
          name: targetReq.clientName,
          phone: targetReq.phone,
          userId: targetUserId,
          password: targetReq.password || "123456",
          package: targetReq.package,
          bandwidth: "10 Mbps",
          downloadSpeed: "10",
          uploadSpeed: "5",
          status: "online",
          expiry: hsExpiryDate,
          router: targetRouter.name,
          deviceType: "Mobile",
          price: String(targetReq.price),
          priority: "8",
        };
        syncClientToMikrotik(hotspotClientObj, targetRouter);
      }

      setPayments((prev) => {
        const targetUserId = createdUserId || targetReq.phone;
        const isMatchingPending = (p: PaymentRecord) => {
          const isPend =
            p.status === "Pending" || p.status === "Pending Approval";
          if (!isPend) return false;
          if (p.userId === targetUserId || p.clientName === targetReq.clientName)
            return true;
          if (
            targetReq.transaction &&
            (p.notes?.includes(targetReq.transaction) ||
              p.id === targetReq.transaction)
          )
            return true;
          return false;
        };

        const pendingMatch = prev.find(isMatchingPending);

        const autoPayment: PaymentRecord = {
          id: pendingMatch
            ? pendingMatch.id
            : `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          clientName: targetReq.clientName,
          userId: targetUserId,
          package: targetReq.package,
          amount:
            parseInt(String(targetReq.price).replace(/[^\d]/g, ""), 10) || 500,
          paymentMethod: (targetReq.gateway as any) || "Hotspot Portal",
          transactionType: "Hotspot Voucher",
          collector: "Admin Portal",
          timestamp: `${dateKey} ${timeStr}`,
          dateKey: dateKey,
          monthKey: dateKey.slice(0, 7),
          status: "Completed",
        };

        const remaining = prev.filter((p) => !isMatchingPending(p));
        return [autoPayment, ...remaining];
      });
    }

    addAuditLog("Approved Hotspot Request", reqId);
  };

  const handleRejectHotspotRequest = (reqId: string) => {
    setHotspotRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "rejected" } : r)),
    );
    showToast("Hotspot request rejected", "warning");
    addAuditLog("Rejected Hotspot Request", reqId);
  };

  const handleApproveBroadbandRenewal = (
    reqId: string,
    customMessageText?: string,
  ) => {
    const targetReq = renewalRequests.find((r) => r.id === reqId);
    if (!targetReq) return;

    const targetClient = clients.find(
      (c) => c.id === targetReq.clientId || c.userId === targetReq.userId,
    );
    if (targetClient) {
      const selectedPkg = findPackageByDetails(packages, targetReq.requestedPackage, targetReq.price);
      const validityDays = parseValidityDays(selectedPkg?.validity, targetReq.requestedPackage, targetReq.price);

      const isPendingOrExpired =
        targetClient.status === "pending_approval" ||
        targetClient.status === "offline" ||
        getClientExpiryInfo(targetClient.expiry).isExpired;

      const baseExpiryStr = isPendingOrExpired ? undefined : targetClient.expiry;
      const newExp = addDaysToExpiry(baseExpiryStr, validityDays);

      const updatedClient: Client = {
        ...targetClient,
        package: targetReq.requestedPackage,
        price: targetReq.price,
        expiry: newExp,
        status: "online",
        downloadSpeed: selectedPkg?.speed || targetClient.downloadSpeed,
        uploadSpeed: selectedPkg?.upload || targetClient.uploadSpeed,
      };

      setClients((prev) =>
        prev.map((c) => (c.id === targetClient.id ? updatedClient : c)),
      );
      syncClientToMikrotik(updatedClient);

      const nowTime = new Date();
      const amount = parseInt(targetReq.price.replace(/[^\d]/g, ""), 10) || 500;
      setPayments((prev) => {
        const isMatchingPending = (p: PaymentRecord) => {
          const isPend =
            p.status === "Pending" || p.status === "Pending Approval";
          if (!isPend) return false;
          if (
            p.userId === targetClient.userId ||
            p.clientName === targetClient.name
          )
            return true;
          if (
            targetReq.transactionId &&
            (p.notes?.includes(targetReq.transactionId) ||
              p.id === targetReq.transactionId)
          )
            return true;
          return false;
        };

        const pendingMatch = prev.find(isMatchingPending);

        const newPayment: PaymentRecord = {
          id: pendingMatch
            ? pendingMatch.id
            : `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          clientName: targetClient.name,
          userId: targetClient.userId,
          package: targetReq.requestedPackage,
          amount: amount,
          paymentMethod: targetReq.paymentMethod as any,
          transactionType: "Broadband Renewal",
          collector: "Online Gateway Approved",
          timestamp: nowTime.toLocaleString(),
          dateKey: nowTime.toISOString().slice(0, 10),
          monthKey: `${nowTime.getFullYear()}-${String(nowTime.getMonth() + 1).padStart(2, "0")}`,
          status: "Completed",
          notes: `Transaction ID: ${targetReq.transactionId}. Approved from Online Client Panel.`,
        };

        const remaining = prev.filter((p) => !isMatchingPending(p));
        return [newPayment, ...remaining];
      });

      const smsMessage =
        customMessageText ||
        `Dear ${targetClient.name}, your account is successfully renewed with ${targetReq.requestedPackage}. Valid till ${newExp}. TrxID: ${targetReq.transactionId}. Nexora network.`;

      try {
        const localLogs = localStorage.getItem("isp_sms_logs");
        const currentLogs = localLogs ? JSON.parse(localLogs) : [];
        const newLogItem = {
          id: `SMS-${Math.floor(1000 + Math.random() * 9000)}`,
          recipientName: targetClient.name,
          phone: targetClient.phone,
          type: "Payment Received",
          message: smsMessage,
          sentAt: new Date().toLocaleString(),
          status: "Delivered",
        };
        localStorage.setItem(
          "isp_sms_logs",
          JSON.stringify([newLogItem, ...currentLogs]),
        );
      } catch (err) {
        console.error("Failed to write to SMS logs:", err);
      }

      showToast(
        `Renewal approved! Client ${targetClient.name} is now ONLINE.`,
        "success",
      );
      addAuditLog("Approve Broadband Renewal", targetClient.name);
    } else {
      showToast(`Error: Client not found for renewal`, "error");
    }

    setRenewalRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "approved" } : r)),
    );
  };

  const handleRejectBroadbandRenewal = (reqId: string) => {
    setRenewalRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "rejected" } : r)),
    );
    showToast("Broadband renewal request rejected", "warning");
    addAuditLog("Reject Broadband Renewal", reqId);
  };

  // Notification Actions
  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleToggleNotificationRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  };

  const handleResetAllData = () => {
    setClients([]);
    setHotspotUsers([]);
    setHotspotRequests([]);
    setNotifications([]);
    setAuditLogs([]);
    setPayments([]);
    const moduleKeys = [
      "configuration",
      "hr-payroll",
      "network-diagram",
      "leave-management",
      "mac-reseller",
      "events-holidays",
      "support-ticketing",
      "task-management",
      "bandwidth-buy",
      "bandwidth-sale",
      "purchase",
      "inventory",
      "assets",
      "billing",
    ];
    moduleKeys.forEach((k) =>
      localStorage.removeItem(`isp_module_records_${k}`),
    );
    localStorage.removeItem("nexora_clients");
    localStorage.removeItem("nexora_payments");
    localStorage.removeItem("nexora_hotspot_users");
    localStorage.removeItem("nexora_hotspot_requests");
    localStorage.removeItem("nexora_notifications");
    localStorage.removeItem("nexora_audit_logs");
    showToast(
      "All data has been reset. Your app is now ready with fresh initial state!",
      "success",
    );
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#ecf0f5] text-slate-800 font-sans flex relative">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadNotifications={unreadNotificationsCount}
        settings={settings}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 lg:pl-[270px] flex flex-col min-h-screen w-full">
        <Topbar
          currentPage={currentPage}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={handleNavigate}
          onGoBack={handleGoBack}
          unreadCount={unreadNotificationsCount}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          settings={settings}
          clients={clients}
          onLock={onLockApp}
          onOpenBillingModal={() => setGlobalBillingModalOpen(true)}
          onOpenImportWizard={() => setGlobalImportWizardOpen(true)}
          onOpenTownView={() => setGlobalTownViewOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Back Navigation Bar for Inner Pages */}
          {currentPage !== "dashboard" && (
            <div className="bg-white border border-slate-200 rounded px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGoBack}
                  className="px-3.5 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white font-semibold rounded shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Go Back</span>
                </button>

                <div className="flex items-center gap-2 text-slate-900 font-medium">
                  <button
                    onClick={() => handleNavigate("dashboard")}
                    className="hover:text-[#3c8dbc] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Home className="w-4 h-4 text-slate-800" />
                    <span>Dashboard</span>
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-800" />
                  <span className="text-[#3c8dbc] font-bold capitalize bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                    {currentPage.replace("-", " ")}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleNavigate("dashboard")}
                className="text-slate-900 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded border border-slate-300 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-800" />
                <span>Main Dashboard</span>
              </button>
            </div>
          )}

          <div key={currentPage} className="animate-page-enter">
            {currentPage === "dashboard" && (
              <Dashboard
                clients={clients}
                payments={payments}
                hotspotUsers={hotspotUsers}
                hotspotRequests={hotspotRequests}
                onlineOrders={onlineOrders}
                routerConfig={routerConfig}
                settings={settings}
                onConnectRouter={handleConnectRouter}
                onDisconnectRouter={handleDisconnectRouter}
                onNavigate={handleNavigate}
                onApproveRequest={handleApproveHotspotRequest}
                onRejectRequest={handleRejectHotspotRequest}
                onApproveOnlineOrder={handleApproveOnlineOrder}
                onHardResetAll={handleResetAllData}
                onCollectPayment={handleCollectPayment}
                onBulkImportClients={handleBulkImportClients}
              />
            )}

            {currentPage === "clients" && (
              <ClientsPage
                clients={clients}
                routers={routers}
                packages={packages}
                bandwidthProfiles={bandwidthProfiles}
                daysProfiles={daysProfiles}
                hotspotRequests={hotspotRequests}
                settings={settings}
                routerConnected={routerConfig.connected}
                onAddClient={handleAddClient}
                onUpdateClient={handleUpdateClient}
                onDeleteClient={handleDeleteClient}
                onRenewClient={handleRenewClient}
                onToggleStatus={handleToggleStatus}
                onApproveRequest={handleApproveHotspotRequest}
                onRejectRequest={handleRejectHotspotRequest}
                onSendSmsReminder={handleSendSmsReminder}
                onGenerateInvoice={(c) => {
                  setCurrentPage("billing");
                  showToast(
                    `Invoice & billing opened for subscriber "${c.name}"`,
                    "info",
                  );
                }}
                showToast={showToast}
                onHardReset={() => {
                  setClients([]);
                  localStorage.removeItem("nexora_clients");
                  if (uid)
                    setDoc(doc(db, "users", uid, "appData", "nexora_clients"), {
                      value: [],
                    }).catch(console.error);
                  showToast("All client data has been deleted", "success");
                }}
              />
            )}

            {currentPage === "packages" && (
              <PackagesPage
                packages={packages}
                daysProfiles={daysProfiles}
                onAddPackage={handleAddPackage}
                onUpdatePackage={handleUpdatePackage}
                onDeletePackage={handleDeletePackage}
                showToast={showToast}
                onHardReset={() => {
                  setPackages(initialPackages);
                  showToast(
                    "Package data reset successfully with default packages loaded!",
                    "success",
                  );
                }}
              />
            )}

            {currentPage === "bandwidth" && (
              <BandwidthPage
                profiles={bandwidthProfiles}
                routerConfig={routerConfig}
                onConnectRouter={handleConnectRouter}
                onAddProfile={handleAddBandwidth}
                onUpdateProfile={handleUpdateBandwidth}
                onDeleteProfile={handleDeleteBandwidth}
                showToast={showToast}
                onHardReset={() => {
                  setBandwidthProfiles([]);
                  localStorage.removeItem("nexora_bandwidth");
                  if (uid)
                    setDoc(
                      doc(db, "users", uid, "appData", "nexora_bandwidth"),
                      { value: [] },
                    ).catch(console.error);
                  showToast(
                    "All bandwidth profiles have been cleared",
                    "success",
                  );
                }}
              />
            )}

            {currentPage === "days-profile" && (
              <DaysProfilePage
                daysProfiles={daysProfiles}
                onAddDaysProfile={handleAddDaysProfile}
                onUpdateDaysProfile={handleUpdateDaysProfile}
                onDeleteDaysProfile={handleDeleteDaysProfile}
                showToast={showToast}
                onHardReset={() => {
                  setDaysProfiles([]);
                  localStorage.removeItem("nexora_days_profiles");
                  if (uid)
                    setDoc(
                      doc(db, "users", uid, "appData", "nexora_days_profiles"),
                      { value: [] },
                    ).catch(console.error);
                  showToast(
                    "All validity profiles have been cleared",
                    "success",
                  );
                }}
              />
            )}

            {(currentPage === "mikrotik-management" ||
              currentPage === "mikrotik-configure") && (
              <MikrotikManagementPage
                routers={routers}
                selectedRouterId={selectedRouterId}
                onSelectRouter={setSelectedRouterId}
                onAddRouter={handleAddRouter}
                onUpdateRouter={handleUpdateRouter}
                onDeleteRouter={handleDeleteRouter}
                onToggleRouterConnection={handleToggleRouterConnection}
                clients={clients}
                packages={packages}
                bandwidthProfiles={bandwidthProfiles}
                daysProfiles={daysProfiles}
                settings={settings}
                onAddClient={handleAddClient}
                onUpdateClient={handleUpdateClient}
                onDeleteClient={handleDeleteClient}
                onToggleClientStatus={handleToggleStatus}
                onSendSmsReminder={handleSendSmsReminder}
                showToast={showToast}
              />
            )}

            {currentPage === "mikrotik-security" && (
              <MikrotikSecurityPage
                routerConfig={routerConfig}
                showToast={showToast}
              />
            )}

            {currentPage === "hotspot" && (
              <HotspotPage
                hotspotUsers={hotspotUsers}
                packages={packages}
                hotspotRequests={hotspotRequests}
                onAddHotspotUser={handleAddHotspotUser}
                onDisconnectHotspotUser={handleDisconnectHotspotUser}
                onAddHotspotRequest={handleAddHotspotRequest}
                onApproveRequest={handleApproveHotspotRequest}
                onRejectRequest={handleRejectHotspotRequest}
                onNavigate={handleNavigate}
                showToast={showToast}
                onHardReset={() => {
                  setHotspotUsers([]);
                  setHotspotRequests([]);
                  localStorage.removeItem("nexora_hotspot_users");
                  localStorage.removeItem("nexora_hotspot_requests");
                  if (uid) {
                    setDoc(
                      doc(db, "users", uid, "appData", "nexora_hotspot_users"),
                      { value: [] },
                    ).catch(console.error);
                    setDoc(
                      doc(
                        db,
                        "users",
                        uid,
                        "appData",
                        "nexora_hotspot_requests",
                      ),
                      { value: [] },
                    ).catch(console.error);
                  }
                  showToast(
                    "All hotspot user and request data has been cleared",
                    "success",
                  );
                }}
              />
            )}

            {currentPage === "hotspot-config" && (
              <HotspotConfigPage
                packages={packages}
                settings={settings}
                onAddHotspotRequest={handleAddHotspotRequest}
                showToast={showToast}
              />
            )}

            {currentPage === "billing" && (
              <BillingPage
                invoices={invoices}
                clients={clients}
                packages={packages}
                routers={routers}
                settings={settings}
                onAddInvoice={handleAddInvoice}
                onUpdateInvoice={handleUpdateInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onRecordPayment={handleRecordInvoicePayment}
                onBulkGenerateInvoices={handleBulkGenerateInvoices}
                onSendReminder={handleSendInvoiceReminder}
                showToast={showToast}
                onHardReset={() => {
                  setInvoices([]);
                  localStorage.removeItem("nexora_invoices");
                  if (uid)
                    setDoc(
                      doc(db, "users", uid, "appData", "nexora_invoices"),
                      { value: [] },
                    ).catch(console.error);
                  showToast(
                    "All invoice and billing data has been cleared",
                    "success",
                  );
                }}
              />
            )}

            {currentPage === "reports" && (
              <RevenueTrackerPage
                payments={payments}
                clients={clients}
                packages={packages}
                settings={settings}
                onAddPayment={handleAddPayment}
                showToast={showToast}
                onHardReset={() => {
                  setPayments([]);
                  localStorage.removeItem("nexora_payments");
                  if (uid)
                    setDoc(
                      doc(db, "users", uid, "appData", "nexora_payments"),
                      { value: [] },
                    ).catch(console.error);
                  showToast(
                    "All billing and payment history data has been cleared",
                    "success",
                  );
                }}
              />
            )}

            {currentPage === "notifications" && (
              <NotificationsPage
                notifications={notifications}
                hotspotRequests={hotspotRequests}
                renewalRequests={renewalRequests}
                onlineOrders={onlineOrders}
                onApproveBroadbandRenewal={handleApproveBroadbandRenewal}
                onRejectBroadbandRenewal={handleRejectBroadbandRenewal}
                onApproveOnlineOrder={handleApproveOnlineOrder}
                onRejectOnlineOrder={handleRejectOnlineOrder}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onClearAll={handleClearNotifications}
                onToggleRead={handleToggleNotificationRead}
                onApproveRequest={handleApproveHotspotRequest}
                onRejectRequest={handleRejectHotspotRequest}
                onNavigate={handleNavigate}
                showToast={showToast}
                onHardReset={() => {
                  setNotifications([]);
                  setHotspotRequests([]);
                  setOnlineOrders([]);
                  localStorage.removeItem("nexora_notifications");
                  localStorage.removeItem("nexora_hotspot_requests");
                  localStorage.removeItem("nexora_online_orders");
                  if (uid) {
                    setDoc(
                      doc(db, "users", uid, "appData", "nexora_notifications"),
                      { value: [] },
                    ).catch(console.error);
                    setDoc(
                      doc(
                        db,
                        "users",
                        uid,
                        "appData",
                        "nexora_hotspot_requests",
                      ),
                      { value: [] },
                    ).catch(console.error);
                    setDoc(
                      doc(db, "users", uid, "appData", "nexora_online_orders"),
                      { value: [] },
                    ).catch(console.error);
                  }
                  showToast(
                    "All notification and request data has been cleared",
                    "success",
                  );
                }}
              />
            )}

            {currentPage === "subscriptions" && (
              <SubscriptionsPage
                clients={clients}
                packages={packages}
                settings={settings}
                onRenewClient={handleRenewClient}
                onSendSmsReminder={(client) =>
                  handleSendSmsReminder(client, "", "SMS")
                }
                onToggleStatus={handleToggleStatus}
                onNavigate={handleNavigate}
                showToast={showToast}
                renewalRequests={renewalRequests}
                onApproveRenewalRequest={handleApproveBroadbandRenewal}
                onRejectRenewalRequest={handleRejectBroadbandRenewal}
              />
            )}

            {currentPage === "live-bandwidth" && (
              <LiveBandwidthPage
                clients={clients}
                routerConfig={routerConfig}
                showToast={showToast}
              />
            )}

            {currentPage === "support-tickets" && (
              <SupportTicketsPage clients={clients} showToast={showToast} />
            )}

            {currentPage === "sms-notifications" && (
              <SmsNotificationPage
                clients={clients}
                settings={settings}
                showToast={showToast}
              />
            )}

            {currentPage === "expenses" && (
              <ExpensesPage
                payments={payments}
                clients={clients}
                settings={settings}
                showToast={showToast}
              />
            )}

            {currentPage === "network-map" && (
              <NetworkCoverageMap
                clients={clients}
                routers={routers}
                showToast={showToast}
              />
            )}

            {currentPage === "invoices" && (
              <InvoicePrintPage
                clients={clients}
                settings={settings}
                payments={payments}
                showToast={showToast}
              />
            )}

            {currentPage === "security" && (
              <SecurityPage
                settings={settings}
                clients={clients}
                payments={payments}
                routerConfig={routerConfig}
                showToast={showToast}
                onRestoreData={(restored) => {
                  if (restored.clients) setClients(restored.clients);
                  if (restored.settings) setSettings(restored.settings);
                  if (restored.payments) setPayments(restored.payments);
                  if (restored.routerConfig)
                    setRouterConfig(restored.routerConfig);
                }}
              />
            )}

            {currentPage === "admin-profile" && (
              <AdminProfilePage
                adminProfile={adminProfile}
                onSaveAdminProfile={setAdminProfile}
                showToast={showToast}
              />
            )}

            {[
              "configuration",
              "network-diagram",
              "support-ticketing",
              "purchase",
              "inventory",
            ].includes(currentPage) && (
              <IspDigitalModulePage
                key={currentPage}
                pageId={currentPage}
                clients={clients}
                settings={settings}
                showToast={showToast}
                uid={uid}
              />
            )}

            {currentPage === "audit" && (
              <AuditLogsPage
                logs={auditLogs}
                onHardReset={() => {
                  setAuditLogs([]);
                  localStorage.removeItem("nexora_audit_logs");
                  if (uid)
                    setDoc(
                      doc(db, "users", uid, "appData", "nexora_audit_logs"),
                      { value: [] },
                    ).catch(console.error);
                  showToast("All audit log data has been cleared", "success");
                }}
              />
            )}

            {currentPage === "settings" && (
              <SettingsPage
                settings={settings}
                onSaveSettings={(s) => {
                  setSettings(s);
                  addAuditLog("Updated Settings", "App");
                }}
                showToast={showToast}
                onResetAllData={handleResetAllData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Floating Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Global FlowForge Modals */}
      <BillingModal
        isOpen={globalBillingModalOpen}
        onClose={() => setGlobalBillingModalOpen(false)}
        clients={clients}
        onConfirmPayment={handleCollectPayment}
        currencySymbol={settings.currency || "৳"}
      />

      <ImportWizard
        isOpen={globalImportWizardOpen}
        onClose={() => setGlobalImportWizardOpen(false)}
        onImportClients={handleBulkImportClients}
      />

      <TownViewModal
        isOpen={globalTownViewOpen}
        onClose={() => setGlobalTownViewOpen(false)}
        clients={clients}
        payments={payments}
        onSelectClient={(c) => {
          setSelectedLedgerClient(c);
          setGlobalTownViewOpen(false);
        }}
        currencySymbol={settings.currency || "৳"}
      />
    </div>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [loginMode, setLoginMode] = useState<
    "select" | "admin" | "client" | "buy-package"
  >("select");
  const [loggedInClient, setLoggedInClient] = useState<Client | null>(null);

  // Background silent authentication to maintain Firebase Firestore connectivity across all devices
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setAuthChecking(false);
      if (!user) {
        setUser({ uid: "nexora_network_admin" } as User);
      }
    }, 1000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimer);
      if (currentUser) {
        setUser(currentUser);
        setAuthChecking(false);
      } else {
        try {
          const res = await signInAnonymously(auth);
          setUser(res.user);
        } catch {
          setUser({ uid: "nexora_network_admin" } as User);
        } finally {
          setAuthChecking(false);
        }
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const effectiveUid = user?.uid || "nexora_network_admin";
  const [settings, setSettings] = usePersistentState<AppSettings>(
    "nexora_settings",
    initialSettings,
    effectiveUid,
  );
  const [packages, setPackages] = usePersistentState<Package[]>(
    "nexora_packages",
    initialPackages,
    effectiveUid,
  );

  // Show dynamic, branded animated intro screen on application startup
  if (showIntro || authChecking) {
    return (
      <IntroScreen
        settings={settings}
        onComplete={() => {
          setShowIntro(false);
          setAuthChecking(false);
        }}
      />
    );
  }

  const handleAdminSelect = () => {
    setLoginMode("admin");
  };

  const handleClientSelect = () => {
    setLoginMode("client");
  };

  const handleBuyPackageSelect = () => {
    setLoginMode("buy-package");
  };

  // 1. PUBLIC SELF-SERVICE PACKAGE PORTAL
  if (loginMode === "buy-package") {
    return (
      <BuyPackagePortal
        packages={packages}
        settings={settings}
        uid={effectiveUid}
        onBackToLogin={() => setLoginMode("select")}
        onGoToClientLogin={() => setLoginMode("client")}
        onDirectLoginAsClient={(client) => {
          setLoggedInClient(client);
          setLoginMode("client");
        }}
        onClientCreated={() => {
          // Handled by BuyPackagePortal persistence
        }}
      />
    );
  }

  // 2. LOGIN SELECTION SCREEN (Buy Package / Client Login / Admin Login)
  if (loginMode === "select") {
    return (
      <div className="min-h-screen bg-[#ecf0f5] flex flex-col items-center justify-center p-4 text-slate-800 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border-t-4 border-t-[#3c8dbc] shadow-lg text-center space-y-6">
          {/* Company Logo / Emblem */}
          <div className="flex flex-col items-center justify-center">
            {settings.logo ? (
              <div className="w-24 h-24 p-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center mb-3">
                <img
                  src={settings.logo}
                  alt="Company Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-blue-100/80 shadow-xs">
                <Globe className="w-10 h-10 text-[#3c8dbc]" />
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {settings.companyName || settings.appName || "Nexora network"}
            </h1>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Please choose an option to continue
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            {/* 1. BUY YOUR PACKAGE (NEW / PROMINENT) */}
            <button
              id="btn-buy-package"
              onClick={handleBuyPackageSelect}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-between group cursor-pointer active:scale-98"
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black">Buy your package</span>
                    <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-1.5 py-0.2 rounded uppercase">
                      NEW LINE
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-100 font-normal">
                    নতুন ইন্টারনেট লাইন বা প্যাকেজ কিনুন
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* 2. CLIENT LOGIN */}
            <button
              id="btn-client-login"
              onClick={handleClientSelect}
              className="w-full p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all flex items-center justify-between text-[#3c8dbc] font-bold group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-[#3c8dbc]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Client Login
                  </p>
                  <p className="text-[11px] text-slate-500 font-normal">
                    গ্রাহক লগইন ও সেলফ সার্ভিস ড্যাশবোর্ড
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#3c8dbc] group-hover:translate-x-1 transition-transform" />
            </button>

            {/* 3. ADMIN LOGIN */}
            <button
              id="btn-admin-login"
              onClick={handleAdminSelect}
              className="w-full p-4 rounded-xl border border-[#dd4b39]/30 bg-red-50/50 hover:bg-red-50 transition-all flex items-center justify-between text-[#dd4b39] font-bold group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="w-5 h-5 text-[#dd4b39]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Admin Login
                  </p>
                  <p className="text-[11px] text-slate-500 font-normal">
                    এডমিন প্যানেল ও মাইক্রোটিক কন্ট্রোল
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#dd4b39] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Micro Footer Note */}
          <div className="pt-2 text-[11px] text-slate-400 font-medium">
            Hotspot & PPPoE Multi-Router Central ERP System
          </div>
        </div>
      </div>
    );
  }

  if (loginMode === "client" && !loggedInClient) {
    return (
      <ClientLoginScreen
        onBack={() => setLoginMode("select")}
        onLoginSuccess={(client) => setLoggedInClient(client)}
        uid={effectiveUid}
        settings={settings}
      />
    );
  }

  if (loginMode === "client" && loggedInClient) {
    return (
      <ClientDashboard
        client={loggedInClient}
        onLogout={() => {
          setLoggedInClient(null);
          setLoginMode("select");
        }}
        uid={effectiveUid}
        settings={settings}
      />
    );
  }

  // Security layer: If PIN lock is enabled and session is not yet unlocked
  const isLockEnabled =
    settings.pinLockEnabled !== false && settings.patternLockEnabled !== false;
  if (loginMode === "admin" && isLockEnabled && !isUnlocked) {
    return (
      <div className="relative min-h-screen">
        <button
          onClick={() => setLoginMode("select")}
          className="absolute top-6 left-6 z-50 text-slate-800 hover:text-slate-950 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <PinLockScreen
          settings={settings}
          onUnlock={() => setIsUnlocked(true)}
          onSaveSettings={setSettings}
        />
      </div>
    );
  }

  if (loginMode === "admin" && isUnlocked) {
    return (
      <MainApp
        uid={effectiveUid}
        onLockApp={() => {
          setIsUnlocked(false);
          setLoginMode("select");
        }}
      />
    );
  }

  return null;
}

export default App;
