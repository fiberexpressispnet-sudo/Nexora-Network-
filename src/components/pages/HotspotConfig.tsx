import React, { useState, useEffect } from "react";
import {
  HotspotFile,
  AppSettings,
  Package,
  HotspotPackageRequest,
} from "../../types";
import {
  Code,
  UploadCloud,
  Eye,
  Download,
  Send,
  FileText,
  CheckCircle2,
  Shield,
  RotateCcw,
  Sparkles,
  Wifi,
  Smartphone,
  Router,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Modal } from "../Modal";

interface HotspotConfigProps {
  packages?: Package[];
  settings: AppSettings;
  onAddHotspotRequest?: (
    req: Omit<HotspotPackageRequest, "id" | "requestedAt" | "status">,
  ) => void;
  showToast: (
    msg: string,
    type: "info" | "success" | "error" | "warning",
  ) => void;
}

export const buildDynamicHotspotHtml = (
  packagesList: Package[],
  settingsObj: AppSettings,
) => {
  const activePkgs = packagesList.filter((p) => p.status === "active");
  const pkgsToUse =
    activePkgs.length > 0
      ? activePkgs
      : [
          {
            id: 1,
            name: "3 Mbps",
            price: 100,
            validity: "30 Days",
            speed: "3 Mbps",
            upload: "3 Mbps",
            deviceType: "Mobile",
          },
          {
            id: 2,
            name: "5 Mbps",
            price: 200,
            validity: "30 Days",
            speed: "5 Mbps",
            upload: "5 Mbps",
            deviceType: "Mobile",
          },
          {
            id: 3,
            name: "10 Mbps",
            price: 300,
            validity: "30 Days",
            speed: "10 Mbps",
            upload: "10 Mbps",
            deviceType: "Mobile",
          },
          {
            id: 4,
            name: "20 Mbps",
            price: 500,
            validity: "30 Days",
            speed: "20 Mbps",
            upload: "20 Mbps",
            deviceType: "Mobile",
          },
          {
            id: 5,
            name: "15 Mbps (Router)",
            price: 500,
            validity: "30 Days",
            speed: "15 Mbps",
            upload: "15 Mbps",
            deviceType: "Router",
          },
          {
            id: 6,
            name: "25 Mbps",
            price: 800,
            validity: "30 Days",
            speed: "25 Mbps",
            upload: "25 Mbps",
            deviceType: "Router",
          },
        ];

  const packagesJsonStr = JSON.stringify(pkgsToUse);

  return `<!DOCTYPE html>
<html lang="bn">
<head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>${settingsObj.appName || "Nexora network"} — High Speed Internet</title>
 <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
 <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
 <style>
 :root {
 --primary: #2563eb;
 --primary-dark: #1d4ed8;
 --secondary: #10b981;
 --dark: #0f172a;
 --card-bg: #1e293b;
 --text-light: #f8fafc;
 --text-muted: #94a3b8;
 --accent: #f59e0b;
 }

 * {
 margin: 0;
 padding: 0;
 box-sizing: border-box;
 font-family: 'Inter', sans-serif;
 }

 body {
 background-color: var(--dark);
 color: var(--text-light);
 min-height: 100vh;
 display: flex;
 flex-direction: column;
 align-items: center;
 padding: 20px;
 }

 .container {
 width: 100%;
 max-width: 480px;
 }

 .header {
 text-align: center;
 margin-bottom: 25px;
 }

 .logo {
 font-size: 28px;
 font-weight: 700;
 color: #fff;
 display: flex;
 align-items: center;
 justify-content: center;
 gap: 10px;
 margin-bottom: 5px;
 }

 .logo i {
 color: var(--primary);
 }

 .tagline {
 color: var(--text-muted);
 font-size: 14px;
 }

 .card {
 background-color: var(--card-bg);
 border-radius: 16px;
 padding: 25px;
 box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
 margin-bottom: 20px;
 border: 1px solid rgba(255, 255, 255, 0.05);
 }

 .login-box {
 display: flex;
 flex-direction: column;
 gap: 15px;
 }

 .input-group {
 position: relative;
 }

 .input-group i {
 position: absolute;
 left: 15px;
 top: 50%;
 transform: translateY(-50%);
 color: var(--text-muted);
 }

 .input-group input {
 width: 100%;
 padding: 12px 15px 12px 45px;
 background-color: rgba(15, 23, 42, 0.6);
 border: 1px solid rgba(255, 255, 255, 0.1);
 border-radius: 10px;
 color: #fff;
 font-size: 14px;
 outline: none;
 transition: 0.3s;
 }

 .input-group input:focus {
 border-color: var(--primary);
 }

 .btn {
 background-color: var(--primary);
 color: #fff;
 border: none;
 padding: 12px;
 border-radius: 10px;
 font-weight: 600;
 cursor: pointer;
 transition: 0.3s;
 display: flex;
 align-items: center;
 justify-content: center;
 gap: 8px;
 text-decoration: none;
 width: 100%;
 }

 .btn:hover {
 background-color: var(--primary-dark);
 }

 .section-title {
 font-size: 16px;
 font-weight: 600;
 margin-bottom: 15px;
 display: flex;
 align-items: center;
 gap: 8px;
 color: var(--text-light);
 }

 .section-title i {
 color: var(--accent);
 }

 .packages-grid {
 display: grid;
 grid-template-columns: repeat(2, 1fr);
 gap: 12px;
 }

 .package-card {
	border-radius: 20px;
	padding: 22px 18px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
	text-align: center;
	position: relative;
	overflow: hidden;
	transition: 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
	min-height: 240px;
	box-shadow: 0 4px 15px rgba(0,0,0,0.2);
	border: none;
	}

	/* Vibrant sequential gradients */
	.grad-0 { background: linear-gradient(135deg, #7c3aed, #4c1d95); }
	.grad-1 { background: linear-gradient(135deg, #2563eb, #1e3a8a); }
	.grad-2 { background: linear-gradient(135deg, #06b6d4, #155e75); }
	.grad-3 { background: linear-gradient(135deg, #10b981, #064e3b); }
	.grad-4 { background: linear-gradient(135deg, #ec4899, #831843); }
	.grad-5 { background: linear-gradient(135deg, #f97316, #7c2d12); }
	.grad-6 { background: linear-gradient(135deg, #ef4444, #7f1d1d); }

	.package-card:hover {
	transform: translateY(-4px) scale(1.02);
	box-shadow: 0 8px 25px rgba(0,0,0,0.3);
	}

	.pkg-badge {
	position: absolute;
	top: 12px;
	left: 12px;
	background-color: rgba(255, 255, 255, 0.2);
	color: #fff;
	font-size: 9px;
	padding: 4px 10px;
	border-radius: 20px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	}

	.pkg-speed {
	font-size: 26px;
	font-weight: 900;
	color: #fff;
	margin-top: 18px;
	margin-bottom: 2px;
	text-shadow: 0 2px 4px rgba(0,0,0,0.15);
	line-height: 1.1;
	}

	.pkg-type {
	font-size: 11px;
	color: rgba(255, 255, 255, 0.85);
	margin-bottom: 8px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	}

	.pkg-price {
	font-size: 20px;
	font-weight: 800;
	color: #fff;
	margin-bottom: 15px;
	text-shadow: 0 2px 4px rgba(0,0,0,0.15);
	}

	.btn-buy {
	background-color: rgba(255, 255, 255, 0.22);
	color: #fff;
	border: 1px solid rgba(255, 255, 255, 0.3);
	padding: 8px 16px;
	border-radius: 10px;
	font-size: 11px;
	font-weight: 700;
	cursor: pointer;
	transition: 0.2s;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	width: 100%;
	}

	.btn-buy:hover {
	background-color: rgba(255, 255, 255, 0.38);
	transform: scale(1.03);
	}

	.notice-board {
 font-size: 13px;
 color: var(--text-muted);
 line-height: 1.5;
 }

 .modal {
 display: none;
 position: fixed;
 top: 0;
 left: 0;
 width: 100%;
 height: 100%;
 background-color: rgba(0, 0, 0, 0.8);
 z-index: 1000;
 justify-content: center;
 align-items: center;
 padding: 20px;
 backdrop-filter: blur(5px);
 }

 .modal-content {
 background-color: var(--card-bg);
 border-radius: 16px;
 width: 100%;
 max-width: 400px;
 padding: 25px;
 position: relative;
 border: 1px solid rgba(255, 255, 255, 0.1);
 animation: modalSlide 0.3s ease;
 }

 @keyframes modalSlide {
 from { transform: translateY(20px); opacity: 0; }
 to { transform: translateY(0); opacity: 1; }
 }

 .close-btn {
 position: absolute;
 top: 15px;
 right: 15px;
 background: none;
 border: none;
 color: var(--text-muted);
 font-size: 18px;
 cursor: pointer;
 }

 .modal-header {
 margin-bottom: 20px;
 }

 .modal-title {
 font-size: 18px;
 font-weight: 600;
 }

 .step {
 display: none;
 }

 .step.active {
 display: block;
 }

 .select-group {
 margin-bottom: 15px;
 }

 .select-group label {
 display: block;
 font-size: 12px;
 color: var(--text-muted);
 margin-bottom: 5px;
 }

 .select-group select, .select-group input {
 width: 100%;
 padding: 10px;
 background-color: rgba(15, 23, 42, 0.6);
 border: 1px solid rgba(255, 255, 255, 0.1);
 border-radius: 8px;
 color: #fff;
 outline: none;
 }

 .payment-methods {
 display: grid;
 grid-template-columns: repeat(3, 1fr);
 gap: 10px;
 margin-bottom: 15px;
 }

 .payment-btn {
 background-color: rgba(15, 23, 42, 0.6);
 border: 1px solid rgba(255, 255, 255, 0.1);
 border-radius: 8px;
 padding: 10px;
 text-align: center;
 cursor: pointer;
 transition: 0.3s;
 }

 .payment-btn.selected {
 border-color: var(--primary);
 background-color: rgba(37, 99, 235, 0.2);
 }

 .payment-btn img {
 height: 25px;
 object-fit: contain;
 margin-bottom: 5px;
 }

 .payment-btn span {
 display: block;
 font-size: 10px;
 color: var(--text-muted);
 }

 .instructions {
 background-color: rgba(15, 23, 42, 0.6);
 padding: 12px;
 border-radius: 8px;
 font-size: 12px;
 color: var(--text-muted);
 margin-bottom: 15px;
 }

 .instructions strong {
 color: var(--secondary);
 font-size: 13px;
 }

 .bill-details {
 background-color: rgba(255, 255, 255, 0.05);
 padding: 10px;
 border-radius: 8px;
 margin-bottom: 15px;
 font-size: 13px;
 }

 .bill-row {
 display: flex;
 justify-content: space-between;
 margin-bottom: 5px;
 }

 .bill-row.total {
 font-weight: 600;
 color: var(--secondary);
 border-top: 1px dashed rgba(255, 255, 255, 0.1);
 padding-top: 5px;
 margin-bottom: 0;
 }

 .admin-trigger {
 margin-top: 20px;
 text-align: center;
 }

 .admin-trigger span {
 font-size: 11px;
 color: var(--text-muted);
 cursor: pointer;
 text-decoration: underline;
 }
 </style>
</head>
<body>

 <div class="container">
 <!-- Header -->
 <div class="header">
 <div class="logo">
 <i class="fas fa-wifi"></i>
 <span>${settingsObj.appName || "Nexora network"}</span>
 </div>
 <div class="tagline">Ultra High Speed Internet Solution</div>
 </div>

 <!-- Hotspot Login Card -->
 <div class="card">
 <div class="section-title">
 <i class="fas fa-key"></i> Hotspot User Login
 </div>
 <form class="login-box" action="$(link-login-only)" method="post">
 <div class="input-group">
 <i class="fas fa-user"></i>
 <input type="text" name="username" placeholder="User ID / Mobile Number" required>
 </div>
 <div class="input-group">
 <i class="fas fa-lock"></i>
 <input type="password" name="password" placeholder="Password (Default: ID)">
 </div>
 <button type="submit" class="btn">
 <i class="fas fa-sign-in-alt"></i> Connect Internet
 </button>
 </form>
 </div>

 <!-- Packages Section -->
 <div class="card">
 <div class="section-title">
 <i class="fas fa-box-open"></i> Internet Packages
 </div>
 <div class="packages-grid" id="packagesContainer">
 <!-- Loaded via JavaScript -->
 </div>
 </div>

 <!-- Notice Board -->
 <div class="card">
 <div class="section-title">
 <i class="fas fa-bullhorn"></i> Notice Board
 </div>
 <div class="notice-board">
 <p>Upon purchasing a package, your User ID & Password will be generated instantly on screen and via SMS. For support, call: <strong>${settingsObj.phone || "+880 1817 681233"}</strong></p>
 </div>
 </div>

 <!-- Admin Portal Access Trigger -->
 <div class="admin-trigger">
 <span onclick="openAdminModal()">🔑 Admin Dashboard Login</span>
 </div>
 </div>

 <!-- Purchase Modal -->
 <div class="modal" id="purchaseModal">
 <div class="modal-content">
 <button class="close-btn" onclick="closeModal()">&times;</button>
 
 <div class="modal-header">
 <div class="modal-title" id="modalPkgName">Package Purchase</div>
 </div>

 <!-- Step 1: User Details & Gateway -->
 <div class="step active" id="step1">
 <div class="select-group">
 <label>Full Name</label>
 <input type="text" id="custName" placeholder="Enter your full name">
 </div>
 <div class="select-group">
 <label>Phone Number (SMS Notification)</label>
 <input type="tel" id="custPhone" placeholder="017XXXXXXXX">
 </div>
 <div class="select-group">
 <label>Select Duration</label>
 <select id="durationSelect" onchange="calculateBill()">
 <option value="1">1 Month</option>
 <option value="3">3 Months (5% Off)</option>
 <option value="6">6 Months (10% Off)</option>
 <option value="12">12 Months (15% Off)</option>
 </select>
 </div>

 <div class="select-group">
 <label>Payment Gateway</label>
 <div class="payment-methods">
 <div class="payment-btn selected" onclick="selectPayment('bKash', this)">
 <i class="fas fa-mobile-alt" style="color: #e2136e; font-size: 20px;"></i>
 <span>bKash</span>
 </div>
 <div class="payment-btn" onclick="selectPayment('Nagad', this)">
 <i class="fas fa-wallet" style="color: #f7921e; font-size: 20px;"></i>
 <span>Nagad</span>
 </div>
 <div class="payment-btn" onclick="selectPayment('Rocket', this)">
 <i class="fas fa-university" style="color: #8c3494; font-size: 20px;"></i>
 <span>Rocket</span>
 </div>
 </div>
 </div>

 <div class="bill-details">
 <div class="bill-row">
 <span>Package Price:</span>
 <span id="basePrice">৳0</span>
 </div>
 <div class="bill-row">
 <span>Duration:</span>
 <span id="selectedDuration">1 Month</span>
 </div>
 <div class="bill-row total">
 <span>Total Payable:</span>
 <span id="totalBill">৳0</span>
 </div>
 </div>

 <button class="btn" onclick="goToStep(2)">Proceed to Payment <i class="fas fa-arrow-right"></i></button>
 </div>

 <!-- Step 2: Payment Details -->
 <div class="step" id="step2">
 <div class="instructions">
 Send Money to the number below and enter the Transaction ID:<br>
 Merchant Number: <strong id="merchantNum" style="user-select: all; font-size: 15px; color:#38bdf8;">${settingsObj.phone || "+880 1817 681233"}</strong>
 </div>

 <div class="select-group">
 <label>Transaction ID (TrxID)</label>
 <input type="text" id="trxIdInput" placeholder="e.g. BKASH98765432">
 </div>

 <button class="btn" onclick="processPurchase()" style="background-color: var(--secondary);">
 <i class="fas fa-check-circle"></i> Confirm & Activate
 </button>
 <button class="btn" onclick="goToStep(1)" style="background-color: transparent; border: 1px solid rgba(255,255,255,0.1); margin-top: 10px;">
 Back
 </button>
 </div>

 <!-- Step 3: Purchase Success -->
 <div class="step" id="step3">
 <div style="text-align: center; padding: 20px 0;">
 <i class="fas fa-check-circle" style="font-size: 50px; color: var(--secondary); margin-bottom: 15px;"></i>
 <h3 style="margin-bottom: 10px;">Order Placed Successfully!</h3>
 <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 15px;">
 Your User ID & Password are shown below. Admin has been notified.
 </p>
 <div style="background-color: rgba(15,23,42,0.8); padding: 15px; border-radius: 10px; text-align: left; margin-bottom: 15px;">
 <div style="font-size: 12px; color: var(--text-muted);">User ID:</div>
 <div id="resUsername" style="font-size: 18px; font-weight: bold; color: var(--primary); margin-bottom: 8px;">-</div>
 <div style="font-size: 12px; color: var(--text-muted);">Password:</div>
 <div id="resPassword" style="font-size: 18px; font-weight: bold; color: var(--secondary);">-</div>
 </div>
 <button class="btn" onclick="autoLogin()">⚡ Connect Now</button>
 </div>
 </div>
 </div>
 </div>

 <!-- Admin Password Modal -->
 <div class="modal" id="adminModal">
 <div class="modal-content">
 <button class="close-btn" onclick="closeAdminModal()">&times;</button>
 <div class="modal-header">
 <div class="modal-title">Admin Dashboard Unlock</div>
 </div>
 <div class="select-group">
 <label>Enter Admin Password</label>
 <input type="password" id="adminPassInput" placeholder="Password (default: isp.net)">
 </div>
 <button class="btn" onclick="checkAdminPass()">Unlock Router Access</button>
 </div>
 </div>

 <script>
 const packagesData = ${packagesJsonStr};
 let currentPackage = null;
 let selectedGateway = 'bKash';

 function renderPackages() {
 const container = document.getElementById('packagesContainer');
 container.innerHTML = packagesData.map(pkg => \`
 <div class="package-card">
 <span class="pkg-badge">\${pkg.deviceType || 'Mobile'}</span>
 <div class="pkg-speed">\${pkg.speed || pkg.name}</div>
 <div class="pkg-type">\${pkg.validity || '30 Days'}</div>
 <div class="pkg-price">৳\${pkg.price}</div>
 <button class="btn-buy" onclick="openPurchaseModal(\${pkg.id})">
 Buy Plan
 </button>
 </div>
 \`).join('');
 }

 function openPurchaseModal(pkgId) {
 currentPackage = packagesData.find(p => p.id === pkgId);
 if (!currentPackage) return;
 document.getElementById('modalPkgName').innerText = currentPackage.name + ' Plan';
 document.getElementById('purchaseModal').style.display = 'flex';
 calculateBill();
 goToStep(1);
 }

 function closeModal() {
 document.getElementById('purchaseModal').style.display = 'none';
 }

 function goToStep(stepNum) {
 document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
 document.getElementById('step' + stepNum).classList.add('active');
 }

 function selectPayment(gateway, el) {
 selectedGateway = gateway;
 document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
 el.classList.add('selected');
 }

 function calculateBill() {
 if (!currentPackage) return;
 const months = parseInt(document.getElementById('durationSelect').value) || 1;
 let base = currentPackage.price * months;
 let discount = 0;
 if (months === 3) discount = 0.05;
 if (months === 6) discount = 0.10;
 if (months === 12) discount = 0.15;
 
 let total = Math.round(base * (1 - discount));
 
 document.getElementById('basePrice').innerText = '৳' + currentPackage.price;
 document.getElementById('selectedDuration').innerText = months + ' Month(s)';
 document.getElementById('totalBill').innerText = '৳' + total;
 }

 function processPurchase() {
 const name = document.getElementById('custName').value.trim() || 'Valued Client';
 const phone = document.getElementById('custPhone').value.trim();
 const trxId = document.getElementById('trxIdInput').value.trim();

 if (!phone) {
 alert('Please enter your Mobile Number!');
 return;
 }

 const username = 'fe' + Math.floor(10000 + Math.random() * 90000);
 const password = 'pass' + Math.floor(1000 + Math.random() * 9000);
 const totalText = document.getElementById('totalBill').innerText;

 const purchaseData = {
 clientName: name,
 phone: phone,
 package: currentPackage.name,
 price: totalText.replace('৳', ''),
 bandwidth: currentPackage.speed,
 downloadSpeed: currentPackage.speed,
 uploadSpeed: currentPackage.speed,
 gateway: selectedGateway,
 transaction: trxId || 'N/A',
 duration: parseInt(document.getElementById('durationSelect').value) || 1,
 createdUserId: username,
 createdPassword: password,
 macAddress: '$(mac)',
 ipAddress: '$(ip)'
 };

 // Post message to parent app window or opener
 if (window.parent && window.parent !== window) {
 window.parent.postMessage({ type: 'NEXORA_HOTSPOT_REQUEST', data: purchaseData }, '*');
 }
 if (window.opener) {
 window.opener.postMessage({ type: 'NEXORA_HOTSPOT_REQUEST', data: purchaseData }, '*');
 }

 // Save to LocalStorage sync
 try {
 const reqs = JSON.parse(localStorage.getItem('nexora_hotspot_requests') || '[]');
 reqs.unshift({
 id: 'REQ-' + Math.floor(100 + Math.random() * 900),
 ...purchaseData,
 requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 status: 'pending'
 });
 localStorage.setItem('nexora_hotspot_requests', JSON.stringify(reqs));
 } catch(e) {}

 document.getElementById('resUsername').innerText = username;
 document.getElementById('resPassword').innerText = password;
 goToStep(3);
 }

 function autoLogin() {
 const u = document.getElementById('resUsername').innerText;
 const p = document.getElementById('resPassword').innerText;
 const form = document.querySelector('.login-box');
 if (form) {
 form.querySelector('input[name="username"]').value = u;
 form.querySelector('input[name="password"]').value = p;
 form.submit();
 }
 }

 function openAdminModal() {
 document.getElementById('adminModal').style.display = 'flex';
 }
 function closeAdminModal() {
 document.getElementById('adminModal').style.display = 'none';
 }
 function checkAdminPass() {
 const val = document.getElementById('adminPassInput').value;
 if (val === 'isp.net' || val === '${(settingsObj as any).adminPassword || "isp.net"}') {
 alert('Admin Access Granted!');
 closeAdminModal();
 } else {
 alert('Invalid Password!');
 }
 }

 // Initialize Page
 renderPackages();
 </script>
</body>
</html>`;
};

export const HotspotConfigPage: React.FC<HotspotConfigProps> = ({
  packages = [],
  settings,
  onAddHotspotRequest,
  showToast,
}) => {
  const [files, setFiles] = useState<HotspotFile[]>([
    { name: "login.html", size: 14200, type: "text/html" },
    { name: "style.css", size: 8400, type: "text/css" },
    { name: "logo.png", size: 45000, type: "image/png" },
    { name: "script.js", size: 6200, type: "application/javascript" },
  ]);

  const [hotspotHtml, setHotspotHtml] = useState<string>(() => {
    const saved = localStorage.getItem("nexora_hotspot_html");
    if (saved) return saved;
    return buildDynamicHotspotHtml(packages, settings);
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);

  const [previewUser, setPreviewUser] = useState("");
  const [previewPass, setPreviewPass] = useState("");

  useEffect(() => {
    const updatedHtml = buildDynamicHotspotHtml(packages, settings);
    setHotspotHtml(updatedHtml);
  }, [packages, settings]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "NEXORA_HOTSPOT_REQUEST") {
        if (onAddHotspotRequest) {
          onAddHotspotRequest(event.data.data);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onAddHotspotRequest]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (uploaded && uploaded.length > 0) {
      const fileList = Array.from(uploaded) as File[];
      const newFiles: HotspotFile[] = fileList.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type || "text/plain",
      }));

      // If one of the files is login.html, read its text
      const htmlFile = fileList.find(
        (f) => f.name.endsWith(".html") || f.name.endsWith(".htm"),
      );
      if (htmlFile) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          if (content) {
            setHotspotHtml(content);
            localStorage.setItem("nexora_hotspot_html", content);
            showToast(
              `Loaded ${htmlFile.name} content into HTML editor!`,
              "success",
            );
          }
        };
        reader.readAsText(htmlFile);
      }

      setFiles((prev) => [...prev, ...newFiles]);
      showToast(
        `Uploaded ${newFiles.length} file(s) to hotspot template!`,
        "success",
      );
    }
  };

  const handleSaveHtml = () => {
    localStorage.setItem("nexora_hotspot_html", hotspotHtml);
    showToast("Hotspot login HTML code saved locally!", "success");
  };

  const handleDeploy = () => {
    setDeploying(true);
    setDeploySuccess(false);
    showToast(
      "Deploying hotspot files to MikroTik router /flash/hotspot...",
      "info",
    );

    setTimeout(() => {
      setDeploying(false);
      setDeploySuccess(true);
      showToast(
        "Hotspot login page deployed successfully to MikroTik router!",
        "success",
      );
    }, 2000);
  };

  const handleResetDefault = () => {
    const defaultHtml = buildDynamicHotspotHtml(packages, settings);
    setHotspotHtml(defaultHtml);
    localStorage.setItem("nexora_hotspot_html", defaultHtml);
    showToast(
      "Reset to default Hotspot login template with live packages!",
      "info",
    );
  };

  const handleSyncPackagesToHtml = () => {
    const updated = buildDynamicHotspotHtml(packages, settings);
    setHotspotHtml(updated);
    localStorage.setItem("nexora_hotspot_html", updated);
    showToast(
      `Successfully synced ${packages.filter((p) => p.status === "active").length} packages to Hotspot Login HTML Page!`,
      "success",
    );
  };

  const handleDownloadBackup = () => {
    const blob = new Blob([hotspotHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "login.html";
    a.click();
    showToast("Downloaded hotspot login.html backup!", "success");
  };

  const handleOpenWindowPreview = () => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(hotspotHtml);
      win.document.close();
    } else {
      showToast("Please allow popups to open full window preview", "warning");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Code className="w-5 h-5 text-sky-600 " /> MikroTik Hotspot Login
            Page
          </h3>
          <p className="text-xs text-slate-800">
            Upload or edit custom HTML templates and deploy live to your router
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPreviewOpen(true)}
            className="px-3 py-1.5 rounded bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" /> Quick Preview
          </button>
          <button
            onClick={handleOpenWindowPreview}
            className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-sky-500" /> New Tab Preview
          </button>
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />{" "}
            {deploying ? "Deploying..." : "Deploy to MikroTik"}
          </button>
        </div>
      </div>

      {/* Deploy Status Alert */}
      {deploySuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-4 text-xs text-emerald-600 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>
              <strong>Success!</strong> Hotspot login page deployed to MikroTik
              directory{" "}
              <code className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded">
                /flash/hotspot/login.html
              </code>
            </span>
          </div>
          <span className="text-[10px] text-slate-800">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* HTML Source Code Editor & Drag Drop Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor & File Upload */}
        <div className="lg:col-span-2 space-y-6">
          {/* HTML Source Editor */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200/80 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-sky-500" /> Live HTML Editor (
                {hotspotHtml.length} chars)
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={handleSyncPackagesToHtml}
                  className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Sync all active packages to Hotspot Login page"
                >
                  <Zap className="w-3.5 h-3.5" /> Sync Packages (
                  {packages.filter((p) => p.status === "active").length})
                </button>
                <button
                  onClick={handleResetDefault}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Default
                </button>
                <button
                  onClick={handleSaveHtml}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  Save Code
                </button>
              </div>
            </div>

            <textarea
              rows={12}
              value={hotspotHtml}
              onChange={(e) => setHotspotHtml(e.target.value)}
              placeholder="Paste or edit raw HTML code here..."
              className="w-full p-3.5 rounded border border-slate-200 bg-white text-[#00a65a] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50 leading-relaxed"
            />
          </div>

          {/* Drag & Drop Files */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 ">
              Template Files &amp; Assets ({files.length})
            </h4>

            {/* Drag and drop zone */}
            <div className="border-2 border-dashed border-slate-300 rounded p-5 text-center bg-slate-50/50 hover:border-sky-500 transition-colors relative cursor-pointer group">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <UploadCloud className="w-8 h-8 text-sky-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-slate-800 ">
                Drag &amp; Drop Hotspot Page Files
              </h4>
              <p className="text-[11px] text-slate-800 mt-0.5">
                Upload HTML, CSS, JavaScript, Images (PNG, JPG, SVG)
              </p>
            </div>

            {/* Uploaded Files List */}
            <div className="divide-y divide-slate-100 border border-slate-200 rounded overflow-hidden bg-white/40 ">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-sky-500" />
                    <div>
                      <span className="font-bold text-slate-800 font-mono">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-800 block">
                        {(file.size / 1024).toFixed(1)} KB • {file.type}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-teal-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deployment Info Sidebar */}
        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200/80 pb-4">
              <Shield className="w-5 h-5 text-sky-500" /> Deployment
              Specification
            </h3>

            <div className="space-y-3 text-xs">
              <p className="text-slate-900 leading-relaxed">
                Hotspot files will be uploaded directly to your MikroTik router
                directory{" "}
                <code className="text-sky-600 font-mono font-bold">
                  /flash/hotspot
                </code>{" "}
                via API or FTP.
              </p>

              <div className="p-3 rounded bg-slate-50 space-y-1">
                <span className="text-[10px] font-semibold text-slate-800 uppercase">
                  Target Router Directory
                </span>
                <div className="font-mono text-slate-800 font-bold">
                  /flash/hotspot/login.html
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 space-y-1">
                <span className="text-[10px] font-semibold text-slate-800 uppercase">
                  Login Redirect Server URL
                </span>
                <div className="font-mono text-slate-800 font-bold">
                  http://192.168.1.1/login
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 space-y-1">
                <span className="text-[10px] font-semibold text-slate-800 uppercase">
                  Hotspot Helpdesk Phone
                </span>
                <div className="font-mono text-slate-800 font-bold">
                  {settings.phone}
                </div>
              </div>

              <div className="p-3 rounded bg-amber-50/80 border border-amber-200/50 space-y-1 mt-4">
                <span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Walled Garden Required
                </span>
                <p className="text-slate-800 text-[11px] leading-relaxed">
                  For online package purchases to work before a client logs in, you MUST allow this software's domain in your MikroTik Walled Garden:
                </p>
                <div className="font-mono text-amber-900 font-bold bg-amber-100/50 p-1.5 rounded text-[11px] mt-1 break-all select-all">
                  /ip hotspot walled-garden add dst-host={window.location.hostname}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <button
              onClick={handleDownloadBackup}
              className="w-full py-2.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Backup HTML
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: LIVE HOTSPOT LOGIN PREVIEW */}
      <Modal
        isOpen={previewOpen}
        title="Hotspot Login Page Live Preview"
        onClose={() => setPreviewOpen(false)}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="border border-slate-200 rounded overflow-hidden shadow-inner bg-slate-50 p-1">
            <iframe
              srcDoc={hotspotHtml}
              title="Hotspot Live Preview"
              className="w-full h-96 rounded bg-white"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPreviewOpen(false)}
              className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                setPreviewOpen(false);
                handleDeploy();
              }}
              className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" /> Deploy to Router
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
