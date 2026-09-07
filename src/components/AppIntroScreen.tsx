import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Wifi, Server, ShieldCheck, Zap } from "lucide-react";
import { AppSettings } from "../types";

interface AppIntroScreenProps {
  settings?: AppSettings;
  onFinish?: () => void;
  minDuration?: number; // milliseconds
}

export const AppIntroScreen: React.FC<AppIntroScreenProps> = ({
  settings,
  onFinish,
  minDuration = 2200,
}) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing System Core...");
  const companyName =
    settings?.companyName || settings?.appName || "Nexora network";
  const logo = settings?.logo;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(
        100,
        Math.floor((elapsed / minDuration) * 100),
      );
      setProgress(currentProgress);

      if (currentProgress < 30) {
        setStatusText("Loading ISP Cloud Node...");
      } else if (currentProgress < 65) {
        setStatusText("Connecting MikroTik Routing Engine...");
      } else if (currentProgress < 90) {
        setStatusText("Securing Gateway & Billing Protocol...");
      } else {
        setStatusText("System Ready!");
      }

      if (elapsed >= minDuration) {
        clearInterval(interval);
        if (onFinish) {
          setTimeout(onFinish, 300);
        }
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDuration, onFinish]);

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden select-none">
      {/* Background Animated Ambient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Network Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center max-w-sm w-full text-center"
      >
        {/* Logo Container with Pulsing Halo */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Animated Halo Rings */}
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-36 h-36 rounded-full border border-cyan-400/30 bg-cyan-500/5 shadow-[0_0_40px_rgba(6,182,212,0.2)]"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute w-44 h-44 rounded-full border border-dashed border-cyan-500/20"
          />

          {/* Logo Card */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative w-28 h-28 rounded-3xl bg-slate-900/90 border-2 border-cyan-500/40 p-3 shadow-2xl flex items-center justify-center backdrop-blur-md"
          >
            {logo ? (
              <img
                src={logo}
                alt="Company Logo"
                className="max-h-full max-w-full object-contain filter drop-shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Globe className="w-9 h-9 text-white animate-pulse" />
              </div>
            )}

            {/* Corner Badge */}
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] shadow-sm">
              <Zap className="w-3 h-3 text-white fill-white" />
            </div>
          </motion.div>
        </div>

        {/* Company Name / Typography */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-1.5 mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>{companyName}</span>
          </h1>
          <p className="text-xs font-semibold text-cyan-400 tracking-wider uppercase flex items-center justify-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>High-Speed ISP & Hotspot ERP Network</span>
          </p>
        </motion.div>

        {/* Progress Bar and Indicator */}
        <div className="w-full space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Server className="w-3.5 h-3.5 animate-spin" />
              {statusText}
            </span>
            <span className="font-mono font-bold text-white">{progress}%</span>
          </div>

          {/* Track */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>

          <div className="flex items-center justify-center gap-4 pt-1 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              256-Bit Encrypted
            </span>
            <span>•</span>
            <span>MikroTik RouterOS 7.x Ready</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
