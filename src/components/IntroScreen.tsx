import React, { useEffect, useState } from "react";
import { AppSettings } from "../types";
import {
  Wifi,
  ShieldCheck,
  Zap,
  Server,
  ChevronRight,
  Activity,
} from "lucide-react";

interface IntroScreenProps {
  settings?: AppSettings;
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({
  settings,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const statusMessages = [
    "Initializing Core Network Node...",
    "Connecting Optical Fiber Backbone...",
    "Loading High-Speed Bandwidth Profiles...",
    "Synchronizing Billing & Security Modules...",
    "Network Gateway Active & Online!",
  ];

  useEffect(() => {
    // Progress increment timer
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const step = Math.floor(Math.random() * 15) + 12;
        const next = Math.min(100, prev + step);
        return next;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Status text update based on progress
    if (progress < 25) setStatusIndex(0);
    else if (progress < 50) setStatusIndex(1);
    else if (progress < 75) setStatusIndex(2);
    else if (progress < 95) setStatusIndex(3);
    else setStatusIndex(4);

    if (progress >= 100) {
      const exitTimer = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          onComplete();
        }, 500);
      }, 400);

      return () => clearTimeout(exitTimer);
    }
  }, [progress, onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 250);
  };

  const companyName =
    settings?.companyName || settings?.appName || "Nexora Network ISP";
  const logoUrl = settings?.logo;

  return (
    <div
      id="app-intro-overlay"
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#070d18] text-white select-none transition-all duration-500 overflow-hidden ${
        isFadingOut
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
    >
      {/* Dynamic Background Tech Waves and Fiber Grids */}
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-600/30 via-blue-600/20 to-indigo-600/30 rounded-full blur-[130px] animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:28px_28px] opacity-40" />
      </div>

      {/* Optical Laser Beams */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse opacity-80" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse opacity-80" />

      {/* Skip Button Top Right */}
      <button
        id="intro-skip-btn"
        onClick={handleSkip}
        className="absolute top-6 right-6 z-50 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-xs font-semibold tracking-wide text-cyan-200 hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
      >
        <span>Skip Intro</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center space-y-6">
        {/* Animated Logo Container with Glow Rings */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing Outer Rings */}
          <div className="absolute w-36 h-36 rounded-full border border-cyan-500/30 animate-ping opacity-30" />
          <div className="absolute w-44 h-44 rounded-full border border-blue-500/20 animate-pulse" />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 blur-xl opacity-40 animate-pulse" />

          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-b from-[#0e1e38] to-[#0a1426] border-2 border-cyan-400/40 p-4 shadow-2xl flex items-center justify-center overflow-hidden group">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="max-h-full max-w-full object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] transform transition-transform duration-700 animate-[pulse_3s_infinite]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-cyan-400">
                <Wifi className="w-12 h-12 stroke-[2.2] animate-bounce" />
                <span className="text-[10px] font-black tracking-widest mt-1 text-cyan-200">
                  FIBER ISP
                </span>
              </div>
            )}

            {/* Glass Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Company Name & Brand Headline */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-[11px] font-bold tracking-widest uppercase text-cyan-300">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>High-Speed Optical Fiber ERP</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
            {companyName}
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Automated Billing, MikroTik Management & Subscriber Portal
          </p>
        </div>

        {/* Progress Bar & Status Text */}
        <div className="w-full max-w-xs space-y-2 pt-2">
          {/* Progress Bar Container */}
          <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 truncate text-cyan-300/90">
              <Activity className="w-3 h-3 animate-spin text-cyan-400" />
              {statusMessages[statusIndex]}
            </span>
            <span className="font-bold text-white pl-2">{progress}%</span>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 pt-2 border-t border-white/5 w-full">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Zero-Trust Protected
          </span>
          <span className="flex items-center gap-1">
            <Server className="w-3 h-3 text-cyan-400" />
            MikroTik API v6/v7
          </span>
        </div>
      </div>
    </div>
  );
};
