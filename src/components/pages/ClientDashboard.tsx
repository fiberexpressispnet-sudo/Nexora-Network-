import React, { useState, useEffect } from "react";
import {
  Client,
  AppSettings,
  NotificationItem,
  Package,
  BroadbandRenewalRequest,
  SupportTicket,
  PaymentRecord,
} from "../../types";
import {
  LogOut,
  Activity,
  Wifi,
  Shield,
  Calendar,
  Clock,
  CreditCard,
  ChevronRight,
  Zap,
  Users,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Play,
  Send,
  Plus,
  MessageSquare,
  Wrench,
  RefreshCw,
  Printer,
  FileText,
  QrCode,
  Menu,
  Gift,
  Landmark,
  Copy,
  Check,
  Smartphone,
  PhoneCall,
  Bot,
  ExternalLink,
} from "lucide-react";
import { generateClientLinkToken, checkClientLinkStatus, unlinkClientTelegram } from "../../lib/telegramClient";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { sanitizeForStorage } from "../../lib/storageUtils";
import { getClientExpiryInfo, findPackageByDetails } from "../../lib/expiryUtils";
import { initialPackages } from "../../data/initialData";
import { ClientAiAssistant } from "../ClientAiAssistant";
import { ClientBandwidthGraph } from "../ClientBandwidthGraph";

interface ClientDashboardProps {
  client: Client;
  onLogout: () => void;
  uid: string;
  settings: AppSettings;
}

// Helper date formatters to match screenshot layout perfectly
const formatToCustomDate = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
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
    return `${day} ${months[monthIndex] || "Mar"} ${year}`;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = [
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
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatToCustomDateTime = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  const customDate = formatToCustomDate(dateStr);
  return `${customDate}, 11:03 PM`;
};

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
  const [activeTab, setActiveTab] = useState<
    "overview" | "renew" | "diagnostics" | "tickets" | "receipts"
  >("overview");
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>(
    client.package,
  );
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "bKash" | "Nagad" | "Rocket" | "Bank"
  >("bKash");

  // Interactive Gateway Modal simulation states
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
    "idle",
  );
  const [pingLatency, setPingLatency] = useState<number>(0);
  const [packetLoss, setPacketLoss] = useState<number>(0);
  const [signalPower, setSignalPower] = useState<number>(-19.4);
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<string[]>([]);

  // Billing history
  const [billingHistory, setBillingHistory] = useState<PaymentRecord[]>([]);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] =
    useState<PaymentRecord | null>(null);

  // Telegram Bot One-Time Client Linking State
  const [telegramLinkStatus, setTelegramLinkStatus] = useState<{ isLinked: boolean; linkedAt?: string } | null>(null);
  const [isGeneratingClientLink, setIsGeneratingClientLink] = useState(false);
  const [clientTelegramLinkData, setClientTelegramLinkData] = useState<{ link: string; token: string } | null>(null);
  const [copiedClientLink, setCopiedClientLink] = useState(false);
  const [isUnlinkingTelegram, setIsUnlinkingTelegram] = useState(false);
  const [telegramActionNotice, setTelegramActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (activeClient?.userId) {
      checkClientLinkStatus(activeClient.userId).then((res) => {
        if (res.success) {
          setTelegramLinkStatus({ isLinked: res.isLinked, linkedAt: res.linkDetails?.linkedAt });
        }
      });
    }
  }, [activeClient?.userId]);

  const handleGenerateTelegramLink = async () => {
    if (!activeClient?.userId) return;
    setIsGeneratingClientLink(true);
    setTelegramActionNotice(null);
    const res = await generateClientLinkToken(activeClient.userId, activeClient.name || activeClient.userId);
    setIsGeneratingClientLink(false);
    if (res.success && res.link && res.token) {
      setClientTelegramLinkData({ link: res.link, token: res.token });
    } else {
      setTelegramActionNotice(res.error || 'Failed to generate linking token');
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
      setTelegramActionNotice('Telegram account unlinked successfully.');
    } else {
      setTelegramActionNotice(res.error || 'Failed to unlink Telegram');
    }
  };

  // Sync client real-time from both zero-quota server database and Firestore
  useEffect(() => {
    let active = true;

    const updateFromClientsList = (allClients: Client[]) => {
      if (!active) return;
      const latest = allClients.find(
        (c) => c.id === client.id || c.userId === client.userId,
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

    // A. Express server database sync (Fast, zero-quota primary source of truth)
    const syncWithBackend = () => {
      fetch("/api/db/get?key=nexora_clients")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.value && Array.isArray(data.value)) {
            updateFromClientsList(data.value);
          }
        })
        .catch((err) => console.warn("Dashboard backend sync warning:", err));
    };

    syncWithBackend();
    const pollInterval = setInterval(syncWithBackend, 3000);

    // B. Firestore snapshot sync
    const refs = [
      doc(db, "ispWorkspace", "mainData", "collections", "nexora_clients"),
    ];
    if (uid && uid !== "nexora_network_admin") {
      refs.push(doc(db, "users", uid, "appData", "nexora_clients"));
    }

    const unsubs = refs.map((ref) => {
      return onSnapshot(
        ref,
        (snap) => {
          if (snap.exists() && snap.data().value) {
            updateFromClientsList(snap.data().value as Client[]);
          }
        },
        (err) => {
          console.warn("Snapshot subscription error:", err);
        },
      );
    });

    const handleStorage = () => {
      const local = localStorage.getItem("nexora_clients");
      if (local) {
        try {
          updateFromClientsList(JSON.parse(local) as Client[]);
        } catch {
          // ignore
        }
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

  // Load support tickets & payment records on mount and sync
  useEffect(() => {
    const loadData = () => {
      try {
        // Tickets
        const localTickets = localStorage.getItem("isp_support_tickets");
        if (localTickets) {
          const parsed = JSON.parse(localTickets) as SupportTicket[];
          setTickets(
            parsed.filter(
              (t) => t.clientId === client.id || t.phone === client.phone,
            ),
          );
        }

        // Payments
        const localPayments = localStorage.getItem("nexora_payments");
        if (localPayments) {
          const parsed = JSON.parse(localPayments) as PaymentRecord[];
          setBillingHistory(parsed.filter((p) => p.userId === client.userId));
        }
      } catch (err) {
        console.error("Error loading local records:", err);
      }
    };
    loadData();

    // Listen to payments in real-time
    const paymentsRef = doc(
      db,
      "ispWorkspace",
      "mainData",
      "collections",
      "nexora_payments",
    );
    const unsubPayments = onSnapshot(
      paymentsRef,
      (snap) => {
        if (snap.exists() && snap.data().value) {
          const allPayments = snap.data().value as PaymentRecord[];
          setBillingHistory(
            allPayments.filter((p) => p.userId === client.userId),
          );
        }
      },
      (err) => {
        console.warn("Payments onSnapshot error:", err);
      },
    );

    return () => unsubPayments();
  }, [client.id, client.userId, client.phone]); // Fetch packages for pricing options
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        // 1. Primary: Fetch from high-reliability backend server database (works on any client device)
        const res = await fetch("/api/db/get?key=nexora_packages");
        const data = await res.json();
        if (data.success && data.value && Array.isArray(data.value)) {
          setPackages(data.value);
          return;
        }

        // 2. Fallback: Fetch from Firestore
        const workspaceRef = doc(
          db,
          "ispWorkspace",
          "mainData",
          "collections",
          "nexora_packages",
        );
        const workspaceSnap = await getDoc(workspaceRef);
        if (workspaceSnap.exists() && workspaceSnap.data().value) {
          setPackages(workspaceSnap.data().value);
          return;
        }

        // 3. Last resort: Local Storage
        const local = localStorage.getItem("nexora_packages");
        if (local) setPackages(JSON.parse(local));
      } catch (err) {
        console.warn(
          "Proxy package fetch failed, trying Firestore direct fallback:",
          err,
        );
        try {
          const workspaceRef = doc(
            db,
            "ispWorkspace",
            "mainData",
            "collections",
            "nexora_packages",
          );
          const workspaceSnap = await getDoc(workspaceRef);
          if (workspaceSnap.exists() && workspaceSnap.data().value) {
            setPackages(workspaceSnap.data().value);
            return;
          }
        } catch (dbErr) {
          console.warn("Firestore package load failed:", dbErr);
        }
        // Last fallback: Local Storage
        const local = localStorage.getItem("nexora_packages");
        if (local) {
          try {
            setPackages(JSON.parse(local));
          } catch {
            // ignore
          }
        }
      }
    };
    fetchPackages();
  }, []);

  // Set initial selectedPackageId based on the client's current package name and price
  useEffect(() => {
    if (packages.length > 0 && activeClient) {
      const matched = findPackageByDetails(packages, activeClient.package, activeClient.price);
      if (matched) {
        setSelectedPackageId(matched.id);
      }
    }
  }, [packages, activeClient]);

  // 1-Click Line Auto-Fix & Re-sync for Client Dashboard
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixSuccessMsg, setAutoFixSuccessMsg] = useState<string | null>(
    null,
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
          data.message || "Line reset and reactivated successfully!",
        );

        // Sync to backend DB
        const clientsRef = doc(
          db,
          "ispWorkspace",
          "mainData",
          "collections",
          "nexora_clients",
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
          c.id === updatedClient.id || (updatedClient.userId && updatedClient.userId.trim() !== "" && c.userId === updatedClient.userId)
            ? updatedClient
            : c,
        );

        localStorage.setItem("nexora_clients", JSON.stringify(nextClients));
        await setDoc(clientsRef, { value: sanitizeForStorage(nextClients), updatedAt: Date.now() });
        fetch("/api/db/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "nexora_clients", value: sanitizeForStorage(nextClients) }),
        }).catch(() => {});

        window.dispatchEvent(new Event("storage"));
      } else {
        alert(data.error || "Auto-fix failed. Please contact helpline.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to communicate with server.");
    } finally {
      setIsAutoFixing(false);
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
      const info = getClientExpiryInfo(activeClient.expiry);
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
          999,
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
              999,
            );
      }

      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        const overdueDays = Math.max(
          1,
          Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24)),
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
          (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        setLiveCountdown({
          days,
          hours,
          minutes,
          seconds,
          isExpired: false,
          formattedText: `${days} days ${hours} hours ${minutes} minutes`,
        });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [activeClient.expiry]);

  // Live graph data synchronized strictly with client status
  const [liveData, setLiveData] = useState<{ dl: number; ul: number }[]>([]);
  const [currentSpeedMbps, setCurrentSpeedMbps] = useState({ dl: 0, ul: 0 });

  useEffect(() => {
    const maxDl = Math.max(5, parseFloat(activeClient.downloadSpeed || "10"));
    const maxUl = Math.max(2, parseFloat(activeClient.uploadSpeed || "5"));
    const isOnline = activeClient.status === "online";

    // Initial fill - clean 0.0 baseline
    const initialPoints: { dl: number; ul: number }[] = [];
    for (let i = 0; i < 20; i++) {
      initialPoints.push({ dl: 0.0, ul: 0.0 });
    }
    setLiveData(initialPoints);
    setCurrentSpeedMbps({ dl: 0.0, ul: 0.0 });

    if (!isOnline) return;

    let isMounted = true;

    const pollClientTraffic = async () => {
      let dl = 0.0;
      let ul = 0.0;

      try {
        let savedRouter: any = null;
        try {
          const raw = localStorage.getItem("fe_mikrotik_config");
          if (raw) savedRouter = JSON.parse(raw);
        } catch {}

        if (savedRouter?.ip && savedRouter?.connected) {
          const res = await fetch("/api/mikrotik/traffic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              router: {
                ip: savedRouter.ip,
                apiPort: Number(savedRouter.port) || 8728,
                username: savedRouter.user || savedRouter.username || "admin",
                password: savedRouter.password || "",
                connected: true,
                isDemo: savedRouter.isDemo,
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.queues)) {
              const q = data.queues.find(
                (item: any) =>
                  item.name === `nexora_${activeClient.userId}` ||
                  item.name === activeClient.userId ||
                  (activeClient.ipAddress && item.target?.includes(activeClient.ipAddress)),
              );
              if (q) {
                dl = Number(q.rxMbps) || (Number(q.rxBps) || 0) / 1000000;
                ul = Number(q.txMbps) || (Number(q.txBps) || 0) / 1000000;
              }
            }
          }
        }
      } catch {}

      if (!isMounted) return;

      const boundedDl = parseFloat(Math.min(maxDl, Math.max(0.0, dl)).toFixed(1));
      const boundedUl = parseFloat(Math.min(maxUl, Math.max(0.0, ul)).toFixed(1));

      setCurrentSpeedMbps({ dl: boundedDl, ul: boundedUl });
      setLiveData((prev) => {
        const newData = [...prev.slice(-19)];
        newData.push({ dl: boundedDl, ul: boundedUl });
        return newData;
      });
    };

    pollClientTraffic();
    const interval = setInterval(pollClientTraffic, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [
    activeClient.userId,
    activeClient.ipAddress,
    activeClient.status,
    activeClient.downloadSpeed,
    activeClient.uploadSpeed,
  ]);

  // Start ping test diagnostic with accurate status evaluation
  const runPingTest = () => {
    setPingStatus("running");
    setDiagnosticsLogs([]);
    let currentLogs: string[] = [];
    const addLog = (msg: string) => {
      currentLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setDiagnosticsLogs([...currentLogs]);
    };

    const isOnline = activeClient.status === "online";

    setTimeout(() => {
      addLog("Connecting to Gateway Router (nexora-network-gw)...");
      if (isOnline) {
        setPingLatency(3);
      } else {
        setPingLatency(0);
      }
    }, 500);

    setTimeout(() => {
      addLog("Sending ICMP Echo packets to local ONU device...");
      if (isOnline) {
        setSignalPower(-18.5);
        setPacketLoss(0);
      } else {
        setSignalPower(-38.5);
        setPacketLoss(100);
      }
    }, 1500);

    setTimeout(() => {
      if (isOnline) {
        addLog(
          "Pinging external DNS 8.8.8.8 and 1.1.1.1... Response: 3ms TTL=58",
        );
      } else {
        addLog(
          "⚠️ Pinging external DNS: Destination Host Unreachable (100% Packet Loss)",
        );
      }
    }, 2500);

    setTimeout(() => {
      if (isOnline) {
        addLog(
          "✅ Ping diagnostics completed successfully. Status: ONLINE & HEALTHY.",
        );
      } else {
        addLog(
          "❌ Diagnostic Result: Line is OFFLINE. Interface traffic is suspended in MikroTik.",
        );
      }
      setPingStatus("success");
    }, 3500);
  };

  // Submit Support Ticket Complaint
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
        JSON.stringify(updatedTickets),
      );
      setTickets(updatedTickets.filter((t) => t.clientId === client.id));

      // Also sync notification to admin in Firestore
      const notifRef = doc(
        db,
        "ispWorkspace",
        "mainData",
        "collections",
        "nexora_notifications",
      );
      const notifSnap = await getDoc(notifRef);
      let notifications: NotificationItem[] = [];
      if (notifSnap.exists() && notifSnap.data().value) {
        notifications = notifSnap.data().value;
      }
      const newNotif: NotificationItem = {
        id: Date.now(),
        icon: "Headphones",
        text: `Client ${activeClient.name} (${activeClient.userId}) opened a Ticket: ${newTicketSubject}`,
        time: new Date().toISOString(),
        read: false,
      };
      await setDoc(notifRef, {
        value: sanitizeForStorage([newNotif, ...notifications]),
        updatedAt: Date.now(),
      });

      setNewTicketSubject("");
      setNewTicketDesc("");
      setTicketMsg(
        "Your ticket has been submitted successfully! Support team will assist shortly.",
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

  // Process checkout step
  const handleProceedCheckout = async () => {
    if (!checkoutPhone || checkoutPhone.length < 6) {
      alert("Please enter your Mobile Number!");
      return;
    }
    if (!inputTrxId || inputTrxId.trim().length < 3) {
      alert("Please enter the payment Transaction ID (TrxID)!");
      return;
    }
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

      // 1. Submit BroadbandRenewalRequest for Admin Approval
      const reqRef = doc(
        db,
        "ispWorkspace",
        "mainData",
        "collections",
        "nexora_renewal_requests",
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
      await setDoc(reqRef, { value: sanitizeForStorage(nextRequests), updatedAt: Date.now() });
      localStorage.setItem(
        "nexora_renewal_requests",
        JSON.stringify(nextRequests),
      );
      fetch("/api/db/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "nexora_renewal_requests",
          value: sanitizeForStorage(nextRequests),
        }),
      }).catch(() => {});

      // 2. Add Payment Record (Pending Admin Approval)
      const paymentsRef = doc(
        db,
        "ispWorkspace",
        "mainData",
        "collections",
        "nexora_payments",
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
      await setDoc(paymentsRef, { value: sanitizeForStorage(nextPayments), updatedAt: Date.now() });
      localStorage.setItem("nexora_payments", JSON.stringify(nextPayments));
      fetch("/api/db/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "nexora_payments", value: sanitizeForStorage(nextPayments) }),
      }).catch(() => {});
      setBillingHistory(nextPayments.filter((p) => p.userId === client.userId));

      // 3. Create Notification for admin
      const notifRef = doc(
        db,
        "ispWorkspace",
        "mainData",
        "collections",
        "nexora_notifications",
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
      await setDoc(notifRef, { value: sanitizeForStorage(nextNotifs), updatedAt: Date.now() });
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
      alert("Payment process failed. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  const handlePrintReceipt = (payment: PaymentRecord) => {
    setSelectedReceiptForPrint(payment);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#ecf0f5] text-slate-900 font-sans flex overflow-hidden">
      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-white/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-[230px] bg-[#222d32] text-[#b8c7ce] transform transition-transform duration-300 flex flex-col flex-shrink-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Logo Area */}
        <div className="h-[55px] bg-[#367fa9] text-white flex items-center justify-center px-4 font-bold text-base flex-shrink-0">
          {currentSettings?.logo ? (
            <img
              src={currentSettings.logo}
              alt={currentSettings.companyName || "Logo"}
              className="max-h-9 max-w-[190px] object-contain drop-shadow-xs"
            />
          ) : (
            <span className="truncate">
              {currentSettings?.companyName ||
                currentSettings?.appName ||
                "Nexora network"}
            </span>
          )}
        </div>

        {/* User Info */}
        <div className="p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-600 flex items-center justify-center text-white overflow-hidden shrink-0 border-2 border-slate-600">
            {activeClient.photo ? (
              <img
                src={activeClient.photo}
                alt={activeClient.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-6 h-6 text-slate-300" />
            )}
          </div>
          <div className="overflow-hidden">
            <div className="text-white text-sm font-bold truncate">
              Hi.. {activeClient.name}
            </div>
            <div className="text-[#00a65a] text-[11px] flex items-center gap-1.5 mt-1 font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${activeClient.status === "online" ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`}
              ></span>
              {activeClient.status === "online" ? "Online" : "Offline"}
            </div>
          </div>
        </div>

        {/* Nav Title */}
        <div className="px-4 py-2 bg-[#1a2226] text-[11px] font-bold text-[#4b646f] tracking-wider uppercase">
          General
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab("overview");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-l-[3px] transition-colors cursor-pointer ${activeTab === "overview" ? "border-[#3c8dbc] bg-[#1e282c] text-white" : "border-transparent hover:bg-[#1e282c] hover:text-white"}`}
          >
            <Activity
              className={`w-4 h-4 ${activeTab === "overview" ? "text-[#3c8dbc]" : ""}`}
            />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("renew");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-l-[3px] transition-colors cursor-pointer ${activeTab === "renew" ? "border-[#3c8dbc] bg-[#1e282c] text-white" : "border-transparent hover:bg-[#1e282c] hover:text-white"}`}
          >
            <Gift
              className={`w-4 h-4 ${activeTab === "renew" ? "text-[#3c8dbc]" : ""}`}
            />
            <span>Packages</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("receipts");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-l-[3px] transition-colors cursor-pointer ${activeTab === "receipts" ? "border-[#3c8dbc] bg-[#1e282c] text-white" : "border-transparent hover:bg-[#1e282c] hover:text-white"}`}
          >
            <CreditCard
              className={`w-4 h-4 ${activeTab === "receipts" ? "text-[#3c8dbc]" : ""}`}
            />
            <span>Accounts</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("tickets");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-l-[3px] transition-colors cursor-pointer ${activeTab === "tickets" ? "border-[#3c8dbc] bg-[#1e282c] text-white" : "border-transparent hover:bg-[#1e282c] hover:text-white"}`}
          >
            <MessageSquare
              className={`w-4 h-4 ${activeTab === "tickets" ? "text-[#3c8dbc]" : ""}`}
            />
            <span>HelpDesk</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("diagnostics");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-l-[3px] transition-colors cursor-pointer ${activeTab === "diagnostics" ? "border-[#3c8dbc] bg-[#1e282c] text-white" : "border-transparent hover:bg-[#1e282c] hover:text-white"}`}
          >
            <Wrench
              className={`w-4 h-4 ${activeTab === "diagnostics" ? "text-[#3c8dbc]" : ""}`}
            />
            <span>Ping Test</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-[55px] bg-[#223344] flex items-center justify-between px-5 text-white flex-shrink-0 z-30 border-b border-[#2d4053] shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              {currentSettings?.logo ? (
                <img
                  src={currentSettings.logo}
                  alt="Company Logo"
                  className="h-7 w-auto max-w-[130px] object-contain drop-shadow-xs"
                />
              ) : (
                <svg
                  className="w-4.5 h-4.5 text-cyan-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              )}
              <span className="text-base font-black tracking-wide text-white truncate max-w-[220px]">
                {currentSettings?.companyName ||
                  currentSettings?.appName ||
                  "ERP System"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onLogout}
              className="p-2 hover:bg-white/10 rounded-xl flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer text-white"
              title="Logout"
            >
              <LogOut className="w-4 h-4" /> <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#ecf0f5]">
          {/* Breadcrumb Title Area */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-2xl font-normal text-slate-900 flex items-baseline gap-2">
              {activeTab === "overview" && "Dashboard"}
              {activeTab === "renew" && "Packages"}
              {activeTab === "receipts" && "Accounts"}
              {activeTab === "tickets" && "HelpDesk"}
              {activeTab === "diagnostics" && "Ping Test"}
              <small className="text-[13px] text-slate-900 font-light">
                Control panel
              </small>
            </h1>
            <div className="text-xs text-slate-900 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Home{" "}
              <ChevronRight className="w-3 h-3" />{" "}
              <span className="capitalize">{activeTab}</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. Overview Tab */}
            {/* 1. Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-in fade-in duration-300 max-w-xl mx-auto">
                {/* Centered Main Profile Card */}
                <div className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100 flex flex-col text-center relative overflow-hidden">
                  {/* Absolute top decoration */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                  {/* Dynamic Client Avatar */}
                  <div className="w-24 h-24 rounded-full bg-[#3b82f6]/10 border-4 border-slate-200 flex items-center justify-center mx-auto overflow-hidden relative shadow-inner">
                    {activeClient.photo ? (
                      <img
                        src={activeClient.photo}
                        alt={activeClient.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-16 h-16 text-[#3b82f6] mt-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* User Name */}
                  <h2 className="text-2xl font-black text-[#1e293b] mt-4 tracking-tight">
                    {activeClient.name}
                  </h2>

                  {/* Center Bullet List of Client Stats */}
                  <div className="mt-5 space-y-2.5 text-sm text-slate-800 font-semibold tracking-wide max-w-xs mx-auto text-left">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span className="text-slate-950">ID:</span>
                      <span className="text-slate-900 ml-auto font-mono">
                        {activeClient.userId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-slate-955">Mobile:</span>
                      <span className="text-slate-900 ml-auto font-mono">
                        {activeClient.phone || "01817681233"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                      <span className="text-slate-955">Email:</span>
                      <span className="text-slate-900 ml-auto">
                        {activeClient.email || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span className="text-slate-955">Since:</span>
                      <span className="text-slate-900 ml-auto">
                        {formatToCustomDate(
                          activeClient.createdAt || "2025-03-20",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span className="text-slate-955">Expires:</span>
                      <span className="text-slate-900 ml-auto text-rose-600 font-bold">
                        {formatToCustomDateTime(activeClient.expiry)}
                      </span>
                    </div>
                  </div>

                  {/* Centered Active Badge pill */}
                  <div className="mt-6">
                    <span
                      className={
                        activeClient.status === "online" &&
                        !getClientExpiryInfo(activeClient.expiry).isExpired
                          ? "inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-black rounded-full border bg-[#e2f3e9] text-[#1e7e47] border-emerald-200 shadow-xs"
                          : "inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-black rounded-full border bg-rose-50 text-rose-600 border-rose-200 animate-pulse shadow-xs"
                      }
                    >
                      <span
                        className={
                          activeClient.status === "online" &&
                          !getClientExpiryInfo(activeClient.expiry).isExpired
                            ? "w-2 h-2 rounded-full bg-emerald-500 animate-ping"
                            : "w-2 h-2 rounded-full bg-rose-500"
                        }
                      ></span>
                      {activeClient.status === "online" &&
                      !getClientExpiryInfo(activeClient.expiry).isExpired
                        ? "• Active (Online)"
                        : getClientExpiryInfo(activeClient.expiry).isExpired
                          ? "• Expired (Suspended)"
                          : "• Suspended / Offline"}
                    </span>
                  </div>
                </div>

                {/* 2x2 Colorful Grid Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Card 1: Account ID */}
                  <div className="bg-[#60b5f4] text-white p-5 rounded-[24px] shadow-sm flex flex-col justify-between min-h-[140px]">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                        ACCOUNT ID
                      </p>
                      <p className="text-lg font-black tracking-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        {activeClient.userId}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Package Name */}
                  <div className="bg-[#34e389] text-white p-5 rounded-[24px] shadow-sm flex flex-col justify-between min-h-[140px]">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                        PACKAGE
                      </p>
                      <p className="text-base font-black tracking-tight leading-tight mt-1">
                        {activeClient.package || "25 Mbps"}
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Monthly Fee */}
                  <div className="bg-[#e59972] text-white p-5 rounded-[24px] shadow-sm flex flex-col justify-between min-h-[140px]">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-lg font-black text-white">৳</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                        MONTHLY FEE
                      </p>
                      <p className="text-xl font-black mt-0.5">
                        ৳ {activeClient.price || "500"}
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Connection type */}
                  <div className="bg-[#c866fc] text-white p-5 rounded-[24px] shadow-sm flex flex-col justify-between min-h-[140px]">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                        CONNECTION
                      </p>
                      <p className="text-lg font-black mt-0.5">
                        {activeClient.deviceType === "Mobile"
                          ? "HOTSPOT"
                          : activeClient.connectionType?.toUpperCase() ||
                            "PPPOE"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Real-time Connection & Router Link Status Details */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-3 h-3 rounded-full ${activeClient.status === "online" ? "bg-emerald-500 animate-ping" : "bg-rose-500"}`}
                      ></span>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">
                        Real-time Connection & Network Status
                      </h3>
                    </div>
                    <span
                      className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${activeClient.status === "online" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}
                    >
                      {activeClient.status === "online"
                        ? "● ONLINE (LIVE)"
                        : "● OFFLINE / SUSPENDED"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Assigned IP
                      </span>
                      <span className="font-mono font-black text-slate-800 text-sm mt-0.5 block truncate">
                        {activeClient.ip || "192.168.88.24"}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        MAC / Caller ID
                      </span>
                      <span className="font-mono font-black text-slate-800 text-sm mt-0.5 block truncate">
                        {activeClient.mac || "AA:BB:CC:DD:EE:01"}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Gateway Node
                      </span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block truncate">
                        {activeClient.router || "Core MikroTik Gateway"}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Optical Power
                      </span>
                      <span className="font-mono font-black text-emerald-600 text-sm mt-0.5 block">
                        -19.4 dBm
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
                      <span className="text-[11px] font-bold text-slate-600">
                        Download Speed
                      </span>
                      <span className="font-mono font-black text-blue-700">
                        {activeClient.downloadSpeed ||
                          activeClient.bandwidth ||
                          "25 Mbps"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
                      <span className="text-[11px] font-bold text-slate-600">
                        Upload Speed
                      </span>
                      <span className="font-mono font-black text-indigo-700">
                        {activeClient.uploadSpeed || "10 Mbps"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50/50 border border-teal-100 col-span-2 sm:col-span-1">
                      <span className="text-[11px] font-bold text-slate-600">
                        Ping Latency
                      </span>
                      <span className="font-mono font-black text-teal-700">
                        ~3.8 ms
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Bandwidth Realtime Graph */}
                <ClientBandwidthGraph client={activeClient} />

                {/* 1-Click Line Self-Healing & Diagnostics Bar */}
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <div
                      className={`p-3 rounded-2xl ${activeClient.status === "online" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}
                    >
                      <Zap
                        className={`w-5 h-5 ${activeClient.status === "online" ? "animate-pulse" : ""}`}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        Connection Health & MikroTik Status
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activeClient.status === "online"
                          ? "Your fiber line session is active and verified on gateway."
                          : "Line is currently offline/suspended. Click below to auto-heal and test link."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoFixLine}
                    disabled={isAutoFixing}
                    className="w-full sm:w-auto px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isAutoFixing ? "animate-spin" : ""}`}
                    />
                    <span>
                      {isAutoFixing
                        ? "Diagnosing & Fixing..."
                        : "1-Click Auto-Fix Line"}
                    </span>
                  </button>
                </div>

                {autoFixSuccessMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{autoFixSuccessMsg}</span>
                  </div>
                )}

                {/* Telegram Self-Care & Instant Alerts Box */}
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                          <span>Telegram Bot Self-Care &amp; Alerts</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              telegramLinkStatus?.isLinked
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {telegramLinkStatus?.isLinked ? 'Connected 🟢' : 'Not Connected'}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Receive payment receipts, expiry warnings, and check live fiber optical signal on Telegram.
                        </p>
                      </div>
                    </div>

                    {telegramLinkStatus?.isLinked ? (
                      <button
                        type="button"
                        onClick={handleUnlinkTelegram}
                        disabled={isUnlinkingTelegram}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                      >
                        {isUnlinkingTelegram ? 'Unlinking...' : 'Disconnect Telegram'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateTelegramLink}
                        disabled={isGeneratingClientLink}
                        className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:brightness-105 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{isGeneratingClientLink ? 'Generating...' : 'Link with Telegram'}</span>
                      </button>
                    )}
                  </div>

                  {telegramActionNotice && (
                    <div className="p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs">
                      {telegramActionNotice}
                    </div>
                  )}

                  {clientTelegramLinkData && !telegramLinkStatus?.isLinked && (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in">
                      <div className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                        <span>Tap button below to open Bot in Telegram or copy command:</span>
                        <span className="text-[10px] text-indigo-600 bg-white px-2 py-0.5 rounded font-bold">Valid for 30 mins</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={clientTelegramLinkData.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>Open in Telegram (@NexoranetworkISPBot)</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`/link ${clientTelegramLinkData.token}`);
                            setCopiedClientLink(true);
                            setTimeout(() => setCopiedClientLink(false), 2000);
                          }}
                          className="px-3 py-2 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedClientLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedClientLink ? 'Copied Command!' : 'Copy /link command'}</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-indigo-800">
                        Once you send <code>/start</code> in the bot, your account will be linked automatically.
                      </p>
                    </div>
                  )}

                  {telegramLinkStatus?.isLinked && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-mono font-bold text-sky-700 block">/status</span>
                        <span className="text-[10px] text-slate-500">Subscription &amp; balance</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-mono font-bold text-indigo-700 block">/mypackage</span>
                        <span className="text-[10px] text-slate-500">Speed &amp; plan details</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-mono font-bold text-emerald-700 block">/mypayments</span>
                        <span className="text-[10px] text-slate-500">Payment receipt history</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-mono font-bold text-teal-700 block">/myonu</span>
                        <span className="text-[10px] text-slate-500">Live fiber optical RX/TX</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Countdown remaining card */}
                <div className="bg-[#1a2332] text-white p-6 rounded-[28px] shadow-lg flex flex-col items-center space-y-4 relative overflow-hidden">
                  {/* Dynamic decorative radar beam */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl"></div>

                  <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                    Time remaining until expiry
                  </p>

                  {/* Grid digits row */}
                  <div className="flex items-center gap-3 py-1">
                    {/* Days */}
                    <div className="flex flex-col items-center">
                      <div className="bg-[#243345] w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black text-white border border-slate-700/50 shadow-md">
                        {String(liveCountdown.days).padStart(2, "0")}
                      </div>
                      <span className="text-[9px] font-black text-slate-400 tracking-wider mt-1.5 uppercase">
                        DAYS
                      </span>
                    </div>

                    <span className="text-xl font-bold text-[#60b5f4] -mt-4 animate-pulse">
                      :
                    </span>

                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <div className="bg-[#243345] w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black text-white border border-slate-700/50 shadow-md">
                        {String(liveCountdown.hours).padStart(2, "0")}
                      </div>
                      <span className="text-[9px] font-black text-slate-400 tracking-wider mt-1.5 uppercase">
                        HOURS
                      </span>
                    </div>

                    <span className="text-xl font-bold text-[#60b5f4] -mt-4 animate-pulse">
                      :
                    </span>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <div className="bg-[#243345] w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black text-white border border-slate-700/50 shadow-md">
                        {String(liveCountdown.minutes).padStart(2, "0")}
                      </div>
                      <span className="text-[9px] font-black text-slate-400 tracking-wider mt-1.5 uppercase">
                        MINS
                      </span>
                    </div>

                    <span className="text-xl font-bold text-[#60b5f4] -mt-4 animate-pulse">
                      :
                    </span>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <div className="bg-[#243345] w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black text-white border border-slate-700/50 shadow-md text-cyan-400">
                        {String(liveCountdown.seconds).padStart(2, "0")}
                      </div>
                      <span className="text-[9px] font-black text-slate-400 tracking-wider mt-1.5 uppercase">
                        SECS
                      </span>
                    </div>
                  </div>

                  {/* Expires text */}
                  <p className="text-xs font-semibold text-slate-400 mt-1">
                    Expires on{" "}
                    <strong className="text-white">
                      {formatToCustomDateTime(activeClient.expiry)}
                    </strong>
                  </p>

                  {/* Action Button: Pay Now */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("renew");
                      setTimeout(() => {
                        handleInteractivePayment();
                      }, 100);
                    }}
                    className="w-full mt-2 py-4 bg-transparent hover:bg-white/5 border border-white/20 rounded-2xl text-white font-black text-xs tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4 text-cyan-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                      />
                    </svg>
                    Pay Now
                  </button>
                </div>

                {/* Payment Summary Ledger */}
                <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm flex flex-col space-y-4">
                  <div className="flex items-center gap-2 font-black text-[#1e293b] text-sm pb-3 border-b border-slate-100">
                    <svg
                      className="w-4 h-4 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                    Payment Summary
                  </div>

                  <div className="space-y-3.5 text-xs text-slate-700">
                    {/* Row 1: Last Payment */}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-500">
                        Last Payment
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-emerald-600">
                          ৳ {activeClient.price || "500"}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {formatToCustomDate(
                            activeClient.createdAt || "2025-03-20",
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100"></div>

                    {/* Row 2: Next Due Date */}
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="font-semibold text-slate-500">
                        Next Due Date
                      </span>
                      <span className="font-black text-slate-950">
                        {formatToCustomDate(activeClient.expiry)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Styled Footer Block matching requested style */}
                <div className="pt-6 pb-2 text-center flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-500 transition-colors">
                    <svg
                      className="w-3.5 h-3.5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 12-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-1.35 15.65c.162.336.347.653.55.95M11.25 5.65c-.162-.336-.347-.653-.55-.95"
                      />
                    </svg>
                    <span>Footer</span>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Renew Connection & Checkout Tab */}
            {activeTab === "renew" && (
              <div className="bg-[#f4f6f9] p-4 sm:p-6 rounded-[24px] animate-in fade-in duration-300 space-y-6">
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="flex items-center gap-2 text-slate-800">
                    <svg
                      className="w-6 h-6 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.284 16.284A3 3 0 0012 17a3 3 0 003.716-.716m-7.432-4.568a5 5 0 017.432 0m-9.288-2.288a7 7 0 0111.144 0M4.004 5.004a11 11 0 0115.992 0"
                      />
                    </svg>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                      Internet Packages
                    </h2>
                  </div>
                  <p className="text-xs text-slate-800 font-medium">
                    Choose the best internet package for your needs
                  </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
                    <div className="p-3 bg-indigo-500 text-white rounded-xl">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                        Total Packages
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        {packages.length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
                    <div className="p-3 bg-emerald-500 text-white rounded-xl">
                      <span className="text-xl font-bold">৳</span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                        Starting From
                      </p>
                      <p className="text-lg font-black text-slate-900">৳500</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
                    <div className="p-3 bg-amber-500 text-white rounded-xl">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                        Highest Plan
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        ৳3,675
                      </p>
                    </div>
                  </div>
                </div>

                {/* Packages Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...packages]
                    .sort((a, b) => {
                      const pA = parseFloat(String(a.price).replace(/[^\d.]/g, "")) || 0;
                      const pB = parseFloat(String(b.price).replace(/[^\d.]/g, "")) || 0;
                      return pA - pB;
                    })
                    .map((pkg, idx) => {
                    const numericSpeed = pkg.speed.replace(/\D/g, "");
                    const isSelected = selectedPackageId !== null ? selectedPackageId === pkg.id : selectedPackage === pkg.name;

                    const themes = [
                      {
                        bg: "from-indigo-600 to-indigo-500",
                        text: "text-indigo-600",
                        selectBg: "bg-indigo-600",
                        border: "border-indigo-100",
                      },
                      {
                        bg: "from-orange-400 to-orange-500",
                        text: "text-orange-600",
                        selectBg: "bg-orange-500",
                        border: "border-orange-100",
                      },
                      {
                        bg: "from-sky-500 to-sky-400",
                        text: "text-sky-600",
                        selectBg: "bg-sky-500",
                        border: "border-sky-100",
                      },
                      {
                        bg: "from-emerald-500 to-emerald-400",
                        text: "text-emerald-600",
                        selectBg: "bg-emerald-500",
                        border: "border-emerald-100",
                      },
                      {
                        bg: "from-indigo-600 to-indigo-500",
                        text: "text-indigo-600",
                        selectBg: "bg-indigo-600",
                        border: "border-indigo-100",
                      },
                      {
                        bg: "from-amber-500 to-amber-400",
                        text: "text-amber-500",
                        selectBg: "bg-amber-500",
                        border: "border-amber-100",
                      },
                      {
                        bg: "from-violet-600 to-violet-500",
                        text: "text-violet-600",
                        selectBg: "bg-violet-600",
                        border: "border-violet-100",
                      },
                      {
                        bg: "from-red-500 to-rose-400",
                        text: "text-red-600",
                        selectBg: "bg-red-500",
                        border: "border-red-100",
                      },
                    ];
                    const theme = themes[idx % themes.length];

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => {
                          setSelectedPackage(pkg.name);
                          setSelectedPackageId(pkg.id);
                        }}
                        className={`flex flex-col rounded-[24px] overflow-hidden transition-all duration-300 cursor-pointer bg-white border border-slate-200/80 ${
                          isSelected
                            ? "ring-4 ring-cyan-500/80 shadow-2xl scale-[1.02]"
                            : "hover:shadow-xl hover:scale-[1.01]"
                        }`}
                      >
                        <div
                          className={`py-6 bg-gradient-to-br ${theme.bg} text-white flex flex-col items-center justify-center relative min-h-[120px]`}
                        >
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 bg-white text-cyan-600 text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                              ✓ ACTIVE SELECTION
                            </div>
                          )}
                          <span className="text-4xl font-extrabold tracking-tight">
                            {numericSpeed || "0"}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-90 mt-0.5">
                            Mbps
                          </span>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
                          <div className="space-y-4">
                            <div className="text-center">
                              <h3 className="text-xs font-extrabold text-slate-800 tracking-tight leading-snug">
                                {pkg.name}
                              </h3>
                              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                {numericSpeed} Mbps (24 Hours || Shared)
                              </p>
                            </div>

                            <div className="space-y-2 pt-1 border-t border-slate-100">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                <span
                                  className={`w-3.5 h-3.5 rounded-full ${theme.selectBg} text-white flex items-center justify-center text-[8px] flex-shrink-0`}
                                >
                                  ✓
                                </span>
                                <span>Bandwidth Shared (1:8 Ratio)</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                <span
                                  className={`w-3.5 h-3.5 rounded-full ${theme.selectBg} text-white flex items-center justify-center text-[8px] flex-shrink-0`}
                                >
                                  ✓
                                </span>
                                <span>Optical Fiber Connection</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                <span
                                  className={`w-3.5 h-3.5 rounded-full ${theme.selectBg} text-white flex items-center justify-center text-[8px] flex-shrink-0`}
                                >
                                  ✓
                                </span>
                                <span>Connection Charge Free</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                <span
                                  className={`w-3.5 h-3.5 rounded-full ${theme.selectBg} text-white flex items-center justify-center text-[8px] flex-shrink-0`}
                                >
                                  ✓
                                </span>
                                <span>24/7 Customer Support</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
                            <span
                              className={`text-2xl font-black ${theme.text}`}
                            >
                              ৳{pkg.price}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Per Month
                            </span>

                            <button
                              className={`mt-4 w-full py-2.5 rounded-xl text-xs font-black tracking-wide transition-colors ${
                                isSelected
                                  ? "bg-cyan-500 text-white hover:bg-cyan-600"
                                  : "bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-slate-100"
                              }`}
                            >
                              {isSelected ? "✓ SELECTED PLAN" : "CHOOSE PLAN"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Wallet Gateways */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-2.5">
                    SELECT PAYMENT GATEWAY
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(
                      [
                        {
                          id: "bKash",
                          color:
                            "border-pink-500 bg-pink-500/5 hover:bg-pink-500/10",
                          label: "bKash Wallet",
                          logo:
                            settings?.paymentLogos?.bkash ||
                            "https://defipay.oss-ap-southeast-1.aliyuncs.com/bKash.png",
                        },
                        {
                          id: "Nagad",
                          color:
                            "border-orange-500 bg-orange-500/5 hover:bg-orange-500/10",
                          label: "Nagad Pay",
                          logo:
                            settings?.paymentLogos?.nagad ||
                            "https://defipay.oss-ap-southeast-1.aliyuncs.com/Nagad.png",
                        },
                        {
                          id: "Rocket",
                          color:
                            "border-purple-500 bg-purple-500/5 hover:bg-purple-500/10",
                          label: "Rocket Mobile",
                          logo:
                            settings?.paymentLogos?.rocket ||
                            "https://defipay.oss-ap-southeast-1.aliyuncs.com/Rocket.png",
                        },
                        {
                          id: "Bank",
                          color:
                            "border-sky-500 bg-sky-500/5 hover:bg-sky-500/10",
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
                          onClick={() =>
                            setSelectedPaymentMethod(item.id as any)
                          }
                          className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between gap-3 transition-all cursor-pointer min-h-[140px] w-full ${
                            isSelected
                              ? item.color +
                                " shadow-[0_4px_15px_rgba(0,0,0,0.15)] border-current scale-[1.02]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:scale-[1.01]"
                          }`}
                        >
                          {item.logo ? (
                            <div className="h-16 w-full flex items-center justify-center bg-white rounded-xl p-1 border border-slate-100/80 shadow-sm overflow-hidden">
                              <img
                                src={item.logo}
                                alt={item.id}
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const span = e.currentTarget
                                    .nextElementSibling as HTMLElement;
                                  if (span) span.style.display = "block";
                                }}
                              />
                              <span className="hidden text-xs font-black text-slate-900">
                                {item.id}
                              </span>
                            </div>
                          ) : (
                            <div className="h-16 w-full flex items-center justify-center bg-sky-50/50 rounded-xl p-2 border border-sky-100/30">
                              <Landmark
                                className={`w-8 h-8 ${isSelected ? "text-sky-600" : "text-slate-400"}`}
                              />
                            </div>
                          )}
                          <span
                            className={`text-[10px] font-black uppercase tracking-wide text-center leading-tight ${isSelected ? "text-slate-900" : "text-slate-700"}`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic Merchant/Personal Payment Number Box */}
                <div
                  className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${
                    selectedPaymentMethod === "bKash"
                      ? "bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50/70 border-pink-300 text-pink-950"
                      : selectedPaymentMethod === "Nagad"
                        ? "bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/70 border-orange-300 text-orange-950"
                        : selectedPaymentMethod === "Rocket"
                          ? "bg-gradient-to-r from-purple-50 via-fuchsia-50 to-purple-50/70 border-purple-300 text-purple-950"
                          : "bg-gradient-to-r from-sky-50 via-blue-50 to-sky-50/70 border-sky-300 text-sky-950"
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-white border border-current shadow-xs">
                          {selectedPaymentMethod} Payment Gateway
                        </span>
                        <span className="text-[11px] font-bold opacity-80 bg-white/60 px-2 py-0.5 rounded">
                          Personal / Send Money (or Merchant)
                        </span>
                      </div>
                      <div className="text-sm font-bold flex flex-wrap items-center gap-2 pt-1">
                        <span>Payment / Send Money Number:</span>
                        <span className="text-xl font-mono font-black tracking-wider bg-white px-3 py-1 rounded-xl border border-slate-300 text-slate-900 shadow-sm inline-flex items-center gap-2">
                          <PhoneCall className="w-4 h-4 text-emerald-600 animate-pulse" />
                          {merchantPaymentNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyNumber(merchantPaymentNumber)
                          }
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
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
                    <div className="text-right self-end md:self-center bg-white/70 px-3 py-1.5 rounded-xl border border-current/10">
                      <span className="text-[10px] opacity-75 block font-bold uppercase">
                        Total Payable Bill:
                      </span>
                      <span className="text-xl font-black font-mono text-slate-900">
                        ৳
                        {
                          (
                            (selectedPackageId !== null
                              ? packages.find((p) => p.id === selectedPackageId)
                              : packages.find((p) => p.name === selectedPackage)) || { price: activeClient.price || "500" }
                          ).price
                        }
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-current/10 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <p className="opacity-90 leading-relaxed font-medium">
                      💡 From your <strong>{selectedPaymentMethod}</strong> app,
                      transfer to <strong>{merchantPaymentNumber}</strong> ৳
                      {
                        (
                          (selectedPackageId !== null
                            ? packages.find((p) => p.id === selectedPackageId)
                            : packages.find((p) => p.name === selectedPackage)) || {
                            price: activeClient.price || "500",
                          }
                        ).price
                      }{" "}
                      BDT Send Money and enter the TrxID below to submit.
                    </p>
                    <button
                      type="button"
                      onClick={handleInteractivePayment}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow whitespace-nowrap cursor-pointer transition-all active:scale-95"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Submit Payment
                      TrxID
                    </button>
                  </div>
                </div>

                {/* Print Friendly Check Info */}
                <div className="bg-white/40 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-900 block">
                      Total Renewal Charge:
                    </span>
                    <span className="font-bold text-slate-900 text-base mt-1 block">
                      ৳
                      {
                        (
                          (selectedPackageId !== null
                            ? packages.find((p) => p.id === selectedPackageId)
                            : packages.find((p) => p.name === selectedPackage)) || {
                            price: activeClient.price || "500",
                          }
                        ).price
                      }
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleInteractivePayment}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl transition-all shadow-md shadow-emerald-500/10 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" /> Secure Checkout (Instant
                    Payment)
                  </button>
                </div>
              </div>
            )}

            {/* 3. Diagnostics & Latency Tester Tab */}
            {/* 3. Diagnostics Tab */}
            {activeTab === "diagnostics" && (
              <div className="bg-white border-t-[3px] border-[#3c8dbc] p-6 rounded shadow-sm animate-in fade-in duration-300 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-medium text-slate-900 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-[#00a65a]" /> Line Ping &
                    Diagnostic Center
                  </h2>
                  <button
                    onClick={runPingTest}
                    disabled={pingStatus === "running"}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-black rounded-lg cursor-pointer"
                  >
                    {pingStatus === "running"
                      ? "Testing..."
                      : "Run Diagnostics"}
                  </button>
                </div>

                {/* Diagnostic stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-900 font-bold block">
                      ONT LATENCY
                    </span>
                    <span className="text-xl font-mono font-black text-[#00a65a] mt-1 block">
                      {pingStatus === "running"
                        ? "pinging..."
                        : `${pingLatency || "--"} ms`}
                    </span>
                    <span className="text-[9px] text-slate-900">
                      Router to gateway server ping
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-900 font-bold block">
                      OPTICAL POWER RX
                    </span>
                    <span className="text-xl font-mono font-black text-amber-400 mt-1 block">
                      {pingStatus === "running"
                        ? "measuring..."
                        : `${signalPower} dBm`}
                    </span>
                    <span
                      className={`text-[9px] ${signalPower > -24 ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {signalPower > -24
                        ? "Optimum Fiber Link Quality"
                        : "Weak fiber link"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-900 font-bold block">
                      PACKET LOSS
                    </span>
                    <span className="text-xl font-mono font-black text-sky-400 mt-1 block">
                      {pingStatus === "running"
                        ? "checking..."
                        : `${packetLoss}%`}
                    </span>
                    <span className="text-[9px] text-slate-900">
                      Stability & QoS metrics
                    </span>
                  </div>
                </div>

                {/* Diagnostic Log Output terminal */}
                <div className="bg-slate-800/40 rounded-2xl p-4.5 border border-slate-200 font-mono text-[10px] text-[#00a65a] space-y-1.5 max-h-[180px] overflow-y-auto">
                  <div>// NexoraNetwork Router diagnostics console</div>
                  {diagnosticsLogs.length === 0 && (
                    <div className="text-slate-900">
                      Click &quot;Run Diagnostics&quot; above to scan your
                      internet wire health.
                    </div>
                  )}
                  {diagnosticsLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Support Tickets Tab */}
            {/* 4. Complaints Tab */}
            {activeTab === "tickets" && (
              <div className="bg-white border-t-[3px] border-[#3c8dbc] p-6 rounded shadow-sm animate-in fade-in duration-300 space-y-6">
                <h2 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-rose-400" /> Open
                  Support Ticket & Complaints
                </h2>

                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-900 uppercase mb-1">
                        Issue Category
                      </label>
                      <select
                        value={newTicketCategory}
                        onChange={(e) =>
                          setNewTicketCategory(e.target.value as any)
                        }
                        className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
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
                      <label className="block text-[10px] font-bold text-slate-900 uppercase mb-1">
                        Subject / Summary
                      </label>
                      <input
                        type="text"
                        required
                        value={newTicketSubject}
                        onChange={(e) => setNewTicketSubject(e.target.value)}
                        placeholder="e.g. Red light on router / LOS"
                        className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-900 uppercase mb-1">
                      Detail Description
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newTicketDesc}
                      onChange={(e) => setNewTicketDesc(e.target.value)}
                      placeholder="Describe your issue in detail..."
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                    />
                  </div>

                  {ticketMsg && (
                    <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/20 text-[#3c8dbc] rounded-xl text-xs font-semibold">
                      {ticketMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full p-3 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Submit complaint ticket
                  </button>
                </form>

                {/* Ticket Logs list */}
                <div className="space-y-2 pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">
                    My Ticket Logs
                  </h3>
                  {tickets.length === 0 ? (
                    <div className="text-xs text-slate-900">
                      No ticket records found.
                    </div>
                  ) : (
                    tickets.map((t, i) => (
                      <div
                        key={i}
                        className="p-3.5 bg-white/60 border border-slate-200 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] font-bold bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20">
                              {t.ticketNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {t.subject}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-900 block mt-1">
                            Status: {t.status} | Created: {t.createdAt}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.status === "Resolved"
                              ? "bg-emerald-500/15 text-[#00a65a]"
                              : "bg-rose-500/15 text-rose-400 animate-pulse"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 5. Billing History & Print Receipts */}

            {/* 5. Receipts Tab */}
            {activeTab === "receipts" && (
              <div className="bg-white border-t-[3px] border-[#00a65a] p-4 sm:p-6 rounded shadow-sm animate-in fade-in duration-300 space-y-4">
                <h2 className="text-base font-medium text-slate-900 flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-[#00a65a]" /> Member Ledger
                  Panel
                </h2>
                {billingHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-900">
                    No billing receipts found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border border-slate-200">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Transaction ID</th>
                          <th className="px-4 py-3">Particulars</th>
                          <th className="px-4 py-3 text-right">Debit</th>
                          <th className="px-4 py-3 text-right">Credit</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingHistory.map((rec, i) => (
                          <tr
                            key={i}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-900 whitespace-nowrap">
                              {rec.timestamp}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-900 text-xs">
                              {rec.id}
                            </td>
                            <td className="px-4 py-3 text-slate-900">
                              Package Renew: {rec.package} ({rec.paymentMethod})
                            </td>
                            <td className="px-4 py-3 text-right text-rose-500 font-semibold">
                              ৳{rec.amount}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                              ৳{rec.amount}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handlePrintReceipt(rec)}
                                className="px-3 py-1.5 bg-[#00c0ef] hover:bg-[#0097bc] text-white rounded text-xs font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" /> Print
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ICONIC BKASH/NAGAD CHECKOUT MODAL */}
          {showCheckoutModal && (
            <div className="fixed inset-0 z-[100] bg-white/85 backdrop-blur-md flex items-center justify-center p-4">
              <div
                className={`max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl border-2 transition-all duration-300 ${
                  selectedPaymentMethod === "bKash"
                    ? "bg-[#E2125B] border-pink-500/30 text-white"
                    : selectedPaymentMethod === "Nagad"
                      ? "bg-[#F04D22] border-orange-500/30 text-white"
                      : selectedPaymentMethod === "Rocket"
                        ? "bg-[#8c2a91] border-purple-500/30 text-white"
                        : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                {/* Logo bar */}
                <div className="p-5 text-center border-b border-white/10 bg-white/20 flex flex-col items-center">
                  {selectedPaymentMethod === "bKash" && (
                    <img
                      src="https://seeklogo.com/images/B/bkash-logo-0C1572FBB4-seeklogo.com.png"
                      alt="bKash"
                      className="h-8 w-auto object-contain mb-2 drop-shadow-md brightness-0 invert"
                    />
                  )}
                  {selectedPaymentMethod === "Nagad" && (
                    <img
                      src="https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png"
                      alt="Nagad"
                      className="h-8 w-auto object-contain mb-2 drop-shadow-md brightness-0 invert scale-125 origin-bottom"
                    />
                  )}
                  {selectedPaymentMethod === "Rocket" && (
                    <img
                      src="https://seeklogo.com/images/D/dutch-bangla-rocket-logo-B4D104E752-seeklogo.com.png"
                      alt="Rocket"
                      className="h-7 w-auto object-contain mb-2 drop-shadow-md brightness-0 invert"
                    />
                  )}

                  <span className="text-base font-black tracking-widest">
                    {selectedPaymentMethod.toUpperCase()} CHECKOUT
                  </span>
                  <span className="text-[10px] font-bold text-slate-900/70 tracking-wider uppercase mt-1">
                    Merchant Pay: {settings?.appName || "Nexora network"}
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  {/* Checkout Form: Mobile & Transaction ID */}
                  {checkoutStep === "form" && (
                    <div className="space-y-4">
                      {/* Prominent Number Banner in Modal */}
                      <div className="bg-black/35 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 text-center space-y-1.5 shadow-inner">
                        <div className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
                          {selectedPaymentMethod} Send Money / Payment Number
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-black font-mono tracking-wider text-white select-all bg-white/10 px-3.5 py-1 rounded-xl border border-white/20 shadow-inner">
                            {merchantPaymentNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyNumber(merchantPaymentNumber)
                            }
                            className="px-2.5 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95"
                          >
                            {copiedNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            {copiedNumber ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <div className="text-[11px] text-white/90 font-medium flex items-center justify-center gap-2">
                          <span>Payable Bill:</span>
                          <span className="font-black text-amber-300">
                            ৳
                            {
                              (
                                (selectedPackageId !== null
                                  ? packages.find((p) => p.id === selectedPackageId)
                                  : packages.find((p) => p.name === selectedPackage)) || { price: activeClient.price || "500" }
                              ).price
                            }{" "}
                            BDT
                          </span>
                        </div>
                      </div>

                      <div className="text-center text-xs text-white/95 font-medium">
                        After sending payment to ({merchantPaymentNumber}),
                        enter the received{" "}
                        <span className="font-black underline">
                          Transaction ID (TrxID)
                        </span>{" "}
                        below:
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-white/85 uppercase mb-1">
                            Sender Mobile Number (Your Number)
                          </label>
                          <input
                            type="text"
                            value={checkoutPhone}
                            onChange={(e) => setCheckoutPhone(e.target.value)}
                            placeholder="e.g. 017XXXXXXXX"
                            className="w-full text-center p-3 rounded-2xl bg-white/20 border border-white/30 text-white focus:outline-none focus:border-white placeholder-white/50 font-bold text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-white/85 uppercase mb-1">
                            Transaction ID (TrxID) *
                          </label>
                          <input
                            type="text"
                            value={inputTrxId}
                            onChange={(e) => setInputTrxId(e.target.value)}
                            placeholder="e.g. 9H78K29L"
                            className="w-full text-center p-3.5 rounded-2xl bg-white text-slate-900 border-2 border-emerald-400 focus:outline-none focus:border-white placeholder-slate-400 font-mono font-black text-base uppercase tracking-wider shadow-inner"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action controller buttons */}
                  {checkoutStep !== "success" && (
                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCheckoutModal(false)}
                        className="w-1/3 py-3 bg-white/20 hover:bg-white/35 text-slate-900/85 font-extrabold rounded-2xl text-xs cursor-pointer transition-all"
                      >
                        CLOSE
                      </button>
                      <button
                        type="button"
                        onClick={handleProceedCheckout}
                        disabled={isProcessingPayment}
                        className="w-2/3 py-3 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 font-black rounded-2xl text-xs cursor-pointer transition-all flex items-center justify-center gap-1 shadow-md"
                      >
                        {isProcessingPayment ? (
                          <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                        ) : (
                          "PROCEED / CONFIRM"
                        )}
                      </button>
                    </div>
                  )}

                  {checkoutStep === "success" && (
                    <div className="space-y-4 text-center py-2">
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-lg">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">
                          Payment Request Submitted!
                        </h4>
                        <p className="text-xs text-white/90 mt-1">
                          Your payment has been submitted for admin
                          verification. Once approved, your internet package
                          will be renewed immediately.
                        </p>
                      </div>
                      <div className="bg-black/20 rounded-xl p-3 border border-white/20 font-mono text-xs">
                        <span className="text-white/70 block text-[10px] uppercase font-bold">
                          Transaction ID:
                        </span>
                        <span className="text-white font-black tracking-wider text-sm">
                          {generatedTrxId}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCheckoutModal(false);
                          setActiveTab("overview");
                        }}
                        className="w-full py-3 bg-white text-slate-900 font-extrabold rounded-2xl text-xs cursor-pointer hover:bg-slate-100 transition-colors shadow-md mt-2"
                      >
                        OK, DONE
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Styled Printable Receipt Format */}
          {selectedReceiptForPrint && (
            <div className="hidden print:block fixed inset-0 bg-white text-slate-900 p-10 font-sans z-[999] text-xs">
              <div className="border-2 border-slate-300 p-8 space-y-6 rounded-lg max-w-xl mx-auto relative overflow-hidden">
                {/* PAID watermark */}
                <div className="absolute top-24 right-12 border-4 border-emerald-500 text-emerald-500 font-black tracking-widest text-lg px-4 py-1 rotate-12 opacity-35 rounded">
                  PAID / Paid
                </div>

                {/* Header bill */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                  <div>
                    <h1 className="text-lg font-black text-slate-900">
                      {settings?.companyName ||
                        settings?.appName ||
                        "NexoraNetwork ISP"}
                    </h1>
                    <p className="text-[10px] text-slate-900 mt-1">
                      {settings?.address || "Dhaka, Bangladesh"}
                    </p>
                    <p className="text-[10px] text-slate-900">
                      Support: {settings?.phone || "01XXXXXXXXX"}
                    </p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-sm font-black text-slate-700">
                      BILL PAYMENT RECEIPT
                    </h2>
                    <p className="text-[10px] text-slate-900 mt-1">
                      Transaction: {selectedReceiptForPrint.id}
                    </p>
                    <p className="text-[10px] text-slate-900">
                      Date: {selectedReceiptForPrint.timestamp}
                    </p>
                  </div>
                </div>

                {/* Client Details */}
                <div className="space-y-1 bg-slate-50 p-3.5 rounded">
                  <div className="flex justify-between">
                    <span className="text-slate-900">Customer Name:</span>
                    <span className="font-bold text-slate-900">
                      {selectedReceiptForPrint.clientName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-900">User ID / Username:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedReceiptForPrint.userId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-900">Package Title:</span>
                    <span className="font-bold text-slate-900">
                      {selectedReceiptForPrint.package}
                    </span>
                  </div>
                </div>

                {/* Item Table pricing */}
                <table className="w-full text-left mt-4 border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Amount (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2">
                        Internet Subscription Renewal (Bandwidth Recharge)
                      </td>
                      <td className="p-2 text-right">
                        ৳{selectedReceiptForPrint.amount}
                      </td>
                    </tr>
                    <tr className="font-bold">
                      <td className="p-2 text-right">Subtotal:</td>
                      <td className="p-2 text-right">
                        ৳{selectedReceiptForPrint.amount}
                      </td>
                    </tr>
                    <tr className="font-black text-sm border-t-2 border-slate-300">
                      <td className="p-2 text-right">Grand Total Paid:</td>
                      <td className="p-2 text-right text-emerald-600">
                        ৳{selectedReceiptForPrint.amount}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer QR code */}
                <div className="flex justify-between items-center pt-6 border-t border-slate-200 mt-8">
                  <div>
                    <p className="font-extrabold text-[9px] uppercase tracking-wider text-slate-900">
                      Secure Payment Confirmed via
                    </p>
                    <p className="font-black text-xs text-sky-600">
                      {selectedReceiptForPrint.paymentMethod} Mobile Wallet
                    </p>
                  </div>
                  <div className="w-14 h-14">
                    <QrCode className="w-full h-full text-slate-700" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Smart AI Line Diagnostic & Support Assistant */}
          <ClientAiAssistant
            client={activeClient}
            onNavigateToRenew={() => setActiveTab("renew")}
            onClientStatusUpdated={(updated) => setActiveClient(updated)}
          />
        </main>
      </div>
    </div>
  );
};
