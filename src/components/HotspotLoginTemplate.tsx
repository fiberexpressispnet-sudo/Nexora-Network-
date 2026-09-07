import React, { useState, useEffect } from "react";
import {
  Download,
  Copy,
  Check,
  Eye,
  ExternalLink,
  Smartphone,
  Monitor,
  Wifi,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  CreditCard,
  FileCode,
  ArrowRight,
  PhoneCall,
  CheckCircle2,
  Zap,
  Tag,
} from "lucide-react";
import { AppSettings, Package } from "../types";
import { initialPackages } from "../data/initialData";

interface HotspotLoginTemplateProps {
  settings?: AppSettings;
  packages?: Package[];
  showToast: (msg: string, type?: "info" | "success" | "error" | "warning") => void;
}

export const generateMikrotikLoginHtml = (
  ispName: string,
  hotline: string,
  bkashNumber: string,
  packagesList: Package[] | any[],
  defaultTab: "login" | "buy" = "login",
  apiDomain: string = typeof window !== "undefined" ? window.location.origin : ""
): string => {
  const parsePrice = (pStr: any): number => {
    if (typeof pStr === "number") return pStr;
    if (!pStr) return 0;
    const num = parseFloat(String(pStr).replace(/[^\d.]/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const sortedList = Array.isArray(packagesList)
    ? [...packagesList].sort((a, b) => parsePrice(a?.price) - parsePrice(b?.price))
    : [];

  const packagesJson = JSON.stringify(sortedList);

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${ispName} - Hotspot WiFi Login</title>
  <meta name="theme-color" content="#0284c7">
  <style>
    :root {
      --primary: #0284c7;
      --primary-dark: #0369a1;
      --accent: #059669;
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --bkash: #e2136e;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    body {
      background: radial-gradient(circle at top, #1e293b 0%, #0f172a 100%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 16px 12px;
      font-size: 14px;
    }
    .container {
      width: 100%;
      max-width: 440px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      margin-top: 10px;
      transition: max-width 0.3s ease;
    }
    .container.wide-mode {
      max-width: 1100px;
    }
    .header {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      padding: 24px 20px;
      text-align: center;
      position: relative;
    }
    .header .wifi-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(4px);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .header p {
      font-size: 12px;
      color: #e0f2fe;
      margin-top: 4px;
    }
    .nav-tabs {
      display: flex;
      background: #0f172a;
      border-bottom: 1px solid var(--border);
    }
    .tab-btn {
      flex: 1;
      padding: 14px 10px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }
    .tab-btn.active {
      color: #38bdf8;
      background: var(--card-bg);
      border-bottom: 2px solid #38bdf8;
    }
    .content {
      padding: 20px;
    }
    .tab-pane {
      display: none;
    }
    .tab-pane.active {
      display: block;
      animation: fadeIn 0.25s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .input-wrapper {
      position: relative;
    }
    .form-control {
      width: 100%;
      padding: 12px 14px;
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 12px;
      color: #ffffff;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-control:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
    }
    .btn-login {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #0284c7, #0284c7);
      border: none;
      border-radius: 12px;
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);
    }
    .btn-login:hover {
      background: #0369a1;
      transform: translateY(-1px);
    }
    .btn-login:active {
      transform: translateY(0);
    }
    .btn-trial {
      display: block;
      width: 100%;
      padding: 12px;
      background: #065f46;
      border: 1px solid #059669;
      border-radius: 12px;
      color: #a7f3d0;
      text-align: center;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      margin-top: 12px;
      transition: background 0.2s;
    }
    .btn-trial:hover {
      background: #047857;
    }
    .mode-switch {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      padding: 8px 12px;
      border-radius: 10px;
      margin-bottom: 16px;
      border: 1px solid var(--border);
    }
    .mode-switch span {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .mode-btn {
      background: transparent;
      border: none;
      color: #38bdf8;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
    }
    .alert-error {
      background: #7f1d1d;
      border: 1px solid #ef4444;
      color: #fecaca;
      padding: 12px;
      border-radius: 10px;
      font-size: 12px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    /* ========================================================== */
    /* EXACT APP PACKAGE CARDS DESIGN (FROM PACKAGES.TSX)        */
    /* ========================================================== */
    .packages-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin-bottom: 24px;
      padding: 4px 0;
    }
    @media (min-width: 640px) {
      .packages-grid {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
      }
    }
    .custom-pkg-card {
      border-radius: 26px;
      padding: 24px 20px;
      color: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      position: relative;
      overflow: hidden;
      min-height: 440px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border: 3px solid transparent;
    }
    .custom-pkg-card:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.6);
    }
    .custom-pkg-card.selected-card {
      border-color: #ffffff;
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.45), 0 20px 35px -5px rgba(0, 0, 0, 0.7);
    }
    .pkg-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 10px;
    }
    .pkg-badge-pill {
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .pkg-status-pill {
      background: rgba(255, 255, 255, 0.22);
      padding: 3px 9px;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .pkg-speed-box {
      padding: 6px 0;
    }
    .pkg-speed-num {
      font-size: 48px;
      font-weight: 900;
      line-height: 1;
      letter-spacing: -1px;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    }
    .pkg-speed-unit {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.95;
      margin-top: 4px;
    }
    .pkg-title-box {
      margin: 8px 0;
    }
    .pkg-title {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #ffffff;
      line-height: 1.3;
    }
    .pkg-validity {
      font-size: 10px;
      font-weight: 700;
      opacity: 0.95;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    .pkg-features-box {
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 18px;
      padding: 12px 10px;
      margin: 12px 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: center;
    }
    .pkg-feat-item {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .feat-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #ffffff;
      display: inline-block;
      flex-shrink: 0;
    }
    .pkg-device-pill {
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      padding: 4px 12px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
      margin: 0 auto;
    }
    .pkg-price-box {
      margin: 8px 0;
    }
    .pkg-main-price {
      font-size: 32px;
      font-weight: 900;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      line-height: 1.1;
    }
    .pkg-renew-price {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      opacity: 0.85;
      letter-spacing: 1.5px;
      margin-top: 2px;
    }
    .btn-buy-card {
      background: #ffffff;
      color: #0f172a;
      border: none;
      border-radius: 14px;
      padding: 11px 14px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      margin-top: 8px;
      width: 100%;
    }
    .btn-buy-card:hover {
      transform: scale(1.02);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    }
    .selected-card .btn-buy-card {
      background: #0f172a;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.4);
    }

    /* Checkout Drawer / Box */
    .checkout-wrapper {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 20px;
      margin-top: 20px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .selected-banner {
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid #38bdf8;
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }
    .bkash-badge {
      background: var(--bkash);
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .pay-instructions {
      background: #1e293b;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px;
      font-size: 12px;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .pay-instructions strong {
      color: #fb7185;
    }
    .copy-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0f172a;
      padding: 10px 14px;
      border-radius: 10px;
      margin: 10px 0;
      font-family: monospace;
      font-size: 15px;
      color: #facc15;
      font-weight: 700;
      border: 1px dashed #475569;
    }
    .btn-copy {
      background: #38bdf8;
      color: #0f172a;
      border: none;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
    }
    .footer-info {
      padding: 14px 20px;
      background: #0f172a;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .hotline-link {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 700;
    }
  </style>
</head>
<body>

  <div class="container ${defaultTab === "buy" ? "wide-mode" : ""}">
    <div class="header">
      <div class="wifi-badge">
        <span>⚡</span>
        <span>High-Speed WiFi Hotspot</span>
      </div>
      <h1>${ispName}</h1>
      <p>নির্বিঘ্ন ও দ্রুতগতির ইন্টারনেট সেবা</p>
    </div>

    <div class="nav-tabs">
      <button type="button" class="tab-btn ${defaultTab === "login" ? "active" : ""}" id="tabLoginBtn" onclick="switchTab('login')">
        <span>🔐</span>
        <span>লগইন করুন (WiFi Login)</span>
      </button>
      <button type="button" class="tab-btn ${defaultTab === "buy" ? "active" : ""}" id="tabBuyBtn" onclick="switchTab('buy')">
        <span>⚡</span>
        <span>প্যাকেজ ক্রয় (Buy Package)</span>
      </button>
    </div>

    <div class="content">

      <!-- $(if error) -->
      <div class="alert-error" id="errorBlock">
        <span>⚠️</span>
        <div>\$(error)</div>
      </div>
      <!-- $(endif) -->

      <!-- TAB 1: LOGIN -->
      <div class="tab-pane ${defaultTab === "login" ? "active" : ""}" id="paneLogin">
        <form name="login" action="\$(link-login-only)" method="post" onsubmit="return validateLogin()">
          <input type="hidden" name="dst" value="\$(link-orig)" />
          <input type="hidden" name="popup" value="true" />

          <div class="mode-switch">
            <span id="modeLabel">ইউজারনেম ও পাসওয়ার্ড মোড</span>
            <button type="button" class="mode-btn" id="toggleModeBtn" onclick="toggleVoucherMode()">
              ভাউচার পিন দিন
            </button>
          </div>

          <div class="form-group" id="userGroup">
            <label for="username">ইউজারনেম / Username</label>
            <input type="text" id="username" name="username" class="form-control" placeholder="018XXXXXXXX" value="\$(username)" required autofocus>
          </div>

          <div class="form-group" id="passGroup">
            <label for="password">পাসওয়ার্ড / Password</label>
            <input type="password" id="password" name="password" class="form-control" placeholder="••••••••" required>
          </div>

          <button type="submit" class="btn-login">
            <span>কানেক্ট করুন (Connect WiFi)</span>
            <span>→</span>
          </button>

          <!-- $(if trial == 'yes') -->
          <a href="\$(link-login-only)?dst=\$(link-orig-esc)&amp;username=T-\$(mac-esc)" class="btn-trial">
            🎁 বিনামূল্যে ট্রায়াল ব্যবহার করুন (Free Trial)
          </a>
          <!-- $(endif) -->
        </form>

        <div style="margin-top: 16px; text-align: center;">
          <small style="color: var(--text-muted); font-size: 12px;">
            কোনো কোড নেই? <a href="javascript:void(0)" onclick="switchTab('buy')" style="color: #38bdf8; font-weight: 700; text-decoration: underline;">এখান থেকে প্যাকেজ কিনুন</a>
          </small>
        </div>
      </div>

      <!-- TAB 2: BUY PACKAGE (APP CARDS DESIGN) -->
      <div class="tab-pane ${defaultTab === "buy" ? "active" : ""}" id="paneBuy">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h2 style="font-size: 16px; font-weight: 800; color: #ffffff;">হটস্পট ইন্টারনেট প্যাকেজসমূহ</h2>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              পছন্দের প্যাকেজটি ক্লিক করে বিকাশ বা নগদ দিয়ে সরাসরি রিচার্জ করুন:
            </p>
          </div>
          <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
            স্বয়ংক্রিয় এক্টিভেশন
          </span>
        </div>

        <div class="packages-grid" id="packagesList">
          <!-- Populated by JS with exact App Card Design -->
        </div>

        <div id="checkoutBox" class="checkout-wrapper" style="display: none;">
          <div class="selected-banner">
            <div>
              <div style="font-size: 10px; text-transform: uppercase; color: #7dd3fc; font-weight: 800; letter-spacing: 1px;">
                নির্বাচিত প্যাকেজ
              </div>
              <div id="selectedPlanTitle" style="font-size: 16px; font-weight: 900; color: #ffffff;">
                DFNHOB1-25 Mbps
              </div>
              <div id="selectedPlanMeta" style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                ⚡ 25 Mbps • 📅 30 Days Unlimited Access
              </div>
            </div>
            <div style="text-align: right;">
              <div id="selectedPlanPrice" style="font-size: 26px; font-weight: 900; color: #38bdf8;">
                ৳500
              </div>
              <button type="button" onclick="scrollToPackages()" style="background: transparent; border: none; color: #f43f5e; font-size: 10px; font-weight: 700; cursor: pointer; text-decoration: underline;">
                প্যাকেজ পরিবর্তন করুন
              </button>
            </div>
          </div>

          <div class="pay-instructions">
            <span class="bkash-badge">bKash / Nagad Personal Send Money</span>
            <div style="margin-top: 8px;">
              ১. আপনার বিকাশ বা নগদ অ্যাপ ওপেন করে <strong>"Send Money"</strong> অপশনে যান।<br>
              ২. নিচের নম্বরে নির্বাচিত প্যাকেজের সমপরিমাণ টাকা পাঠান:
            </div>
            <div class="copy-box">
              <span id="bkashNumDisplay">${bkashNumber}</span>
              <button type="button" class="btn-copy" onclick="copyNumber()">নম্বর কপি করুন</button>
            </div>
            <div>
              ৩. টাকা পাঠানো সফল হলে ফিরতি SMS-এ পাওয়া <strong>Transaction ID (TrxID)</strong> এবং আপনার মোবাইল নম্বর নিচে দিয়ে সাবমিট করুন।
            </div>
          </div>

          <div class="form-group">
            <label for="clientName">আপনার নাম (Your Name) <span style="color: #94a3b8; font-size: 10px; font-weight: normal; margin-left: 4px;">(ঐচ্ছিক)</span></label>
            <input type="text" id="clientName" class="form-control" placeholder="আপনার নাম লিখুন">
          </div>

          <div class="form-group">
            <label for="clientPhone" style="display: flex; justify-content: space-between;">
              <span>আপনার মোবাইল নম্বর (যেখানে ইন্টারনেট সক্রিয় হবে)</span>
              <span style="color: #38bdf8; font-weight: 700;">*বাধ্যতামূলক</span>
            </label>
            <input type="tel" id="clientPhone" class="form-control" placeholder="018XXXXXXXX" required oninput="onClientPhoneChange(this.value)">
          </div>

          <div class="form-group">
            <label>আপনার ছবি (Profile Photo) <span style="color: #94a3b8; font-size: 10px; font-weight: normal; margin-left: 4px;">(ঐচ্ছিক)</span></label>
            <div style="position: relative; overflow: hidden; display: block; border: 2px dashed #334155; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; background: rgba(15, 23, 42, 0.4); transition: all 0.2s;" onmouseover="this.style.background='rgba(15, 23, 42, 0.8)';" onmouseout="this.style.background='rgba(15, 23, 42, 0.4)';">
                <input type="file" id="clientPhoto" accept="image/*" capture style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 10;" onchange="previewAndCompressImage(this)">
                <div id="photoPlaceholder" style="pointer-events: none;">
                   <div style="font-size: 32px; margin-bottom: 8px; opacity: 0.8;">📷</div>
                   <div style="font-size: 13px; color: #e2e8f0; font-weight: 700;">ক্যামেরা দিয়ে ছবি তুলুন অথবা গ্যালারি থেকে সিলেক্ট করুন</div>
                   <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">ছবি যুক্ত করলে আপনাকে সনাক্ত করতে সুবিধা হবে</div>
                </div>
                <img id="photoPreview" style="display: none; max-height: 140px; border-radius: 8px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid #38bdf8; pointer-events: none;">
            </div>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label for="clientPassword" style="margin-bottom: 0;">লগইন পাসওয়ার্ড (Password)</label>
              <span style="font-size: 11px; color: #38bdf8; background: rgba(56, 189, 248, 0.15); padding: 2px 8px; border-radius: 6px; font-weight: 700;">
                ডিফল্ট দেওয়া আছে • চাইলে পরিবর্তন করুন
              </span>
            </div>
            <div style="position: relative;">
              <input type="text" id="clientPassword" class="form-control" value="123456" placeholder="পাসওয়ার্ড লিখুন" required style="padding-right: 86px; font-weight: 700; letter-spacing: 1px;">
              <button type="button" onclick="generateRandomPass()" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: #334155; border: none; color: #7dd3fc; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer;">
                র‍্যান্ডম পিন ⟳
              </button>
            </div>
            <small style="display: block; margin-top: 4px; font-size: 11px; color: var(--text-muted);">
              💡 ডিফল্ট পাসওয়ার্ড <strong>123456</strong> দেওয়া আছে। আপনি চাইলে কেটে দিয়ে আপনার পছন্দমতো পাসওয়ার্ড দিতে পারেন।
            </small>
          </div>

          <div class="form-group">
            <label for="trxId" style="display: flex; justify-content: space-between;">
              <span>bKash / Nagad Transaction ID (TrxID)</span>
              <span style="color: #fb7185; font-weight: 700;">*Send Money SMS থেকে</span>
            </label>
            <input type="text" id="trxId" class="form-control" placeholder="যেমন: BJK7X9Q2P4" required style="text-transform: uppercase; font-family: monospace; font-size: 15px; letter-spacing: 1px;">
          </div>

          <button type="button" class="btn-login" onclick="submitOrder()">
            <span>প্যাকেজ একটিভ করুন (Activate Package)</span>
            <span>⚡</span>
          </button>
        </div>

        <div id="orderSuccessBox" style="display: none; background: #064e3b; border: 1px solid #10b981; padding: 22px 18px; border-radius: 20px; text-align: center; margin-top: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <div style="width: 50px; height: 50px; background: rgba(16, 185, 129, 0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 26px;">
            🎉
          </div>
          <h3 style="color: #a7f3d0; font-size: 18px; margin-bottom: 8px; font-weight: 900;">
            অভিনন্দন! আপনার প্যাকেজটি সফলভাবে ক্রয় করা হয়েছে
          </h3>
          <p style="font-size: 14px; color: #f1f5f9; line-height: 1.6; margin-bottom: 14px; background: rgba(0, 0, 0, 0.28); padding: 14px; border-radius: 14px; border: 1px solid rgba(16, 185, 129, 0.35);">
            ⌛ <strong>আপনি সর্বোচ্চ তিন মিনিট পরে</strong> আপনার দেওয়া <strong>মোবাইল নম্বর</strong> এবং <strong>পাসওয়ার্ড</strong> দিয়ে লগইন করবেন, তখন আপনার ইন্টারনেট চালু হয়ে যাবে।
          </p>

          <!-- 3-Minute Countdown Timer -->
          <div style="background: rgba(15, 23, 42, 0.7); padding: 8px 16px; border-radius: 12px; margin-bottom: 14px; display: inline-flex; align-items: center; gap: 8px; border: 1px solid #334155;">
            <span style="font-size: 12px; color: #94a3b8;">ইন্টারনেট চালু হতে সময় বাকি:</span>
            <span id="countdownTimer" style="font-size: 17px; font-weight: 900; color: #38bdf8; font-family: monospace;">03:00</span>
          </div>

          <!-- Credentials Summary Box -->
          <div style="background: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 14px; text-align: left; margin-bottom: 16px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #7dd3fc; font-weight: 800; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 5px;">
              📋 আপনার লগইন তথ্য (স্ক্রিনশট বা নোট রাখুন)
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: #94a3b8;">ইউজারনেম (মোবাইল নম্বর):</span>
              <strong id="successPhone" style="color: #ffffff; font-family: monospace; font-size: 14px;">-</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: #94a3b8;">পাসওয়ার্ড:</span>
              <strong id="successPass" style="color: #facc15; font-family: monospace; font-size: 14px;">-</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: #94a3b8;">প্যাকেজ:</span>
              <strong id="successPackage" style="color: #38bdf8;">-</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: #94a3b8;">TrxID:</span>
              <strong id="successTrx" style="color: #34d399; font-family: monospace;">-</strong>
            </div>
          </div>

          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button type="button" onclick="goToLoginWithCredentials()" style="background: #38bdf8; color: #0f172a; padding: 11px 20px; border-radius: 12px; border: none; font-weight: 900; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);">
              🔐 লগইন পেজে যান ও কানেক্ট করুন →
            </button>
            <a href="tel:${hotline}" style="display: inline-block; background: #059669; color: white; padding: 11px 18px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px;">
              📞 হেল্পলাইন (${hotline})
            </a>
          </div>
        </div>
      </div>

    </div>

    <div class="footer-info">
      <div>IP: \$(ip) | MAC: \$(mac)</div>
      <div>সার্ভার: \$(identity) • সেবা সহায়তা: <a href="tel:${hotline}" class="hotline-link">${hotline}</a></div>
      <div style="margin-top: 4px; opacity: 0.7;">© 2026 ${ispName}. All Rights Reserved.</div>
    </div>
  </div>

  <script>
    var packages = ${packagesJson};
    var selectedPackage = null;
    var isVoucherOnly = false;

    var colorGradients = [
      'linear-gradient(135deg, #9333ea, #4f46e5, #5b21b6)', // 1. Purple
      'linear-gradient(135deg, #2563eb, #1d4ed8, #3730a3)', // 2. Blue
      'linear-gradient(135deg, #06b6d4, #0d9488, #0369a1)', // 3. Cyan
      'linear-gradient(135deg, #10b981, #0d9488, #15803d)', // 4. Green
      'linear-gradient(135deg, #ec4899, #f43f5e, #7e22ce)', // 5. Pink
      'linear-gradient(135deg, #f97316, #d97706, #dc2626)', // 6. Orange
      'linear-gradient(135deg, #dc2626, #e11d48, #991b1b)', // 7. Red
    ];

    // Render Packages matching Packages.tsx design exactly
    function renderPackages() {
      var container = document.getElementById('packagesList');
      if (!container) return;
      container.innerHTML = '';

      packages.forEach(function(pkg, idx) {
        var card = document.createElement('div');
        var bg = colorGradients[idx % colorGradients.length];
        var isSelected = (selectedPackage && selectedPackage.name === pkg.name);
        
        card.className = 'custom-pkg-card' + (isSelected ? ' selected-card' : '');
        card.style.background = bg;

        var numSpeed = (pkg.speed || '').replace(/\\D/g, '') || '25';
        var isMobile = (pkg.deviceType === 'Mobile');
        var cleanTitle = (pkg.name || '').replace(/\\s*\\(Monthly Pac\\)\\s*/i, '');
        var validity = pkg.validity || (pkg.validityDays ? pkg.validityDays + ' Days' : '30 Days');
        var price = pkg.price || '500';
        var renewal = pkg.renewal || price;

        card.innerHTML = 
          '<div class="pkg-top-row">' +
            '<div class="pkg-badge-pill">⚡ Hotspot Plan</div>' +
            '<span class="pkg-status-pill">' + (pkg.status || 'Active').toUpperCase() + '</span>' +
          '</div>' +

          '<div class="pkg-speed-box">' +
            '<div class="pkg-speed-num">' + numSpeed + '</div>' +
            '<div class="pkg-speed-unit">Mbps Speed</div>' +
          '</div>' +

          '<div class="pkg-title-box">' +
            '<div class="pkg-title">' + cleanTitle + '</div>' +
            '<div class="pkg-validity">📅 ' + validity + ' Unlimited Access</div>' +
          '</div>' +

          '<div class="pkg-features-box">' +
            '<div class="pkg-feat-item"><span class="feat-dot"></span> Shared Bandwidth (1:8)</div>' +
            '<div class="pkg-feat-item"><span class="feat-dot"></span> Single Device Lock</div>' +
            '<div class="pkg-feat-item"><span class="feat-dot"></span> Optical Fiber Powered</div>' +
            '<div class="pkg-feat-item"><span class="feat-dot"></span> 24/7 Priority Support</div>' +
          '</div>' +

          '<div class="pkg-device-pill">' + (isMobile ? '📱 Mobile Hotspot' : '📶 Router Hotspot') + '</div>' +

          '<div class="pkg-price-box">' +
            '<div class="pkg-main-price">৳' + price + '</div>' +
            '<div class="pkg-renew-price">Renew: ৳' + renewal + '</div>' +
          '</div>' +

          '<button type="button" class="btn-buy-card" onclick="event.stopPropagation(); selectPackage(' + idx + ');">' +
            (isSelected ? '✓ নির্বাচিত (Selected)' : '⚡ এই প্যাকেজটি কিনুন (Buy Plan)') +
          '</button>';

        card.onclick = function() { selectPackage(idx); };
        container.appendChild(card);
      });
    }

    function selectPackage(idx) {
      selectedPackage = packages[idx];
      renderPackages();

      var checkoutBox = document.getElementById('checkoutBox');
      var successBox = document.getElementById('orderSuccessBox');
      if (checkoutBox) {
        checkoutBox.style.display = 'block';
        
        var cleanTitle = (selectedPackage.name || '').replace(/\\s*\\(Monthly Pac\\)\\s*/i, '');
        document.getElementById('selectedPlanTitle').innerText = cleanTitle;
        document.getElementById('selectedPlanMeta').innerText = 
          '⚡ ' + (selectedPackage.speed || '25 Mbps') + ' • 📅 ' + (selectedPackage.validity || '30 Days') + ' Unlimited Access';
        document.getElementById('selectedPlanPrice').innerText = '৳' + (selectedPackage.price || '500');

        checkoutBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (successBox) {
        successBox.style.display = 'none';
      }
    }

    function scrollToPackages() {
      var grid = document.getElementById('packagesList');
      if (grid) grid.scrollIntoView({ behavior: 'smooth' });
    }

    function switchTab(tab) {
      var container = document.querySelector('.container');
      var paneLogin = document.getElementById('paneLogin');
      var paneBuy = document.getElementById('paneBuy');
      var tabLoginBtn = document.getElementById('tabLoginBtn');
      var tabBuyBtn = document.getElementById('tabBuyBtn');

      paneLogin.classList.remove('active');
      paneBuy.classList.remove('active');
      tabLoginBtn.classList.remove('active');
      tabBuyBtn.classList.remove('active');

      if (tab === 'login') {
        paneLogin.classList.add('active');
        tabLoginBtn.classList.add('active');
        if (container) container.classList.remove('wide-mode');
      } else {
        paneBuy.classList.add('active');
        tabBuyBtn.classList.add('active');
        if (container) container.classList.add('wide-mode');
        renderPackages();
        if (!selectedPackage && packages.length > 0) {
          selectPackage(0);
        }
      }
    }

    function toggleVoucherMode() {
      isVoucherOnly = !isVoucherOnly;
      var userGroup = document.getElementById('userGroup');
      var passGroup = document.getElementById('passGroup');
      var modeLabel = document.getElementById('modeLabel');
      var toggleBtn = document.getElementById('toggleModeBtn');
      var userInput = document.getElementById('username');

      if (isVoucherOnly) {
        passGroup.style.display = 'none';
        modeLabel.innerText = 'একক ভাউচার পিন মোড';
        toggleBtn.innerText = 'ইউজার ও পাসওয়ার্ড দিন';
        userInput.placeholder = 'ভাউচার পিন কোড লিখুন';
        document.querySelector('label[for="username"]').innerText = 'ভাউচার কোড / Voucher PIN';
      } else {
        passGroup.style.display = 'block';
        modeLabel.innerText = 'ইউজারনেম ও পাসওয়ার্ড মোড';
        toggleBtn.innerText = 'ভাউচার পিন দিন';
        userInput.placeholder = '018XXXXXXXX';
        document.querySelector('label[for="username"]').innerText = 'ইউজারনেম / Username';
      }
    }

    function validateLogin() {
      var user = document.getElementById('username').value.trim();
      var pass = document.getElementById('password').value.trim();
      if (!user) {
        alert('দয়া করে ইউজারনেম বা ভাউচার কোড লিখুন');
        return false;
      }
      if (isVoucherOnly) {
        // If single voucher PIN, copy username value into password field
        document.getElementById('password').value = user;
      } else if (!pass) {
        alert('দয়া করে পাসওয়ার্ড লিখুন');
        return false;
      }
      return true;
    }

    function copyNumber() {
      var num = document.getElementById('bkashNumDisplay').innerText;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(num).then(function() {
          alert('বিকাশ নম্বর কপি করা হয়েছে: ' + num);
        }).catch(function() {
          alert('নম্বর: ' + num);
        });
      } else {
        alert('নম্বর: ' + num);
      }
    }

    var currentOrderPhone = '';
    var currentOrderPass = '';
    var countdownInterval = null;

    function onClientPhoneChange(val) {
      // Optional helper
    }

    function generateRandomPass() {
      var rand = Math.floor(100000 + Math.random() * 900000);
      var passInput = document.getElementById('clientPassword');
      if (passInput) {
        passInput.value = rand;
      }
    }

    function startCountdown(durationSeconds) {
      if (countdownInterval) clearInterval(countdownInterval);
      var remaining = durationSeconds;
      var timerEl = document.getElementById('countdownTimer');

      function updateDisplay() {
        var m = Math.floor(remaining / 60);
        var s = remaining % 60;
        var mStr = (m < 10 ? '0' : '') + m;
        var sStr = (s < 10 ? '0' : '') + s;
        if (timerEl) {
          timerEl.innerText = mStr + ':' + sStr;
          if (remaining <= 0) {
            timerEl.innerText = 'এখনই কানেক্ট করুন! ⚡';
            timerEl.style.color = '#34d399';
          }
        }
      }

      updateDisplay();
      countdownInterval = setInterval(function() {
        remaining--;
        updateDisplay();
        if (remaining <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);
    }

    var compressedPhotoData = null;

    function previewAndCompressImage(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    var canvas = document.createElement('canvas');
                    var MAX_WIDTH = 400;
                    var MAX_HEIGHT = 400;
                    var width = img.width;
                    var height = img.height;
                    
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    compressedPhotoData = canvas.toDataURL('image/jpeg', 0.6);
                    
                    var preview = document.getElementById('photoPreview');
                    var placeholder = document.getElementById('photoPlaceholder');
                    if (preview && placeholder) {
                      preview.src = compressedPhotoData;
                      preview.style.display = 'block';
                      placeholder.style.display = 'none';
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    function submitOrder() {
      var nameEl = document.getElementById('clientName');
      var clientNameValue = nameEl ? nameEl.value.trim() : '';
      var phone = document.getElementById('clientPhone').value.trim();
      var passInput = document.getElementById('clientPassword');
      var pass = (passInput && passInput.value.trim()) ? passInput.value.trim() : '123456';
      var trx = document.getElementById('trxId').value.trim();

      if (!phone || phone.length < 11) {
        alert('দয়া করে আপনার ১১ ডিজিটের সঠিক মোবাইল নম্বর লিখুন');
        document.getElementById('clientPhone').focus();
        return;
      }
      if (!pass) {
        alert('দয়া করে একটি পাসওয়ার্ড দিন অথবা ডিফল্ট 123456 ব্যবহার করুন');
        if (passInput) passInput.focus();
        return;
      }
      if (!trx || trx.length < 4) {
        alert('দয়া করে বিকাশ/নগদের সঠিক Transaction ID (TrxID) লিখুন');
        document.getElementById('trxId').focus();
        return;
      }

      var defaultClientName = clientNameValue || 'Hotspot Client ' + phone;
      currentOrderPhone = phone;
      currentOrderPass = pass;

      // Populate Success Summary Box
      document.getElementById('successPhone').innerText = phone;
      document.getElementById('successPass').innerText = pass;
      document.getElementById('successPackage').innerText = selectedPackage ? (selectedPackage.name + ' (' + selectedPackage.speed + ')') : 'Hotspot Plan';
      document.getElementById('successTrx').innerText = trx.toUpperCase();

      // Start 3-minute (180 seconds) countdown
      startCountdown(180);

      // Send to server in background
      try {
        var apiOrigin = "${apiDomain}";
        // If apiOrigin is empty or localhost, it might fail inside real mikrotik. The ISP must replace it if downloaded manually.
        var targetUrl = apiOrigin ? (apiOrigin + '/api/hotspot/purchase') : '/api/hotspot/purchase';
        
        fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: defaultClientName,
            phone: phone,
            package: selectedPackage ? selectedPackage.name : 'Hotspot Plan',
            speed: selectedPackage ? selectedPackage.speed : '25 Mbps',
            total: selectedPackage ? selectedPackage.price : 500,
            transaction: trx,
            username: phone,
            password: pass,
            gateway: 'bKash/Nagad',
            photo: compressedPhotoData
          })
        }).catch(function() {});
      } catch (e) {}

      document.getElementById('checkoutBox').style.display = 'none';
      document.getElementById('orderSuccessBox').style.display = 'block';
      document.getElementById('orderSuccessBox').scrollIntoView({ behavior: 'smooth' });
    }

    function goToLoginWithCredentials() {
      switchTab('login');
      if (isVoucherOnly) {
        toggleVoucherMode();
      }
      var userField = document.getElementById('username');
      var passField = document.getElementById('password');
      if (userField && currentOrderPhone) {
        userField.value = currentOrderPhone;
      }
      if (passField && currentOrderPass) {
        passField.value = currentOrderPass;
      }
      var container = document.querySelector('.container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Hide error block if template tags are not evaluated or empty
    window.onload = function() {
      renderPackages();
      var errBlock = document.getElementById('errorBlock');
      if (errBlock && (errBlock.innerText.indexOf('$(error)') !== -1 || !errBlock.innerText.trim())) {
        errBlock.style.display = 'none';
      }
    };
  </script>
</body>
</html>`;
};

export const HotspotLoginTemplate: React.FC<HotspotLoginTemplateProps> = ({
  settings,
  packages = [],
  showToast,
}) => {
  const [ispName, setIspName] = useState(
    settings?.companyName || settings?.appName || "Nexora Network",
  );
  const [hotline, setHotline] = useState(
    settings?.phone || settings?.whatsapp || "01817681233",
  );
  const [bkashNumber, setBkashNumber] = useState(
    settings?.phone || "01817681233",
  );
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [previewTab, setPreviewTab] = useState<"login" | "buy">("buy");
  const [copied, setCopied] = useState(false);

  // Maintain live packages from props, local storage, or initialData
  const [livePackages, setLivePackages] = useState<Package[]>(() => {
    if (packages && packages.length > 0) return packages;
    try {
      const local = localStorage.getItem("nexora_packages");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialPackages;
  });

  useEffect(() => {
    if (packages && packages.length > 0) {
      setLivePackages(packages);
    }
  }, [packages]);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/db/get?key=nexora_packages");
        const data = await res.json();
        if (data.success && Array.isArray(data.value) && data.value.length > 0) {
          setLivePackages(data.value);
        }
      } catch {
        // use local fallback
      }
    };
    fetchLatest();
  }, []);

  const htmlContent = generateMikrotikLoginHtml(
    ispName,
    hotline,
    bkashNumber,
    livePackages,
    previewTab
  );

  const [showCodeModal, setShowCodeModal] = useState(false);

  const handleDownload = () => {
    try {
      // 1. Primary: Server-side form POST with target="_blank"
      // This immediately instructs the browser to open a transient request receiving
      // Content-Disposition: attachment; filename="login.html"
      // This bypasses iframe sandbox restrictions that block client-side blob downloads!
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/download/hotspot-login";
      form.target = "_blank";

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "htmlContent";
      input.value = htmlContent;
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        try {
          document.body.removeChild(form);
        } catch {
          // ignore
        }
      }, 1500);

      // 2. Auxiliary Client-side Blob download fallback
      try {
        const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "login.html";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 800);
      } catch (blobErr) {
        console.warn("Client blob download attempt:", blobErr);
      }

      showToast("login.html ফাইলটি ডাউনলোড শুরু হয়েছে!", "success");
    } catch (err: any) {
      showToast(`ডাউনলোড ত্রুটি: ${err.message}`, "error");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(htmlContent).then(() => {
      setCopied(true);
      showToast("সম্পূর্ণ login.html কোড কপি করা হয়েছে!", "success");
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback copy using textarea
      const el = document.createElement("textarea");
      el.value = htmlContent;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      showToast("সম্পূর্ণ login.html কোড কপি করা হয়েছে!", "success");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Bar */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-900 border border-sky-500/30 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MikroTik Hotspot Captive Portal (Ready to Upload)</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
              হটস্পট লগইন ও প্যাকেজ ক্রয় পেজ (login.html)
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              এই ফাইলটি ডাউনলোড করে আপনার মাইক্রোটিক রাউটারের <code className="bg-slate-800 text-sky-400 px-2 py-0.5 rounded font-mono">hotspot/</code> ফোল্ডারে আপলোড করলেই কাজ শুরু করবে। এতে গ্রাহক ইউজার/পাসওয়ার্ড বা ভাউচার পিন দিয়ে সরাসরি লগইন করতে পারবে এবং বিকাশ/নগদে অনলাইনে প্যাকেজ ক্রয় করতে পারবে।
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full lg:w-auto">
            <button
              onClick={handleDownload}
              className="flex-1 lg:flex-none px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-sky-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>১-ক্লিকে ডাউনলোড (login.html)</span>
            </button>

            {/* Direct Server URL Download Link */}
            <a
              href="/api/download/hotspot-login"
              download="login.html"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              title="ব্রাউজার থেকে সরাসরি ডাউনলোড লিংক"
            >
              <ExternalLink className="w-4 h-4" />
              <span>সরাসরি লিঙ্ক</span>
            </a>

            <button
              onClick={handleCopyCode}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>কোড কপি</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowCodeModal(!showCodeModal)}
              className="px-3 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="সম্পূর্ণ কোডটি দেখুন ও ম্যানুয়ালি সেভ করুন"
            >
              <FileCode className="w-4 h-4 text-sky-400" />
              <span>{showCodeModal ? "কোড লুকান" : "কোড দেখুন"}</span>
            </button>
          </div>
        </div>

        {/* Notice for iframe / sandbox download issue */}
        <div className="mt-4 pt-3 border-t border-sky-500/20 text-xs text-sky-200/90 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>টিপস: ব্রাউজারে পপ-আপ বা ডাউনলোড ব্লক থাকলে <strong>'সরাসরি লিঙ্ক'</strong> ক্লিক করুন অথবা <strong>'কোড কপি'</strong> করে Notepad-এ login.html নামে সেভ করুন।</span>
          </div>
          <a
            href="/hotspot/login.html"
            target="_blank"
            rel="noreferrer"
            className="text-sky-300 hover:text-white underline font-semibold flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            নতুন ট্যাবে প্রিভিউ দেখুন ও সেভ করুন (Ctrl + S)
          </a>
        </div>
      </div>

      {/* Code Viewer Modal / Expandable Box */}
      {showCodeModal && (
        <div className="bg-slate-950 border border-sky-500/40 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <FileCode className="w-4 h-4 text-sky-400" />
              <span>login.html - সম্পূর্ণ সোর্স কোড (HTML/CSS/JS)</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                {htmlContent.length.toLocaleString()} bytes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "কপি হয়েছে!" : "সম্পূর্ণ কোড কপি করুন"}</span>
              </button>
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            যদি আপনার ব্রাউজার বা ডিভাইসে অটোমেটিক ডাউনলোড কাজ না করে, তবে উপরের <strong>'সম্পূর্ণ কোড কপি করুন'</strong> বাটনে ক্লিক করুন। এরপর আপনার কম্পিউটারে <strong>Notepad</strong> ওপেন করে পেস্ট করুন এবং <strong>login.html</strong> নামে সেভ করে নিন।
          </p>

          <textarea
            readOnly
            value={htmlContent}
            className="w-full h-72 font-mono text-xs p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 focus:outline-none select-all"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      )}

      {/* Main Grid: Customizer & Instructions on left, Live Preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Settings & Upload Instructions */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Customizer Card */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base border-b border-slate-100 dark:border-slate-700 pb-3">
              <CreditCard className="w-5 h-5 text-sky-500" />
              <span>পেজ কাস্টমাইজেশন (Customization)</span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  আইএসপি বা ব্র্যান্ডের নাম (ISP Name)
                </label>
                <input
                  type="text"
                  value={ispName}
                  onChange={(e) => setIspName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="যেমন: Nexora Network"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  হেল্পলাইন / মোবাইল নম্বর (Support Hotline)
                </label>
                <input
                  type="text"
                  value={hotline}
                  onChange={(e) => setHotline(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="018XXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  বিকাশ / নগদ পার্সোনাল নম্বর (Payment Number)
                </label>
                <input
                  type="text"
                  value={bkashNumber}
                  onChange={(e) => setBkashNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="018XXXXXXXX"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleDownload}
                className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>নতুন সেভ করা তথ্যে login.html ডাউনলোড করুন</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Upload Guide */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base border-b border-slate-100 dark:border-slate-700 pb-3">
              <HelpCircle className="w-5 h-5 text-emerald-500" />
              <span>মাইক্রোটিক রাউটারে আপলোড করার নিয়ম (Upload Guide)</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  উপরের নীল <strong>"Download login.html"</strong> বাটনে ক্লিক করে ফাইলটি আপনার কম্পিউটার বা মোবাইলে ডাউনলোড করুন।
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <strong>WinBox</strong> ওপেন করে আপনার মাইক্রোটিক রাউটারে লগইন করুন।
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  WinBox-এর বাম পাশের মেনু থেকে <strong>Files</strong>-এ যান। সেখানে <strong>hotspot</strong> নামের ফোল্ডারটি দেখতে পাবেন।
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center shrink-0">4</span>
                <div>
                  ডাউনলোড করা <code className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-sky-600 dark:text-sky-400">login.html</code> ফাইলটি মাউস দিয়ে ড্র্যাগ করে (Drag & Drop) সরাসরি <strong>hotspot</strong> ফোল্ডারের মধ্যে ছেড়ে দিন।
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">✓</span>
                <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  সম্পন্ন! এবার আপনার Hotspot WiFi কানেক্ট করলে এই প্রিমিয়াম পোর্টাল পেজটি স্বয়ংক্রিয়ভাবে স্ক্রিনে চলে আসবে।
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-500" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                লাইভ প্রিভিউ (Live Preview)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Selector */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewTab("buy")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    previewTab === "buy"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  ⚡ প্যাকেজ ক্রয়
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("login")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    previewTab === "login"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  🔐 লগইন পেজ
                </button>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    previewDevice === "mobile"
                      ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    previewDevice === "desktop"
                      ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
              </div>
            </div>
          </div>

          <div
            className={`border border-slate-300 dark:border-slate-700 bg-slate-950 rounded-2xl overflow-hidden shadow-2xl mx-auto transition-all ${
              previewDevice === "mobile" ? "max-w-[430px]" : "w-full"
            }`}
          >
            {/* Mock browser header */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="font-mono text-[11px] text-slate-400 ml-2">
                  http://hotspot.login/login.html
                </span>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-mono text-sky-400">
                MikroTik v6 / v7
              </span>
            </div>

            {/* Embedded Live Preview iFrame */}
            <div className="h-[640px] w-full bg-slate-900">
              <iframe
                title="Hotspot Preview"
                srcDoc={htmlContent}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-forms allow-same-origin"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
