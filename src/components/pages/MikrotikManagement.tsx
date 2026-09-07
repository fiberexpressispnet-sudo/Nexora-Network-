import React, { useState } from "react";
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
} from "lucide-react";
import {
  Client,
  MikrotikRouter,
  Package,
  BandwidthProfile,
  DaysProfile,
  AppSettings,
} from "../../types";
import { matchClientToRouter } from "../../utils/mikrotikMatcher";
import { Modal } from "../Modal";
import { SmsReminderModal } from "../SmsReminderModal";
import { getClientExpiryInfo } from "../../lib/expiryUtils";
import { QRCodeSVG } from "qrcode.react";
import { compressImage } from "../../lib/imageUtils";
import { BandwidthMonitor } from "../BandwidthMonitor";
import { LiveNetworkTraffic } from "../LiveNetworkTraffic";
import { HotspotLoginTemplate } from "../HotspotLoginTemplate";

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
  onSendSmsReminder?: (
    client: Client,
    messageText: string,
    channel: "SMS" | "WhatsApp" | "Manual",
  ) => void;
  showToast: (
    msg: string,
    type: "info" | "success" | "error" | "warning",
  ) => void;
}

const isPrivateIp = (host: string): boolean => {
  if (!host) return false;
  const clean = host.trim().toLowerCase();
  if (clean === "localhost" || clean === "127.0.0.1") return true;
  if (clean.startsWith("10.")) return true;
  if (clean.startsWith("192.168.")) return true;

  const parts = clean.split(".");
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
    selectedRouterId || routers[0]?.id || "mk-01",
  );

  const activeRouterId = selectedRouterId || internalSelectedId;
  const currentRouter = routers.find((r) => r.id === activeRouterId) ||
    routers[0] || {
      id: "mk-01",
      name: "Main Core Router (CCR1036)",
      ip: "192.168.1.1",
      apiPort: 8728,
      apiSslPort: 8729,
      username: "admin",
      connected: true,
      model: "CCR1036-12G-4S",
      location: "Central Datacenter",
      mode: "Core",
      cpu: "12%",
      ram: "128 MB / 512 MB",
      uptime: "14 days, 06:22:10",
    };

  const handleSelectRouter = (id: string) => {
    setInternalSelectedId(id);
    if (onSelectRouter) {
      onSelectRouter(id);
    }
    const found = routers.find((r) => r.id === id);
    if (found) {
      showToast(`Switched to MikroTik: ${found.name} (${found.ip})`, "info");
    }
  };

  const [activeTab, setActiveTab] = useState<
    "clients" | "interfaces" | "ip" | "dhcp" | "firewall" | "queues" | "system" | "hotspot-login"
  >("clients");

  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<
    "all" | "online" | "offline" | "expiring" | "expired"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Router Management Modals
  const [isAddRouterOpen, setIsAddRouterOpen] = useState(false);
  const [isEditRouterOpen, setIsEditRouterOpen] = useState(false);
  const [isDeleteRouterOpen, setIsDeleteRouterOpen] = useState(false);
  const [isConnectionGuideOpen, setIsConnectionGuideOpen] = useState(false);

  // Router Form States
  const [routerFormName, setRouterFormName] = useState("");
  const [routerFormIp, setRouterFormIp] = useState("");
  const [routerFormPort, setRouterFormPort] = useState(8728);
  const [routerFormSslPort, setRouterFormSslPort] = useState(8729);
  const [routerFormUser, setRouterFormUser] = useState("admin");
  const [routerFormPass, setRouterFormPass] = useState("");
  const [routerFormLocation, setRouterFormLocation] = useState("");
  const [routerFormModel, setRouterFormModel] = useState("RB4011iGS+RM");
  const [routerFormMode, setRouterFormMode] = useState<
    "Hotspot" | "PPPoE" | "Hybrid" | "Core"
  >("Hybrid");

  // Client Management Modals inside MikroTik Management
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [editClientData, setEditClientData] = useState<Client | null>(null);
  const [deleteClientData, setDeleteClientData] = useState<Client | null>(null);
  const [viewClientData, setViewClientData] = useState<Client | null>(null);
  const [qrClientData, setQrClientData] = useState<Client | null>(null);
  const [smsReminderClient, setSmsReminderClient] = useState<Client | null>(
    null,
  );

  // New Client Form States
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientUserId, setNewClientUserId] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [newClientPkg, setNewClientPkg] = useState(
    packages[0]?.name || "Fiber 20",
  );
  const [newClientPrice, setNewClientPrice] = useState(
    packages[0]?.price || "500",
  );
  const [newClientBw, setNewClientBw] = useState(
    bandwidthProfiles[0]?.name || "20 Mbps",
  );
  const [newClientDl, setNewClientDl] = useState(
    bandwidthProfiles[0]?.download || "20",
  );
  const [newClientUl, setNewClientUl] = useState(
    bandwidthProfiles[0]?.upload || "10",
  );
  const [newClientBurst, setNewClientBurst] = useState("30M/30M");
  const [newClientPriority, setNewClientPriority] = useState("8");
  const [newClientDevice, setNewClientDevice] = useState<"Mobile" | "Router">(
    "Router",
  );
  const [newClientExpiry, setNewClientExpiry] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  );
  const [newClientPhoto, setNewClientPhoto] = useState<string | null>(null);

  // Edit Client Form States
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPkg, setEditPkg] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editBw, setEditBw] = useState("");
  const [editDl, setEditDl] = useState("");
  const [editUl, setEditUl] = useState("");
  const [editBurst, setEditBurst] = useState("30M/30M");
  const [editPriority, setEditPriority] = useState("8");
  const [editDevice, setEditDevice] = useState<"Mobile" | "Router">("Router");
  const [editExpiry, setEditExpiry] = useState("");
  const [editRouterName, setEditRouterName] = useState("");
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  const handleRefreshRouterLiveInfo = async (targetRouter = currentRouter) => {
    if (!targetRouter || !targetRouter.ip) return;
    setIsRefreshingStatus(true);
    try {
      const res = await fetch("/api/mikrotik/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: targetRouter.ip,
          port: targetRouter.apiPort,
          username: targetRouter.username,
          password: targetRouter.password,
          isDemo: targetRouter.isDemo,
        }),
      });
      const data = await res.json();
      if (data.success && data.router) {
        const updated: MikrotikRouter = {
          ...targetRouter,
          connected: true,
          cpu: data.router.cpuLoad ? `${data.router.cpuLoad}%` : data.router.cpu || targetRouter.cpu || "10%",
          ram: data.router.ramUsage || data.router.ram || targetRouter.ram || "128 MB / 1024 MB",
          uptime: data.router.uptime || targetRouter.uptime || "Online",
          version: data.router.version || targetRouter.version || "RouterOS v7",
          model: data.router.model || targetRouter.model || "MikroTik",
        };
        if (onUpdateRouter) {
          onUpdateRouter(updated);
        }
        showToast(`✅ Live MikroTik hardware status refreshed! (CPU: ${updated.cpu}, RAM: ${updated.ram})`, "success");
      } else {
        const updated: MikrotikRouter = {
          ...targetRouter,
          connected: false,
          errorReason: data.error || "Connection failed",
        };
        if (onUpdateRouter) {
          onUpdateRouter(updated);
        }
        showToast(data.error || "Failed to reach physical MikroTik router.", "error");
      }
    } catch (err: any) {
      showToast(`Router refresh error: ${err.message}`, "error");
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  // Filter clients for THIS specific router using smart matcher
  const routerClients = clients.filter((c) =>
    matchClientToRouter(c, currentRouter, routers),
  );
  const unassignedOrOtherClients = clients.filter(
    (c) => !matchClientToRouter(c, currentRouter, routers),
  );

  const filteredRouterClients = routerClients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      c.userId.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      c.phone.includes(clientSearchQuery) ||
      c.package.toLowerCase().includes(clientSearchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (clientStatusFilter === "all") return true;
    if (clientStatusFilter === "online") return c.status === "online";
    if (clientStatusFilter === "offline") return c.status === "offline";
    if (clientStatusFilter === "expiring")
      return getClientExpiryInfo(c.expiry).isExpiringSoon;
    if (clientStatusFilter === "expired")
      return getClientExpiryInfo(c.expiry).isExpired || c.status === "expired";
    return true;
  });

  const onlineClientCount = routerClients.filter(
    (c) => c.status === "online",
  ).length;
  const offlineClientCount = routerClients.filter(
    (c) => c.status === "offline",
  ).length;
  const expiringClientCount = routerClients.filter(
    (c) => getClientExpiryInfo(c.expiry).isExpiringSoon,
  ).length;

  // Interfaces data
  const [interfaces, setInterfaces] = useState([
    {
      name: "ether1-wan",
      type: "ether",
      rx: "42.5 Mbps",
      tx: "18.2 Mbps",
      status: "running",
    },
    {
      name: "ether2-lan",
      type: "ether",
      rx: "12.8 Mbps",
      tx: "35.1 Mbps",
      status: "running",
    },
    {
      name: "ether3-hotspot",
      type: "ether",
      rx: "28.1 Mbps",
      tx: "14.0 Mbps",
      status: "running",
    },
    {
      name: "sfp-plus1-core",
      type: "sfp-plus",
      rx: "85.4 Mbps",
      tx: "62.0 Mbps",
      status: "running",
    },
    {
      name: "wlan1-wifi",
      type: "wlan",
      rx: "5.2 Mbps",
      tx: "8.4 Mbps",
      status: "disabled",
    },
  ]);

  // IP Addresses
  const [ipList, setIpList] = useState([
    {
      address: "103.14.22.10/30",
      network: "103.14.22.8",
      interface: "ether1-wan",
    },
    {
      address: "192.168.1.1/24",
      network: "192.168.1.0",
      interface: "ether2-lan",
    },
    {
      address: "10.5.5.1/24",
      network: "10.5.5.0",
      interface: "ether3-hotspot",
    },
  ]);

  // DHCP Leases
  const [dhcpLeases, setDhcpLeases] = useState([
    {
      ip: "192.168.1.100",
      mac: "AA:BB:CC:11:22:33",
      host: "Ahmed-Phone",
      status: "bound",
      expires: "23h 12m",
    },
    {
      ip: "192.168.1.101",
      mac: "AA:BB:CC:44:55:66",
      host: "Fatima-Laptop",
      status: "bound",
      expires: "18h 45m",
    },
    {
      ip: "10.5.5.50",
      mac: "AA:BB:CC:77:88:99",
      host: "Hotspot-User1",
      status: "bound",
      expires: "2h 05m",
    },
  ]);

  // Firewall Rules
  const [firewallRules, setFirewallRules] = useState([
    {
      chain: "input",
      action: "accept",
      src: "192.168.1.0/24",
      comment: "Allow LAN to Router",
    },
    {
      chain: "forward",
      action: "drop",
      src: "0.0.0.0/0",
      comment: "Drop Invalid Packets",
    },
    {
      chain: "srcnat",
      action: "masquerade",
      src: "10.5.5.0/24",
      comment: "NAT Hotspot Traffic",
    },
  ]);

  // Simple Queues
  const [queues, setQueues] = useState([
    { name: "queue-client1", target: "192.168.1.100", limit: "20M/10M" },
    { name: "queue-client2", target: "192.168.1.101", limit: "30M/15M" },
    { name: "queue-hotspot", target: "10.5.5.0/24", limit: "100M/50M" },
  ]);

  // Modal States for Network Ops
  const [isAddIpOpen, setIsAddIpOpen] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState("");
  const [newIpNetwork, setNewIpNetwork] = useState("");
  const [newIpInterface, setNewIpInterface] = useState("ether2-lan");

  const [isAddFirewallOpen, setIsAddFirewallOpen] = useState(false);
  const [newFwChain, setNewFwChain] = useState<"input" | "forward" | "srcnat">(
    "forward",
  );
  const [newFwAction, setNewFwAction] = useState<
    "accept" | "drop" | "masquerade"
  >("accept");
  const [newFwSrc, setNewFwSrc] = useState("");
  const [newFwComment, setNewFwComment] = useState("");

  const [isAddQueueOpen, setIsAddQueueOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [newQueueTarget, setNewQueueTarget] = useState("");
  const [newQueueLimit, setNewQueueLimit] = useState("10M/5M");

  // Ping tool
  const [pingHost, setPingHost] = useState("8.8.8.8");
  const [pingLogs, setPingLogs] = useState<string[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [syncingClientId, setSyncingClientId] = useState<string | null>(null);
  const [isTerminalScriptModalOpen, setIsTerminalScriptModalOpen] =
    useState(false);
  const [bulkSyncResult, setBulkSyncResult] = useState<any>(null);

  const handleSyncSingleClient = async (client: Client) => {
    setSyncingClientId(client.id);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch("/api/mikrotik/sync-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ router: currentRouter, client }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        showToast(
          `Client ${client.name} saved in portal database (Router API offline).`,
          "info",
        );
        return;
      }

      const data = await res.json();
      if (data.success) {
        showToast(
          `⚡ Client ${client.name} (${client.userId}) successfully synced to MikroTik router (${currentRouter.name})!`,
          "success",
        );
      } else {
        showToast(
          `Client ${client.name} saved in portal database. ${data.error || "Router API response error."}`,
          "info",
        );
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === "AbortError";
      console.warn("Single Client Sync Note:", isAbort ? "Request timeout" : err.message);
      showToast(
        `Client ${client.name} saved in portal database (${isAbort ? "Router connection timeout" : "Saved offline"}).`,
        "info",
      );
    } finally {
      setSyncingClientId(null);
    }
  };

  const handleBulkSyncAllClients = async () => {
    if (routerClients.length === 0) {
      showToast("No clients to sync on this router.", "warning");
      return;
    }
    setIsBulkSyncing(true);
    setBulkSyncResult(null);
    try {
      const res = await fetch("/api/mikrotik/sync-all-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ router: currentRouter, clients: routerClients }),
      });
      const data = await res.json();
      setBulkSyncResult(data);
      if (data.success) {
        showToast(
          `✅ Successfully synchronized ${data.syncedCount || routerClients.length} of ${routerClients.length} clients to MikroTik router!`,
          "success",
        );
      } else {
        showToast(data.error || "Bulk synchronization failed.", "error");
      }
    } catch (err: any) {
      showToast(`Bulk sync error: ${err.message}`, "error");
    } finally {
      setIsBulkSyncing(false);
    }
  };

  // Router Handlers
  const handleOpenAddRouter = () => {
    setRouterFormName("");
    setRouterFormIp("");
    setRouterFormPort(8728);
    setRouterFormSslPort(8729);
    setRouterFormUser("admin");
    setRouterFormPass("");
    setRouterFormLocation("");
    setRouterFormModel("RB4011iGS+RM");
    setRouterFormMode("Hybrid");
    setIsAddRouterOpen(true);
  };

  const handleSaveNewRouter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routerFormName.trim() || !routerFormIp.trim()) {
      showToast("Router name and IP address are required", "error");
      return;
    }

    const newId = `mk-${Date.now().toString().slice(-4)}`;
    const newRouterObj: MikrotikRouter = {
      id: newId,
      name: routerFormName.trim(),
      ip: routerFormIp.trim(),
      apiPort: Number(routerFormPort) || 8728,
      apiSslPort: Number(routerFormSslPort) || 8729,
      username: routerFormUser.trim() || "admin",
      password: routerFormPass,
      connected: true,
      location: routerFormLocation.trim() || "Zone POP",
      model: routerFormModel,
      version: "RouterOS v7.12.1",
      cpu: "10%",
      uptime: "1 day, 02:15:00",
      ram: "128 MB / 1024 MB",
      activeUsers: 0,
      mode: routerFormMode,
      isDefault: routers.length === 0,
    };

    if (onAddRouter) {
      onAddRouter(newRouterObj);
    }
    handleSelectRouter(newId);
    setIsAddRouterOpen(false);
    showToast(
      `MikroTik Router "${newRouterObj.name}" added successfully!`,
      "success",
    );
  };

  const handleOpenEditRouter = () => {
    setRouterFormName(currentRouter.name);
    setRouterFormIp(currentRouter.ip);
    setRouterFormPort(currentRouter.apiPort);
    setRouterFormSslPort(currentRouter.apiSslPort);
    setRouterFormUser(currentRouter.username);
    setRouterFormPass(currentRouter.password || "");
    setRouterFormLocation(currentRouter.location || "");
    setRouterFormModel(currentRouter.model || "CCR1036-12G-4S");
    setRouterFormMode(currentRouter.mode || "Core");
    setIsEditRouterOpen(true);
  };

  const handleSaveEditRouter = (e: React.FormEvent) => {
    e.preventDefault();
    const oldName = currentRouter.name;
    const oldId = currentRouter.id;
    const updatedRouter: MikrotikRouter = {
      ...currentRouter,
      name: routerFormName.trim(),
      ip: routerFormIp.trim(),
      apiPort: Number(routerFormPort) || 8728,
      apiSslPort: Number(routerFormSslPort) || 8729,
      username: routerFormUser.trim() || "admin",
      password: routerFormPass,
      location: routerFormLocation.trim(),
      model: routerFormModel,
      mode: routerFormMode,
    };

    if (onUpdateRouter) {
      onUpdateRouter(updatedRouter);
    }

    if (oldName !== updatedRouter.name) {
      clients.forEach((c) => {
        if (c.router === oldName || c.router === oldId) {
          onUpdateClient({ ...c, router: updatedRouter.name });
        }
      });
    }

    setIsEditRouterOpen(false);
    showToast(
      `MikroTik Router "${updatedRouter.name}" configuration updated!`,
      "success",
    );
  };

  const handleDeleteCurrentRouter = () => {
    if (routers.length <= 1) {
      showToast(
        "Cannot delete the only configured MikroTik router!",
        "warning",
      );
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
    showToast(`Router "${currentRouter.name}" deleted`, "warning");
  };

  // Client Handlers
  const handleOpenAddClient = () => {
    setNewClientName("");
    setNewClientPhone("");
    setNewClientUserId(`user_${Math.floor(100 + Math.random() * 900)}`);
    setNewClientPassword(`pass${Math.floor(100 + Math.random() * 900)}`);
    setNewClientPkg(packages[0]?.name || "Fiber 20");
    setNewClientPrice(packages[0]?.price || "500");
    setNewClientBw(bandwidthProfiles[0]?.name || "20 Mbps");
    setNewClientDl(bandwidthProfiles[0]?.download || "20");
    setNewClientUl(bandwidthProfiles[0]?.upload || "10");
    setNewClientBurst("30M/30M");
    setNewClientPriority("8");
    setNewClientDevice("Router");
    setNewClientExpiry(
      new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    );
    setNewClientPhoto(null);
    setIsAddClientOpen(true);
  };

  const handleSaveNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) {
      showToast("Name and phone number are required.", "error");
      return;
    }

    const maxNum = clients.reduce((max, c) => {
      const match = c.id.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return num > max ? num : max;
    }, 0);
    const generatedId = `CL-${String(maxNum + 1).padStart(4, "0")}`;

    const clientToAdd: Client = {
      id: generatedId,
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      userId: newClientUserId.trim() || `user${maxNum + 1}`,
      password:
        newClientPassword.trim() ||
        `pass${Math.floor(100 + Math.random() * 900)}`,
      package: newClientPkg,
      price: newClientPrice.trim() || "500",
      bandwidth: newClientBw,
      downloadSpeed: newClientDl.trim() || "20",
      uploadSpeed: newClientUl.trim() || "10",
      status: "online",
      expiry: newClientExpiry,
      router: currentRouter.name, // Assigned to this selected router!
      photo: newClientPhoto,
      deviceType: newClientDevice,
      burstSpeed: newClientBurst,
      priority: newClientPriority,
    };

    onAddClient(clientToAdd);
    setIsAddClientOpen(false);
    showToast(
      `Client ${clientToAdd.name} added to MikroTik "${currentRouter.name}"!`,
      "success",
    );
  };

  const handleOpenEditClient = (c: Client) => {
    setEditClientData(c);
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditPassword(c.password || "");
    setEditPkg(c.package);
    setEditPrice(c.price || "500");
    setEditBw(c.bandwidth);
    setEditDl(c.downloadSpeed || "20");
    setEditUl(c.uploadSpeed || "10");
    setEditBurst(c.burstSpeed || "30M/30M");
    setEditPriority(c.priority || "8");
    setEditDevice(c.deviceType || "Router");
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
      price: editPrice.trim() || "500",
      bandwidth: editBw,
      downloadSpeed: editDl.trim() || "20",
      uploadSpeed: editUl.trim() || "10",
      burstSpeed: editBurst,
      priority: editPriority,
      deviceType: editDevice,
      expiry: editExpiry,
      router: editRouterName,
      photo: editPhoto,
    };

    onUpdateClient(updated);
    setEditClientData(null);
    showToast(
      `Client ${updated.name} profile updated successfully!`,
      "success",
    );
  };

  const handleDeleteClient = () => {
    if (!deleteClientData) return;
    onDeleteClient(deleteClientData.id);
    showToast(
      `Client ${deleteClientData.name} removed from router!`,
      "warning",
    );
    setDeleteClientData(null);
  };

  // Ping Tool Execution
  const handleRunPing = () => {
    setIsPinging(true);
    setPingLogs([
      `PING ${pingHost} from MikroTik ${currentRouter.ip} (56 data bytes)...`,
    ]);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      const ms = Math.floor(2 + Math.random() * 15);
      setPingLogs((prev) => [
        ...prev,
        `64 bytes from ${pingHost}: icmp_seq=${count} ttl=118 time=${ms}ms`,
      ]);
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
                Select any MikroTik router to view its interfaces, live traffic,
                and manage subscribers.
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
            const rClientCount = clients.filter((c) =>
              matchClientToRouter(c, router, routers),
            ).length;

            return (
              <div
                key={router.id}
                onClick={() => handleSelectRouter(router.id)}
                className={`relative p-3.5 rounded border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? "bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/40 shadow-md"
                    : "bg-white/50 border-slate-200 hover:bg-slate-100/60 "
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        router.connected
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-rose-500"
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
                      router.mode === "Hotspot"
                        ? "bg-amber-500/15 text-amber-600 "
                        : router.mode === "PPPoE"
                          ? "bg-indigo-500/15 text-indigo-600 "
                          : router.mode === "Core"
                            ? "bg-emerald-500/15 text-emerald-600 "
                            : "bg-sky-500/15 text-sky-600 "
                    }`}
                  >
                    {router.mode || "Hybrid"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60 text-slate-800">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-sky-500" />
                    <strong>{rClientCount}</strong> Clients
                  </span>
                  <span className="font-mono text-[10px] text-slate-800">
                    {router.model || "RouterBoard"}
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
                ? "bg-teal-500/15 text-teal-600 border border-teal-500/30"
                : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
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
                    ? "bg-teal-500/15 text-teal-600 border border-teal-500/30"
                    : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentRouter.connected
                      ? "bg-teal-500 animate-ping"
                      : "bg-rose-500"
                  }`}
                />
                {currentRouter.connected ? "Connected & Live" : "Disconnected"}
              </span>
              {!currentRouter.connected && currentRouter.errorReason && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Reason: {currentRouter.errorReason}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-900 ">
                {currentRouter.model || "MikroTik CCR"}
              </span>
            </div>
            <p className="text-xs text-slate-800 font-mono mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                IP:{" "}
                <strong>
                  {currentRouter.ip}:{currentRouter.apiPort}
                </strong>
              </span>
              <span>•</span>
              <span>
                User: <strong>{currentRouter.username}</strong>
              </span>
              {currentRouter.location && (
                <>
                  <span>•</span>
                  <span>
                    Location: <strong>{currentRouter.location}</strong>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => handleRefreshRouterLiveInfo()}
            disabled={isRefreshingStatus}
            className="px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Live MikroTik Hardware Metrics (CPU, RAM, Uptime)"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isRefreshingStatus ? "animate-spin" : ""}`} />
            {isRefreshingStatus ? "Checking Hardware..." : "Live Hardware Refresh"}
          </button>

          <button
            onClick={() => setIsConnectionGuideOpen(true)}
            className="px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="MikroTik Connection Assistant & Troubleshooting"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" /> Connect Guide
            & DDNS
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
                  ? "bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 border border-rose-500/30"
                  : "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
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

          <button
            onClick={() => setActiveTab("hotspot-login")}
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Download Hotspot login.html"
          >
            <Download className="w-3.5 h-3.5" /> Hotspot Login (login.html)
          </button>

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
              Local IP Network Notice (Private IP Subnet Detected)
            </h4>
            <p className="text-xs text-slate-900 leading-relaxed">
              Your router IP (
              <strong className="font-mono text-amber-700 ">
                {currentRouter.ip}
              </strong>
              ) is on a private subnet. Since this ISP panel is hosted on a
              Cloud container, the cloud server cannot reach your private local
              IP directly.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="font-bold text-slate-700 ">Solutions:</span>
              <span className="bg-white px-2.5 py-1 rounded-md shadow-2xs text-slate-900 border border-slate-200/60 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Set up a Public WAN IP with Port Forwarding (8728) on your
                router.
              </span>
              <span className="bg-white px-2.5 py-1 rounded-md shadow-2xs text-slate-900 border border-slate-200/60 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Or enable <strong>Router Simulator Mode</strong> for offline
                testing and preview.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. ROUTER LIVE HARDWARE METRICS */}
      {(() => {
        const cpuNum = parseInt(String(currentRouter.cpu || "12").replace(/[^\d]/g, ""), 10) || 12;
        const cpuPct = Math.min(100, Math.max(2, cpuNum));
        
        let ramPct = 25;
        const ramStr = String(currentRouter.ram || "");
        if (ramStr.includes("%")) {
          const match = ramStr.match(/(\d+)%/);
          if (match) ramPct = Math.min(100, Math.max(5, parseInt(match[1], 10)));
        } else if (ramStr.includes("/")) {
          const parts = ramStr.split("/");
          const used = parseInt(parts[0].replace(/[^\d]/g, ""), 10);
          const total = parseInt(parts[1].replace(/[^\d]/g, ""), 10);
          if (used && total) {
            ramPct = Math.min(100, Math.max(5, Math.round((used / total) * 100)));
          }
        }

        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 shadow-xs">
              <div className="flex justify-between items-center text-slate-800 mb-1">
                <span className="text-xs font-medium">Router CPU Load</span>
                <Cpu className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {currentRouter.cpu || "12%"}
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    cpuPct > 80 ? "bg-rose-500" : cpuPct > 50 ? "bg-amber-500" : "bg-sky-500"
                  }`}
                  style={{ width: `${cpuPct}%` }}
                />
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 shadow-xs">
              <div className="flex justify-between items-center text-slate-800 mb-1">
                <span className="text-xs font-medium">RAM Allocation</span>
                <HardDrive className="w-4 h-4 text-teal-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {currentRouter.ram || "128 / 512 MB"}
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    ramPct > 85 ? "bg-rose-500" : ramPct > 65 ? "bg-amber-500" : "bg-teal-500"
                  }`}
                  style={{ width: `${ramPct}%` }}
                />
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
                <span className="text-emerald-500 font-bold">
                  🟢 {onlineClientCount} Online
                </span>
                <span className="text-slate-800">
                  🔴 {offlineClientCount} Offline
                </span>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 shadow-xs">
              <div className="flex justify-between items-center text-slate-800 mb-1">
                <span className="text-xs font-medium">Router Uptime</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono truncate">
                {currentRouter.uptime || "14 days, 06:22:10"}
              </div>
              <p className="text-[10px] text-teal-600 font-semibold mt-1">
                {currentRouter.version || "RouterOS v7.12"}
              </p>
            </div>
          </div>
        );
      })()}

      {/* 4. DEDICATED LIVE NETWORK TRAFFIC VISUALIZER (Recharts) */}
      <LiveNetworkTraffic
        routerConfig={{
          ip: currentRouter.ip,
          port: String(
            currentRouter.apiPort || (currentRouter as any).port || 8728,
          ),
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
            {
              id: "clients",
              label: `Router Clients (${currentRouter.name})`,
              icon: Users,
              count: routerClients.length,
            },
            {
              id: "interfaces",
              label: "Interfaces & Traffic",
              icon: Wifi,
              count: interfaces.length,
            },
            {
              id: "ip",
              label: "IP Addresses",
              icon: Network,
              count: ipList.length,
            },
            {
              id: "dhcp",
              label: "DHCP Leases",
              icon: Server,
              count: dhcpLeases.length,
            },
            {
              id: "firewall",
              label: "Firewall & NAT",
              icon: Shield,
              count: firewallRules.length,
            },
            {
              id: "queues",
              label: "Simple Queues",
              icon: ListFilter,
              count: queues.length,
            },
            {
              id: "system",
              label: "System Diagnostics",
              icon: Power,
              count: null,
            },
            {
              id: "hotspot-login",
              label: "Hotspot Login Page (login.html)",
              icon: Download,
              count: "Template",
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-900 hover:bg-slate-200/60 "
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] rounded-md font-mono ${
                      isActive
                        ? "bg-white/20 text-slate-800"
                        : "bg-slate-200 text-slate-900 "
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
        {activeTab === "clients" && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Quick Assign / Link Alert if clients exist in system but 0 on this router */}
            {routerClients.length === 0 && clients.length > 0 && (
              <div className="bg-sky-500/10 border border-sky-500/30 rounded p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-sky-500" />
                    সিস্টেমে মোট {clients.length} টি গ্রাহক রয়েছে (এই রাউটারে কোনো গ্রাহক যুক্ত নেই)
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300">
                    আপনি ১-ক্লিকেই সিস্টেমে থাকা সকল বা আনঅ্যাসাইনড গ্রাহককে <strong>{currentRouter.name}</strong> রাউটারে যুক্ত করতে পারেন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clients.forEach((c) => {
                      onUpdateClient({ ...c, router: currentRouter.name });
                    });
                    showToast(`✅ সকল ${clients.length} গ্রাহক "${currentRouter.name}" রাউটারে সফলভাবে এসাইন করা হয়েছে!`, 'success');
                  }}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5" />
                  সব গ্রাহক এই রাউটারে যুক্ত করুন (Assign All)
                </button>
              </div>
            )}

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
                  <option value="all">
                    All Clients ({routerClients.length})
                  </option>
                  <option value="online">
                    🟢 Online ({onlineClientCount})
                  </option>
                  <option value="offline">
                    🔴 Offline ({offlineClientCount})
                  </option>
                  <option value="expiring">⚠️ Expiring Soon (≤ 3 Days)</option>
                  <option value="expired">🚨 Expired</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBulkSyncAllClients}
                  disabled={isBulkSyncing || routerClients.length === 0}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  title="Synchronize all clients to MikroTik (PPPoE Secrets & Hotspot Users)"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isBulkSyncing ? "animate-spin" : ""}`}
                  />
                  {isBulkSyncing
                    ? "Syncing All..."
                    : "সব ক্লায়েন্ট সিঙ্ক করুন (Bulk Sync)"}
                </button>

                <button
                  onClick={() => setIsTerminalScriptModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Router Terminal Code</span>
                </button>

                <button
                  onClick={handleOpenAddClient}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:brightness-110 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Client
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
                    <th className="py-3 px-3 text-right">
                      Actions (Edit & Delete)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 ">
                  {filteredRouterClients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-slate-800 text-xs"
                      >
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-sky-500" />
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          এই MikroTik রাউটারে ({currentRouter.name}) কোনো গ্রাহক পাওয়া যায়নি
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          (No subscribers currently assigned or matched to this router)
                        </p>
                        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                          {clients.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                clients.forEach((c) => {
                                  onUpdateClient({ ...c, router: currentRouter.name });
                                });
                                showToast(`✅ সকল ${clients.length} গ্রাহক "${currentRouter.name}" রাউটারে এসাইন করা হয়েছে!`, 'success');
                              }}
                              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              সকল {clients.length} গ্রাহক এই রাউটারে যুক্ত করুন
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleOpenAddClient}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            নতুন গ্রাহক যুক্ত করুন (Add Client)
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRouterClients.map((client, idx) => {
                      const expiryInfo = getClientExpiryInfo(client.expiry);
                      return (
                        <tr
                          key={client.id ? `${client.id}-${idx}` : idx}
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
                                  ID: {client.id} •{" "}
                                  {client.deviceType || "Router"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* User ID / Phone */}
                          <td className="py-2.5 px-3 font-mono">
                            <div className="text-slate-800 font-bold">
                              {client.userId}
                            </div>
                            <div className="text-[10px] text-slate-800">
                              {client.phone}
                            </div>
                          </td>

                          {/* Package & Bandwidth */}
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 ">
                              {client.package}
                            </div>
                            <div className="text-[10px] text-sky-600 font-mono">
                              ↓{client.downloadSpeed || client.bandwidth} / ↑
                              {client.uploadSpeed || "10"} Mbps
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                  client.status === "online"
                                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    client.status === "online"
                                      ? "bg-emerald-500"
                                      : "bg-rose-500"
                                  }`}
                                />
                                {client.status}
                              </span>

                              <button
                                onClick={() => onToggleClientStatus(client.id)}
                                className="p-1 rounded hover:bg-slate-200 text-slate-800 hover:text-slate-900 transition-colors cursor-pointer"
                                title={
                                  client.status === "online"
                                    ? "Disable Client"
                                    : "Enable Client"
                                }
                              >
                                {client.status === "online" ? (
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
                                {expiryInfo.isExpired
                                  ? "⚠️ Expired"
                                  : `⏰ ${expiryInfo.daysLeft} Days Left`}
                              </span>
                            )}
                          </td>

                          {/* Actions: Edit, Delete, SMS, View, QR */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Sync to MikroTik Button */}
                              <button
                                onClick={() => handleSyncSingleClient(client)}
                                disabled={syncingClientId === client.id}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                                title="Sync this client to MikroTik (PPPoE Secret & Hotspot User)"
                              >
                                <Zap
                                  className={`w-3.5 h-3.5 ${syncingClientId === client.id ? "animate-spin text-amber-500" : ""}`}
                                />
                              </button>

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
        {activeTab === "interfaces" && (
          <div className="p-4 sm:p-5 space-y-6">
            {/* Recharts-Powered Live Network Traffic Component with Tab Switcher */}
            <LiveNetworkTraffic
              routerConfig={{
                ip: currentRouter.ip,
                port: String(
                  currentRouter.apiPort || (currentRouter as any).port || 8728,
                ),
                user: currentRouter.username,
                password: currentRouter.password,
                connected: currentRouter.connected,
              }}
              onConnectRouter={() =>
                onToggleRouterConnection &&
                onToggleRouterConnection(currentRouter.id)
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
                      <td className="py-3 uppercase text-[10px] text-slate-800 font-semibold">
                        {i.type}
                      </td>
                      <td className="py-3 font-mono text-teal-600 font-bold">
                        ↓ {i.rx}
                      </td>
                      <td className="py-3 font-mono text-sky-600 font-bold">
                        ↑ {i.tx}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            i.status === "running"
                              ? "bg-teal-500/10 text-teal-600 "
                              : "bg-slate-200 text-slate-800"
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
                                  ? {
                                      ...item,
                                      status:
                                        item.status === "running"
                                          ? "disabled"
                                          : "running",
                                    }
                                  : item,
                              ),
                            );
                            showToast(
                              `Interface ${i.name} state updated`,
                              "info",
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            i.status === "running"
                              ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                              : "bg-teal-500/10 text-teal-600 hover:bg-teal-500/20"
                          }`}
                        >
                          {i.status === "running" ? "Disable" : "Enable"}
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
        {activeTab === "ip" && (
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
                      <td className="py-3 font-mono text-slate-800">
                        {ip.network}
                      </td>
                      <td className="py-3 font-mono text-sky-600 ">
                        {ip.interface}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setIpList((prev) =>
                              prev.filter((i) => i.address !== ip.address),
                            );
                            showToast(`IP ${ip.address} removed`, "warning");
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
        {activeTab === "dhcp" && (
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
                    <td className="py-3 font-mono font-bold text-slate-900 ">
                      {d.ip}
                    </td>
                    <td className="py-3 font-mono text-slate-800">{d.mac}</td>
                    <td className="py-3 font-semibold text-slate-800 ">
                      {d.host}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 ">
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-800">
                      {d.expires}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: FIREWALL */}
        {activeTab === "firewall" && (
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
                      <td className="py-3 font-mono font-bold text-purple-600 ">
                        {rule.chain}
                      </td>
                      <td className="py-3 uppercase font-bold text-xs">
                        {rule.action}
                      </td>
                      <td className="py-3 font-mono text-slate-800">
                        {rule.src}
                      </td>
                      <td className="py-3 text-slate-700 ">{rule.comment}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setFirewallRules((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                            showToast("Firewall rule deleted", "warning");
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
        {activeTab === "queues" && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-700 ">
                MikroTik Simple Queues (Bandwidth Shaping)
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
                      <td className="py-3 font-bold text-slate-900 font-mono">
                        {q.name}
                      </td>
                      <td className="py-3 font-mono text-slate-800">
                        {q.target}
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-600 ">
                        {q.limit}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setQueues((prev) =>
                              prev.filter((item) => item.name !== q.name),
                            );
                            showToast(`Queue ${q.name} deleted`, "warning");
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
        {activeTab === "system" && (
          <div className="p-4 sm:p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ping Test */}
              <div className="p-4 rounded bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-sky-500" /> RouterOS Ping
                  Utility
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
                    <RefreshCw
                      className={`w-3 h-3 ${isPinging ? "animate-spin" : ""}`}
                    />
                    {isPinging ? "Pinging..." : "Send Ping"}
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
                  <SettingsIcon className="w-4 h-4 text-amber-500" /> Router
                  Operations
                </h4>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const backupName = `MikroTik_${currentRouter.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.backup`;
                      const element = document.createElement("a");
                      const file = new Blob(["# MikroTik RouterOS Backup\n"], {
                        type: "text/plain",
                      });
                      element.href = URL.createObjectURL(file);
                      element.download = backupName;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                      showToast(
                        `Backup exported for ${currentRouter.name}`,
                        "success",
                      );
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold flex items-center justify-between text-slate-800 cursor-pointer"
                  >
                    <span>Download Binary Backup (.backup)</span>
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to reboot ${currentRouter.name}?`,
                        )
                      ) {
                        showToast(
                          `Reboot signal sent to ${currentRouter.name}`,
                          "warning",
                        );
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

        {activeTab === "hotspot-login" && (
          <div className="p-4 sm:p-6">
            <HotspotLoginTemplate
              settings={settings}
              packages={packages}
              showToast={showToast}
            />
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
        title="Add New MikroTik Router"
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
              <p className="font-bold">
                Are you sure you want to remove this router?
              </p>
              <p className="mt-1 text-[11px]">
                Router:{" "}
                <strong>
                  {currentRouter.name} ({currentRouter.ip})
                </strong>
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
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-[#3c8dbc]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Phone Number *
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
                Package (Package)
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
                Monthly Price (৳)
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
                Expiry Date (Expiry Date)
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
                Price (৳)
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
                Are you sure you want to delete client "{deleteClientData?.name}
                "?
              </p>
              <p className="mt-1 text-[11px] text-slate-900 ">
                User ID: <strong>{deleteClientData?.userId}</strong> • Phone:{" "}
                <strong>{deleteClientData?.phone}</strong>
                <br />
                Router:{" "}
                <strong>
                  {deleteClientData?.router || currentRouter.name}
                </strong>
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
                  {viewClientData.password || "N/A"}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 ">
                <span className="text-slate-800">Package:</span>
                <p className="font-bold text-slate-800 ">
                  {viewClientData.package} (৳{viewClientData.price || "500"})
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 ">
                <span className="text-slate-800">Bandwidth:</span>
                <p className="font-bold text-sky-600 font-mono">
                  ↓{viewClientData.downloadSpeed || viewClientData.bandwidth} /
                  ↑{viewClientData.uploadSpeed || "10"} Mbps
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
                  qrClientData.userId,
                )}&password=${encodeURIComponent(qrClientData.password || "")}`}
                size={180}
              />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 ">{qrClientData.name}</h4>
              <p className="text-xs font-mono text-slate-800">
                ID: {qrClientData.userId}
              </p>
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
              <span>
                ⚠️ Why private local IPs (like 192.168.88.1) cannot connect
                directly across the public cloud
              </span>
            </h4>
            <p className="text-amber-800 leading-relaxed">
              This ISP billing app is hosted on a secure cloud server. Your
              local router IP <strong>192.168.88.1</strong> or{" "}
              <strong>10.x.x.x</strong> is a private local address inaccessible
              directly from public cloud networks.
            </p>
          </div>

          {/* Solution 1: Free MikroTik Cloud DDNS */}
          <div className="p-4 rounded bg-sky-500/10 border border-sky-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h5 className="font-bold text-slate-900 text-sm">
                Method 1: MikroTik Cloud DDNS (Free & Easy)
              </h5>
            </div>
            <p className="text-xs text-slate-900 ">
              Open <strong>Terminal</strong> in WinBox, copy-paste the 4 command
              lines below, and press Enter:
            </p>
            <div className="bg-white text-[#00a65a] p-3 rounded-lg font-mono text-[11px] select-all border border-slate-200">
              /ip service enable api
              <br />
              /ip service set api port=8728
              <br />
              /ip cloud set ddns-enabled=yes update-time=yes
              <br />
              /ip cloud print
            </div>
            <p className="text-[11px] text-slate-800">
              The Terminal will return a <strong>dns-name</strong> (e.g.{" "}
              <code className="text-sky-600 font-bold">
                6c3b01xxxxxx.sn.mynetname.net
              </code>
              ). Copy and paste this domain into the router IP field in this
              app!
            </p>
          </div>

          {/* Solution 2: Public Real IP */}
          <div className="p-4 rounded bg-indigo-500/10 border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h5 className="font-bold text-slate-900 text-sm">
                Method 2: Use Real Public IP
              </h5>
            </div>
            <p className="text-xs text-slate-900 ">
              Enter the public WAN IP assigned by your upstream ISP and ensure{" "}
              <code>IP -&gt; Services -&gt; api</code> (Port 8728) is enabled in
              WinBox.
            </p>
          </div>

          {/* Solution 3: Staging Mode */}
          <div className="p-4 rounded bg-teal-500/10 border border-teal-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h5 className="font-bold text-slate-900 text-sm">
                Method 3: Offline Staging / Simulation Mode
              </h5>
            </div>
            <p className="text-xs text-slate-900 ">
              If you do not have a public IP yet, you can test client
              management, billing invoices, hotspot vouchers, and traffic graphs
              in Demo/Staging Mode.
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
                showToast(
                  `Router "${currentRouter.name}" connected in Offline Staging Mode!`,
                  "success",
                );
              }}
              className="px-3 py-2 rounded bg-teal-600/15 hover:bg-teal-600/25 border border-teal-500/40 text-teal-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-teal-500" /> Connect in Staging
              Mode (Force Connect)
            </button>

            <button
              onClick={() => setIsConnectionGuideOpen(false)}
              className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Got It
            </button>
          </div>
        </div>
      </Modal>

      {/* Terminal Setup Script Modal */}
      {isTerminalScriptModalOpen && (
        <Modal
          isOpen={isTerminalScriptModalOpen}
          onClose={() => setIsTerminalScriptModalOpen(false)}
          title="MikroTik RouterOS 1-Click Terminal Setup Script"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 p-2 text-xs">
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 text-sky-900">
              <p className="font-semibold">
                💡 এই স্ক্রিপ্টটি কপি করে আপনার মাইক্রোটিক রাউটারের{" "}
                <strong>New Terminal</strong> এ পেস্ট করুন। এর মাধ্যমে API পোর্ট
                ৮৭২৮ সক্রিয় হবে, ক্লাউড ডিডিএনএস অন হবে এবং পিপিপিওই (PPPoE) ও
                হটস্পট ইউজাররা স্বয়ংক্রিয়ভাবে কানেক্ট হতে পারবে।
              </p>
            </div>

            <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-x-auto relative">
              <pre className="whitespace-pre">{`# =========================================
# FIBER EXPRESS ISP - MIKROTIK AUTO SETUP
# =========================================

# 1. Enable RouterOS API Service (Port 8728 & 8729)
/ip service enable api
/ip service set api port=8728
/ip service enable api-ssl
/ip service set api-ssl port=8729

# 2. Enable MikroTik Free Cloud DDNS (For Remote Access)
/ip cloud set ddns-enabled=yes

# 3. Setup Default PPPoE Profile
/ppp profile add name="default-feisp" only-one=yes

# 4. Enable Hotspot Authentication Methods
/ip hotspot profile set [find default=yes] login-by=http-chap,http-pap,mac-cookie cookie-lifetime=30d

# 5. Allow API Port Through Firewall
/ip firewall filter add chain=input protocol=tcp dst-port=8728,8729 action=accept comment="Allow Fiber Express ISP API" place-before=1
`}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const script = `# FIBER EXPRESS ISP - MIKROTIK AUTO SETUP
/ip service enable api
/ip service set api port=8728
/ip service enable api-ssl
/ip service set api-ssl port=8729
/ip cloud set ddns-enabled=yes
/ppp profile add name="default-feisp" only-one=yes
/ip hotspot profile set [find default=yes] login-by=http-chap,http-pap,mac-cookie cookie-lifetime=30d
/ip firewall filter add chain=input protocol=tcp dst-port=8728,8729 action=accept comment="Allow Fiber Express ISP API" place-before=1`;
                  navigator.clipboard.writeText(script);
                  showToast("Terminal script copied to clipboard!", "success");
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Copy Terminal Script
              </button>
              <button
                onClick={() => setIsTerminalScriptModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Sync Result Modal */}
      {bulkSyncResult && (
        <Modal
          isOpen={!!bulkSyncResult}
          onClose={() => setBulkSyncResult(null)}
          title="MikroTik Bulk Sync Results"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 p-2 text-xs">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-semibold">
              {bulkSyncResult.message}
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-emerald-600">
                ✅ Synced: {bulkSyncResult.syncedCount || 0}
              </span>
              <span className="text-rose-600">
                ❌ Failed: {bulkSyncResult.failedCount || 0}
              </span>
              <span className="text-slate-600">
                Total: {bulkSyncResult.total || 0}
              </span>
            </div>

            {Array.isArray(bulkSyncResult.details) && (
              <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 rounded p-2 bg-slate-50">
                {bulkSyncResult.details.map((d: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] p-1.5 bg-white rounded border border-slate-100"
                  >
                    <span className="font-mono font-bold text-slate-800">
                      {d.userId} ({d.name})
                    </span>
                    <span
                      className={
                        d.success
                          ? "text-emerald-600 font-bold"
                          : "text-rose-600 font-bold"
                      }
                    >
                      {d.success ? "Synced" : d.error || "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setBulkSyncResult(null)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
