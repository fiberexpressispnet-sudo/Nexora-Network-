export interface BroadbandRenewalRequest {
  id: string;
  clientId: string;
  userId: string;
  clientName: string;
  phone: string;
  currentPackage: string;
  requestedPackage: string;
  price: string;
  paymentMethod: string;
  transactionId: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
}

export interface OnlinePackageOrder {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  phone: string;
  userId: string;
  password?: string;
  address?: string;
  packageName: string;
  price: string;
  bandwidth: string;
  connectionType: "Hotspot" | "PPPoE";
  paymentMethod: "bKash" | "Nagad" | "Rocket" | "Cash" | "Bank";
  transactionId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  targetRouter?: string;
  photo?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  userId: string;
  password?: string;
  package: string;
  bandwidth: string;
  downloadSpeed: string;
  uploadSpeed: string;
  status: "online" | "offline" | "expired" | "suspended" | "pending_approval";
  expiry: string;
  router: string;
  photo?: string | null;
  deviceType?: "Mobile" | "Router";
  price?: string;
  burstSpeed?: string;
  priority?: string;
  daysProfileId?: number;
  bandwidthProfileId?: number;
}

export interface Package {
  id: number;
  name: string;
  price: string;
  validity: string;
  speed: string;
  upload: string;
  installFee: string;
  renewal: string;
  description: string;
  status: "active" | "inactive";
  icon?: string;
  deviceType?: "Mobile" | "Router";
}

export interface BandwidthProfile {
  id: number;
  name: string;
  download: string;
  upload: string;
  burst?: string;
  priority?: string;
  status: "active" | "inactive";
  deviceType?: "Mobile" | "Router";
}

export interface DaysProfile {
  id: number;
  name: string;
  days: number;
  graceDays: number;
  deviceType: "All" | "Mobile" | "Router";
  status: "active" | "inactive";
  description: string;
  isDefault?: boolean;
}

export interface HotspotPackageRequest {
  id: string;
  clientName: string;
  phone: string;
  package: string;
  price: string;
  bandwidth: string;
  downloadSpeed?: string;
  uploadSpeed?: string;
  macAddress?: string;
  ipAddress?: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  createdUserId?: string;
  createdPassword?: string;
  password?: string;
  gateway?: string;
  transaction?: string;
  duration?: number;
  photo?: string;
}

export interface HotspotUser {
  username: string;
  profile: string;
  ip: string;
  mac: string;
  uptime: string;
  bytesIn: string;
  bytesOut: string;
  status: "active" | "expired";
}

export interface NotificationItem {
  id: number;
  icon: string;
  text: string;
  time: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  admin: string;
  action: string;
  target: string;
  time: string;
  ip: string;
  result: "Success" | "Failed";
}

export interface PaymentRecord {
  id: string;
  clientName: string;
  userId: string;
  package: string;
  amount: number;
  paymentMethod:
    "bKash" | "Nagad" | "Rocket" | "Cash" | "Bank" | "Hotspot Portal";
  transactionType:
    | "Broadband Renewal"
    | "New Client Activation"
    | "Hotspot Voucher"
    | "Corporate Bill";
  collector: string;
  timestamp: string;
  dateKey: string;
  monthKey: string;
  status:
    | "Completed"
    | "Pending"
    | "Refunded"
    | "Approved"
    | "Rejected"
    | "Pending Approval"
    | (string & {});
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  userId: string;
  phone: string;
  email?: string;
  address?: string;
  router?: string;
  package: string;
  speed?: string;
  billingMonth: string; // e.g. "2026-08" or "August 2026"
  issueDate: string; // e.g. "2026-08-01"
  dueDate: string; // e.g. "2026-08-10"
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: "paid" | "pending" | "overdue";
  paymentMethod?:
    "bKash" | "Nagad" | "Rocket" | "Cash" | "Bank" | "Online Gateway";
  transactionId?: string;
  paidAt?: string;
  notes?: string;
  remindersSentCount?: number;
  lastReminderSentAt?: string;
}

export interface AppSettings {
  appName: string;
  phone: string;
  whatsapp: string;
  companyName: string;
  address: string;
  logo: string | null;
  banner: string | null;
  timezone: string;
  currency: string;
  sessionTimeout: number;
  twoFactor: string;
  pinLockEnabled?: boolean;
  pinCode?: string;
  pinPassword?: string;
  patternLockEnabled?: boolean;
  patternSequence?: number[];
  recoveryPin?: string;
  autoLockMinutes?: number;
  biometricLockEnabled?: boolean;
  biometricCredentialId?: string;
  biometricRegistered?: boolean;
  paymentLogos?: {
    bkash?: string;
    nagad?: string;
    rocket?: string;
    bank?: string;
  };
}

export interface HotspotFile {
  name: string;
  size: number;
  type: string;
}

export interface MikrotikRouter {
  id: string;
  name: string;
  ip: string;
  apiPort: number;
  apiSslPort: number;
  username: string;
  password?: string;
  connected: boolean;
  location?: string;
  model?: string;
  version?: string;
  cpu?: string;
  uptime?: string;
  ram?: string;
  activeUsers?: number;
  mode?: "Hotspot" | "PPPoE" | "Hybrid" | "Core";
  isDefault?: boolean;
  isDemo?: boolean;
  notes?: string;
  errorReason?: string;
}

export interface RouterConfig {
  id?: string;
  name: string;
  ip: string;
  apiPort: number;
  apiSslPort: number;
  username: string;
  password?: string;
  connected: boolean;
  location?: string;
  model?: string;
}

export interface RouterInfo {
  osVersion: string;
  uptime: string;
  cpu: string;
  ram: string;
  activeUsers: number;
}

export type PageId =
  | "dashboard"
  | "configuration"
  | "clients"
  | "billing"
  | "payments"
  | "subscriptions"
  | "mikrotik-configure"
  | "mikrotik-management"
  | "mikrotik-security"
  | "live-bandwidth"
  | "support-ticketing"
  | "support-tickets"
  | "sms-notifications"
  | "network-diagram"
  | "network-map"
  | "purchase"
  | "inventory"
  | "expenses"
  | "security"
  | "invoices"
  | "admin-profile"
  | "packages"
  | "bandwidth"
  | "days-profile"
  | "hotspot"
  | "hotspot-config"
  | "reports"
  | "notifications"
  | "audit"
  | "settings";

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  clientId: string;
  clientName: string;
  phone: string;
  category:
    | "No Internet"
    | "Slow Speed"
    | "Router Problem"
    | "Payment Issue"
    | "Connection Problem"
    | "Fiber LOS"
    | "Other";
  priority: "Urgent" | "High" | "Medium" | "Low";
  status: "Open" | "Assigned" | "Working" | "Resolved" | "Closed";
  subject: string;
  description: string;
  assignedStaff?: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  location?: string;
}

export interface ExpenseItem {
  id: string;
  title: string;
  category:
    | "Bandwidth Cost"
    | "Server Cost"
    | "Electricity"
    | "Employee Salary"
    | "Maintenance"
    | "Equipment"
    | "Office Rent"
    | "Marketing"
    | "Other";
  amount: number;
  date: string;
  monthKey: string;
  paidTo: string;
  paymentMethod: "Cash" | "bKash" | "Bank" | "Nagad";
  notes?: string;
  receiptNumber?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category:
    | "Router"
    | "ONU"
    | "OLT"
    | "Switch"
    | "Fiber Cable"
    | "Adapter"
    | "Power Supply"
    | "Connector"
    | "Patch Cord"
    | "Joint Enclosure"
    | "Tools";
  sku: string;
  quantity: number;
  used: number;
  damaged: number;
  purchasePrice: number;
  supplier: string;
  unit: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  location?: string;
  lastUpdated: string;
}

export interface NetworkNodeItem {
  id: string;
  name: string;
  type:
    | "POP"
    | "Core Router"
    | "OLT"
    | "Splitter"
    | "Distribution Box"
    | "Client Premise";
  ip?: string;
  ponPort?: string;
  status: "Online" | "Offline" | "Degraded";
  signalPower?: string; // e.g. -19.2 dBm
  lat: number;
  lng: number;
  zone: string;
  capacity?: string;
  connectedClients: number;
  parentConnection?: string;
}

export interface SmsLogItem {
  id: string;
  recipientName: string;
  phone: string;
  type:
    | "Bill Generated"
    | "Payment Received"
    | "Payment Due Reminder"
    | "Payment Overdue"
    | "Package Expiring"
    | "Package Renewed"
    | "Connection Suspended"
    | "Connection Activated"
    | "Complaint Updated"
    | "Custom Broadcast";
  message: string;
  sentAt: string;
  status: "Sent" | "Delivered" | "Failed";
  gatewayResponse?: string;
}

export interface AdminProfileData {
  name: string;
  role: string;
  phone: string;
  email: string;
  avatar?: string;
  twoFactorEnabled: boolean;
  lastLogin: string;
  connectedDevices: {
    device: string;
    ip: string;
    location: string;
    lastActive: string;
    isCurrent: boolean;
  }[];
}

export type DnsProfileId = "cloudflare" | "adguard" | "custom";

export interface HotspotNetworkInfo {
  serverName: string;
  interfaceName: string;
  addressPool: string;
  subnet: string;
  dhcpServer: string;
  routerIp: string;
  activeClientsCount: number;
}

export interface DnsSecurityStatus {
  enabled: boolean;
  profile: DnsProfileId;
  primaryDns: string;
  secondaryDns: string;
  allowRemoteRequests: boolean;
  redirectUdpPort53: boolean;
  redirectTcpPort53: boolean;
  lastConfiguredAt?: string;
  backupCreated: boolean;
  hotspotInfo?: HotspotNetworkInfo;
}

export interface SecurityLogItem {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  profile: string;
  result: "Success" | "Failed" | "Rolled Back";
  details: string;
  routerIp: string;
}

export interface ProposedChanges {
  commands: string[];
  explanation: string[];
  hotspotInterface: string;
  subnet: string;
  existingRulesFound: number;
  conflicts: string[];
}

export type ToastType = "info" | "success" | "error" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}
