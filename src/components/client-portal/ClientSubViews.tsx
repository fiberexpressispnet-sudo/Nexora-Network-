import React, { useState } from "react";
import {
  User,
  Package as PackageIcon,
  Activity,
  Wifi,
  Radio,
  FileText,
  Bot,
  Bell,
  UserCircle,
  Lock,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Printer,
  Wrench,
  CreditCard,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { Client, Invoice, NotificationItem, PaymentRecord } from "../../types";
import { getClientExpiryInfo } from "../../lib/expiryUtils";
import { ClientNavTab } from "./ClientSidebarAndHeader";

interface ClientSubViewsProps {
  activeTab: ClientNavTab;
  client: Client;
  onSelectTab: (tab: ClientNavTab) => void;
  liveCountdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    formattedText: string;
  };
  bandwidthTelemetry: {
    available: boolean;
    downloadMbps: number;
    uploadMbps: number;
    lastUpdated: string | null;
    history: { time: string; dl: number; ul: number }[];
  };
  onuMapping: any | null;
  clientInvoices: Invoice[];
  billingHistory: PaymentRecord[];
  notifications: NotificationItem[];
  tickets?: any[];
  onPrintReceipt: (payment: PaymentRecord) => void;
  onOpenPaymentModal: () => void;
  // Network & Ping props
  pingStatus: "idle" | "running" | "success";
  pingLatency: number;
  packetLoss: number;
  signalPower: number;
  diagnosticsLogs: string[];
  onRunPingTest: () => void;
  isAutoFixing: boolean;
  autoFixSuccessMsg: string | null;
  onAutoFixLine: () => void;
  // Telegram props
  telegramLinkStatus: { isLinked: boolean; linkedAt?: string } | null;
  isGeneratingClientLink: boolean;
  clientTelegramLinkData: { link: string; token: string } | null;
  copiedClientLink: boolean;
  setCopiedClientLink: (v: boolean) => void;
  isUnlinkingTelegram: boolean;
  telegramActionNotice: string | null;
  onGenerateTelegramLink: () => void;
  onUnlinkTelegram: () => void;
  // Profile & Password update handlers
  onSaveClientProfile: (updates: Partial<Client>) => Promise<void>;
}

export const ClientSubViews: React.FC<ClientSubViewsProps> = ({
  activeTab,
  client,
  onSelectTab,
  liveCountdown,
  bandwidthTelemetry,
  onuMapping,
  clientInvoices,
  billingHistory,
  notifications,
  tickets,
  onPrintReceipt,
  onOpenPaymentModal,
  pingStatus,
  pingLatency,
  packetLoss,
  signalPower,
  diagnosticsLogs,
  onRunPingTest,
  isAutoFixing,
  autoFixSuccessMsg,
  onAutoFixLine,
  telegramLinkStatus,
  isGeneratingClientLink,
  clientTelegramLinkData,
  copiedClientLink,
  setCopiedClientLink,
  isUnlinkingTelegram,
  telegramActionNotice,
  onGenerateTelegramLink,
  onUnlinkTelegram,
  onSaveClientProfile,
}) => {
  const expiryInfo = getClientExpiryInfo(client.expiry);
  const isExpired = expiryInfo.isExpired || client.status === "expired";
  const isSuspended = client.status === "suspended";
  const isOnline = client.status === "online" && !isExpired && !isSuspended;

  const [profileName, setProfileName] = useState(client.name || "");
  const [profilePhone, setProfilePhone] = useState(client.phone || "");
  const [profileEmail, setProfileEmail] = useState(client.email || "");
  const [profileAddress, setProfileAddress] = useState(client.address || "");
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSavedMsg(null);
    await onSaveClientProfile({
      name: profileName.trim() || client.name,
      phone: profilePhone.trim() || client.phone,
      email: profileEmail.trim(),
      address: profileAddress.trim(),
    });
    setIsSavingProfile(false);
    setProfileSavedMsg("Profile updated successfully!");
    setTimeout(() => setProfileSavedMsg(null), 3500);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (client.password && currentPassword && currentPassword !== client.password) {
      setPasswordMsg({ type: "error", text: "Current password does not match." });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPasswordMsg({
        type: "error",
        text: "New password must be at least 4 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        type: "error",
        text: "New password and confirmation do not match.",
      });
      return;
    }
    setIsSavingPassword(true);
    await onSaveClientProfile({ password: newPassword });
    setIsSavingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg({
      type: "success",
      text: "Your account password has been updated successfully!",
    });
  };

  // 1. MY ACCOUNT VIEW
  if (activeTab === "account") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Account</h2>
              <p className="text-xs text-slate-500">
                Subscriber account details and billing summary
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab("profile")}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Subscriber Name</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {client.name}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Username / Client ID</span>
            <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
              {client.userId}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Mobile Number</span>
            <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
              {client.phone || "N/A"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Email Address</span>
            <span className="text-sm font-semibold text-slate-900 mt-1 block">
              {client.email || "N/A"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Subscribed Package</span>
            <span className="text-sm font-bold text-blue-600 mt-1 block">
              {client.package || "N/A"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Monthly Bill</span>
            <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
              ৳{client.price || "0"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Activation Date</span>
            <span className="text-sm font-mono font-semibold text-slate-900 mt-1 block">
              {client.createdAt || "N/A"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Expiry Date</span>
            <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
              {client.expiry || "N/A"} ({liveCountdown.formattedText})
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Gateway Router</span>
            <span className="text-sm font-semibold text-slate-900 mt-1 block">
              {client.router || "N/A"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. MY PACKAGE VIEW
  if (activeTab === "my-package") {
    const dl = client.downloadSpeed || client.bandwidth || "N/A";
    const ul = client.uploadSpeed || "N/A";
    const connType =
      client.deviceType === "Mobile"
        ? "Hotspot"
        : client.connectionType || "Fiber (PPPoE)";

    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PackageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Package</h2>
              <p className="text-xs text-slate-500">
                Active internet plan specifications and validity
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectTab("renew")}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
            >
              Renew Package
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("buy-package")}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Upgrade / Change Plan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
            <span className="text-slate-500 block">Package Name</span>
            <span className="text-base font-bold text-slate-900 mt-1 block">
              {client.package || "No Active Package"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
            <span className="text-slate-500 block">Download / Upload</span>
            <span className="text-base font-mono font-bold text-indigo-700 mt-1 block">
              ↓ {dl} / ↑ {ul}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-slate-500 block">Monthly Price</span>
            <span className="text-base font-mono font-bold text-emerald-700 mt-1 block">
              ৳{client.price || "0"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
            <span className="text-slate-500 block">Connection Type</span>
            <span className="text-base font-bold text-amber-800 mt-1 block">
              {connType}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 block">Subscription Expiry</span>
            <span className="text-lg font-bold font-mono mt-0.5 block">
              {client.expiry || "N/A"} ({liveCountdown.formattedText})
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm">
            <div className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="font-bold text-lg block">
                {String(liveCountdown.days).padStart(2, "0")}
              </span>
              <span className="text-[10px] text-slate-400">DAYS</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="font-bold text-lg block">
                {String(liveCountdown.hours).padStart(2, "0")}
              </span>
              <span className="text-[10px] text-slate-400">HRS</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="font-bold text-lg block">
                {String(liveCountdown.minutes).padStart(2, "0")}
              </span>
              <span className="text-[10px] text-slate-400">MIN</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-center text-cyan-400">
              <span className="font-bold text-lg block">
                {String(liveCountdown.seconds).padStart(2, "0")}
              </span>
              <span className="text-[10px] text-slate-400">SEC</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. LIVE BANDWIDTH VIEW
  if (activeTab === "bandwidth") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Live Bandwidth</h2>
              <p className="text-xs text-slate-500">
                Real-time MikroTik / LibreQoS traffic for {client.userId}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {bandwidthTelemetry.lastUpdated
              ? `Last updated: ${bandwidthTelemetry.lastUpdated}`
              : "Waiting for live router queue telemetry"}
          </span>
        </div>

        {bandwidthTelemetry.available ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <ArrowDown className="w-4 h-4 text-blue-600" /> Download Speed
                  </span>
                  <span className="text-3xl font-bold font-mono text-blue-700 mt-1 block tabular-nums">
                    {bandwidthTelemetry.downloadMbps.toFixed(1)} Mbps
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Max: {client.downloadSpeed || client.bandwidth || "N/A"}
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <ArrowUp className="w-4 h-4 text-indigo-600" /> Upload Speed
                  </span>
                  <span className="text-3xl font-bold font-mono text-indigo-700 mt-1 block tabular-nums">
                    {bandwidthTelemetry.uploadMbps.toFixed(1)} Mbps
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Max: {client.uploadSpeed || "N/A"}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Download (Mbps)</th>
                    <th className="py-2 px-3">Upload (Mbps)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {bandwidthTelemetry.history
                    .slice(-8)
                    .reverse()
                    .map((h, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 text-slate-600">{h.time}</td>
                        <td className="py-2 px-3 text-blue-700 font-semibold">
                          {h.dl.toFixed(1)} Mbps
                        </td>
                        <td className="py-2 px-3 text-indigo-700 font-semibold">
                          {h.ul.toFixed(1)} Mbps
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-10 rounded-2xl bg-slate-50 border border-slate-200/70 text-center space-y-2">
            <Activity className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-base font-bold text-slate-800">
              Live bandwidth unavailable
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Real-time bandwidth data is only shown when your MikroTik router is actively streaming queue telemetry for your session. No fake or simulated numbers are displayed.
            </p>
          </div>
        )}
      </div>
    );
  }

  // 4. NETWORK STATUS & PING DIAGNOSTICS VIEW
  if (activeTab === "network") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Network Status &amp; Diagnostics
              </h2>
              <p className="text-xs text-slate-500">
                Real-time connection parameters and gateway ping test
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAutoFixLine}
              disabled={isAutoFixing}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoFixing ? "animate-spin" : ""}`} />
              <span>{isAutoFixing ? "Syncing..." : "1-Click Auto-Fix Line"}</span>
            </button>
            <button
              type="button"
              onClick={onRunPingTest}
              disabled={pingStatus === "running"}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{pingStatus === "running" ? "Running..." : "Run Ping Test"}</span>
            </button>
          </div>
        </div>

        {autoFixSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{autoFixSuccessMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Internet Status</span>
            <span
              className={`text-sm font-bold mt-1 block ${
                isOnline ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              ● {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Assigned IP</span>
            <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
              {client.ipAddress || client.ip || "N/A"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Gateway Router</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {client.router || "N/A"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Ping Latency / Loss</span>
            <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
              {pingStatus === "running"
                ? "Testing..."
                : pingLatency > 0
                  ? `${pingLatency} ms (${packetLoss}% loss)`
                  : "N/A"}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-emerald-400 space-y-1.5 max-h-48 overflow-y-auto">
          <div className="text-slate-400">Nexora Network Gateway Diagnostic Output</div>
          {diagnosticsLogs.length === 0 ? (
            <div className="text-slate-500">
              Click &quot;Run Ping Test&quot; above to test gateway reachability.
            </div>
          ) : (
            diagnosticsLogs.map((log, i) => <div key={i}>{log}</div>)
          )}
        </div>
      </div>
    );
  }

  // 5. ONU / OPTICAL INFO VIEW
  if (activeTab === "onu") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">ONU / Optical Info</h2>
            <p className="text-xs text-slate-500">
              Optical Network Unit (ONU) hardware &amp; fiber signal telemetry
            </p>
          </div>
        </div>

        {onuMapping ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">ONU Serial Number (PON SN)</span>
              <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
                {onuMapping.serialNumber || "N/A"}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">MAC Address</span>
              <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
                {onuMapping.macAddress || "N/A"}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">OLT Name</span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {onuMapping.oltName || "N/A"}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Slot / PON Port</span>
              <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
                Slot {onuMapping.slot || "0"} / PON {onuMapping.ponPort || "1"}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Optical RX Power</span>
              <span className="text-sm font-mono font-bold text-emerald-600 mt-1 block">
                {onuMapping.rxPower !== undefined && onuMapping.rxPower !== null
                  ? `${onuMapping.rxPower} dBm`
                  : "N/A"}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Last Synced</span>
              <span className="text-sm font-mono text-slate-800 mt-1 block">
                {onuMapping.updatedAt
                  ? new Date(onuMapping.updatedAt).toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/70 text-center space-y-2">
            <Radio className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-800">
              No ONU Mapped to Account ({client.userId})
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your account is not yet linked to a specific OLT PON serial number, or optical telemetry is currently N/A.
            </p>
          </div>
        )}
      </div>
    );
  }

  // 6. INVOICES VIEW
  if (activeTab === "invoices") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Invoices</h2>
              <p className="text-xs text-slate-500">
                Billing invoices for subscriber {client.name} ({client.userId})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectTab("renew");
              setTimeout(() => onOpenPaymentModal(), 80);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pay Bill Now</span>
          </button>
        </div>

        {clientInvoices.length === 0 && billingHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
            No invoices found for your account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-3">Invoice No</th>
                  <th className="py-3 px-3">Billing Month / Date</th>
                  <th className="py-3 px-3">Package</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {inv.billingMonth} (Due: {inv.dueDate})
                    </td>
                    <td className="py-3 px-3 text-slate-700">{inv.package}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      ৳{inv.totalAmount}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          inv.status === "paid"
                            ? "text-emerald-600"
                            : inv.status === "overdue"
                              ? "text-rose-600"
                              : "text-amber-600"
                        }`}
                      >
                        ●{" "}
                        {inv.status === "paid"
                          ? "Paid"
                          : inv.status === "overdue"
                            ? "Overdue"
                            : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {inv.status !== "paid" ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTab("renew");
                            setTimeout(() => onOpenPaymentModal(), 80);
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer"
                        >
                          Pay Now
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
                {clientInvoices.length === 0 &&
                  billingHistory.map((rec, i) => (
                    <tr key={rec.id || i} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                        INV-{rec.dateKey?.replace(/-/g, "") || i + 1}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{rec.timestamp}</td>
                      <td className="py-3 px-3 text-slate-700">{rec.package}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        ৳{rec.amount}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-emerald-600">
                          ● {rec.status || "Paid"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onPrintReceipt(rec)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 7 & 8. REAL-TIME NOTIFICATIONS VIEW (No External Bot Required)
  if (activeTab === "notifications" || activeTab === "telegram") {
    const dlSpeed = client.speed || (bandwidthTelemetry?.downloadMbps ? `${bandwidthTelemetry.downloadMbps} Mbps` : "High-Speed Fiber");

    let clientTickets: any[] = Array.isArray(tickets) ? tickets : [];
    if (!clientTickets.length) {
      try {
        const raw = localStorage.getItem("isp_support_tickets");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            clientTickets = parsed.filter(
              (t: any) =>
                t.clientId === client.id ||
                t.phone === client.phone ||
                t.userId === client.userId
            );
          }
        }
      } catch {}
    }

    const synthesizedAlerts: NotificationItem[] = [];
    if (isExpired) {
      synthesizedAlerts.push({
        id: 990001,
        icon: "🚨",
        text: `⚠️ প্যাকেজ মেয়াদ উত্তীর্ণ (Package Expired): আপনার "${client.package}" প্যাকেজটির মেয়াদ (${client.expiry}) শেষ হয়েছে। সংযোগ সচল রাখতে এখনই রিনিউ করুন।`,
        time: "Live Status",
        read: false,
      });
    } else if (expiryInfo.daysLeft <= 5) {
      synthesizedAlerts.push({
        id: 990002,
        icon: "⏰",
        text: `⏰ মেয়াদ রিমাইন্ডার: আপনার "${client.package}" প্যাকেজের মেয়াদ আর ${expiryInfo.daysLeft} দিন বাকি আছে (মেয়াদ শেষ: ${client.expiry})।`,
        time: "Auto Reminder",
        read: false,
      });
    } else {
      synthesizedAlerts.push({
        id: 990003,
        icon: "✅",
        text: `🟢 সংযোগ সচল রয়েছে: আপনার "${client.package}" (${dlSpeed}) প্যাকেজটি সক্রিয় আছে। মেয়াদ: ${client.expiry} (${expiryInfo.daysLeft} দিন বাকি)।`,
        time: "Active",
        read: true,
      });
    }

    billingHistory.slice(0, 3).forEach((pay, i) => {
      const isPending =
        pay.status === "Pending" || pay.status === "Pending Approval";
      synthesizedAlerts.push({
        id: 990100 + i,
        icon: isPending ? "⏳" : "💳",
        text: isPending
          ? `⏳ পেমেন্ট যাচাই চলছে: আপনার ৳${pay.amount} (${pay.paymentMethod}) পেমেন্ট রিকোয়েস্টটি অ্যাডমিন ভেরিফিকেশনের অপেক্ষায় রয়েছে।`
          : `✅ পেমেন্ট সম্পন্ন: আপনার ৳${pay.amount} (${pay.paymentMethod}) পেমেন্ট সফলভাবে গৃহীত হয়েছে (${pay.package})।`,
        time: pay.timestamp || pay.dateKey,
        read: !isPending,
      });
    });

    clientTickets.slice(0, 2).forEach((t, i) => {
      synthesizedAlerts.push({
        id: 990200 + i,
        icon: "🎫",
        text: `🎫 সাপোর্ট টিকেট (${t.ticketNumber || t.id}): "${t.subject}" — বর্তমান স্ট্যাটাস: ${t.status}`,
        time: t.createdAt,
        read: t.status === "Resolved" || t.status === "Closed",
      });
    });

    const combinedNotifications = [...notifications, ...synthesizedAlerts];

    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Real-Time Notifications &amp; Alerts
              </h2>
              <p className="text-xs text-slate-500">
                আপনার অ্যাকাউন্টের পেমেন্ট, প্যাকেজ মেয়াদ, লাইন স্ট্যাটাস এবং সাপোর্ট টিকেটের সকল তাৎক্ষণিক নোটিফিকেশন
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if ("Notification" in window) {
                  window.Notification.requestPermission().then((perm) => {
                    if (perm === "granted") {
                      new window.Notification("Nexora Client Portal Alerts", {
                        body: "আপনার ব্রাউজার নোটিফিকেশন সফলভাবে চালু হয়েছে!",
                      });
                    }
                  });
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Browser Push Alerts</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {combinedNotifications.map((n, idx) => (
            <div
              key={n.id ? `${n.id}-${idx}` : idx}
              className={`py-3.5 px-3 rounded-xl flex items-start justify-between gap-4 transition-colors ${
                !n.read ? "bg-sky-50/60" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-base mt-0.5">
                  {n.icon && n.icon.length <= 3 ? n.icon : "🔔"}
                </span>
                <div>
                  <div
                    className={`text-xs leading-relaxed ${
                      !n.read
                        ? "text-slate-900 font-bold"
                        : "text-slate-700 font-medium"
                    }`}
                  >
                    {n.text}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                    {n.time}
                  </span>
                </div>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 9. PROFILE VIEW
  if (activeTab === "profile") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
            <p className="text-xs text-slate-500">
              Update your contact details for billing and support alerts
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Username / Client ID (Read-Only)
              </label>
              <input
                type="text"
                disabled
                value={client.userId}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Installation / Billing Address
            </label>
            <input
              type="text"
              value={profileAddress}
              onChange={(e) => setProfileAddress(e.target.value)}
              placeholder="House, Road, Area"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          {profileSavedMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
              {profileSavedMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingProfile}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold cursor-pointer"
          >
            {isSavingProfile ? "Saving..." : "Save Profile Changes"}
          </button>
        </form>
      </div>
    );
  }

  // 10. CHANGE PASSWORD VIEW
  if (activeTab === "password") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
            <p className="text-xs text-slate-500">
              Update the password for your client portal login ({client.userId})
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          {passwordMsg && (
            <div
              className={`p-3 rounded-xl border font-medium ${
                passwordMsg.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              {passwordMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingPassword}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold cursor-pointer"
          >
            {isSavingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    );
  }

  return null;
};
