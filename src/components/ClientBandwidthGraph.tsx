import React, { useState, useEffect } from "react";
import { Activity, ArrowDown, ArrowUp, Wifi, WifiOff, Zap } from "lucide-react";
import { Client } from "../types";

interface ClientBandwidthGraphProps {
  client: Client;
  compact?: boolean;
}

interface DataPoint {
  time: string;
  download: number;
  upload: number;
}

export const ClientBandwidthGraph: React.FC<ClientBandwidthGraphProps> = ({
  client,
  compact = false,
}) => {
  const isOnline = client.status === "online";
  const maxDl = Math.max(5, parseFloat(client.downloadSpeed || "20"));
  const maxUl = Math.max(2, parseFloat(client.uploadSpeed || "10"));

  // 25 data points sliding window (clean 0.0 baseline)
  const [dataHistory, setDataHistory] = useState<DataPoint[]>(() => {
    const initial: DataPoint[] = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const timeStr = new Date(now - i * 1500).toLocaleTimeString([], {
        minute: "2-digit",
        second: "2-digit",
      });
      initial.push({
        time: timeStr,
        download: 0.0,
        upload: 0.0,
      });
    }
    return initial;
  });

  const [currentSpeed, setCurrentSpeed] = useState({
    download: 0.0,
    upload: 0.0,
    ping: 0,
    packets: 0,
  });

  useEffect(() => {
    if (!isOnline) {
      setCurrentSpeed({ download: 0.0, upload: 0.0, ping: 0, packets: 0 });
      return;
    }

    let isMounted = true;

    const pollClientTelemetry = async () => {
      let dl = 0.0;
      let ul = 0.0;
      let pkts = 0;

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
                  item.name === `nexora_${client.userId}` ||
                  item.name === client.userId ||
                  (client.ipAddress && item.target?.includes(client.ipAddress)),
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

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], {
        minute: "2-digit",
        second: "2-digit",
      });

      const finalDl = parseFloat(dl.toFixed(1));
      const finalUl = parseFloat(ul.toFixed(1));

      setCurrentSpeed({
        download: finalDl,
        upload: finalUl,
        ping: finalDl > 0 ? 2 : 0,
        packets: pkts,
      });

      setDataHistory((prev) => {
        const next = [...prev.slice(1)];
        next.push({ time: timeStr, download: finalDl, upload: finalUl });
        return next;
      });
    };

    pollClientTelemetry();
    const interval = setInterval(pollClientTelemetry, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [client.userId, client.ipAddress, isOnline]);

  // Mini sparkline for compact mode
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-24 h-7 bg-slate-50 border border-slate-200 rounded-lg p-0.5 relative overflow-hidden flex items-end">
          {dataHistory.map((d, idx) => {
            const heightPct = isOnline
              ? Math.min(100, (d.download / (maxDl || 1)) * 100)
              : 0;
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-end h-full"
              >
                <div
                  className={`w-full rounded-t-xs transition-all duration-300 ${
                    isOnline
                      ? "bg-cyan-400 shadow-[0_0_4px_#06b6d4]"
                      : "bg-rose-500/40"
                  }`}
                  style={{
                    height: `${isOnline ? Math.max(10, heightPct) : 2}%`,
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="text-[11px] font-mono leading-tight">
          {isOnline ? (
            <div className="text-[#3c8dbc] font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 animate-pulse text-[#3c8dbc]" />
              <span>{currentSpeed.download} Mbps</span>
            </div>
          ) : (
            <div className="text-rose-500 font-bold flex items-center gap-1">
              <WifiOff className="w-3 h-3 text-rose-500" />
              <span>0.0 Mbps (DOWN)</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SVG Area calculations for full mode
  const svgWidth = 500;
  const svgHeight = 110;
  const graphMax = Math.max(maxDl * 1.1, 10);

  const coords = dataHistory.map((p, idx) => {
    const x = (idx / (dataHistory.length - 1)) * svgWidth;
    const yDl = svgHeight - (p.download / graphMax) * (svgHeight - 15) - 5;
    const yUl = svgHeight - (p.upload / graphMax) * (svgHeight - 15) - 5;
    return { x, yDl, yUl, ...p };
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

  const dlArea = `${dlPath} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;

  return (
    <div className="bg-white border border-cyan-500/30 rounded p-3.5 text-slate-800 shadow-lg space-y-3 font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[#3c8dbc]">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>LIVE BANDWIDTH GRAPH</span>
              <span className="text-[9px] font-mono font-bold bg-cyan-500/20 text-[#3c8dbc] px-1.5 py-0.2 rounded border border-cyan-500/30">
                {client.userId}
              </span>
            </span>
            <p className="text-[10px] text-slate-800 font-mono">
              Package Limit:{" "}
              <strong className="text-[#3c8dbc]">
                ↓{client.downloadSpeed || "20"}M / ↑{client.uploadSpeed || "10"}
                M
              </strong>
            </p>
          </div>
        </div>

        {/* Online / Offline Status Pill */}
        <div
          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1.5 ${
            isOnline
              ? "bg-emerald-500/20 text-[#00a65a] border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
          }`}
        >
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Wifi className="w-3 h-3" /> ONLINE (STREAMING)
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <WifiOff className="w-3 h-3" /> OFFLINE (DOWN)
            </>
          )}
        </div>
      </div>

      {/* Live Speed Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        {/* RX Download */}
        <div className="bg-white border border-cyan-500/30 rounded-lg p-2">
          <span className="text-[10px] text-slate-800 flex items-center gap-1">
            <ArrowDown className="w-3 h-3 text-[#3c8dbc]" /> RX (Download)
          </span>
          <div
            className={`text-base font-black tracking-tight mt-0.5 ${isOnline ? "text-[#3c8dbc]" : "text-slate-800"}`}
          >
            {currentSpeed.download}{" "}
            <span className="text-[10px] text-slate-800 font-semibold">
              Mbps
            </span>
          </div>
        </div>

        {/* TX Upload */}
        <div className="bg-white border border-emerald-500/30 rounded-lg p-2">
          <span className="text-[10px] text-slate-800 flex items-center gap-1">
            <ArrowUp className="w-3 h-3 text-[#00a65a]" /> TX (Upload)
          </span>
          <div
            className={`text-base font-black tracking-tight mt-0.5 ${isOnline ? "text-emerald-300" : "text-slate-800"}`}
          >
            {currentSpeed.upload}{" "}
            <span className="text-[10px] text-slate-800 font-semibold">
              Mbps
            </span>
          </div>
        </div>

        {/* Latency */}
        <div className="bg-white border border-slate-200 rounded-lg p-2">
          <span className="text-[10px] text-slate-800">Ping Latency</span>
          <div className="text-base font-black text-amber-300 tracking-tight mt-0.5">
            {isOnline ? `${currentSpeed.ping} ms` : "N/A (Timeout)"}
          </div>
        </div>

        {/* Live Packets */}
        <div className="bg-white border border-slate-200 rounded-lg p-2">
          <span className="text-[10px] text-slate-800">Packets/Sec</span>
          <div className="text-base font-black text-purple-300 tracking-tight mt-0.5">
            {currentSpeed.packets} p/s
          </div>
        </div>
      </div>

      {/* SVG Wave Graphic */}
      <div className="relative h-[110px] bg-slate-50 border border-slate-200 rounded-lg overflow-hidden p-1">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-cyan-500 text-[8px] font-mono text-[#3c8dbc] pl-1">
            {maxDl}M
          </div>
          <div className="border-b border-cyan-500 text-[8px] font-mono text-[#3c8dbc] pl-1">
            {Math.floor(maxDl / 2)}M
          </div>
          <div className="border-b border-cyan-500 text-[8px] font-mono text-[#3c8dbc] pl-1">
            0M
          </div>
        </div>

        {!isOnline && (
          <div className="absolute inset-0 bg-rose-950/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10">
            <span className="text-xs font-mono font-extrabold text-rose-400 bg-rose-950/80 border border-rose-500/40 px-3 py-1 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1.5">
              <WifiOff className="w-4 h-4 text-rose-400" /> CLIENT IS OFFLINE
              (TRAFFIC FLATLINE)
            </span>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id={`clientDlGrad-${client.id}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#06b6d4"
                stopOpacity={isOnline ? "0.4" : "0.05"}
              />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={dlArea} fill={`url(#clientDlGrad-${client.id})`} />

          {/* Upload stroke */}
          <path
            d={ulPath}
            fill="none"
            stroke={isOnline ? "#10b981" : "#64748b"}
            strokeWidth="1.5"
            strokeDasharray={isOnline ? "none" : "4 4"}
          />

          {/* Download stroke */}
          <path
            d={dlPath}
            fill="none"
            stroke={isOnline ? "#06b6d4" : "#f43f5e"}
            strokeWidth="2.5"
            className={
              isOnline ? "drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" : ""
            }
          />
        </svg>
      </div>

      {/* Footer live status bar */}
      <div className="flex justify-between items-center text-[10px] font-mono text-slate-800">
        <span>
          Interface:{" "}
          {client.deviceType === "Mobile" ? "wlan0-hotspot" : "ether2-lan"}
        </span>
        <span>
          Queue:{" "}
          {client.burstSpeed && client.burstSpeed !== "0M/0M"
            ? `Burst ${client.burstSpeed}`
            : "Standard"}
        </span>
        <span
          className={
            isOnline
              ? "text-[#00a65a] font-bold animate-pulse"
              : "text-slate-800"
          }
        >
          {isOnline ? "● REALTIME ACTIVE" : "○ DISCONNECTED"}
        </span>
      </div>
    </div>
  );
};
