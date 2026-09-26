import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface LibreQosConfig {
  enabled: boolean;
  serverHost: string;
  serverPort: number;
  apiToken: string;
  syncMethod: "REST" | "SSH" | "LocalCSV" | "Webhook";
  shapedDevicesPath: string;
  networkJsonPath: string;
  autoSyncIntervalMinutes: number; // 0 = disabled
  lastSyncTime: string | null;
  defaultCakeProfile: "diffserv4" | "diffserv8" | "besteffort" | "video_priority" | "gaming_priority";
  overheadType: "ethernet_vlan" | "pppoe" | "raw_ethernet" | "docsis" | "custom";
  overheadBytes: number;
  washDscp: boolean;
  ackFilter: boolean;
  rttTargetMs: number;
  autoThrottleBufferbloat: boolean;
  autoOffloadMikrotikQueues: boolean;
}

export interface LibreQosNode {
  id: string;
  name: string;
  type: "Core" | "Tower" | "Sector_AP" | "OLT_PON" | "Switch" | "Site";
  parentId: string | null;
  capacityDownMbps: number;
  capacityUpMbps: number;
  location?: string;
  ipSubnet?: string;
  interfaceName?: string;
  routerId?: string;
  currentDownMbps?: number;
  currentUpMbps?: number;
  activeCircuits?: number;
  bufferbloatGrade?: "A+" | "A" | "B" | "C" | "D" | "F";
  avgRttMs?: number;
}

export interface LibreQosCircuit {
  circuitId: string;
  clientName: string;
  ipAddress: string;
  macAddress?: string;
  downloadKbps: number;
  uploadKbps: number;
  cirDownKbps?: number;
  cirUpKbps?: number;
  nodeId: string;
  parentNodeId?: string;
  packageName: string;
  priority: number; // 1-8 (8 default)
  cosClass: string;
  cakeProfile: string;
  overheadBytes: number;
  wash: boolean;
  ackFilter: boolean;
  comment: string;
  status: "Active" | "Suspended" | "Pending_Sync";
  currentRttMs?: number;
  packetLossPercent?: number;
  qoeScore?: number; // 1.0 - 5.0
}

export interface WanUplink {
  id: string;
  name: string;
  interfaceName: string;
  routerId: string;
  capacityDownMbps: number;
  capacityUpMbps: number;
  currentDownMbps: number;
  currentUpMbps: number;
  targetPingHost: string;
  currentRttMs: number;
  packetLossPercent: number;
  bufferbloatScore: "A+" | "A" | "B" | "C" | "D" | "F";
  status: "Optimal" | "Congested" | "Degraded" | "Offline";
  sqmEnabled: boolean;
}

export interface LibreQosSyncHistory {
  id: string;
  timestamp: string;
  totalCircuits: number;
  totalNodes: number;
  status: "Success" | "Failed" | "DryRun";
  triggeredBy: string;
  diffSummary: string;
  rawOutput?: string;
}

// Default initial LibreQoS Configuration
export const defaultLibreQosConfig: LibreQosConfig = {
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
};

// Default initial Network Topology Hierarchy
export const defaultLibreQosNodes: LibreQosNode[] = [
  {
    id: "node-core-01",
    name: "Central Core DC (CCR1036)",
    type: "Core",
    parentId: null,
    capacityDownMbps: 10000,
    capacityUpMbps: 10000,
    location: "Nexora Core Datacenter",
    ipSubnet: "10.0.0.0/8",
    interfaceName: "sfp-plus1-Core",
    routerId: "mk-01",
    currentDownMbps: 1420.5,
    currentUpMbps: 480.2,
    activeCircuits: 184,
    bufferbloatGrade: "A+",
    avgRttMs: 7.2,
  },
  {
    id: "node-tower-north",
    name: "North Tower Alpha",
    type: "Tower",
    parentId: "node-core-01",
    capacityDownMbps: 2500,
    capacityUpMbps: 2500,
    location: "Tower Site North (Sector 1)",
    ipSubnet: "172.16.10.0/24",
    interfaceName: "ether2-NorthTrunk",
    routerId: "mk-01",
    currentDownMbps: 480.0,
    currentUpMbps: 160.0,
    activeCircuits: 62,
    bufferbloatGrade: "A+",
    avgRttMs: 8.5,
  },
  {
    id: "node-olt-pon1",
    name: "Zone A Core EPON OLT (Port 1)",
    type: "OLT_PON",
    parentId: "node-core-01",
    capacityDownMbps: 1250,
    capacityUpMbps: 1250,
    location: "Substation Alpha Rack 2",
    ipSubnet: "172.16.20.0/24",
    interfaceName: "ether3-OLT-PON1",
    routerId: "mk-01",
    currentDownMbps: 380.0,
    currentUpMbps: 120.0,
    activeCircuits: 48,
    bufferbloatGrade: "A",
    avgRttMs: 9.1,
  },
  {
    id: "node-ap-sector1",
    name: "Wireless Sector 5GHz AP-01",
    type: "Sector_AP",
    parentId: "node-tower-north",
    capacityDownMbps: 450,
    capacityUpMbps: 450,
    location: "North Tower Pole 1 (120 Deg)",
    ipSubnet: "172.16.30.0/24",
    interfaceName: "wlan1-SectorA",
    routerId: "mk-01",
    currentDownMbps: 190.0,
    currentUpMbps: 65.0,
    activeCircuits: 24,
    bufferbloatGrade: "A+",
    avgRttMs: 11.4,
  },
];

// Default initial WAN Uplinks
export const defaultWanUplinks: WanUplink[] = [
  {
    id: "wan-01",
    name: "Primary Tier-1 Fiber Uplink (10G Transit)",
    interfaceName: "sfp-plus1-WAN",
    routerId: "mk-01",
    capacityDownMbps: 2000,
    capacityUpMbps: 2000,
    currentDownMbps: 1140.2,
    currentUpMbps: 395.4,
    targetPingHost: "8.8.8.8",
    currentRttMs: 7.8,
    packetLossPercent: 0.0,
    bufferbloatScore: "A+",
    status: "Optimal",
    sqmEnabled: true,
  },
  {
    id: "wan-02",
    name: "Secondary BDIX / Local IXP Peering (1G Direct)",
    interfaceName: "ether1-IXP",
    routerId: "mk-01",
    capacityDownMbps: 1000,
    capacityUpMbps: 1000,
    currentDownMbps: 420.8,
    currentUpMbps: 110.6,
    targetPingHost: "1.1.1.1",
    currentRttMs: 3.4,
    packetLossPercent: 0.0,
    bufferbloatScore: "A+",
    status: "Optimal",
    sqmEnabled: true,
  },
];

/**
 * Rate Resolver: Converts Mbps / Kbps string speed into exact numeric kbps for LibreQoS
 */
export function parseSpeedToKbps(speedStr: string | undefined, defaultKbps: number = 20480): number {
  if (!speedStr) return defaultKbps;
  const clean = speedStr.trim().toLowerCase();
  
  if (clean.includes("g") || clean.includes("gbps")) {
    const val = parseFloat(clean.replace(/[^0-9.]/g, ""));
    return isNaN(val) ? defaultKbps : Math.round(val * 1000 * 1000);
  }
  if (clean.includes("m") || clean.includes("mbps")) {
    const val = parseFloat(clean.replace(/[^0-9.]/g, ""));
    return isNaN(val) ? defaultKbps : Math.round(val * 1000);
  }
  if (clean.includes("k") || clean.includes("kbps")) {
    const val = parseFloat(clean.replace(/[^0-9.]/g, ""));
    return isNaN(val) ? defaultKbps : Math.round(val);
  }
  const numeric = parseFloat(clean);
  if (!isNaN(numeric)) {
    // If <= 1000 assume Mbps, else assume kbps
    return numeric <= 1000 ? Math.round(numeric * 1000) : Math.round(numeric);
  }
  return defaultKbps;
}

/**
 * Calculates Overhead Compensation Bytes
 */
export function getOverheadBytes(type: string): number {
  switch (type) {
    case "pppoe":
      return 8; // 8 bytes PPPoE header
    case "ethernet_vlan":
      return 18; // 14 byte Ethernet + 4 byte 802.1Q VLAN tag
    case "raw_ethernet":
      return 14;
    case "docsis":
      return 26;
    default:
      return 8;
  }
}

/**
 * Rate Resolver Engine: Builds complete LibreQoS circuit list from Clients, Packages, and Nodes
 */
export function resolveLibreQosCircuits(
  clients: any[],
  packages: any[],
  nodes: LibreQosNode[],
  config: LibreQosConfig
): LibreQosCircuit[] {
  const circuits: LibreQosCircuit[] = [];
  const defaultNode = nodes[0]?.id || "node-core-01";

  for (const client of clients) {
    if (!client) continue;

    // Find matching package
    const pkg = packages.find(
      (p) => p.name?.toLowerCase() === client.package?.toLowerCase() || p.id?.toString() === client.package?.toString()
    );

    // Resolve Download & Upload rates
    let downKbps = 20480; // 20 Mbps default
    let upKbps = 10240;   // 10 Mbps default

    if (client.downloadSpeed) {
      downKbps = parseSpeedToKbps(client.downloadSpeed, 20480);
    } else if (pkg?.speed) {
      downKbps = parseSpeedToKbps(pkg.speed, 20480);
    }

    if (client.uploadSpeed) {
      upKbps = parseSpeedToKbps(client.uploadSpeed, 10240);
    } else if (pkg?.upload) {
      upKbps = parseSpeedToKbps(pkg.upload, 10240);
    }

    // Determine CIR (Committed Information Rate) - typically 70-80% of MIR for high quality QoS
    const cirDown = Math.round(downKbps * 0.75);
    const cirUp = Math.round(upKbps * 0.75);

    // Find or assign Node ID based on client router or IP
    let assignedNodeId = defaultNode;
    if (nodes.length > 0) {
      // Check if client has an explicitly configured router or IP matching a node
      const matchingNode = nodes.find(
        (n) => (client.router && n.routerId === client.router) || (n.name.toLowerCase().includes("pon") && client.userId?.includes("pon"))
      );
      if (matchingNode) {
        assignedNodeId = matchingNode.id;
      }
    }

    const assignedNode = nodes.find((n) => n.id === assignedNodeId);
    const parentNodeId = assignedNode?.parentId || undefined;

    // Generate predictable IP if client doesn't have one
    let ip = client.ip || client.ipAddress;
    if (!ip) {
      // Deterministic synthetic IP based on ID hash for preview
      const hash = Math.abs(client.id.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)) % 250 + 2;
      ip = `172.16.10.${hash}`;
    }

    // Determine CoS class & CAKE profile
    const priority = client.priority ? parseInt(client.priority, 10) || 8 : 8;
    const cakeProfile = config.defaultCakeProfile || "diffserv4";
    const cosClass = priority <= 3 ? "Gaming_VoIP_Priority" : priority <= 6 ? "Streaming_Business" : "Standard_Residential";

    // Simulate realistic live QoE metrics
    const baseRtt = assignedNode?.avgRttMs || 8.0;
    const jitter = (Math.random() * 2.5 - 1.25);
    const currentRtt = Math.max(3.0, Math.round((baseRtt + jitter) * 10) / 10);
    const qoeScore = currentRtt < 12 ? 4.9 : currentRtt < 25 ? 4.2 : 3.5;

    circuits.push({
      circuitId: `CIR-${client.userId || client.id}`,
      clientName: client.name || "Subscriber",
      ipAddress: ip,
      macAddress: client.macAddress || undefined,
      downloadKbps: downKbps,
      uploadKbps: upKbps,
      cirDownKbps: cirDown,
      cirUpKbps: cirUp,
      nodeId: assignedNodeId,
      parentNodeId: parentNodeId,
      packageName: client.package || pkg?.name || "Standard",
      priority: priority,
      cosClass: cosClass,
      cakeProfile: cakeProfile,
      overheadBytes: config.overheadBytes || 8,
      wash: config.washDscp || false,
      ackFilter: config.ackFilter ?? true,
      comment: `${client.name} | ${client.phone || ''} | ${client.package || ''}`,
      status: client.status === "online" ? "Active" : client.status === "suspended" ? "Suspended" : "Active",
      currentRttMs: currentRtt,
      packetLossPercent: 0.0,
      qoeScore: qoeScore,
    });
  }

  return circuits;
}

/**
 * ShapedDevices.csv Generator
 * Follows exact LibreQoS format:
 * # Circuit ID, IP Address, Download (kbps), Upload (kbps), Node ID, Parent Node, MAC, Comments, CoS Class, Priority, Cake Preset
 */
export function generateShapedDevicesCsv(circuits: LibreQosCircuit[]): string {
  const header = [
    "# LibreQoS ShapedDevices.csv",
    `# Generated by Nexora FlowForge ISP Management System on ${new Date().toISOString()}`,
    `# Total Circuits: ${circuits.length}`,
    "# Format: Circuit ID,Device IP,Download kbps,Upload kbps,Node ID,Parent Node,MAC Address,Comment,CoS Class,Priority,CAKE Preset",
    "Circuit ID,Device IP,Download kbps,Upload kbps,Node ID,Parent Node,MAC Address,Comment,CoS Class,Priority,CAKE Preset"
  ].join("\n");

  const rows = circuits.map((c) => {
    const fields = [
      c.circuitId,
      c.ipAddress,
      c.downloadKbps,
      c.uploadKbps,
      c.nodeId,
      c.parentNodeId || "",
      c.macAddress || "",
      `"${(c.comment || '').replace(/"/g, '""')}"`,
      c.cosClass,
      c.priority,
      c.cakeProfile
    ];
    return fields.join(",");
  });

  return [header, ...rows].join("\n");
}

/**
 * network.json Generator (Hierarchical Node Topology for LibreQoS)
 */
export function generateNetworkJson(nodes: LibreQosNode[]): string {
  const topology = {
    version: "1.5",
    generatedAt: new Date().toISOString(),
    system: "Nexora FlowForge LibreQoS Engine",
    nodes: nodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      parent: n.parentId,
      bandwidth: {
        downloadMbps: n.capacityDownMbps,
        uploadMbps: n.capacityUpMbps,
      },
      metadata: {
        location: n.location || "",
        ipSubnet: n.ipSubnet || "",
        interface: n.interfaceName || "",
        routerId: n.routerId || "",
      },
    })),
  };

  return JSON.stringify(topology, null, 2);
}

/**
 * cpct.json Generator (Circuit Parent-Child Tree)
 */
export function generateCpctJson(nodes: LibreQosNode[], circuits: LibreQosCircuit[]): string {
  const cpct: Record<string, any> = {};

  for (const node of nodes) {
    const nodeCircuits = circuits.filter((c) => c.nodeId === node.id);
    cpct[node.id] = {
      name: node.name,
      type: node.type,
      parent: node.parentId,
      totalCapacityDownMbps: node.capacityDownMbps,
      totalCapacityUpMbps: node.capacityUpMbps,
      activeCircuitCount: nodeCircuits.length,
      circuits: nodeCircuits.map((c) => ({
        circuitId: c.circuitId,
        ip: c.ipAddress,
        downKbps: c.downloadKbps,
        upKbps: c.uploadKbps,
      })),
    };
  }

  return JSON.stringify(cpct, null, 2);
}

/**
 * RouterOS Script Generator to Offload Queues and Enable FastPath/FastTrack
 */
export function generateMikrotikOffloadScript(routerName: string, wanInterface: string = "ether1"): string {
  return `# =========================================================================
# MikroTik RouterOS -> LibreQoS Offload & FastPath Optimization Script
# Router: ${routerName}
# Generated by Nexora FlowForge ISP Architecture
# =========================================================================

# Step 1: Add FastTrack Firewall Rule to bypass CPU Queue Processing
/ip firewall filter
add chain=forward action=fasttrack-connection connection-state=established,related comment="[LibreQoS] FastTrack established/related" place-before=0
add chain=forward action=accept connection-state=established,related comment="[LibreQoS] Accept established/related" place-before=1

# Step 2: Configure FastPath on Bridge & Ethernet interfaces
/interface bridge settings
set allow-fast-path=yes use-ip-firewall=no use-ip-firewall-for-vlan=no use-ip-firewall-for-pppoe=no

# Step 3: Disable CPU-heavy Simple Queues (LibreQoS will perform FQ-CoDel CAKE externally)
:log info "[LibreQoS] Offloading queue processing to LibreQoS Dedicated Shaper..."
/queue simple
disable [find comment~"Auto" or dynamic=no]

# Step 4: Configure DSCP / ToS Preservation for Cake Diffserv Classification
/ip firewall mangle
add chain=forward action=change-dscp new-dscp=0 passthrough=yes comment="[LibreQoS] Clean DSCP for downstream" disabled=yes

:log info "[LibreQoS] RouterOS FastPath & Queue Offload Applied Successfully! CPU Usage reduced."
`;
}
