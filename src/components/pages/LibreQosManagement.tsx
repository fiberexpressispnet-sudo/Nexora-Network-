import React, { useState, useEffect, useMemo } from "react";
import {
  Server,
  Activity,
  Zap,
  Gauge,
  Network,
  Cpu,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  SlidersHorizontal,
  HardDrive,
  ShieldCheck,
  TrendingUp,
  Layers,
  FileCode,
  Terminal,
  Play,
  Check,
  Copy,
  Plus,
  Trash2,
  Edit2,
  Search,
  ExternalLink,
  Wifi,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import {
  Client,
  MikrotikRouter,
  Package,
  BandwidthProfile,
  AppSettings,
  LibreQosNode,
  LibreQosCircuit,
  WanUplink,
  LibreQosConfig,
} from "../../types";
import { getAdminHeaders } from "../../lib/apiClient";
import { Modal } from "../Modal";

interface LibreQosManagementProps {
  routers: MikrotikRouter[];
  clients: Client[];
  packages: Package[];
  bandwidthProfiles?: BandwidthProfile[];
  settings?: AppSettings;
  showToast: (msg: string, type?: "info" | "success" | "error" | "warning") => void;
}

export const LibreQosManagement: React.FC<LibreQosManagementProps> = ({
  routers = [],
  clients = [],
  packages = [],
  bandwidthProfiles = [],
  settings,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "scanner" | "rates" | "nodes" | "wan" | "updatecsv" | "fastpath" | "settings"
  >("overview");

  // Config State
  const [config, setConfig] = useState<LibreQosConfig>({
    enabled: true,
    serverHost: "192.168.88.250",
    serverPort: 9123,
    apiToken: "lq_live_token_sec_2026",
    syncMethod: "REST",
    shapedDevicesPath: "/etc/libreqos/ShapedDevices.csv",
    networkJsonPath: "/etc/libreqos/network.json",
    autoSyncIntervalMinutes: 5,
    lastSyncTime: null,
    defaultCakeProfile: "diffserv4",
    overheadType: "pppoe",
    overheadBytes: 8,
    washDscp: false,
    ackFilter: true,
    rttTargetMs: 12,
    autoThrottleBufferbloat: true,
    autoOffloadMikrotikQueues: true,
  });

  // Nodes & WANs
  const [nodes, setNodes] = useState<LibreQosNode[]>([]);
  const [wanUplinks, setWanUplinks] = useState<WanUplink[]>([]);
  const [circuits, setCircuits] = useState<LibreQosCircuit[]>([]);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  // Generated Files State
  const [generatedCsv, setGeneratedCsv] = useState<string>("");
  const [generatedNetworkJson, setGeneratedNetworkJson] = useState<string>("");
  const [generatedCpctJson, setGeneratedCpctJson] = useState<string>("");
  const [generatedMikrotikScript, setGeneratedMikrotikScript] = useState<string>("");
  const [selectedFilePreview, setSelectedFilePreview] = useState<"csv" | "network" | "cpct" | "script">("csv");

  // Scanner State
  const [selectedRouterId, setSelectedRouterId] = useState<string>(routers[0]?.id || "mk-01");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Live Telemetry HUD
  const [telemetry, setTelemetry] = useState({
    bufferbloatGrade: "A+",
    qoeStarRating: 4.9,
    avgRttMs: 7.4,
    jitterMs: 0.6,
    packetLossPercent: 0.001,
    tcpRetransmitRate: 0.03,
    totalThroughputDownMbps: 1560.8,
    totalThroughputUpMbps: 512.4,
    totalCapacityDownMbps: 3000,
    totalCapacityUpMbps: 3000,
    activeCircuits: clients.filter((c) => c.status === "online").length || 142,
    cakeDropsPerSecond: 3,
    cakeMarksPerSecond: 18,
  });

  // Modals
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<LibreQosNode | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApplyingFastpath, setIsApplyingFastpath] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Fetch initial data
  const fetchData = async () => {
    try {
      const headers = getAdminHeaders();
      const [cfgRes, nodeRes, wanRes, histRes, liveRes] = await Promise.all([
        fetch("/api/libreqos/config", { headers }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/libreqos/nodes", { headers }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/libreqos/wan-uplinks", { headers }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/libreqos/sync-history", { headers }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/libreqos/live-qoe", { headers }).then((r) => r.json()).catch(() => ({})),
      ]);

      if (cfgRes.config) setConfig(cfgRes.config);
      if (nodeRes.nodes) setNodes(nodeRes.nodes);
      if (wanRes.uplinks) setWanUplinks(wanRes.uplinks);
      if (histRes.history) setSyncHistory(histRes.history);
      if (liveRes.metrics) setTelemetry(liveRes.metrics);

      // Compute circuits
      refreshCircuits(cfgRes.config || config, nodeRes.nodes || nodes);
    } catch (err) {
      console.error("Failed to load LibreQoS data:", err);
    }
  };

  const refreshCircuits = async (curConfig: LibreQosConfig, curNodes: LibreQosNode[]) => {
    try {
      const headers = getAdminHeaders();
      const res = await fetch("/api/libreqos/resolve-circuits", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ clients, packages, nodes: curNodes, config: curConfig }),
      }).then((r) => r.json());

      if (res.circuits) setCircuits(res.circuits);

      // Also refresh generated files
      const fileRes = await fetch("/api/libreqos/generate-files", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ clients, packages, nodes: curNodes, config: curConfig }),
      }).then((r) => r.json());

      if (fileRes.success) {
        setGeneratedCsv(fileRes.csv);
        setGeneratedNetworkJson(fileRes.networkJson);
        setGeneratedCpctJson(fileRes.cpctJson);
        setGeneratedMikrotikScript(fileRes.mikrotikScript);
      }
    } catch (err) {
      console.error("Circuit refresh error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      fetch("/api/libreqos/live-qoe", { headers: getAdminHeaders() })
        .then((r) => r.json())
        .then((data) => {
          if (data.metrics) setTelemetry(data.metrics);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Scan MikroTik Router
  const handleScanRouter = async () => {
    setIsScanning(true);
    try {
      const activeRouter = routers.find((r) => r.id === selectedRouterId) || routers[0];
      const res = await fetch("/api/libreqos/scan-router", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          routerId: activeRouter?.id,
          routerIp: activeRouter?.ip,
          routerUser: activeRouter?.username,
          routerPort: activeRouter?.apiPort,
        }),
      }).then((r) => r.json());

      if (res.success) {
        setScanResult(res);
        showToast(`Scan complete: Discovered ${res.interfaces.length} interfaces, ${res.activePppoeCount} sessions`, "success");
      } else {
        showToast(`Scan warning: ${res.error || "Using simulated telemetry"}`, "warning");
      }
    } catch (err: any) {
      showToast(`Scan error: ${err.message}`, "error");
    } finally {
      setIsScanning(false);
    }
  };

  // Push / Sync to LibreQoS
  const handleSyncPush = async (dryRun: boolean = false) => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/libreqos/sync-push", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, triggeredBy: "Web Admin Console" }),
      }).then((r) => r.json());

      if (res.success) {
        showToast(
          dryRun
            ? `Dry Run Passed: Verified ${res.circuitsCount} circuits across ${res.nodesCount} nodes.`
            : `LibreQoS Sync Successful: ${res.circuitsCount} circuits deployed via eBPF/XDP.`,
          "success"
        );
        fetchData();
      } else {
        showToast(`Sync failed: ${res.error}`, "error");
      }
    } catch (err: any) {
      showToast(`Sync error: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Apply FastPath to MikroTik
  const handleApplyFastpath = async () => {
    setIsApplyingFastpath(true);
    try {
      const activeRouter = routers.find((r) => r.id === selectedRouterId) || routers[0];
      const res = await fetch("/api/libreqos/apply-mikrotik-fastpath", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          routerIp: activeRouter?.ip,
          routerUser: activeRouter?.username,
          routerPort: activeRouter?.apiPort,
        }),
      }).then((r) => r.json());

      if (res.success) {
        showToast("MikroTik FastPath & Queue Offload applied successfully!", "success");
      } else {
        showToast(`FastPath error: ${res.error}`, "error");
      }
    } catch (err: any) {
      showToast(`Execution error: ${err.message}`, "error");
    } finally {
      setIsApplyingFastpath(false);
    }
  };

  // Save Settings
  const handleSaveConfig = async (newConfig: LibreQosConfig) => {
    try {
      const res = await fetch("/api/libreqos/config", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      }).then((r) => r.json());

      if (res.success) {
        setConfig(res.config);
        showToast("LibreQoS settings saved successfully", "success");
        refreshCircuits(res.config, nodes);
      }
    } catch (err: any) {
      showToast(`Save error: ${err.message}`, "error");
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast("Copied to clipboard", "info");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Download File helper
  const handleDownload = (content: string, filename: string, type: string = "text/plain") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, "success");
  };

  // Filtered Circuits
  const filteredCircuits = useMemo(() => {
    if (!searchFilter.trim()) return circuits;
    const q = searchFilter.toLowerCase();
    return circuits.filter(
      (c) =>
        c.clientName.toLowerCase().includes(q) ||
        c.circuitId.toLowerCase().includes(q) ||
        c.ipAddress.includes(q) ||
        c.packageName.toLowerCase().includes(q) ||
        c.nodeId.toLowerCase().includes(q)
    );
  }, [circuits, searchFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Zap className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  LibreQoS &amp; MikroTik Traffic Engine
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  FQ-CoDel CAKE Active
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                  v1.5 Enterprise
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Autonomous Bufferbloat mitigation, eBPF/XDP kernel traffic shaping, multi-tier node tree hierarchy, and 10Gbps+ RouterOS FastPath queue offloading.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleSyncPush(true)}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>Dry Run Test</span>
            </button>
            <button
              onClick={() => handleSyncPush(false)}
              disabled={isSyncing}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Deploying eBPF Maps..." : "Push to LibreQoS"}</span>
            </button>
          </div>
        </div>

        {/* Real-Time QoE & Bufferbloat HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-indigo-900/60">
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Bufferbloat Grade
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1 flex items-baseline gap-1.5">
              <span>{telemetry.bufferbloatGrade}</span>
              <span className="text-xs font-normal text-slate-400">Score</span>
            </div>
            <div className="text-[10px] text-emerald-300/80 font-mono mt-0.5">Ultra Low Latency</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              Average Latency (RTT)
            </div>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              {telemetry.avgRttMs} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Jitter: ±{telemetry.jitterMs}ms</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              QoE Experience Index
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1 flex items-baseline gap-1">
              <span>{telemetry.qoeStarRating}</span>
              <span className="text-xs font-normal text-slate-400">/ 5.0</span>
            </div>
            <div className="text-[10px] text-amber-300/80 font-mono mt-0.5">99.98% Excellent</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Network className="w-3.5 h-3.5 text-blue-400" />
              Shaped Circuits
            </div>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              {circuits.length || telemetry.activeCircuits}
            </div>
            <div className="text-[10px] text-blue-300/80 font-mono mt-0.5">{nodes.length} Network Nodes</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Live Throughput (Down)
            </div>
            <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
              {telemetry.totalThroughputDownMbps} <span className="text-xs font-normal text-slate-400">Mbps</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Peak: 2,450 Mbps</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              TCP Retransmissions
            </div>
            <div className="text-2xl font-black text-purple-300 mt-1 font-mono">
              {telemetry.tcpRetransmitRate}%
            </div>
            <div className="text-[10px] text-purple-300/80 font-mono mt-0.5">Cake Marks: {telemetry.cakeMarksPerSecond}/s</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-700/80 bg-slate-900/50 p-1 rounded-xl gap-1 overflow-x-auto">
        {[
          { id: "overview", label: "Circuits & Live QoE", icon: Activity },
          { id: "scanner", label: "Router Scanner", icon: Server },
          { id: "rates", label: "Rate Resolver & Profiles", icon: SlidersHorizontal },
          { id: "nodes", label: "Node Assigner & Hierarchy", icon: Layers },
          { id: "wan", label: "WAN & Bufferbloat", icon: Gauge },
          { id: "updatecsv", label: "UpdateCSV & Sync Engine", icon: FileCode },
          { id: "fastpath", label: "MikroTik FastPath Offload", icon: Cpu },
          { id: "settings", label: "Server Settings", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & CIRCUITS */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search circuits by client, IP, package, node ID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Showing {filteredCircuits.length} of {circuits.length} Circuits
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(generatedCsv, "ShapedDevices.csv", "text/csv")}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export ShapedDevices.csv</span>
              </button>
              <button
                onClick={() => refreshCircuits(config, nodes)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
                title="Refresh Rates"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Circuits Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3 pl-4">Circuit ID &amp; Client</th>
                    <th className="p-3">Target IP Address</th>
                    <th className="p-3">Download / Upload (MIR)</th>
                    <th className="p-3">Committed (CIR)</th>
                    <th className="p-3">Assigned Node</th>
                    <th className="p-3">CAKE Profile &amp; CoS</th>
                    <th className="p-3">Live RTT</th>
                    <th className="p-3">QoE Score</th>
                    <th className="p-3 pr-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredCircuits.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 font-mono">
                        No circuits found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCircuits.map((c) => (
                      <tr key={c.circuitId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{c.clientName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{c.circuitId}</div>
                        </td>
                        <td className="p-3 font-mono text-indigo-300 font-semibold">
                          {c.ipAddress}
                          {c.macAddress && <div className="text-[10px] text-slate-500">{c.macAddress}</div>}
                        </td>
                        <td className="p-3 font-mono">
                          <div className="text-emerald-400 font-bold">↓ {Math.round(c.downloadKbps / 1000)} Mbps</div>
                          <div className="text-cyan-400 text-[11px]">↑ {Math.round(c.uploadKbps / 1000)} Mbps</div>
                        </td>
                        <td className="p-3 font-mono text-slate-400 text-[11px]">
                          <div>↓ {Math.round((c.cirDownKbps || 0) / 1000)}M</div>
                          <div>↑ {Math.round((c.cirUpKbps || 0) / 1000)}M</div>
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-700">
                            {c.nodeId}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-slate-300 text-[11px] font-semibold">{c.cakeProfile}</div>
                          <div className="text-[10px] text-indigo-400 mt-0.5">{c.cosClass}</div>
                        </td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">
                          {c.currentRttMs} ms
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-amber-400 font-mono">{c.qoeScore}</span>
                            <span className="text-[10px] text-amber-400">★</span>
                          </div>
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              c.status === "Active"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROUTER SCANNER */}
      {activeTab === "scanner" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-400" />
                  Live MikroTik Topology &amp; Session Scanner
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Connects to RouterOS API / REST to discover network interfaces, active PPPoE sessions, IP pools, and queue trees.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedRouterId}
                  onChange={(e) => setSelectedRouterId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {routers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.ip})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleScanRouter}
                  disabled={isScanning}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
                  <span>{isScanning ? "Scanning Router..." : "Scan MikroTik Router"}</span>
                </button>
              </div>
            </div>

            {scanResult && (
              <div className="mt-6 pt-6 border-t border-slate-800 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg">
                    <div className="text-xs text-slate-400">Target Router Host</div>
                    <div className="text-base font-bold text-white font-mono mt-1">{scanResult.router}</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Online &amp; Responsive</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg">
                    <div className="text-xs text-slate-400">Discovered Interfaces</div>
                    <div className="text-xl font-black text-indigo-400 font-mono mt-1">{scanResult.interfaces?.length || 0}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">SFP+, Ether &amp; Bridges</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg">
                    <div className="text-xs text-slate-400">Active PPPoE Sessions</div>
                    <div className="text-xl font-black text-emerald-400 font-mono mt-1">{scanResult.activePppoeCount}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Ready for FQ-CoDel</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg">
                    <div className="text-xs text-slate-400">Discovered IP Pools</div>
                    <div className="text-xl font-black text-cyan-400 font-mono mt-1">{scanResult.pools?.length || 0}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Subnets mapped to nodes</div>
                  </div>
                </div>

                {/* Interfaces Table */}
                <div>
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Network className="w-4 h-4 text-indigo-400" />
                    Discovered Router Interfaces &amp; Trunk Links
                  </h3>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-mono">
                          <th className="p-3 pl-4">Interface Name</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Link Status</th>
                          <th className="p-3">MTU</th>
                          <th className="p-3 pr-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {scanResult.interfaces.map((intf: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="p-3 pl-4 font-bold text-white flex items-center gap-2">
                              <Radio className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{intf.name}</span>
                            </td>
                            <td className="p-3 text-slate-300">{intf.type}</td>
                            <td className="p-3">
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {intf.running === "true" || intf.running === true ? "Running (Up)" : "Link Down"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400">{intf.mtu || "1500"}</td>
                            <td className="p-3 pr-4 text-right">
                              <button
                                onClick={() => {
                                  const newNode: LibreQosNode = {
                                    id: `node-${intf.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                                    name: `Link ${intf.name}`,
                                    type: intf.name.includes("WAN") ? "Core" : intf.name.includes("PON") ? "OLT_PON" : "Tower",
                                    parentId: "node-core-01",
                                    capacityDownMbps: 1000,
                                    capacityUpMbps: 1000,
                                    interfaceName: intf.name,
                                    routerId: selectedRouterId,
                                  };
                                  setNodes((prev) => [...prev, newNode]);
                                  showToast(`Created LibreQoS Node for ${intf.name}`, "success");
                                }}
                                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold font-sans cursor-pointer"
                              >
                                + Create Node
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RATE RESOLVER & PROFILES */}
      {activeTab === "rates" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settings Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                CAKE &amp; Overhead Configuration
              </h2>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Default CAKE Diffserv Profile
                  </label>
                  <select
                    value={config.defaultCakeProfile}
                    onChange={(e) => handleSaveConfig({ ...config, defaultCakeProfile: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="diffserv4">diffserv4 (Default: Bulk, BestEffort, Video, Voice)</option>
                    <option value="diffserv8">diffserv8 (8 Priority Classes)</option>
                    <option value="besteffort">besteffort (Single FQ-CoDel Flow Bucket)</option>
                    <option value="gaming_priority">gaming_priority (Ultra-Low Jitter UDP First)</option>
                    <option value="video_priority">video_priority (Smooth 4K Streaming Optimization)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Framing Overhead Compensation
                  </label>
                  <select
                    value={config.overheadType}
                    onChange={(e) => {
                      const ot = e.target.value as any;
                      const ob = ot === "pppoe" ? 8 : ot === "ethernet_vlan" ? 18 : ot === "docsis" ? 26 : 14;
                      handleSaveConfig({ ...config, overheadType: ot, overheadBytes: ob });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="pppoe">PPPoE (8 Bytes Header)</option>
                    <option value="ethernet_vlan">Ethernet + 802.1Q VLAN (18 Bytes)</option>
                    <option value="raw_ethernet">Raw Ethernet (14 Bytes)</option>
                    <option value="docsis">DOCSIS / Cable Framing (26 Bytes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Overhead Bytes Added Per Packet: <span className="text-indigo-400 font-mono font-bold">{config.overheadBytes} B</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="64"
                    value={config.overheadBytes}
                    onChange={(e) => handleSaveConfig({ ...config, overheadBytes: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.ackFilter}
                      onChange={(e) => handleSaveConfig({ ...config, ackFilter: e.target.checked })}
                      className="rounded accent-indigo-600"
                    />
                    <span className="text-slate-300 font-semibold">Enable ACK-Filter (Reduces Upload Saturation)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.washDscp}
                      onChange={(e) => handleSaveConfig({ ...config, washDscp: e.target.checked })}
                      className="rounded accent-indigo-600"
                    />
                    <span className="text-slate-300 font-semibold">Wash DSCP (Sanitize Untrusted Client ToS Bits)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Resolved Package Matrix */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-400" />
                    ISP Packages &amp; Rate Conversion Matrix
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Calculated download/upload rates, CIR floor guarantees, and priority buckets applied to LibreQoS.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-mono">
                      <th className="p-3 pl-4">Package Name</th>
                      <th className="p-3">Max Rate (MIR)</th>
                      <th className="p-3">Committed Rate (CIR)</th>
                      <th className="p-3">CAKE Diffserv Profile</th>
                      <th className="p-3 pr-4 text-right">Subscribers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {packages.map((pkg) => {
                      const count = clients.filter((c) => c.package === pkg.name).length;
                      return (
                        <tr key={pkg.id} className="hover:bg-slate-900/40">
                          <td className="p-3 pl-4 font-bold text-white">{pkg.name}</td>
                          <td className="p-3 font-mono text-emerald-400 font-bold">
                            ↓ {pkg.speed} / ↑ {pkg.upload || "10M"}
                          </td>
                          <td className="p-3 font-mono text-slate-400 text-[11px]">
                            ↓ 75% Guaranteed CIR
                          </td>
                          <td className="p-3 font-mono text-indigo-300">
                            {config.defaultCakeProfile} (Overhead: {config.overheadBytes}B)
                          </td>
                          <td className="p-3 pr-4 text-right font-mono text-white font-bold">
                            {count} Clients
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NODE ASSIGNER & TOPOLOGY HIERARCHY */}
      {activeTab === "nodes" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Network Node Hierarchy (network.json / CPCT Tree)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hierarchical parent-child traffic aggregation for Core Routers, Towers, AP Sectors, and OLT PON ports.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingNode({
                  id: `node-${Date.now().toString(36)}`,
                  name: "New Sector AP",
                  type: "Sector_AP",
                  parentId: nodes[0]?.id || "node-core-01",
                  capacityDownMbps: 500,
                  capacityUpMbps: 500,
                  location: "",
                  ipSubnet: "",
                });
                setIsNodeModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Node</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {nodes.map((node) => {
              const nodeCircuits = circuits.filter((c) => c.nodeId === node.id);
              const totalBandwidthDown = nodeCircuits.reduce((sum, c) => sum + c.downloadKbps, 0) / 1000;
              const oversubRatio = node.capacityDownMbps > 0 ? (totalBandwidthDown / node.capacityDownMbps).toFixed(1) : "1.0";

              return (
                <div key={node.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-lg hover:border-indigo-500/50 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                        {node.type}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-2 truncate">{node.name}</h3>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{node.id}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingNode(node);
                          setIsNodeModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-800 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500">Parent Node:</span>
                      <span className="font-bold text-slate-300">{node.parentId || "Root / Core"}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500">Max Capacity:</span>
                      <span className="font-bold text-emerald-400">{node.capacityDownMbps} Mbps</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500">Active Circuits:</span>
                      <span className="font-bold text-white">{nodeCircuits.length} Devices</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500">Oversubscription:</span>
                      <span className="font-bold text-amber-400">{oversubRatio}x</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: WAN & BUFFERBLOAT */}
      {activeTab === "wan" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-indigo-400" />
                  WAN Uplink Interfaces &amp; SQM Dynamic Throttling
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Monitors ISP Gateway RTT latency and automatically throttles WAN limits during peak congestion to prevent queue bloat.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wanUplinks.map((wan) => (
                <div key={wan.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{wan.name}</h3>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{wan.interfaceName}</div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      {wan.bufferbloatScore} Bufferbloat
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
                    <div>
                      <div className="text-slate-500 text-[10px]">Ping Latency</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">{wan.currentRttMs} ms</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">Capacity</div>
                      <div className="text-sm font-bold text-white mt-0.5">{wan.capacityDownMbps} Mbps</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">Current Load</div>
                      <div className="text-sm font-bold text-cyan-400 mt-0.5">{wan.currentDownMbps} Mbps</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: UPDATECSV & SYNC ENGINE */}
      {activeTab === "updatecsv" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-indigo-400" />
                  LibreQoS Export &amp; Code Generators
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect generated files formatted specifically for LibreQoS v1.4 / v1.5.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const content =
                      selectedFilePreview === "csv"
                        ? generatedCsv
                        : selectedFilePreview === "network"
                        ? generatedNetworkJson
                        : selectedFilePreview === "cpct"
                        ? generatedCpctJson
                        : generatedMikrotikScript;
                    const filename =
                      selectedFilePreview === "csv"
                        ? "ShapedDevices.csv"
                        : selectedFilePreview === "network"
                        ? "network.json"
                        : selectedFilePreview === "cpct"
                        ? "cpct.json"
                        : "mikrotik_fastpath.rsc";
                    handleDownload(content, filename);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download Active File</span>
                </button>
                <button
                  onClick={() => {
                    const content =
                      selectedFilePreview === "csv"
                        ? generatedCsv
                        : selectedFilePreview === "network"
                        ? generatedNetworkJson
                        : selectedFilePreview === "cpct"
                        ? generatedCpctJson
                        : generatedMikrotikScript;
                    handleCopy(content, selectedFilePreview);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {copiedKey === selectedFilePreview ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === selectedFilePreview ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
            </div>

            {/* File Selector Tabs */}
            <div className="flex border-b border-slate-800 gap-2">
              {[
                { id: "csv", label: "ShapedDevices.csv" },
                { id: "network", label: "network.json" },
                { id: "cpct", label: "cpct.json" },
                { id: "script", label: "RouterOS FastPath Script (.rsc)" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilePreview(f.id as any)}
                  className={`px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
                    selectedFilePreview === f.id
                      ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Code Viewer */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto whitespace-pre leading-relaxed shadow-inner">
              {selectedFilePreview === "csv" && (generatedCsv || "# Generating ShapedDevices.csv...")}
              {selectedFilePreview === "network" && (generatedNetworkJson || "{ \"nodes\": [] }")}
              {selectedFilePreview === "cpct" && (generatedCpctJson || "{}")}
              {selectedFilePreview === "script" && (generatedMikrotikScript || "# Script")}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: MIKROTIK FASTPATH OFFLOAD */}
      {activeTab === "fastpath" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  RouterOS FastPath &amp; Queue Offload Engine
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Disables CPU-intensive Simple Queues on your MikroTik router and offloads all FQ-CoDel CAKE shaping to LibreQoS. Enables FastTrack for 10Gbps+ wire-speed forwarding with under 5% CPU usage.
                </p>
              </div>

              <button
                onClick={handleApplyFastpath}
                disabled={isApplyingFastpath}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>{isApplyingFastpath ? "Applying FastPath..." : "Apply FastPath to MikroTik"}</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-indigo-300 whitespace-pre max-h-80 overflow-y-auto">
              {generatedMikrotikScript}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: SERVER SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 max-w-3xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            LibreQoS Daemon &amp; Server Connection
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">LibreQoS Host IP / FQDN</label>
              <input
                type="text"
                value={config.serverHost}
                onChange={(e) => setConfig({ ...config, serverHost: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">API Port</label>
              <input
                type="number"
                value={config.serverPort}
                onChange={(e) => setConfig({ ...config, serverPort: parseInt(e.target.value, 10) || 9123 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">API Security Token</label>
              <input
                type="password"
                value={config.apiToken}
                onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Auto-Sync Interval (Minutes)</label>
              <input
                type="number"
                value={config.autoSyncIntervalMinutes}
                onChange={(e) => setConfig({ ...config, autoSyncIntervalMinutes: parseInt(e.target.value, 10) || 5 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSaveConfig(config)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Node Edit / Add Modal */}
      {isNodeModalOpen && editingNode && (
        <Modal isOpen={isNodeModalOpen} onClose={() => setIsNodeModalOpen(false)} title="Edit Topology Node">
          <div className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Node Identifier (Slug)</label>
              <input
                type="text"
                value={editingNode.id}
                onChange={(e) => setEditingNode({ ...editingNode, id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Node Display Name</label>
              <input
                type="text"
                value={editingNode.name}
                onChange={(e) => setEditingNode({ ...editingNode, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Node Type</label>
                <select
                  value={editingNode.type}
                  onChange={(e) => setEditingNode({ ...editingNode, type: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value="Core">Core Router</option>
                  <option value="Tower">Tower Site</option>
                  <option value="Sector_AP">Sector AP</option>
                  <option value="OLT_PON">OLT PON Port</option>
                  <option value="Switch">Distribution Switch</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Capacity Down (Mbps)</label>
                <input
                  type="number"
                  value={editingNode.capacityDownMbps}
                  onChange={(e) => setEditingNode({ ...editingNode, capacityDownMbps: parseInt(e.target.value, 10) || 1000 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsNodeModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const updatedNodes = nodes.some((n) => n.id === editingNode.id)
                    ? nodes.map((n) => (n.id === editingNode.id ? editingNode : n))
                    : [...nodes, editingNode];
                  setNodes(updatedNodes);
                  setIsNodeModalOpen(false);

                  await fetch("/api/libreqos/nodes", {
                    method: "POST",
                    headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ nodes: updatedNodes }),
                  });
                  showToast("Node topology updated", "success");
                  refreshCircuits(config, updatedNodes);
                }}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Save Node
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
