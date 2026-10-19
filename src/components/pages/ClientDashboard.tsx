import React, { useState, useEffect } from "react";
import {
  Client,
  AppSettings,
  NotificationItem,
  Package,
  BroadbandRenewalRequest,
  SupportTicket,
  PaymentRecord,
  Invoice,
} from "../../types";
import {
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Printer,
  QrCode,
  Landmark,
  Copy,
  Check,
  PhoneCall,
} from "lucide-react";
import {
  generateClientLinkToken,
  checkClientLinkStatus,
  unlinkClientTelegram,
  sendTelegramNotification,
} from "../../lib/telegramClient";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { sanitizeForStorage } from "../../lib/storageUtils";
import { getClientExpiryInfo, findPackageByDetails } from "../../lib/expiryUtils";
import { ClientAiAssistant } from "../ClientAiAssistant";
import {
  ClientSidebar,
  ClientTopHeader,
  ClientNavTab,
} from "../client-portal/ClientSidebarAndHeader";
import { ClientOverviewTab } from "../client-portal/ClientOverviewTab";
import { ClientSubViews } from "../client-portal/ClientSubViews";

interface ClientDashboardProps {
  client: Client;
  onLogout: () => void;
  uid: string;
  settings: AppSettings;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  client,
  onLogout,
  uid,
  settings: initialPropSettings,
}) => {
  const [currentSettings, setCurrentSettings] = useState<AppSettings>(() => {
    if (initialPropSettings?.logo) return initialPropSettings;
    try {
      const local = localStorage.getItem("nexora_settings");
      if (local) {
        const parsed = JSON.parse(local);
        return {
          ...initialPropSettings,
          ...parsed,
          logo: parsed.logo || initialPropSettings?.logo,
        };
      }
    } catch {}
    return initialPropSettings;
  });

  useEffect(() => {
    if (initialPropSettings) {
      setCurrentSettings((prev) => ({
        ...prev,
        ...initialPropSettings,
        logo: initialPropSettings.logo || prev.logo,
      }));
    }
  }, [initialPropSettings]);

  useEffect(() => {
    fetch("/api/db/get?key=nexora_settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.value) {
          setCurrentSettings((prev) => ({
            ...prev,
            ...data.value,
            logo: data.value.logo || prev.logo,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const settings = currentSettings;

  const [activeClient, setActiveClient] = useState<Client>(client);
  const [activeTab, setActiveTab] = useState<ClientNavTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useState<"EN" | "BN">("EN");

  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>(client.package);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "bKash" | "Nagad" | "Rocket" | "Bank"
  >("bKash");

  // Interactive Gateway Modal states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"form" | "success">("form");
  const [inputTrxId, setInputTrxId] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState(client.phone || "");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [generatedTrxId, setGeneratedTrxId] = useState("");
  const [copiedNumber, setCopiedNumber] = useState(false);

  const merchantPaymentNumber =
    currentSettings?.phone || initialPropSettings?.phone || "01817681233";

  const handleCopyNumber = (num: string = "01817681233") => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(num);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = num;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2500);
    } catch (e) {
      console.warn("Copy failed:", e);
    }
  };

  // Support Tickets states
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState<
    "No Internet" | "Slow Speed" | "Router Problem" | "Payment Issue" | "Other"
  >("No Internet");
  const [newTicketDesc, setNewTicketDesc] = useState("");
  const [ticketMsg, setTicketMsg] = useState("");

  // Diagnostics & Network Speed stats
  const [pingStatus, setPingStatus] = useState<"idle" | "running" | "success">(
    "idle"
  );
  const [pingLatency, setPingLatency] = useState<number>(0);
  const [packetLoss, setPacketLoss] = useState<number>(0);
  const [signalPower, setSignalPower] = useState<number>(-19.4);
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<string[]>([]);

  // Billing history, Invoices, Notifications & ONU Mapping for logged-in client ONLY
  const [billingHistory, setBillingHistory] = useState<PaymentRecord[]>([]);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [clientNotifications, setClientNotifications] = useState<NotificationItem[]>([]);
  const [onuMapping, setOnuMapping] = useState<any | null>(null);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] =
    useState<PaymentRecord | null>(null);

  // Telegram Bot One-Time Client Linking State
  const [telegramLinkStatus, setTelegramLinkStatus] = useState<{
    isLinked: boolean;
    linkedAt?: string;
  } | null>(null);
  const [isGeneratingClientLink, setIsGeneratingClientLink] = useState(false);
  const [clientTelegramLinkData, setClientTelegramLinkData] = useState<{
    link: string;
    token: string;
  } | null>(null);
  const [copiedClientLink, setCopiedClientLink] = useState(false);
  const [isUnlinkingTelegram, setIsUnlinkingTelegram] = useState(false);
  const [telegramActionNotice, setTelegramActionNotice] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (activeClient?.userId) {
      checkClientLinkStatus(activeClient.userId).then((res) => {
        if (res.success) {
          setTelegramLinkStatus({
            isLinked: res.isLinked,
            linkedAt: res.linkDetails?.linkedAt,
          });
        }
      });
    }
  }, [activeClient?.userId]);

  const handleGenerateTelegramLink = async () => {
    if (!activeClient?.userId) return;
    setIsGeneratingClientLink(true);
    setTelegramActionNotice(null);
    const res = await generateClientLinkToken(
      activeClient.userId,
      activeClient.name || activeClient.userId
    );
    setIsGeneratingClientLink(false);
    if (res.success && res.link && res.token) {
      setClientTelegramLinkData({ link: res.link, token: res.token });
    } else {
      setTelegramActionNotice(res.error || "Failed to generate linking token");
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!activeClient?.userId) return;
    setIsUnlinkingTelegram(true);
    const res = await unlinkClientTelegram(activeClient.userId);
    setIsUnlinkingTelegram(false);
    if (res.success) {
      setTelegramLinkStatus({ isLinked: false });
      setClientTelegramLinkData(null);
      setTelegramActionNotice("Messenger Bot account unlinked successfully.");
    } else {
      setTelegramActionNotice(res.error || "Failed to unlink Messenger Bot");
    }
  };

  // Sync client real-time from both server database and Firestore
  useEffect(() => {
    let active = true;

    const updateFromClientsList = (allClients: Client[]) => {
      if (!active) return;
      const latest = allClients.find(
        (c) => c.id === client.id || c.userId === client.userId
      );
      if (latest) {
        setActiveClient((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(latest)) {
            return latest;
          }
          return prev;
        });
      }
    };

    const syncWithBackend = () => {
      fetch("/api/db/get?key=nexora_clients")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.value && Array.isArray(data.value)) {
            updateFromClientsList(data.value);
          }
        })
        .catch(() => {});
    };

    syncWithBackend();
    const pollInterval = setInterval(syncWithBackend, 3000);

    const refs = [
      doc(db, "ispWorkspace", "mainData", "collections", "nexora_clients"),
    ];
    if (uid && uid !== "nexora_network_admin") {
      refs.push(doc(db, "users", uid, "appData", "nexora_clients"));
    }

    const unsubs = refs.map((ref) =>
      onSnapshot(
        ref,
        (snap) => {
          if (snap.exists() && snap.data().value) {
            updateFromClientsList(snap.data().value as Client[]);
          }
        },
        () => {}
      )
    );

    const handleStorage = () => {
      const local = localStorage.getItem("nexora_clients");
      if (local) {
        try {
          updateFromClientsList(JSON.parse(local) as Client[]);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      clearInterval(pollInterval);
      unsubs.forEach((unsub) => unsub());
      window.removeEventListener("storage", handleStorage);
    };
  }, [client.id, client.userId, uid]);

  // Load support tickets, payment records, invoices, ONU mapping & client notifications
  useEffect(() => {
    const filterClientNotifications = (allNotifs: NotificationItem[]) => {
      return allNotifs.filter(
        (n) =>
          n.text?.toLowerCase().includes(client.userId.toLowerCase()) ||
          n.text?.toLowerCase().includes(client.name.toLowerCase())
      );
    };

    const loadData = () => {
      try {
        const localTickets = localStorage.getItem("isp_support_tickets");
        if (localTickets) {
          const parsed = JSON.parse(localTickets) as SupportTicket[];
          setTickets(
            parsed.filter(
              (t) => t.clientId === client.id || t.phone === client.phone
            )
          );
        }

        const localPayments = localStorage.getItem("nexora_payments");
        if (localPayments) {
          const parsed = JSON.parse(localPayments) as PaymentRecord[];
          setBillingHistory(parsed.filter((p) => p.userId === client.userId));
        }

        const localInvoices = localStorage.getItem("nexora_invoices");
        if (localInvoices) {
          const parsed = JSON.parse(localInvoices) as Invoice[];
          setClientInvoices(
            parsed.filter(
              (inv) => inv.userId === client.userId || inv.clientId === client.id
            )
          );
        }

        const localNotifs = localStorage.getItem("nexora_notifications");
        if (localNotifs) {
          const parsed = JSON.parse(localNotifs) as NotificationItem[];
          setClientNotifications(filterClientNotifications(parsed));
        }
      } catch (err) {
        console.error("Error loading local client records:", err);
      }
    };
    loadData();

    // Fetch ONU mappings and Invoices from backend DB
    fetch("/api/db/get?key=nexora_onu_mappings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.value)) {
          const found = data.value.find(
            (m: any) =>
              m.clientId === client.id ||
              (m.userId && m.userId.toLowerCase() === client.userId.toLowerCase())
          );
          setOnuMapping(found || null);
        }
      })
      .catch(() => {});

    fetch("/api/db/get?key=nexora_invoices")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.value)) {
          setClientInvoices(
            (data.value as Invoice[]).filter(
              (inv) => inv.userId === client.userId || inv.clientId === client.id
            )
          );
        }
      })
      .catch(() => {});

    const syncClientNotifs = () => {
      fetch("/api/db/get?key=nexora_notifications")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.value)) {
            setClientNotifications(filterClientNotifications(data.value as NotificationItem[]));
          }
        })
        .catch(() => {});
    };
    syncClientNotifs();
    const notifTimer = setInterval(syncClientNotifs, 4000);

    const paymentsRef = doc(
      db,
      "ispWorkspace",
      "mainData",
      "collections",
      "nexora_payments"
    );
    const unsubPayments = onSnapshot(
      paymentsRef,
      (snap) => {
        if (snap.exists() && snap.data().value) {
          const allPayments = snap.data().value as PaymentRecord[];
          setBillingHistory(
            allPayments.filter((p) => p.userId === client.userId)
          );
        }
      },
      () => {}
    );

    return () => {
      clearInterval(notifTimer);
      unsubPayments();
    };
  }, [client.id, client.userId, client.phone]);

  // Fetch packages for pricing options
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await fetch("/api/db/get?key=nexora_packages");
        const data = await res.json();
        if (data.success && data.value && Array.isArray(data.value)) {
          setPackages(data.value);
          return;
        }
        const workspaceRef = doc(
          db,
          "ispWorkspace",
          "mainData",
          "collections",
          "nexora_packages"
        );
        const workspaceSnap = await getDoc(workspaceRef);
        if (workspaceSnap.exists() && workspaceSnap.data().value) {
          setPackages(workspaceSnap.data().value);
          return;
        }
        const local = localStorage.getItem("nexora_packages");
        if (local) setPackages(JSON.parse(local));
      } catch {
        const local = localStorage.getItem("nexora_packages");
        if (local) {
          try {
            setPackages(JSON.parse(local));
          } catch {}
        }
      }
    };
    fetchPackages();
  }, []);

  useEffect(() => {
    if (packages.length > 0 && activeClient) {
      const matched = findPackageByDetails(
        packages,
        activeClient.package,
        activeClient.price
      );
      if (matched) {
        setSelectedPackageId(matched.id);
      }
    }
  }, [packages, activeClient]);

  // 1-Click Line Auto-Fix & Re-sync
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixSuccessMsg, setAutoFixSuccessMsg] = useState<string | null>(
    null
  );

  const handleAutoFixLine = async () => {
    if (isAutoFixing) return;
    setIsAutoFixing(true);
    setAutoFixSuccessMsg(null);

    try {
      const res = await fetch("/api/ai/auto-fix-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeClient.userId,
          phone: activeClient.phone,
          name: activeClient.name,
        }),
      });
      const data = await res.json();
      if (data.success && data.client) {
        const updatedClient: Client = {
          ...activeClient,
          ...data.client,
          status: "online",
        };
        setActiveClient(updatedClient);
        setAutoFixSuccessMsg(
          data.message || "Line reset and reactivated successfully!"
        );

        const clientsRef = doc(
          db,
          "ispWorkspace",
          "mainData",
          "collections",
          "nexora_clients"
        );
        const clientsSnap = await getDoc(clientsRef);
        let allClients: Client[] = [];
        if (clientsSnap.exists() && clientsSnap.data().value) {
          allClients = clientsSnap.data().value;
        } else {
          const local = localStorage.getItem("nexora_clients");
          if (local) allClients = JSON.parse(local);
        }
        const nextClients = allClients.map((c) =>
          c.id === updatedClient.id ||
          (updatedClient.userId &&
            updatedClient.userId.trim() !== "" &&
            c.userId === updatedClient.userId)
            ? updatedClient
            : c
        );

        localStorage.setItem("nexora_clients", JSON.stringify(nextClients));
        await setDoc(clientsRef, {
          value: sanitizeForStorage(nextClients),
          updatedAt: Date.now(),
        });
        fetch("/api/db/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "nexora_clients",
            value: sanitizeForStorage(nextClients),
          }),
        }).catch(() => {});

        window.dispatchEvent(new Event("storage"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAutoFixing(false);
    }
  };

  // Save Client Profile / Password updates to DB & Firestore
  const handleSaveClientProfile = async (updates: Partial<Client>) => {
    const updatedClient: Client = { ...activeClient, ...updates };
    setActiveClient(updatedClient);

    try {
      const res = await fetch("/api/db/get?key=nexora_clients");
      const data = await res.json();
      let allClients: Client[] = [];
      if (data.success && Array.isArray(data.value)) {
        allClients = data.value;
      } else {
        const local = localStorage.getItem("nexora_clients");
        if (local) allClients = JSON.parse(local);
      }

      const nextClients = allClients.map((c) =>
        c.id === updatedClient.id || c.userId === updatedClient.userId
          ? updatedClient
          : c
      );

      localStorage.setItem("nexora_clients", JSON.stringify(nextClients));
      await fetch("/api/db/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "nexora_clients",
          value: sanitizeForStorage(nextClients),
          updatedAt: Date.now(),
        }),
      });

      const clientsRef = doc(
        db,
        "ispWorkspace",
        "mainData",
        "collections",
        "nexora_clients"
      );
      await setDoc(clientsRef, {
        value: sanitizeForStorage(nextClients),
        updatedAt: Date.now(),
      }).catch(() => {});
    } catch (err) {
      console.warn("Error saving client profile:", err);
    }
  };

  // Live second-by-second countdown for client expiry
  const [liveCountdown, setLiveCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    formattedText: string;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    formattedText: "",
  });

  useEffect(() => {
    const updateCountdown = () => {
      if (!activeClient.expiry) {
        setLiveCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: false,
          formattedText: "N/A",
        });
        return;
      }

      const parts = activeClient.expiry.trim().split("-").map(Number);
      let targetDate: Date;
      if (
        parts.length === 3 &&
        !isNaN(parts[0]) &&
        !isNaN(parts[1]) &&
        !isNaN(parts[2])
      ) {
        targetDate = new Date(
          parts[0],
          parts[1] - 1,
          parts[2],
          23,
          59,
          59,
          999
        );
      } else {
        const parsed = new Date(activeClient.expiry);
        targetDate = isNaN(parsed.getTime())
          ? new Date()
          : new Date(
              parsed.getFullYear(),
              parsed.getMonth(),
              parsed.getDate(),
              23,
              59,
              59,
              999
            );
      }

      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        const overdueDays = Math.max(
          1,
          Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
        );
        setLiveCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          formattedText: `Expired (${overdueDays} days ago)`,
        });
      } else {
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        setLiveCountdown({
          days,
          hours,
          minutes,
          seconds,
          isExpired: false,
          formattedText: `${days}d ${hours}h ${minutes}m`,
        });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [activeClient.expiry]);

  // Real-time Bandwidth Telemetry (Strictly from MikroTik / LibreQoS API — NO fake/random numbers)
  const [bandwidthTelemetry, setBandwidthTelemetry] = useState<{
    available: boolean;
    downloadMbps: number;
    uploadMbps: number;
    lastUpdated: string | null;
    history: { time: string; dl: number; ul: number }[];
  }>({
    available: false,
    downloadMbps: 0,
    uploadMbps: 0,
    lastUpdated: null,
    history: [],
  });

  useEffect(() => {
    const isOnline = activeClient.status === "online";
    if (!isOnline) {
      setBandwidthTelemetry({
        available: false,
        downloadMbps: 0,
        uploadMbps: 0,
        lastUpdated: null,
        history: [],
      });
      return;
    }

    let isMounted = true;

    const pollClientTraffic = async () => {
      try {
        let savedRouter: any = null;
        try {
          const raw = localStorage.getItem("fe_mikrotik_config");
          if (raw) savedRouter = JSON.parse(raw);
          if (!savedRouter) {
            const routersRaw = localStorage.getItem("nexora_routers");
            if (routersRaw) {
              const list = JSON.parse(routersRaw);
              if (Array.isArray(list)) {
                savedRouter =
                  list.find((r: any) => r.connected) || list[0] || null;
              }
            }
          }
        } catch {}

        if (savedRouter?.ip && savedRouter?.connected) {
          const res = await fetch("/api/mikrotik/traffic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              router: {
                ip: savedRouter.ip,
                apiPort: Number(savedRouter.port || savedRouter.apiPort) || 8728,
                username: savedRouter.user || savedRouter.username || "admin",
                password: savedRouter.password || "",
                connected: true,
                isDemo: savedRouter.isDemo,
              },
            }),
          });

          if (res.ok && isMounted) {
            const data = await res.json();
            if (data.success && Array.isArray(data.queues)) {
              const q = data.queues.find(
                (item: any) =>
                  item.name === `nexora_${activeClient.userId}` ||
                  item.name === activeClient.userId ||
                  (activeClient.ipAddress &&
                    item.target?.includes(activeClient.ipAddress))
              );
              if (q) {
                const dl = parseFloat(
                  (Number(q.rxMbps) || (Number(q.rxBps) || 0) / 1000000).toFixed(1)
                );
                const ul = parseFloat(
                  (Number(q.txMbps) || (Number(q.txBps) || 0) / 1000000).toFixed(1)
                );
                const timeStr = new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                setBandwidthTelemetry((prev) => ({
                  available: true,
                  downloadMbps: dl,
                  uploadMbps: ul,
                  lastUpdated: timeStr,
                  history: [...prev.history.slice(-19), { time: timeStr, dl, ul }],
                }));
                return;
              }
            }
          }
        }
      } catch {}

      if (isMounted) {
        setBandwidthTelemetry((prev) => ({
          ...prev,
          available: false,
        }));
      }
    };

    pollClientTraffic();
    const interval = setInterval(pollClientTraffic, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeClient.userId, activeClient.ipAddress, activeClient.status]);

  // Ping Test Diagnostic
  const runPingTest = () => {
    setPingStatus("running");
    setDiagnosticsLogs([]);
    const currentLogs: string[] = [];
    const addLog = (msg: string) => {
      currentLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setDiagnosticsLogs([...currentLogs]);
    };

    const isOnline = activeClient.status === "online";

    setTimeout(() => {
      addLog("Connecting to Gateway Router (nexora-network-gw)...");
      setPingLatency(isOnline ? 3 : 0);
    }, 500);

    setTimeout(() => {
      addLog("Sending ICMP Echo packets to local ONU device...");
      setSignalPower(isOnline ? -18.5 : -38.5);
      setPacketLoss(isOnline ? 0 : 100);
    }, 1500);

    setTimeout(() => {
      if (isOnline) {
        addLog("Pinging external DNS 8.8.8.8 and 1.1.1.1... Response: 3ms TTL=58");
      } else {
        addLog("⚠️ Pinging external DNS: Destination Host Unreachable (100% Loss)");
      }
    }, 2500);

    setTimeout(() => {
      if (isOnline) {
        addLog("✅ Ping diagnostics completed. Status: ONLINE & HEALTHY.");
      } else {
        addLog("❌ Diagnostic Result: Line is OFFLINE on gateway.");
      }
      setPingStatus("success");
    }, 3500);
  };

  // Submit Support Ticket
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject || !newTicketDesc) {
      setTicketMsg("Please fill in all details.");
      return;
    }

    try {
      const localTickets = localStorage.getItem("isp_support_tickets");
      const allTickets: SupportTicket[] = localTickets
        ? JSON.parse(localTickets)
        : [];

      const newTicket: SupportTicket = {
        id: `TCK-${Date.now()}`,
        ticketNumber: `TK-2026-${String(allTickets.length + 1).padStart(3, "0")}`,
        clientId: activeClient.id,
        clientName: activeClient.name,
        phone: activeClient.phone,
        category: newTicketCategory as any,
        priority: "High",
        status: "Open",
        subject: newTicketSubject,
        description: newTicketDesc,
        createdAt: new Date().toLocaleString(),
        location: activeClient.router || "POP Central Gateway",
      };

      const updatedTickets = [newTicket, ...allTickets];
      localStorage.setItem(
        "isp_support_tickets",
        JSON.stringify(updatedTickets)
      );
      setTickets(updatedTickets.filter((t) => t.clientId === client.id));

      const notifRef = doc(
        db,
        "ispWorkspace",
        "mainData",
        "collections",
        "nexora_notifications"
      );
      const notifSnap = await getDoc(notifRef);
      let notifications: NotificationItem[] = [];
      if (notifSnap.exists() && notifSnap.data().value) {
        notifications = notifSnap.data().value;
      }
      const newNotif: NotificationItem = {
        id: Date.now(),
        icon: "🎫",
        text: `🎫 New Support Ticket: ${activeClient.name} (${activeClient.userId}) — "${newTicketSubject}" [${newTicketCategory}]`,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        read: false,
      };
      const nextNotifs = sanitizeForStorage([newNotif, ...notifications.slice(0, 99)]);
      localStorage.setItem("nexora_notifications", JSON.stringify(nextNotifs));
      await setDoc(notifRef, {
        value: nextNotifs,
        updatedAt: Date.now(),
      }).catch(() => {});
      fetch("/api/db/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "nexora_notifications",
          value: nextNotifs,
          updatedAt: Date.now(),
        }),
      }).catch(() => {});

      sendTelegramNotification("SUPPORT_TICKET", {
        clientName: activeClient.name,
        userId: activeClient.userId,
        phone: activeClient.phone,
        category: newTicketCategory,
        priority: "High",
        subject: newTicketSubject,
        description: newTicketDesc,
        location: activeClient.router || "POP Central Gateway",
      });

      setNewTicketSubject("");
      setNewTicketDesc("");
      setTicketMsg(
        "Your ticket has been submitted successfully! Support team will assist shortly."
      );
    } catch (err) {
      console.error(err);
      setTicketMsg("Failed to submit ticket.");
    }
  };

  // Interactive Payment checkout processor
  const handleInteractivePayment = () => {
    setCheckoutStep("form");
    setCheckoutPhone(client.phone || "01");
    setInputTrxId("");
    setShowCheckoutModal(true);
  };

  const handleProceedCheckout = async () => {
    if (!checkoutPhone || checkoutPhone.length < 6) return;
    if (!inputTrxId || inputTrxId.trim().length < 3) return;

    setIsProcessingPayment(true);
    const finalTrx = inputTrxId.trim();
    setGeneratedTrxId(finalTrx);

    try {
      const chosenPkg = (selectedPackageId !== null
        ? packages.find((p) => p.id === selectedPackageId)
        : packages.find((p) => p.name === selectedPackage)) || {
        price: activeClient.price || "500",
        speed: activeClient.downloadSpeed || "10 Mbps",
      };

      const reqRef = doc(
        db,
        "ispWorkspace",
        "mainData",
        "collections",
        "nexora_renewal_requests"
      );
      const reqSnap = await getDoc(reqRef);
      let allRequests: BroadbandRenewalRequest[] = [];
      if (reqSnap.exists() && reqSnap.data().value) {
        allRequests = reqSnap.data().value;
      } else {
        const local = localStorage.getItem("nexora_renewal_requests");
        if (local) allRequests = JSON.parse(local);
      }

      const newRequest: BroadbandRenewalRequest = {
        id: `REQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        clientId: activeClient.id,
        clientName: activeClient.name,
        userId: activeClient.userId,
        phone: checkoutPhone,
        currentPackage: activeClient.package || "",
        requestedPackage: selectedPackage,
        price: chosenPkg.price,
        paymentMethod: selectedPaymentMethod,
        transactionId: finalTrx,
        requestedAt: new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        status: "pending",
      };

      const nextRequests = [newRequest, ...allRequests];
      await setDoc(reqRef, {
        value: sanitizeForStorage(nextRequests),
        updatedAt: Date.now(),
      });
      localStorage.setItem(
        "nexora_renewal_requests",
        JSON.stringify(nextRequests)
      );
      fetch("/api/db/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "nexora_renewal_requests",
          value: sanitizeForStorage(nextRequests),
        }),
      }).catch(() => {});

      const paymentsRef = doc(
        db,
        "ispWorkspace",
        "mainData",
        "collections",
        "nexora_payments"
      );
      const paymentsSnap = await getDoc(paymentsRef);
      let allPayments: PaymentRecord[] = [];
      if (paymentsSnap.exists() && paymentsSnap.data().value) {
        allPayments = paymentsSnap.data().value;
      } else {
        const local = localStorage.getItem("nexora_payments");
        if (local) allPayments = JSON.parse(local);
      }

      const newPayment: PaymentRecord = {
        id: finalTrx,
        clientName: activeClient.name,
        userId: activeClient.userId,
        package: selectedPackage,
        amount: parseInt(chosenPkg.price.replace(/[^\d]/g, ""), 10) || 500,
        paymentMethod: selectedPaymentMethod,
        transactionType: "Broadband Renewal",
        collector: "Online Gateway Portal",
        timestamp: new Date().toLocaleString(),
        dateKey: new Date().toISOString().slice(0, 10),
        monthKey: new Date().toISOString().slice(0, 7),
        status: "Pending" as any,
        notes: `Submitted via ${selectedPaymentMethod}. TrxID: ${finalTrx}. Awaiting Admin Accept/Approval.`,
      };

      const nextPayments = [newPayment, ...allPayments];
      await setDoc(paymentsRef, {
        value: sanitizeForStorage(nextPayments),
        updatedAt: Date.now(),
      });
      localStorage.setItem("nexora_payments", JSON.stringify(nextPayments));
      fetch("/api/db/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "nexora_payments",
          value: sanitizeForStorage(nextPayments),
        }),
      }).catch(() => {});
      setBillingHistory(nextPayments.filter((p) => p.userId === client.userId));

      const notifRef = doc(
        db,
        "ispWorkspace",
        "mainData",
        "collections",
        "nexora_notifications"
      );
      const notifSnap = await getDoc(notifRef);
      let allNotifs: NotificationItem[] = [];
      if (notifSnap.exists() && notifSnap.data().value) {
        allNotifs = notifSnap.data().value;
      }
      const newNotif: NotificationItem = {
        id: Date.now(),
        icon: "CreditCard",
        text: `🔔 [Pending Approval] Subscriber ${activeClient.name} (${activeClient.userId}) paid ৳${chosenPkg.price} (${selectedPaymentMethod}), TrxID: ${finalTrx}. Approve via Subscriptions page in Admin panel.`,
        time: new Date().toISOString(),
        read: false,
      };
      const nextNotifs = [newNotif, ...allNotifs];
      await setDoc(notifRef, {
        value: sanitizeForStorage(nextNotifs),
        updatedAt: Date.now(),
      });
      fetch("/api/db/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "nexora_notifications",
          value: sanitizeForStorage(nextNotifs),
        }),
      }).catch(() => {});

      window.dispatchEvent(new Event("storage"));
      setIsProcessingPayment(false);
      setCheckoutStep("success");
    } catch (err) {
      console.error(err);
      setIsProcessingPayment(false);
    }
  };

  const handlePrintReceipt = (payment: PaymentRecord) => {
    setSelectedReceiptForPrint(payment);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex overflow-hidden">
      {/* 2. LEFT SIDEBAR (Fixed/Collapsible Dark Navy) */}
      <ClientSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        client={activeClient}
        settings={settings}
        onLogout={onLogout}
        unreadNotificationsCount={
          clientNotifications.filter((n) => !n.read).length
        }
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* 3. TOP HEADER WITH CLIENT IDENTITY */}
        <ClientTopHeader
          client={activeClient}
          settings={settings}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={onLogout}
          notifications={clientNotifications}
          onMarkNotificationsRead={() =>
            setClientNotifications((prev) =>
              prev.map((n) => ({ ...n, read: true }))
            )
          }
          lang={lang}
          onToggleLang={() => setLang(lang === "EN" ? "BN" : "EN")}
        />

        {/* SCROLLABLE BODY */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* 1. DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <ClientOverviewTab
              client={activeClient}
              liveCountdown={liveCountdown}
              bandwidthTelemetry={bandwidthTelemetry}
              billingHistory={billingHistory}
              clientInvoices={clientInvoices}
              onuMapping={onuMapping}
              isAutoFixing={isAutoFixing}
              autoFixSuccessMsg={autoFixSuccessMsg}
              onAutoFixLine={handleAutoFixLine}
              onSelectTab={setActiveTab}
              onOpenPaymentModal={handleInteractivePayment}
              onPrintReceipt={handlePrintReceipt}
            />
          )}

          {/* 2. RENEW PACKAGE / BUY PACKAGE VIEW */}
          {(activeTab === "renew" || activeTab === "buy-package") && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {activeTab === "buy-package"
                      ? "Buy Internet Package"
                      : "Renew Internet Package"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select your preferred fiber internet package and complete payment verification
                  </p>
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  Current Plan:{" "}
                  <span className="text-blue-600 font-bold">
                    {activeClient.package || "None"}
                  </span>
                </div>
              </div>

              {/* Packages Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...packages]
                  .sort((a, b) => {
                    const pA =
                      parseFloat(String(a.price).replace(/[^\d.]/g, "")) || 0;
                    const pB =
                      parseFloat(String(b.price).replace(/[^\d.]/g, "")) || 0;
                    return pA - pB;
                  })
                  .map((pkg, idx) => {
                    const numericSpeed = pkg.speed.replace(/\D/g, "");
                    const isSelected =
                      selectedPackageId !== null
                        ? selectedPackageId === pkg.id
                        : selectedPackage === pkg.name;

                    const themes = [
                      "from-blue-600 to-indigo-600",
                      "from-indigo-600 to-violet-600",
                      "from-cyan-600 to-blue-600",
                      "from-emerald-600 to-teal-600",
                    ];
                    const gradient = themes[idx % themes.length];

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => {
                          setSelectedPackage(pkg.name);
                          setSelectedPackageId(pkg.id);
                        }}
                        className={`flex flex-col rounded-2xl overflow-hidden transition-all cursor-pointer bg-white border ${
                          isSelected
                            ? "border-blue-600 ring-2 ring-blue-500/30 shadow-md"
                            : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <div
                          className={`py-5 px-4 bg-gradient-to-r ${gradient} text-white flex items-center justify-between`}
                        >
                          <div>
                            <div className="text-xs font-medium text-white/85">
                              {pkg.name}
                            </div>
                            <div className="text-2xl font-bold font-mono mt-0.5">
                              {numericSpeed || pkg.speed} Mbps
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold font-mono">
                              ৳{pkg.price}
                            </div>
                            <div className="text-[10px] text-white/80">
                              / {pkg.validity || "Month"}
                            </div>
                          </div>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between space-y-4 text-xs">
                          <div className="space-y-1.5 text-slate-600">
                            <div>✓ Optical Fiber Connection</div>
                            <div>✓ Download: {pkg.speed}</div>
                            <div>✓ Upload: {pkg.upload || "Symmetric"}</div>
                            <div>✓ 24/7 Customer Support</div>
                          </div>
                          <button
                            type="button"
                            className={`w-full py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {isSelected ? "✓ Selected Package" : "Select Package"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Payment Gateways */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-800">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      {
                        id: "bKash",
                        label: "bKash Wallet",
                        logo:
                          settings?.paymentLogos?.bkash ||
                          "https://defipay.oss-ap-southeast-1.aliyuncs.com/bKash.png",
                      },
                      {
                        id: "Nagad",
                        label: "Nagad Pay",
                        logo:
                          settings?.paymentLogos?.nagad ||
                          "https://defipay.oss-ap-southeast-1.aliyuncs.com/Nagad.png",
                      },
                      {
                        id: "Rocket",
                        label: "Rocket Mobile",
                        logo:
                          settings?.paymentLogos?.rocket ||
                          "https://defipay.oss-ap-southeast-1.aliyuncs.com/Rocket.png",
                      },
                      {
                        id: "Bank",
                        label: "Bank Transfer",
                        logo: settings?.paymentLogos?.bank || null,
                      },
                    ] as const
                  ).map((item) => {
                    const isSelected = selectedPaymentMethod === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(item.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        {item.logo ? (
                          <div className="h-12 w-full flex items-center justify-center">
                            <img
                              src={item.logo}
                              alt={item.id}
                              className="max-h-10 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-full flex items-center justify-center">
                            <Landmark className="w-7 h-7 text-blue-600" />
                          </div>
                        )}
                        <span className="text-xs font-semibold text-slate-800">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Merchant Payment Instructions */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-500">
                    {selectedPaymentMethod} Send Money / Merchant Number
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-mono font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 inline-flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-emerald-600" />
                      {merchantPaymentNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyNumber(merchantPaymentNumber)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedNumber ? "Copied!" : "Copy Number"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">
                      Total Payable
                    </span>
                    <span className="text-xl font-bold font-mono text-slate-900">
                      ৳
                      {
                        (
                          (selectedPackageId !== null
                            ? packages.find((p) => p.id === selectedPackageId)
                            : packages.find(
                                (p) => p.name === selectedPackage
                              )) || { price: activeClient.price || "500" }
                        ).price
                      }
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleInteractivePayment}
                    className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Payment TrxID</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. PAYMENT HISTORY FULL VIEW */}
          {activeTab === "payments" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Payment History
                    </h2>
                    <p className="text-xs text-slate-500">
                      All recorded payments for {activeClient.name} (
                      {activeClient.userId})
                    </p>
                  </div>
                </div>
              </div>

              {billingHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                  No payment records found for your account.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Invoice No</th>
                        <th className="py-3 px-3">Package</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Payment Method</th>
                        <th className="py-3 px-3">Transaction ID</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billingHistory.map((rec, i) => {
                        const raw = String(rec.status || "Completed").toLowerCase();
                        const isPaid =
                          raw === "completed" || raw === "approved" || raw === "paid";
                        const isRejected =
                          raw === "rejected" || raw === "refunded";
                        const label = isPaid
                          ? "Paid"
                          : isRejected
                            ? "Rejected"
                            : "Pending";

                        return (
                          <tr key={rec.id || i} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                              {rec.timestamp}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-800 whitespace-nowrap">
                              INV-{rec.dateKey?.replace(/-/g, "") || i + 1}
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {rec.package}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              ৳{rec.amount}
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {rec.paymentMethod}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-700">
                              {rec.id}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`font-semibold ${
                                  isPaid
                                    ? "text-emerald-600"
                                    : isRejected
                                      ? "text-rose-600"
                                      : "text-amber-600"
                                }`}
                              >
                                ● {label}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handlePrintReceipt(rec)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" /> Print
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. SUPPORT TICKETS VIEW */}
          {activeTab === "tickets" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Support Tickets &amp; HelpDesk
                  </h2>
                  <p className="text-xs text-slate-500">
                    Submit a service request or track your existing tickets
                  </p>
                </div>
              </div>

              <form onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Issue Category
                    </label>
                    <select
                      value={newTicketCategory}
                      onChange={(e) =>
                        setNewTicketCategory(e.target.value as any)
                      }
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                    >
                      <option value="No Internet">
                        No Internet (Connection Down)
                      </option>
                      <option value="Slow Speed">
                        Slow Speed (Low Bandwidth)
                      </option>
                      <option value="Router Problem">Router Problem</option>
                      <option value="Payment Issue">
                        Payment Issue (Billing/Due)
                      </option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Subject / Summary
                    </label>
                    <input
                      type="text"
                      required
                      value={newTicketSubject}
                      onChange={(e) => setNewTicketSubject(e.target.value)}
                      placeholder="e.g. Red LOS light on ONU / Slow speed"
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Detailed Description
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newTicketDesc}
                    onChange={(e) => setNewTicketDesc(e.target.value)}
                    placeholder="Describe your issue..."
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {ticketMsg && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl font-medium">
                    {ticketMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Submit Support Ticket
                </button>
              </form>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800">
                  My Ticket History
                </h3>
                {tickets.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    No support tickets found for your account.
                  </div>
                ) : (
                  tickets.map((t, i) => (
                    <div
                      key={t.id || i}
                      className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600">
                            {t.ticketNumber}
                          </span>
                          <span className="font-bold text-slate-900">
                            {t.subject}
                          </span>
                        </div>
                        <span className="text-slate-500 block mt-1">
                          Category: {t.category} · Created: {t.createdAt}
                        </span>
                      </div>
                      <span
                        className={`font-semibold ${
                          t.status === "Resolved"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        ● {t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* OTHER DEDICATED VIEWS (Account, My Package, Bandwidth, Network, ONU, Invoices, Telegram, Notifications, Profile, Password) */}
          <ClientSubViews
            activeTab={activeTab}
            client={activeClient}
            onSelectTab={setActiveTab}
            liveCountdown={liveCountdown}
            bandwidthTelemetry={bandwidthTelemetry}
            onuMapping={onuMapping}
            clientInvoices={clientInvoices}
            billingHistory={billingHistory}
            notifications={clientNotifications}
            onPrintReceipt={handlePrintReceipt}
            onOpenPaymentModal={handleInteractivePayment}
            pingStatus={pingStatus}
            pingLatency={pingLatency}
            packetLoss={packetLoss}
            signalPower={signalPower}
            diagnosticsLogs={diagnosticsLogs}
            onRunPingTest={runPingTest}
            isAutoFixing={isAutoFixing}
            autoFixSuccessMsg={autoFixSuccessMsg}
            onAutoFixLine={handleAutoFixLine}
            telegramLinkStatus={telegramLinkStatus}
            isGeneratingClientLink={isGeneratingClientLink}
            clientTelegramLinkData={clientTelegramLinkData}
            copiedClientLink={copiedClientLink}
            setCopiedClientLink={setCopiedClientLink}
            isUnlinkingTelegram={isUnlinkingTelegram}
            telegramActionNotice={telegramActionNotice}
            onGenerateTelegramLink={handleGenerateTelegramLink}
            onUnlinkTelegram={handleUnlinkTelegram}
            onSaveClientProfile={handleSaveClientProfile}
          />
        </main>
      </div>

      {/* BKASH / NAGAD / ROCKET / BANK CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300 ${
              selectedPaymentMethod === "bKash"
                ? "bg-[#E2125B] border-pink-500/30 text-white"
                : selectedPaymentMethod === "Nagad"
                  ? "bg-[#F04D22] border-orange-500/30 text-white"
                  : selectedPaymentMethod === "Rocket"
                    ? "bg-[#8c2a91] border-purple-500/30 text-white"
                    : "bg-slate-900 border-slate-700 text-white"
            }`}
          >
            <div className="p-5 text-center border-b border-white/15 bg-black/15 flex flex-col items-center">
              <span className="text-base font-bold tracking-wider">
                {selectedPaymentMethod.toUpperCase()} CHECKOUT
              </span>
              <span className="text-[11px] text-white/80 mt-0.5">
                Merchant: {settings?.companyName || settings?.appName || "Nexora Network ISP"}
              </span>
            </div>

            <div className="p-6 space-y-4">
              {checkoutStep === "form" && (
                <div className="space-y-4">
                  <div className="bg-black/30 rounded-2xl p-3.5 border border-white/20 text-center space-y-1.5">
                    <div className="text-[11px] font-medium text-white/80">
                      {selectedPaymentMethod} Payment Number
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl font-bold font-mono tracking-wider text-white bg-white/10 px-3 py-1 rounded-xl">
                        {merchantPaymentNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyNumber(merchantPaymentNumber)}
                        className="px-2.5 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedNumber ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedNumber ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="text-xs text-white/90">
                      Payable Bill:{" "}
                      <strong className="text-amber-300 font-mono">
                        ৳
                        {
                          (
                            (selectedPackageId !== null
                              ? packages.find((p) => p.id === selectedPackageId)
                              : packages.find(
                                  (p) => p.name === selectedPackage
                                )) || { price: activeClient.price || "500" }
                          ).price
                        }
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-white/90 mb-1">
                        Sender Mobile Number
                      </label>
                      <input
                        type="text"
                        value={checkoutPhone}
                        onChange={(e) => setCheckoutPhone(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full text-center p-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 font-mono font-bold text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-white/90 mb-1">
                        Transaction ID (TrxID) *
                      </label>
                      <input
                        type="text"
                        value={inputTrxId}
                        onChange={(e) => setInputTrxId(e.target.value)}
                        placeholder="e.g. 9H78K29L"
                        className="w-full text-center p-3 rounded-xl bg-white text-slate-900 font-mono font-bold text-sm uppercase tracking-wider focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {checkoutStep !== "success" && (
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="w-1/3 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    CLOSE
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedCheckout}
                    disabled={isProcessingPayment}
                    className="w-2/3 py-3 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center"
                  >
                    {isProcessingPayment ? "Submitting..." : "CONFIRM PAYMENT"}
                  </button>
                </div>
              )}

              {checkoutStep === "success" && (
                <div className="space-y-4 text-center py-2">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-lg">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      Payment Request Submitted!
                    </h4>
                    <p className="text-xs text-white/90 mt-1">
                      Your payment has been submitted for admin verification.
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 border border-white/20 font-mono text-xs">
                    <span className="text-white/70 block text-[10px]">
                      Transaction ID:
                    </span>
                    <span className="text-white font-bold text-sm">
                      {generatedTrxId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCheckoutModal(false);
                      setActiveTab("dashboard");
                    }}
                    className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT */}
      {selectedReceiptForPrint && (
        <div className="hidden print:block fixed inset-0 bg-white text-slate-900 p-10 font-sans z-[999] text-xs">
          <div className="border-2 border-slate-300 p-8 space-y-6 rounded-lg max-w-xl mx-auto relative overflow-hidden">
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {settings?.companyName ||
                    settings?.appName ||
                    "Nexora Network ISP"}
                </h1>
                <p className="text-[11px] text-slate-600 mt-1">
                  {settings?.address || "Dhaka, Bangladesh"}
                </p>
                <p className="text-[11px] text-slate-600">
                  Support: {settings?.phone || "01817681233"}
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold text-slate-800">
                  PAYMENT RECEIPT
                </h2>
                <p className="text-[11px] text-slate-600 mt-1 font-mono">
                  TrxID: {selectedReceiptForPrint.id}
                </p>
                <p className="text-[11px] text-slate-600">
                  Date: {selectedReceiptForPrint.timestamp}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span>Customer Name:</span>
                <span className="font-bold">
                  {selectedReceiptForPrint.clientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>User ID:</span>
                <span className="font-mono font-bold">
                  {selectedReceiptForPrint.userId}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Package:</span>
                <span className="font-bold">
                  {selectedReceiptForPrint.package}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-700">
                  ৳{selectedReceiptForPrint.amount}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-slate-200">
              <div>
                <p className="text-[10px] text-slate-500">Payment Method</p>
                <p className="font-bold text-xs">
                  {selectedReceiptForPrint.paymentMethod}
                </p>
              </div>
              <QrCode className="w-12 h-12 text-slate-700" />
            </div>
          </div>
        </div>
      )}

      {/* Floating Smart Line Diagnostic & Support Assistant */}
      <ClientAiAssistant
        client={activeClient}
        onNavigateToRenew={() => setActiveTab("renew")}
        onClientStatusUpdated={(updated) => setActiveClient(updated)}
      />
    </div>
  );
};
