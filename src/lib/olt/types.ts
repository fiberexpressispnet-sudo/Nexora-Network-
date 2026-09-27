export type OLTBrand =
  | 'Huawei'
  | 'ZTE'
  | 'VSOL'
  | 'BDCOM'
  | 'FiberHome'
  | 'Generic'
  | 'Other';

export type OLTProtocol =
  | 'SNMPv2c'
  | 'SNMPv3'
  | 'SSH'
  | 'Telnet'
  | 'REST';

export type OpticalPowerStatus =
  | 'normal'
  | 'warning'
  | 'critical'
  | 'los'
  | 'unknown';

export interface OLTConfig {
  id: string;
  name: string;
  brand: OLTBrand;
  model: string;
  ip: string;
  managementPort: number;
  protocol: OLTProtocol;
  username: string;
  password?: string;
  snmpCommunityRead?: string;
  snmpCommunityWrite?: string;
  snmpv3User?: string;
  snmpv3AuthPass?: string;
  snmpv3PrivPass?: string;
  timeoutMs: number;
  enabled: boolean;
  status: 'online' | 'offline' | 'warning' | 'untested';
  lastSync?: string;
  totalPonPorts?: number;
  onlinePonPorts?: number;
  totalOnus?: number;
  onlineOnus?: number;
  offlineOnus?: number;
  losOnus?: number;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
  temperature?: number | null;
  uptime?: string | null;
  firmware?: string | null;
  hardwareVersion?: string | null;
  serialNumber?: string | null;
  powerSupplyStatus?: string | null;
  fanStatus?: string | null;
  notes?: string;
  errorReason?: string;
}

export interface PonPortInfo {
  slot: string;
  ponPort: string;
  portName: string;
  adminStatus: 'up' | 'down';
  operStatus: 'up' | 'down' | 'testing';
  totalOnu: number;
  onlineOnu: number;
  offlineOnu: number;
  losCount: number;
  txPowerDbm: number | null;
  rxTrafficMbps: number | null;
  txTrafficMbps: number | null;
}

export interface ONUInfo {
  id: string; // Unique identifier or "SLOT/PORT:ONU_INDEX"
  oltId: string;
  oltName?: string;
  slot: string;
  ponPort: string;
  onuIndex: number;
  serialNumber: string; // PON SN
  macAddress: string;
  vendor: string;
  name: string; // Description/Alias
  status: 'online' | 'offline' | 'los' | 'power_low';
  rxPower: number | null; // in dBm, e.g. -19.5 or null if N/A
  txPower: number | null; // in dBm, e.g. 2.1 or null if N/A
  temperature: number | null; // in °C
  voltage: number | null; // in V
  distanceMeters: number | null; // in meters
  uptime: string | null;
  lastOnline: string | null;
  lastOffline: string | null;
  losStatus: boolean;
  trafficRxMbps: number | null;
  trafficTxMbps: number | null;
  mappedClientId?: string | null;
  mappedClientName?: string | null;
  mappedUserId?: string | null;
}

export interface OpticalPowerThresholds {
  warningMinRx: number; // e.g. -25.0 dBm
  criticalMinRx: number; // e.g. -27.0 dBm
  losMinRx: number; // e.g. -35.0 dBm
  maxRx: number; // e.g. -8.0 dBm
}

export const DEFAULT_OPTICAL_THRESHOLDS: OpticalPowerThresholds = {
  warningMinRx: -25.0,
  criticalMinRx: -27.0,
  losMinRx: -35.0,
  maxRx: -8.0,
};

export interface CustomerOnuMapping {
  id: string;
  clientId: string;
  clientName: string;
  userId: string;
  phone?: string;
  packageName?: string;
  oltId: string;
  oltName: string;
  slot: string;
  ponPort: string;
  onuId: string;
  serialNumber: string;
  macAddress?: string;
  rxPower?: number | null;
  status?: string;
  updatedAt: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertType =
  | 'olt_offline'
  | 'pon_down'
  | 'onu_offline'
  | 'los'
  | 'low_rx_power'
  | 'high_temp'
  | 'high_cpu'
  | 'high_memory';

export interface OLTAlert {
  id: string;
  oltId: string;
  oltName: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  onuSn?: string;
  clientId?: string;
}

export type OLTRole = 'Super Admin' | 'Admin' | 'Support' | 'Viewer';

export interface OLTTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  systemInfo?: {
    brand: OLTBrand;
    model: string;
    serialNumber?: string;
    firmware?: string;
    hardwareVersion?: string;
    uptime?: string;
    totalPonPorts?: number;
    cpuUsage?: number | null;
    memoryUsage?: number | null;
    temperature?: number | null;
  };
  error?: string;
}
