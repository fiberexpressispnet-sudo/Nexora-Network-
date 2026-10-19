import React from "react";
import {
  Wifi,
  Zap,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Bot,
  FileText,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Activity,
  Server,
  Radio,
  Clock,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { Client, PaymentRecord, Invoice } from "../../types";
import { getClientExpiryInfo } from "../../lib/expiryUtils";
import { ClientNavTab } from "./ClientSidebarAndHeader";

interface ClientOverviewTabProps {
  client: Client;
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
  billingHistory: PaymentRecord[];
  clientInvoices: Invoice[];
  onuMapping: any | null;
  isAutoFixing: boolean;
  autoFixSuccessMsg: string | null;
  onAutoFixLine: () => void;
  onSelectTab: (tab: ClientNavTab) => void;
  onOpenPaymentModal: () => void;
  onPrintReceipt: (payment: PaymentRecord) => void;
}

export const ClientOverviewTab: React.FC<ClientOverviewTabProps> = ({
  client,
  liveCountdown,
  bandwidthTelemetry,
  billingHistory,
  clientInvoices,
  onuMapping,
  isAutoFixing,
  autoFixSuccessMsg,
  onAutoFixLine,
  onSelectTab,
  onOpenPaymentModal,
  onPrintReceipt,
}) => {
  const expiryInfo = getClientExpiryInfo(client.expiry);
  const isExpired = expiryInfo.isExpired || client.status === "expired";
  const isSuspended = client.status === "suspended";
  const isOnline = client.status === "online" && !isExpired && !isSuspended;

  // Dynamic Welcome Subtitle & Status Badge
  let statusLabel: "Active" | "Offline" | "Expired" | "Suspended" = "Active";
  let statusSubtitle = "Your internet connection is active and running smoothly.";
  let statusBadgeClasses =
    "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30";
  let statusDotClasses = "bg-emerald-400 animate-pulse";

  if (isSuspended) {
    statusLabel = "Suspended";
    statusSubtitle = "Your service is currently suspended. Please contact support.";
    statusBadgeClasses = "bg-rose-500/25 text-rose-200 border border-rose-400/40";
    statusDotClasses = "bg-rose-400";
  } else if (isExpired) {
    statusLabel = "Expired";
    statusSubtitle = "Your package has expired. Please renew your package.";
    statusBadgeClasses = "bg-amber-500/25 text-amber-200 border border-amber-400/40";
    statusDotClasses = "bg-amber-400";
  } else if (!isOnline) {
    statusLabel = "Offline";
    statusSubtitle = "Your connection is currently offline.";
    statusBadgeClasses = "bg-rose-500/25 text-rose-200 border border-rose-400/40";
    statusDotClasses = "bg-rose-400";
  }

  const hasActivePackage = Boolean(client.package && client.package.trim() !== "");
  const connectionType =
    client.deviceType === "Mobile"
      ? "Hotspot"
      : client.connectionType || "Fiber (PPPoE)";
  const dlSpeed = client.downloadSpeed || client.bandwidth || "N/A";
  const ulSpeed = client.uploadSpeed || "N/A";

  // SVG Graph computation for Live Bandwidth
  const svgW = 480;
  const svgH = 120;
  const maxScale = Math.max(
    parseFloat(String(dlSpeed).replace(/[^\d.]/g, "")) || 20,
    ...bandwidthTelemetry.history.map((h) => Math.max(h.dl, h.ul)),
    10
  );
  const historyPts = bandwidthTelemetry.history;
  const coords = historyPts.map((pt, i) => {
    const x = historyPts.length > 1 ? (i / (historyPts.length - 1)) * svgW : 0;
    const yDl = svgH - (pt.dl / maxScale) * (svgH - 20) - 8;
    const yUl = svgH - (pt.ul / maxScale) * (svgH - 20) - 8;
    return { x, yDl, yUl };
  });

  const dlPath = coords.reduce((acc, c, i) => {
    if (i === 0) return `M ${c.x},${c.yDl}`;
    const prev = coords[i - 1];
    const cpX = (prev.x + c.x) / 2;
    return `${acc} C ${cpX},${prev.yDl} ${cpX},${c.yDl} ${c.x},${c.yDl}`;
  }, "");

  const ulPath = coords.reduce((acc, c, i) => {
    if (i === 0) return `M ${c.x},${c.yUl}`;
    const prev = coords[i - 1];
    const cpX = (prev.x + c.x) / 2;
    return `${acc} C ${cpX},${prev.yUl} ${cpX},${c.yUl} ${c.x},${c.yUl}`;
  }, "");

  const dlArea = coords.length > 1 ? `${dlPath} L ${svgW},${svgH} L 0,${svgH} Z` : "";

  return (
    <div className="space-y-6">
      {/* 4. WELCOME HEADER BANNER */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0f172a] via-[#1e3a8a] to-[#312e81] text-white p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs border border-white/15 bg-white/10">
              <span className={`w-2 h-2 rounded-full ${statusDotClasses}`} />
              <span>● {statusLabel}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Hello, {client.name}!
            </h1>
            <p className="text-sm text-blue-100/90 max-w-xl">{statusSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectTab("account")}
              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-blue-50 text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>View Account Details</span>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
      </div>

      {/* TOP GRID: 5. CURRENT PACKAGE CARD & 6. LIVE BANDWIDTH CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 5. CURRENT PACKAGE CARD (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-500">Current Package</span>
                {hasActivePackage ? (
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {client.package} ({connectionType})
                  </h2>
                ) : (
                  <h2 className="text-xl font-bold text-slate-400 mt-0.5">
                    No Active Package
                  </h2>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700"
                    : isExpired
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                }`}
              >
                <span>● {statusLabel}</span>
              </span>
            </div>

            {hasActivePackage ? (
              <>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                    <div className="text-[11px] font-medium text-slate-500">Download</div>
                    <div className="text-base font-bold font-mono text-blue-700 mt-0.5 tabular-nums">
                      {dlSpeed.includes("Mbps") ? dlSpeed : `${dlSpeed} Mbps`}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <div className="text-[11px] font-medium text-slate-500">Upload</div>
                    <div className="text-base font-bold font-mono text-indigo-700 mt-0.5 tabular-nums">
                      {ulSpeed.includes("Mbps") ? ulSpeed : `${ulSpeed} Mbps`}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500">Connection Type</span>
                    <span className="font-semibold text-slate-900">{connectionType}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500">Activation Date</span>
                    <span className="font-mono font-medium text-slate-800 tabular-nums">
                      {client.createdAt || "N/A"}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500">Expiry Date</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 block tabular-nums">
                        {client.expiry || "N/A"}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          liveCountdown.isExpired ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {liveCountdown.isExpired
                          ? liveCountdown.formattedText
                          : `${liveCountdown.days} days remaining`}
                      </span>
                    </div>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500">Monthly Bill</span>
                    <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                      ৳{client.price || "0"}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500">Service Status</span>
                    <span
                      className={`font-semibold ${
                        isOnline
                          ? "text-emerald-600"
                          : isExpired
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}
                    >
                      ● {statusLabel}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                You currently do not have an active internet package. Click below to choose a plan.
              </div>
            )}
          </div>

          <div className="pt-2">
            {hasActivePackage ? (
              <button
                type="button"
                onClick={() => onSelectTab("renew")}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Renew Package</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectTab("buy-package")}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Buy Package</span>
              </button>
            )}
          </div>
        </div>

        {/* 6. LIVE BANDWIDTH CARD (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Live Bandwidth</h2>
                <p className="text-xs text-slate-500">
                  Real-time MikroTik / LibreQoS subscriber queue traffic
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {bandwidthTelemetry.available ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Real-time</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Telemetry Offline</span>
                </span>
              )}
              {bandwidthTelemetry.lastUpdated && (
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  Updated: {bandwidthTelemetry.lastUpdated}
                </span>
              )}
            </div>
          </div>

          {bandwidthTelemetry.available ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      <span>Download</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                      {bandwidthTelemetry.downloadMbps.toFixed(1)}{" "}
                      <span className="text-xs font-normal text-slate-500">Mbps</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Upload</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                      {bandwidthTelemetry.uploadMbps.toFixed(1)}{" "}
                      <span className="text-xs font-normal text-slate-500">Mbps</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SVG Area Chart */}
              <div className="relative h-36 w-full bg-slate-50/70 rounded-xl border border-slate-100 p-3 overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="clientDlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {dlArea && <path d={dlArea} fill="url(#clientDlGrad)" />}
                  {dlPath && (
                    <path
                      d={dlPath}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}
                  {ulPath && (
                    <path
                      d={ulPath}
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <div className="absolute bottom-2 right-3 flex items-center gap-4 text-[11px] font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-blue-600 inline-block" /> Download
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-violet-600 inline-block" /> Upload
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-[210px] rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <Activity className="w-8 h-8 text-slate-400" />
              <div className="text-sm font-semibold text-slate-700">
                Live bandwidth unavailable
              </div>
              <p className="text-xs text-slate-500 max-w-md">
                Real-time router queue telemetry is currently unavailable because the MikroTik gateway is not streaming active session data or your connection is offline.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
            <span>Subscribed Speed: {dlSpeed}</span>
            <button
              type="button"
              onClick={() => onSelectTab("bandwidth")}
              className="font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Open Full Bandwidth Monitor →
            </button>
          </div>
        </div>
      </div>

      {/* 7. QUICK ACTIONS CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
          <p className="text-xs text-slate-500">
            Instant self-service shortcuts for your account
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => onSelectTab("buy-package")}
            className="p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex flex-col items-center text-center gap-2.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Buy Package</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("renew")}
            className="p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex flex-col items-center text-center gap-2.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Renew Package</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab("renew");
              setTimeout(() => onOpenPaymentModal(), 80);
            }}
            className="p-4 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all flex flex-col items-center text-center gap-2.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Payment</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("tickets")}
            className="p-4 rounded-xl border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/40 transition-all flex flex-col items-center text-center gap-2.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Support Ticket</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("notifications")}
            className="p-4 rounded-xl border border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/40 transition-all flex flex-col items-center text-center gap-2.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("invoices")}
            className="p-4 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all flex flex-col items-center text-center gap-2.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800">View Invoice</span>
          </button>
        </div>
      </div>

      {/* 9. NETWORK STATUS & ONU / OPTICAL INFO SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Network Status</h3>
                <p className="text-xs text-slate-500">Gateway & session information</p>
              </div>
            </div>
            <span
              className={`text-xs font-semibold ${
                isOnline ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              ● {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Internet Status</span>
              <span
                className={`font-bold mt-0.5 block ${
                  isOnline ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                ● {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Gateway Router</span>
              <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                {client.router || "N/A"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Assigned IP</span>
              <span className="font-mono font-semibold text-slate-900 mt-0.5 block truncate">
                {client.ipAddress || client.ip || "N/A"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">MAC Address</span>
              <span className="font-mono font-semibold text-slate-900 mt-0.5 block truncate">
                {client.macAddress || client.mac || onuMapping?.macAddress || "N/A"}
              </span>
            </div>
          </div>

          <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onAutoFixLine}
              disabled={isAutoFixing}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoFixing ? "animate-spin" : ""}`} />
              <span>{isAutoFixing ? "Syncing Line..." : "1-Click Auto-Fix Line"}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("network")}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Run Ping Diagnostics →
            </button>
          </div>

          {autoFixSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{autoFixSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* ONU / Optical Info Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ONU / Optical Info</h3>
                <p className="text-xs text-slate-500">GPON / EPON fiber unit status</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab("onu")}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Details →
            </button>
          </div>

          {onuMapping ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">ONU Serial Number</span>
                <span className="font-mono font-semibold text-slate-900 mt-0.5 block truncate">
                  {onuMapping.serialNumber || "N/A"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">OLT / PON Port</span>
                <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                  {onuMapping.oltName || "OLT"} (Slot {onuMapping.slot || "0"}/PON{" "}
                  {onuMapping.ponPort || "1"})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Optical RX Power</span>
                <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                  {onuMapping.rxPower !== undefined && onuMapping.rxPower !== null
                    ? `${onuMapping.rxPower} dBm`
                    : "N/A"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">ONU MAC Address</span>
                <span className="font-mono font-semibold text-slate-900 mt-0.5 block truncate">
                  {onuMapping.macAddress || "N/A"}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1.5">
              <div className="text-xs font-semibold text-slate-700">
                No ONU Device Mapped
              </div>
              <p className="text-xs text-slate-500">
                Optical ONU telemetry will appear here once your account is mapped on the OLT.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 8. PAYMENT HISTORY SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Payment History</h2>
            <p className="text-xs text-slate-500">
              Recent transactions for your account ({client.userId})
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab("payments")}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All →</span>
          </button>
        </div>

        {billingHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
            No payment history records found for your account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Invoice No</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Transaction ID</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingHistory.slice(0, 5).map((rec, idx) => {
                  const rawStatus = String(rec.status || "Completed").toLowerCase();
                  const isPaid =
                    rawStatus === "completed" ||
                    rawStatus === "approved" ||
                    rawStatus === "paid";
                  const isRejected =
                    rawStatus === "rejected" || rawStatus === "refunded";
                  const displayStatus = isPaid
                    ? "Paid"
                    : isRejected
                      ? "Rejected"
                      : "Pending";

                  const matchedInv = clientInvoices.find(
                    (inv) =>
                      inv.transactionId === rec.id || inv.billingMonth === rec.monthKey
                  );
                  const invoiceNo =
                    matchedInv?.invoiceNumber || `INV-${rec.dateKey?.replace(/-/g, "") || idx + 1}`;

                  return (
                    <tr key={rec.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap tabular-nums">
                        {rec.timestamp || rec.dateKey || "N/A"}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800 whitespace-nowrap">
                        {invoiceNo}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        ৳{rec.amount}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {rec.paymentMethod}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {rec.id}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            isPaid
                              ? "text-emerald-600"
                              : isRejected
                                ? "text-rose-600"
                                : "text-amber-600"
                          }`}
                        >
                          ● {displayStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onPrintReceipt(rec)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print</span>
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
    </div>
  );
};
