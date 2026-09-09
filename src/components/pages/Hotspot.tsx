import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  HotspotUser,
  Package,
  HotspotPackageRequest,
  PageId,
} from "../../types";
import {
  Wifi,
  Plus,
  Unlink,
  UserCheck,
  Ticket,
  Printer,
  Download,
  RefreshCw,
  QrCode,
  Eye,
  Tags,
  Zap,
  Smartphone,
  Router,
  Bell,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Users,
} from "lucide-react";
import { Modal } from "../Modal";

interface HotspotProps {
  hotspotUsers: HotspotUser[];
  packages: Package[];
  hotspotRequests?: HotspotPackageRequest[];
  onAddHotspotUser: (user: HotspotUser) => void;
  onDisconnectHotspotUser: (mac: string) => void;
  onAddHotspotRequest?: (
    req: Omit<HotspotPackageRequest, "id" | "requestedAt" | "status">,
  ) => void;
  onApproveRequest?: (id: string, createdUserId?: string) => void;
  onRejectRequest?: (id: string) => void;
  onNavigate?: (page: PageId) => void;
  showToast: (
    msg: string,
    type: "info" | "success" | "error" | "warning",
  ) => void;
  onHardReset?: () => void;
}

interface Voucher {
  code: string;
  pin: string;
  package: string;
  price: string;
  validity: string;
  created: string;
  used: boolean;
}

export const HotspotPage: React.FC<HotspotProps> = ({
  hotspotUsers,
  packages,
  hotspotRequests = [],
  onAddHotspotUser,
  onDisconnectHotspotUser,
  onAddHotspotRequest,
  onApproveRequest,
  onRejectRequest,
  onNavigate,
  showToast,
  onHardReset,
}) => {
  const [activeTab, setActiveTab] = useState<
    "sessions" | "vouchers" | "requests" | "portal-packages"
  >("sessions");
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Active user modal form
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(packages[0]?.name || "Fiber 20");
  const [ip, setIp] = useState("192.168.1.150");

  // Voucher Generator state
  const [voucherQty, setVoucherQty] = useState(10);
  const [voucherPkg, setVoucherPkg] = useState(
    packages[0]?.name || "1 Hour Wifi",
  );
  const [voucherPrice, setVoucherPrice] = useState("20");
  const [voucherValidity, setVoucherValidity] = useState("1 Hour");
  const [voucherPrefix, setVoucherPrefix] = useState("FX-");

  // Request Approval & SMS Modal
  const [approveModalReq, setApproveModalReq] =
    useState<HotspotPackageRequest | null>(null);
  const [reqModalUser, setReqModalUser] = useState("");
  const [reqModalPass, setReqModalPass] = useState("");

  const handleOpenApproveModal = (req: HotspotPackageRequest) => {
    setApproveModalReq(req);
    setReqModalUser(
      req.createdUserId || "fe" + Math.floor(10000 + Math.random() * 90000),
    );
    setReqModalPass(
      req.createdPassword || "pass" + Math.floor(1000 + Math.random() * 9000),
    );
  };
  const [vouchers, setVouchers] = useState<Voucher[]>([
    {
      code: "FX-89421",
      pin: "9842",
      package: "1 Hour Wifi",
      price: "৳20",
      validity: "1 Hour",
      created: new Date().toLocaleDateString(),
      used: false,
    },
    {
      code: "FX-31298",
      pin: "4109",
      package: "24 Hour Pass",
      price: "৳50",
      validity: "24 Hours",
      created: new Date().toLocaleDateString(),
      used: false,
    },
    {
      code: "FX-77123",
      pin: "8821",
      package: "7 Day Pass",
      price: "৳200",
      validity: "7 Days",
      created: new Date().toLocaleDateString(),
      used: true,
    },
  ]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast("Username required.", "error");
      return;
    }

    const newUser: HotspotUser = {
      username: username.trim(),
      profile: profile,
      ip: ip.trim(),
      mac: "",
      uptime: "0m",
      bytesIn: "0 MB",
      bytesOut: "0 MB",
      status: "active",
    };

    onAddHotspotUser(newUser);
    showToast(`Registered Hotspot User: ${newUser.username}`, "success");
    setUsername("");
    setAddModalOpen(false);
  };

  const handleGenerateVouchers = (e: React.FormEvent) => {
    e.preventDefault();
    const generated: Voucher[] = [];
    for (let i = 0; i < voucherQty; i++) {
      const randomCode = Math.floor(10000 + Math.random() * 90000);
      const randomPin = Math.floor(1000 + Math.random() * 9000);
      generated.push({
        code: `${voucherPrefix}${randomCode}`,
        pin: String(randomPin),
        package: voucherPkg,
        price: `৳${voucherPrice}`,
        validity: voucherValidity,
        created: new Date().toLocaleDateString(),
        used: false,
      });
    }

    setVouchers((prev) => [...generated, ...prev]);
    showToast(`Generated ${voucherQty} Hotspot Vouchers!`, "success");
  };

  const handlePrintVouchers = () => {
    window.print();
    showToast("Sent Vouchers to printer!", "info");
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded w-fit border border-slate-200 ">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "sessions"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-900 hover:text-slate-900 "
            }`}
          >
            <Wifi className="w-4 h-4" /> Active Sessions ({hotspotUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("vouchers")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "vouchers"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-900 hover:text-slate-900 "
            }`}
          >
            <Ticket className="w-4 h-4" /> Hotspot Vouchers ({vouchers.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer relative ${
              activeTab === "requests"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-600 hover:text-amber-700 bg-amber-500/10"
            }`}
          >
            <Bell className="w-4 h-4" /> Package Requests (
            {hotspotRequests.filter((r) => r.status === "pending").length})
            {hotspotRequests.filter((r) => r.status === "pending").length >
              0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1 right-1" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("portal-packages")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "portal-packages"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-900 hover:text-slate-900 "
            }`}
          >
            <Tags className="w-4 h-4" /> Hotspot Page Packages (
            {packages.filter((p) => p.status === "active").length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onHardReset && (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to reset all hotspot data? (Hard Reset)",
                  )
                ) {
                  onHardReset();
                }
              }}
              className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border border-rose-500/30 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Clear all hotspot data"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span>Hard Reset (Reset Data)</span>
            </button>
          )}

          {activeTab === "sessions" ? (
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Hotspot User
            </button>
          ) : (
            <button
              onClick={handlePrintVouchers}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Voucher Cards
            </button>
          )}
        </div>
      </div>

      {activeTab === "sessions" ? (
        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-sky-600 " /> Active Hotspot Sessions
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200/80 text-slate-800 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="p-3.5 pl-5">Username</th>
                  <th className="p-3.5">Profile</th>
                  <th className="p-3.5">IP Address</th>
                  <th className="p-3.5">MAC Address</th>
                  <th className="p-3.5">Uptime</th>
                  <th className="p-3.5">Bytes Rx/Tx</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 ">
                {hotspotUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-800">
                      No active hotspot users.
                    </td>
                  </tr>
                ) : (
                  hotspotUsers.map((u, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-teal-500" />{" "}
                        {u.username}
                      </td>
                      <td className="p-3.5 font-semibold text-sky-600 ">
                        {u.profile}
                      </td>
                      <td className="p-3.5 font-mono text-slate-900 ">
                        {u.ip}
                      </td>
                      <td className="p-3.5 font-mono text-slate-800">
                        {u.mac}
                      </td>
                      <td className="p-3.5 font-mono text-slate-800">
                        {u.uptime}
                      </td>
                      <td className="p-3.5 font-mono text-xs">
                        ↓{u.bytesIn} / ↑{u.bytesOut}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-600 uppercase">
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={() => {
                            onDisconnectHotspotUser(u.mac);
                            showToast(`Disconnected ${u.username}`, "info");
                          }}
                          className="px-2.5 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          <Unlink className="w-3 h-3" /> Kick
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Voucher Batch Generator Form */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-sky-500" /> Generate Batch
              Vouchers
            </h3>

            <form
              onSubmit={handleGenerateVouchers}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-900 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={voucherQty}
                  onChange={(e) => setVoucherQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 "
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-900 mb-1">
                  Prefix
                </label>
                <input
                  type="text"
                  value={voucherPrefix}
                  onChange={(e) => setVoucherPrefix(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-900 mb-1">
                  Package Name
                </label>
                <input
                  type="text"
                  value={voucherPkg}
                  onChange={(e) => setVoucherPkg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 "
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-900 mb-1">
                  Price (BDT ৳)
                </label>
                <input
                  type="text"
                  value={voucherPrice}
                  onChange={(e) => setVoucherPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-900 mb-1">
                  Validity
                </label>
                <input
                  type="text"
                  value={voucherValidity}
                  onChange={(e) => setVoucherValidity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 "
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Generate
                </button>
              </div>
            </form>
          </div>

          {/* Printable Voucher Sheet Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
            {vouchers.map((v, i) => {
              const vQrUrl = `http://isp.net/login?username=${encodeURIComponent(v.code)}&password=${encodeURIComponent(v.pin)}&dns=isp.net&mac_bind=1`;
              return (
                <div
                  key={i}
                  className="bg-white border-2 border-dashed border-slate-300 rounded p-4 space-y-3 relative overflow-hidden shadow-xs text-center"
                >
                  <div className="flex justify-between items-start border-b border-slate-200 pb-2 text-left">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-sky-600 tracking-wider">
                        Nexora network Wifi
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 ">
                        {v.package}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 font-mono">
                      {v.price}
                    </span>
                  </div>

                  {/* Scannable QRCode SVG */}
                  <div className="p-1.5 bg-white rounded border border-slate-200 inline-block mx-auto">
                    <QRCodeSVG
                      value={vQrUrl}
                      size={100}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <div className="bg-slate-50 p-2 rounded space-y-0.5 font-mono">
                    <div className="text-[9px] text-slate-800 uppercase font-sans">
                      User Code / PIN
                    </div>
                    <div className="text-base font-extrabold tracking-wider text-slate-900 ">
                      {v.code}
                    </div>
                    <div className="text-xs text-sky-600 font-bold">
                      PIN: {v.pin}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-800 font-medium pt-1">
                    <span>DNS: isp.net</span>
                    <span className="text-amber-600 font-bold">
                      🔒 Single Phone Lock
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "portal-packages" && (
        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200/80 pb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tags className="w-5 h-5 text-sky-500" /> Hotspot Login Page
                Customer Tariff Cards
              </h4>
              <p className="text-xs text-slate-800">
                These packages are automatically displayed on the public Hotspot
                captive portal login page for connecting clients.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold w-fit">
              ⚡ Live Synced (
              {packages.filter((p) => p.status === "active").length} Active
              Plans)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...packages]
              .sort((a, b) => {
                const pA = parseFloat(String(a.price).replace(/[^\d.]/g, "")) || 0;
                const pB = parseFloat(String(b.price).replace(/[^\d.]/g, "")) || 0;
                return pA - pB;
              })
              .map((p, idx) => {
              const isMobile = p.deviceType === "Mobile";
              const numericSpeed = p.speed.replace(/\D/g, "");

              const colorGradients = [
                // 1. Purple
                { bg: "from-purple-600 via-indigo-600 to-violet-800" },
                // 2. Blue
                { bg: "from-blue-600 via-blue-700 to-indigo-800" },
                // 3. Cyan
                { bg: "from-cyan-500 via-teal-600 to-sky-700" },
                // 4. Green
                { bg: "from-emerald-500 via-teal-600 to-green-700" },
                // 5. Pink
                { bg: "from-pink-500 via-rose-500 to-purple-700" },
                // 6. Orange
                { bg: "from-orange-500 via-amber-600 to-red-600" },
                // 7. Red
                { bg: "from-red-600 via-rose-600 to-red-800" },
              ];

              const theme = colorGradients[idx % colorGradients.length];

              return (
                <div
                  key={p.id}
                  className={`flex flex-col rounded-[28px] overflow-hidden transition-all duration-300 bg-gradient-to-br ${theme.bg} shadow-md hover:shadow-xl hover:scale-[1.01] text-white border-0 p-5 space-y-4 text-center justify-between min-h-[440px]`}
                >
                  {/* Header Badges */}
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
                      <Wifi className="w-3 h-3 text-white" />
                      <span>Hotspot</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20">
                      {p.status === "active" ? "● Live" : "Offline"}
                    </span>
                  </div>

                  {/* Speed Indicator */}
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-black tracking-tight drop-shadow-md leading-none">
                      {numericSpeed || "0"}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-90 mt-1">
                      Mbps Speed
                    </span>
                  </div>

                  {/* Name and validity */}
                  <div className="space-y-1">
                    <h5 className="text-sm font-black tracking-tight leading-snug uppercase max-w-[260px] mx-auto text-white">
                      {p.name.replace(/\s*\(Monthly Pac\)\s*/i, "")}
                    </h5>
                    <p className="text-[10px] font-bold text-white/90 uppercase tracking-widest">
                      📅 {p.validity} Unlimited
                    </p>
                  </div>

                  {/* Tech Details Box */}
                  <div className="bg-white/10 rounded-2xl p-3 text-center space-y-1 backdrop-blur-xs border border-white/5 text-[10px] font-semibold text-white/95">
                    <div className="flex justify-between">
                      <span className="opacity-80">Download Speed:</span>
                      <span className="font-bold">↓ {p.speed}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-1 mt-1">
                      <span className="opacity-80">Upload Speed:</span>
                      <span className="font-bold">↑ {p.upload}</span>
                    </div>
                  </div>

                  {/* Mobile vs Router Device Tag */}
                  <div className="inline-block mx-auto px-2.5 py-0.5 bg-white/15 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-white/10">
                    {isMobile ? "📱 Mobile Package" : "📶 Router Package"}
                  </div>

                  {/* Price tag */}
                  <div className="text-2xl font-black drop-shadow-sm">
                    ৳{p.price}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: HOTSPOT PACKAGE REQUESTS */}
      {activeTab === "requests" && (
        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" /> Hotspot Client
                Package Requests
              </h3>
              <p className="text-xs text-slate-800 mt-1">
                Subscribers package purchase requests submitted via Hotspot
                portal
              </p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("clients")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Create Client ID in Clients Page</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200/80 text-slate-800 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="p-3 pl-4">Client Name</th>
                  <th className="p-3">Mobile Number</th>
                  <th className="p-3">Package</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Bandwidth</th>
                  <th className="p-3">MAC / IP</th>
                  <th className="p-3">Requested At</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 ">
                {hotspotRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-800">
                      No hotspot package requests found.
                    </td>
                  </tr>
                ) : (
                  hotspotRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-3 pl-4 font-bold text-slate-900 flex items-center gap-2">
                        {req.photo ? (
                          <img src={req.photo} alt="Client" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs">
                            <Users className="w-4 h-4" />
                          </div>
                        )}
                        {req.clientName}
                      </td>
                      <td className="p-3 font-mono font-bold text-sky-600 ">
                        📞 {req.phone}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                          {req.package}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-extrabold text-amber-600 ">
                        ৳{req.price}
                      </td>
                      <td className="p-3 font-mono text-slate-900 ">
                        {req.bandwidth}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-800">
                        {req.macAddress || "Auto-Detect"}
                      </td>
                      <td className="p-3 text-slate-800 text-[11px]">
                        {req.requestedAt}
                      </td>
                      <td className="p-3">
                        {req.status === "pending" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/30 animate-pulse">
                            Pending
                          </span>
                        )}
                        {req.status === "approved" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {req.status === "rejected" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/30 flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        {req.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenApproveModal(req)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" /> ID
                              & SMS Send
                            </button>
                            {onRejectRequest && (
                              <button
                                onClick={() => onRejectRequest(req.id)}
                                className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-[11px] font-semibold rounded-lg border border-rose-500/20 cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-800">
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal
        isOpen={addModalOpen}
        title="Add Hotspot User"
        onClose={() => setAddModalOpen(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. guest_wifi"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Profile
              </label>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="10.5.5.15"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/80 ">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Add Hotspot User
            </button>
          </div>
        </form>
      </Modal>

      {/* APPROVE & SEND SMS MODAL */}
      <Modal
        isOpen={!!approveModalReq}
        title="Approve Hotspot Client ID & Send SMS"
        onClose={() => setApproveModalReq(null)}
      >
        {approveModalReq && (
          <div className="space-y-4">
            <div className="bg-sky-500/10 border border-sky-500/30 rounded p-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-800 ">Subscriber Name:</span>
                <strong className="text-slate-900 ">
                  {approveModalReq.clientName}
                </strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-800 ">Mobile Number:</span>
                <strong className="text-sky-600 font-mono">
                  📞 {approveModalReq.phone}
                </strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-800 ">Package & Bill:</span>
                <strong className="text-emerald-600 ">
                  {approveModalReq.package} (৳{approveModalReq.price})
                </strong>
              </div>
              {approveModalReq.gateway && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-800 ">
                    Payment Gateway & TrxID:
                  </span>
                  <span className="font-mono text-amber-600 ">
                    {approveModalReq.gateway} - {approveModalReq.transaction}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hotspot User ID (Username)
                </label>
                <input
                  type="text"
                  value={reqModalUser}
                  onChange={(e) => setReqModalUser(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="text"
                  value={reqModalPass}
                  onChange={(e) => setReqModalPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 ">
                Customer Message Preview (SMS / WhatsApp Text)
              </label>
              <textarea
                readOnly
                rows={3}
                value={`Dear ${approveModalReq.clientName}, Welcome to Nexora network! Your Hotspot User ID: ${reqModalUser}, Password: ${reqModalPass}। Login Portal: http://192.168.88.1/login`}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 font-sans"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const msg = `Dear ${approveModalReq.clientName}, Welcome to Nexora network! Your Hotspot User ID: ${reqModalUser}, Password: ${reqModalPass}। Login Portal: http://192.168.88.1/login`;
                    navigator.clipboard.writeText(msg);
                    showToast("📋 SMS message copied to clipboard!", "success");
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 cursor-pointer flex items-center gap-1"
                >
                  📋 Copy Text
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-200 ">
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = approveModalReq.phone.replace(
                    /[^0-9]/g,
                    "",
                  );
                  const msg = `Dear ${approveModalReq.clientName}, Welcome to Nexora network! Your Hotspot User ID: ${reqModalUser}, Password: ${reqModalPass}। Login Portal: http://192.168.88.1/login`;
                  window.open(
                    `sms:${approveModalReq.phone}?body=${encodeURIComponent(msg)}`,
                    "_self",
                  );
                }}
                className="py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Smartphone className="w-4 h-4" />
                <span>📱 Send via Mobile SMS App</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cleanPhone = approveModalReq.phone.replace(
                    /[^0-9]/g,
                    "",
                  );
                  const formattedPhone = cleanPhone.startsWith("880")
                    ? cleanPhone
                    : "88" + cleanPhone.replace(/^0/, "0");
                  const msg = `Dear ${approveModalReq.clientName}, Welcome to Nexora network! Your Hotspot User ID: ${reqModalUser}, Password: ${reqModalPass}। Login Portal: http://192.168.88.1/login`;
                  window.open(
                    `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`,
                    "_blank",
                  );
                }}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Smartphone className="w-4 h-4" />
                <span>🟢 Send via WhatsApp</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const newHotspotUser: HotspotUser = {
                    username: reqModalUser,
                    profile: approveModalReq.package,
                    ip: approveModalReq.ipAddress || "Dynamic",
                    mac: approveModalReq.macAddress || "",
                    uptime: "0m",
                    bytesIn: "0 B",
                    bytesOut: "0 B",
                    status: "active",
                  };
                  onAddHotspotUser(newHotspotUser);
                  if (onApproveRequest) {
                    onApproveRequest(approveModalReq.id, reqModalUser);
                  }
                  showToast(
                    `⚡ Hotspot User ${reqModalUser} activated and approved successfully!`,
                    "success",
                  );
                  setApproveModalReq(null);
                }}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Activate & Save Client ID</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
