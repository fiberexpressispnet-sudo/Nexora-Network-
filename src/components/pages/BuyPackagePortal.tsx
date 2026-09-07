import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Client, 
  AppSettings, 
  PaymentRecord,
  OnlinePackageOrder,
  NotificationItem
} from '../../types';
import { initialPackages } from '../../data/initialData';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Zap, 
  Wifi, 
  Shield, 
  Phone, 
  Copy, 
  Check, 
  CreditCard, 
  Search, 
  Download, 
  UserCheck, 
  Lock, 
  MapPin, 
  Sparkles,
  HelpCircle,
  Radio,
  FileText,
  Clock,
  ChevronRight,
  ExternalLink,
  Laptop,
  CheckCircle,
  AlertCircle,
  Smartphone
} from 'lucide-react';

import { addDaysToExpiry, parseValidityDays } from '../../lib/expiryUtils';

interface BuyPackagePortalProps {
  packages?: Package[];
  settings?: AppSettings;
  onBackToLogin: () => void;
  onGoToClientLogin: () => void;
  onDirectLoginAsClient?: (client: Client) => void;
  onClientCreated?: (newClient: Client) => void;
  uid?: string;
}

export const BuyPackagePortal: React.FC<BuyPackagePortalProps> = ({
  packages: propPackages,
  settings: propSettings,
  onBackToLogin,
  onGoToClientLogin,
  onDirectLoginAsClient,
  onClientCreated,
  uid = 'nexora_network_admin',
}) => {
  // Live dynamic package state (synced with parent, backend, and localStorage)
  const [livePackages, setLivePackages] = useState<Package[]>(() => {
    if (propPackages && propPackages.length > 0) return propPackages;
    try {
      const local = localStorage.getItem('nexora_packages');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialPackages;
  });

  const [currentSettings, setCurrentSettings] = useState<AppSettings>(() => {
    if (propSettings?.companyName || propSettings?.logo) return propSettings;
    try {
      const local = localStorage.getItem('nexora_settings');
      if (local) return JSON.parse(local);
    } catch {}
    return propSettings || {};
  });

  // Sync when prop changes
  useEffect(() => {
    if (propPackages && propPackages.length > 0) {
      setLivePackages(propPackages);
    }
  }, [propPackages]);

  useEffect(() => {
    if (propSettings) {
      setCurrentSettings(prev => ({ ...prev, ...propSettings }));
    }
  }, [propSettings]);

  // Fetch latest packages from backend to guarantee any newly created admin package is live
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/db/get?key=nexora_packages');
        const data = await res.json();
        if (data.success && Array.isArray(data.value) && data.value.length > 0) {
          setLivePackages(data.value);
        }
      } catch (err) {
        console.warn('Could not fetch backend packages:', err);
      }
    };
    fetchLatest();
  }, []);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'home' | 'hotspot' | 'corporate'>('all');

  // Checkout modal states
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'payment' | 'success'>('form');

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [connectionType, setConnectionType] = useState<'PPPoE' | 'Hotspot'>('PPPoE');
  const [customerPassword, setCustomerPassword] = useState('123456');
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash'>('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success state result
  const [createdClientResult, setCreatedClientResult] = useState<Client | null>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);

  const merchantNumber = currentSettings?.phone || '01817681233';
  const companyName = currentSettings?.companyName || currentSettings?.appName || 'Nexora Network ISP';
  const logoUrl = currentSettings?.logo;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(merchantNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  // Helper function to strictly detect whether a package is Hotspot or Home Router (PPPoE)
  const isHotspotPackage = (pkg?: Package | null): boolean => {
    if (!pkg) return false;
    if (pkg.deviceType === 'Mobile') return true;
    const n = (pkg.name || '').toLowerCase();
    const d = (pkg.description || '').toLowerCase();
    return (
      n.includes('hotspot') ||
      n.includes('voucher') ||
      n.includes('ওয়াইফাই') ||
      n.includes('হটস্পট') ||
      d.includes('hotspot') ||
      d.includes('voucher') ||
      d.includes('হটস্পট')
    );
  };

  // Open Checkout Modal for a specific package with AUTO-LOCKED connection type
  const handleOpenOrder = (pkg: Package) => {
    setSelectedPackage(pkg);
    const autoType: 'Hotspot' | 'PPPoE' = isHotspotPackage(pkg) ? 'Hotspot' : 'PPPoE';
    setConnectionType(autoType);
    setCheckoutStep('form');
    setFormError('');
    setTransactionId('');
    // Suggest an initial password
    if (!customerPassword) {
      setCustomerPassword(Math.floor(100000 + Math.random() * 900000).toString());
    }
  };

  // Handle Form Submit -> Proceed to Payment
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim()) {
      setFormError('অনুগ্রহ করে গ্রাহকের পুরো নাম লিখুন (Please enter full name)');
      return;
    }
    const cleanPhone = customerPhone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 11) {
      setFormError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (Please enter valid 11-digit mobile number)');
      return;
    }
    if (!customerAddress.trim()) {
      setFormError('সংযোগের এলাকা বা ঠিকানা দিন (Please enter installation address/area)');
      return;
    }

    setCheckoutStep('payment');
  };

  // Calculate Expiry Date from package validity string or package price
  const calculateExpiryDate = (validityStr?: string): string => {
    const days = parseValidityDays(validityStr, selectedPackage?.name, selectedPackage?.price);
    return addDaysToExpiry(undefined, days);
  };

  // Play pleasant notification sound when order is placed
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        // Tone 1
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Tone 2
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.15); // A5
        gain2.gain.setValueAtTime(0.25, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.6);
      }
    } catch {}
  };

  // Confirm Order and Automatically Provision the Client
  const handleConfirmOrderAndProvision = async () => {
    if (!selectedPackage) return;
    setFormError('');

    if (paymentMethod !== 'Cash' && !transactionId.trim()) {
      setFormError('অনুগ্রহ করে ট্রানজেকশন আইডি (TrxID) প্রদান করুন (Please enter TrxID)');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanPhone = customerPhone.trim();
      const expiryDate = calculateExpiryDate(selectedPackage.validity);
      const pkgPrice = parseInt(String(selectedPackage.price).replace(/[^\d]/g, ''), 10) || 500;
      const finalTrxId = transactionId.trim() || `CASH-${Date.now().toString().slice(-6)}`;

      // 1. Construct new client record (starts as pending_approval until Admin verifies payment and uploads to MikroTik)
      const newClient: Client = {
        id: `CLI-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: customerName.trim(),
        phone: cleanPhone,
        userId: cleanPhone, // Default username is the client's phone number for effortless login
        password: customerPassword.trim() || '123456',
        package: selectedPackage.name,
        bandwidth: selectedPackage.speed,
        downloadSpeed: selectedPackage.speed,
        uploadSpeed: selectedPackage.upload || '10 Mbps',
        status: 'pending_approval',
        expiry: expiryDate,
        router: 'Core MikroTik Gateway',
        deviceType: connectionType === 'Hotspot' ? 'Mobile' : 'Router',
        price: String(pkgPrice),
      };

      // 2. Construct Online Package Purchase Order for Admin Review & Approval
      const newOrder: OnlinePackageOrder = {
        id: `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        orderNumber: `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
        clientId: newClient.id,
        clientName: newClient.name,
        phone: cleanPhone,
        userId: newClient.userId,
        password: newClient.password,
        address: customerAddress.trim(),
        packageName: selectedPackage.name,
        price: String(pkgPrice),
        bandwidth: selectedPackage.speed,
        connectionType: connectionType,
        paymentMethod: paymentMethod,
        transactionId: finalTrxId,
        status: 'pending',
        createdAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        targetRouter: 'Core MikroTik Gateway',
      };

      // 3. Persist to localStorage 'nexora_clients'
      let existingClients: Client[] = [];
      try {
        const local = localStorage.getItem('nexora_clients');
        if (local) existingClients = JSON.parse(local);
      } catch {}
      const updatedClients = [newClient, ...existingClients];
      localStorage.setItem('nexora_clients', JSON.stringify(updatedClients));

      // 4. Persist to localStorage 'nexora_online_orders'
      let existingOrders: OnlinePackageOrder[] = [];
      try {
        const localOrders = localStorage.getItem('nexora_online_orders');
        if (localOrders) existingOrders = JSON.parse(localOrders);
      } catch {}
      const updatedOrders = [newOrder, ...existingOrders];
      localStorage.setItem('nexora_online_orders', JSON.stringify(updatedOrders));

      // 5. Create instant Admin Notification for New Order
      let existingNotifs: NotificationItem[] = [];
      try {
        const localNotifs = localStorage.getItem('nexora_notifications');
        if (localNotifs) existingNotifs = JSON.parse(localNotifs);
      } catch {}

      const orderNotification: NotificationItem = {
        id: Date.now(),
        icon: 'CreditCard',
        text: `🛒 New Package Order: ${newClient.name} (${cleanPhone}) ordered ${selectedPackage.name} [৳${pkgPrice}] via ${paymentMethod} (TrxID: ${finalTrxId}). Awaiting verification & MikroTik upload.`,
        time: 'Just Now',
        read: false,
      };
      const updatedNotifs = [orderNotification, ...existingNotifs];
      localStorage.setItem('nexora_notifications', JSON.stringify(updatedNotifs));

      // 6. Record payment transaction in 'nexora_payments' with status Pending
      const paymentRec: PaymentRecord = {
        id: `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        clientName: newClient.name,
        userId: newClient.userId,
        package: newClient.package,
        amount: pkgPrice,
        paymentMethod: paymentMethod === 'Cash' ? 'Cash' : (paymentMethod as any),
        transactionType: 'New Client Activation',
        collector: 'Online Package Portal',
        timestamp: new Date().toLocaleString(),
        dateKey: new Date().toISOString().slice(0, 10),
        monthKey: new Date().toISOString().slice(0, 7),
        status: 'Pending',
        notes: `Online Order TrxID: ${finalTrxId} | Address: ${customerAddress}`,
      };

      try {
        let existingPayments: PaymentRecord[] = [];
        const localPay = localStorage.getItem('nexora_payments');
        if (localPay) existingPayments = JSON.parse(localPay);
        const updatedPay = [paymentRec, ...existingPayments];
        localStorage.setItem('nexora_payments', JSON.stringify(updatedPay));

        // Save everything to backend Express database
        await Promise.all([
          fetch('/api/db/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'nexora_clients', value: updatedClients }),
          }),
          fetch('/api/db/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'nexora_online_orders', value: updatedOrders }),
          }),
          fetch('/api/db/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'nexora_notifications', value: updatedNotifs }),
          }),
          fetch('/api/db/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'nexora_payments', value: updatedPay }),
          }),
        ]);
      } catch (err) {
        console.warn('Syncing order data to backend error:', err);
      }

      // 7. Notify parent component
      if (onClientCreated) {
        onClientCreated(newClient);
      }

      playNotificationChime();
      setCreatedClientResult(newClient);
      setCheckoutStep('success');
    } catch (err: any) {
      console.error('Order provisioning failed:', err);
      setFormError('অর্ডার সম্পন্ন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter packages by search & category
  const filteredPackages = livePackages.filter((pkg) => {
    // Search query filter
    const matchesSearch =
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.speed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pkg.price && String(pkg.price).includes(searchQuery));

    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory === 'home') {
      return !isHotspotPackage(pkg);
    }
    if (selectedCategory === 'hotspot') {
      return isHotspotPackage(pkg);
    }
    if (selectedCategory === 'corporate') {
      const priceNum = parseInt(String(pkg.price).replace(/[^\d]/g, ''), 10) || 0;
      return priceNum >= 1200 || pkg.name.toLowerCase().includes('plus') || pkg.name.toLowerCase().includes('corp');
    }

    return true;
  });

  const parsePrice = (priceStr: string | number): number => {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    const num = parseFloat(String(priceStr).replace(/[^\d.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // Sort packages from low price to high price
  const sortedFilteredPackages = [...filteredPackages].sort(
    (a, b) => parsePrice(a.price) - parsePrice(b.price)
  );

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-slate-800 font-sans flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLogin}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Back to login choices"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">লগইন অপশনে ফিরুন</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-8 max-w-[140px] object-contain drop-shadow-xs" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                  <Wifi className="w-4.5 h-4.5" />
                </div>
              )}
              <div>
                <span className="font-black text-base tracking-tight text-slate-900 block leading-tight">
                  {companyName}
                </span>
                <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider block">
                  Online Package Store
                </span>
              </div>
            </div>
          </div>

          {/* Right Header CTAs */}
          <div className="flex items-center gap-3">
            <a
              href={`tel:${merchantNumber}`}
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-cyan-600" />
              <span>হেল্পলাইন: {merchantNumber}</span>
            </a>

            <button
              onClick={onGoToClientLogin}
              className="px-4 py-2 rounded-xl bg-[#3c8dbc] hover:bg-[#367fa9] text-white text-xs font-black shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>ক্লাইন্ট লগইন (Client Login)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section with High-Speed ISP Banner */}
        <section className="relative rounded-3xl bg-gradient-to-br from-[#0c1e3d] via-[#102a54] to-[#0a1931] text-white p-6 sm:p-10 shadow-xl overflow-hidden border border-blue-900/50">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-72 h-72 bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>আল্ট্রা-ফাস্ট অপটিক্যাল ফাইবার & হটস্পট ইন্টারনেট</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              আপনার পছন্দের <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-300">ইন্টারনেট প্যাকেজ</span> বেছে নিন
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-medium">
              বাফারলেস 4K ইউটিউব স্ট্রিমিং, লো-পিং অনলাইন গেমিং ও নিরবচ্ছিন্ন হোম ব্রডব্যান্ড। মুহূর্তের মধ্যে অনলাইনে প্যাকেজ অর্ডার করে ইনস্ট্যান্ট কানেকশন অ্যাক্টিভ করুন।
            </p>

            {/* Feature Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-300 font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>BDIX 100 Mbps আল্ট্রা ক্যাশ</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>৯৯.৯% ফাইবার অপটিক্যাল আপটাইম</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>২৪/৭ ডেডিকেটেড সাপোর্ট</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>বিকাশ/নগদে ইনস্ট্যান্ট অ্যাক্টিভেশন</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#3c8dbc] text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              সবগুলো প্যাকেজ ({livePackages.length})
            </button>
            <button
              onClick={() => setSelectedCategory('home')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'home'
                  ? 'bg-[#3c8dbc] text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              হোম ব্রডব্যান্ড (PPPoE)
            </button>
            <button
              onClick={() => setSelectedCategory('hotspot')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'hotspot'
                  ? 'bg-[#3c8dbc] text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              হটস্পট ওয়াইফাই (Hotspot)
            </button>
            <button
              onClick={() => setSelectedCategory('corporate')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'corporate'
                  ? 'bg-[#3c8dbc] text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              হাই-স্পিড আল্ট্রা (Plus)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="প্যাকেজ বা স্পিড খুঁজুন (যেমন: 40 Mbps)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all"
            />
          </div>
        </div>

        {/* Packages Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>উপলব্ধ প্যাকেজ তালিকা ({filteredPackages.length})</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              সফটওয়্যারের রিয়েল-টাইম প্যাকেজসমূহ
            </span>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">কোন প্যাকেজ খুঁজে পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                আপনার অনুসন্ধানের সাথে মিল রেখে কোনো প্যাকেজ নেই। অন্য কোনো নাম বা স্পিড লিখে সার্চ করুন।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {sortedFilteredPackages.map((pkg, idx) => {
                const isHotspot = isHotspotPackage(pkg);
                const isPopular = idx === 1 || idx === 2;

                return (
                  <div
                    key={pkg.id || idx}
                    className={`relative rounded-2xl bg-white border transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:shadow-xl hover:-translate-y-1 ${
                      isPopular
                        ? 'border-cyan-400/80 shadow-md ring-1 ring-cyan-400/30'
                        : isHotspot
                        ? 'border-amber-200/90 hover:border-amber-400'
                        : 'border-slate-200 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    {/* Popular / Best Value Ribbon */}
                    {isPopular && (
                      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[10px] font-black tracking-wider uppercase py-1 text-center shadow-xs">
                        ★ POPULAR CHOICE (জনপ্রিয়)
                      </div>
                    )}

                    <div className="p-5 space-y-4">
                      {/* Header & Speed */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              isHotspot ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}>
                              {isHotspot ? <Radio className="w-3 h-3 text-amber-700" /> : <Wifi className="w-3 h-3 text-blue-700" />}
                              <span>{isHotspot ? 'হটস্পট ওয়াইফাই' : 'হোম ব্রডব্যান্ড (PPPoE)'}</span>
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {isHotspot ? 'মোবাইল / ভাউচার' : 'রাউটার লাইন'}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-slate-900 mt-2 leading-snug line-clamp-2">
                            {pkg.name}
                          </h3>
                        </div>

                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${
                          isHotspot
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : 'bg-blue-50 text-[#3c8dbc] border border-blue-200'
                        }`}>
                          {isHotspot ? <Radio className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
                        </div>
                      </div>

                      {/* Speed Metrics */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-medium">Download Speed:</span>
                          <span className="font-mono font-black text-slate-900 text-sm text-cyan-700">
                            {pkg.speed || '30 Mbps'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-medium">Upload Speed:</span>
                          <span className="font-mono font-bold text-slate-700 text-xs">
                            {pkg.upload || '15 Mbps'}
                          </span>
                        </div>
                      </div>

                      {/* Price Display */}
                      <div className="border-t border-b border-slate-100 py-3 flex items-baseline justify-between">
                        <div>
                          <span className="text-2xl font-black text-slate-900">
                            ৳{pkg.price || '500'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium ml-1">
                            / {pkg.validity || '30 Days'}
                          </span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          isHotspot ? 'text-amber-800 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
                        }`}>
                          {isHotspot ? 'Hotspot Zone Pass' : 'No Setup Fee'}
                        </span>
                      </div>

                      {/* Feature Bullet points */}
                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>{isHotspot ? 'হটস্পট জোনে মোবাইল বা ল্যাপটপ লগইন' : 'বাসা/অফিস অপটিক্যাল ফাইবার লাইন'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>YouTube 4K & BDIX বাফারলেস ক্যাশ</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>২৪/৭ কল সেন্টার & ফিল্ড সাপোর্ট</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>রিয়েল-টাইম ক্লায়েন্ট সেলফ সার্ভিস ড্যাশবোর্ড</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Button */}
                    <div className="p-5 pt-0">
                      <button
                        onClick={() => handleOpenOrder(pkg)}
                        className={`w-full py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 ${
                          isPopular
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-cyan-500/20'
                            : isHotspot
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        <span>এখনই অর্ডার করুন (Buy Now)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Offline Hotspot Voucher Guide Section */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                OFFLINE HOTSPOT ACCESS
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-500" />
                <span>অফলাইন হটস্পট স্ক্র্যাচ কার্ড / ভাউচার ব্যবহারের নিয়ম</span>
              </h3>
              <p className="text-xs text-slate-500">
                যেসব এলাকায় আমাদের ওপেন ওয়াইফাই হটস্পট জোন আছে, সেখানে সরাসরি কানেক্ট হয়ে ইন্টারনেট ব্যবহার করুন
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onGoToClientLogin}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>হটস্পট লগইন পেজে যান</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-black flex items-center justify-center text-sm">
                ১
              </div>
              <h4 className="font-bold text-slate-900 text-sm">ওয়াইফাইতে কানেক্ট হন</h4>
              <p className="text-slate-600 leading-relaxed">
                মোবাইলের WiFi সেটিংস ওপেন করে আমাদের জোন নেম (যেমন: <strong className="text-slate-900">{companyName} Free WiFi</strong>) সিলেক্ট করুন।
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm">
                ২
              </div>
              <h4 className="font-bold text-slate-900 text-sm">লগইন পেজ ওপেন করুন</h4>
              <p className="text-slate-600 leading-relaxed">
                ব্রাউজারে অটোমেটিক হটস্পট লগইন পেজ আসবে, অথবা যেকোনো ব্রাউজারে <strong className="text-slate-900">10.0.0.1</strong> বা লোকাল গেটওয়ে লিখুন।
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm">
                ৩
              </div>
              <h4 className="font-bold text-slate-900 text-sm">পিন কোড দিন ও ব্রাউজ করুন</h4>
              <p className="text-slate-600 leading-relaxed">
                দোকান বা অনলাইনে ক্রয় করা ভাউচারের ইউজারনেম/পিন দিয়ে <strong>Login</strong> চাপুন এবং সাথে সাথে ইন্টারনেট ব্যবহার শুরু করুন।
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button onClick={onBackToLogin} className="hover:text-slate-900 transition-colors">
              Admin & Staff Login
            </button>
            <span>•</span>
            <button onClick={onGoToClientLogin} className="hover:text-slate-900 transition-colors">
              Subscriber Portal
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* CHECKOUT / ORDER MODAL POPUP */}
      {/* ========================================================= */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2.5 py-0.5 rounded-full">
                  STEP {checkoutStep === 'form' ? '1 OF 2' : checkoutStep === 'payment' ? '2 OF 2' : 'COMPLETED'}
                </span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                  {checkoutStep === 'form' && 'গ্রাহকের তথ্য ও সংযোগের বিবরণ'}
                  {checkoutStep === 'payment' && 'পেমেন্ট ও অর্ডার নিশ্চিতকরণ'}
                  {checkoutStep === 'success' && 'অভিনন্দন! আপনার অ্যাকাউন্ট তৈরি হয়েছে'}
                </h3>
                <p className="text-xs text-slate-500">
                  প্যাকেজ: <strong className="text-slate-800">{selectedPackage.name}</strong> (স্পিড: {selectedPackage.speed} | মূল্য: ৳{selectedPackage.price})
                </p>
              </div>

              <button
                onClick={() => setSelectedPackage(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            {/* STEP 1: CUSTOMER FORM */}
            {checkoutStep === 'form' && (
              <form onSubmit={handleProceedToPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    আপনার পূর্ণ নাম (Full Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="যেমন: মোঃ সাব্বির আহমেদ"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মোবাইল নম্বর (Login User ID) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      এই নম্বরটি ক্লায়েন্ট প্যানেলে লগইন করার ইউজার আইডি হবে
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      পাসওয়ার্ড (Password) *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      placeholder="পাসওয়ার্ড লিখুন"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      ভবিষ্যতে ক্লায়েন্ট ড্যাশবোর্ডে লগইন করার জন্য
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      সংযোগের ধরন (Connection Type) *
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-600" />
                      <span>প্যাকেজ অনুযায়ী নির্ধারিত (Auto-Locked)</span>
                    </span>
                  </div>

                  {connectionType === 'PPPoE' ? (
                    <div className="p-3.5 rounded-2xl border-2 border-blue-500 bg-blue-50/70 text-blue-950 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <Wifi className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-blue-950">হোম ফাইবার ব্রডব্যান্ড (PPPoE Router Line)</p>
                            <p className="text-[10px] text-blue-800 font-medium">বাসা বা অফিসের ওয়াইফাই রাউটার সংযোগ</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                          ROUTER LINE
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-900 leading-relaxed pt-1.5 border-t border-blue-200/80 font-medium">
                        ✓ এই প্যাকেজটি হোম রাউটারের জন্য বাছাইকরণ করা হয়েছে। এডমিন অনুমোদন দিলে এই ইউজার আইডি ও পাসওয়ার্ড আপনার বাসার ওয়াইফাই রাউটারে কনফিগার হবে।
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl border-2 border-amber-500 bg-amber-50/70 text-amber-950 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                            <Radio className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-amber-950">হটস্পট ওয়াইফাই ভাউচার (Hotspot WiFi Voucher)</p>
                            <p className="text-[10px] text-amber-800 font-medium">মোবাইল / ল্যাপটপ হটস্পট জোনে ব্যবহারের জন্য</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                          HOTSPOT PASS
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900 leading-relaxed pt-1.5 border-t border-amber-200/80 font-medium">
                        ✓ এই প্যাকেজটি হটস্পট ওয়াইফাই এর জন্য বাছাইকরণ করা হয়েছে। হটস্পট ওয়াইফাই সিগন্যালে কানেক্ট হয়ে ব্রাউজারে এই মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে লগইন করবেন।
                      </p>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span>অন্য ধরনের লাইন প্রয়োজন হলে প্যাকেজ তালিকা থেকে রাউটার বা হটস্পট প্যাকেজ বাছাই করুন।</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সংযোগের ঠিকানা ও এলাকা (Installation Address / Area) *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="যেমন: বাড়ি নং ১২, রোড নং ৫, ব্লক-বি, মিরপুর-১০, ঢাকা"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPackage(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#3c8dbc] hover:bg-[#367fa9] text-white text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span>পরবর্তী ধাপ: পেমেন্ট</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: PAYMENT METHOD & TRX ID */}
            {checkoutStep === 'payment' && (
              <div className="space-y-5">
                {/* Summary Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>নির্বাচিত প্যাকেজ:</span>
                    <span className="text-cyan-700">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>সংযোগের ধরন:</span>
                    <span className={`font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                      connectionType === 'Hotspot' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {connectionType === 'Hotspot' ? <Radio className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                      {connectionType === 'Hotspot' ? 'হটস্পট ওয়াইফাই (Hotspot Mobile)' : 'হোম ফাইবার (PPPoE Router Line)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>স্পিড & মেয়াদ:</span>
                    <span>{selectedPackage.speed} ({selectedPackage.validity || '30 Days'})</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>গ্রাহকের নাম ও ফোন:</span>
                    <span>{customerName} ({customerPhone})</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-sm text-slate-900">
                    <span>পরিশোধযোগ্য মোট মূল্য:</span>
                    <span className="text-emerald-700">৳{selectedPackage.price}</span>
                  </div>
                </div>

                {/* Payment Gateway Options */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    পেমেন্ট মাধ্যম বেছে নিন (Select Payment Method)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(['bKash', 'Nagad', 'Rocket', 'Cash'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                          paymentMethod === method
                            ? 'border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-400/40 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {method === 'bKash' && 'বিকাশ (bKash)'}
                        {method === 'Nagad' && 'নগদ (Nagad)'}
                        {method === 'Rocket' && 'রকেট (Rocket)'}
                        {method === 'Cash' && 'ক্যাশ (Cash)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Banking Instructions */}
                {paymentMethod !== 'Cash' ? (
                  <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-2xl p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-900">আমাদের {paymentMethod} মার্চেন্ট / পার্সোনাল নম্বর:</span>
                      <button
                        onClick={handleCopyNumber}
                        className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-900 bg-white px-2.5 py-1 rounded-lg border border-cyan-300 shadow-2xs cursor-pointer"
                      >
                        {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedNumber ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                      </button>
                    </div>

                    <div className="text-lg font-mono font-black text-cyan-900 bg-white px-3 py-1.5 rounded-xl border border-cyan-200 text-center tracking-wider">
                      {merchantNumber}
                    </div>

                    <p className="text-[11px] text-cyan-800 leading-relaxed">
                      ১. আপনার {paymentMethod} অ্যাপ বা ডায়াল কোড দিয়ে উপরের নম্বরে <strong>৳{selectedPackage.price}</strong> সেন্ড মানি বা পেমেন্ট করুন।<br />
                      ২. পেমেন্ট সফল হওয়ার পর প্রাপ্ত <strong>Transaction ID (TrxID)</strong> নিচে লিখুন।
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        ট্রানজেকশন আইডি (TrxID) *
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                        placeholder="যেমন: 9K78B2LMN"
                        className="w-full px-4 py-2.5 rounded-xl border border-cyan-300 bg-white text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                    <p className="font-bold">ক্যাশ অন কানেকশন (Cash on Setup)</p>
                    <p className="text-[11px] text-amber-800">
                      আমাদের ফিল্ড টেকনিশিয়ান এসে লাইন সংযোগ সম্পন্ন করার পর নগদ ৳{selectedPackage.price} টাকা পরিশোধ করবেন।
                    </p>
                  </div>
                )}

                {/* Modal Footer Controls */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('form')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>পূর্ববর্তী ধাপ</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmOrderAndProvision}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>অর্ডার তৈরি হচ্ছে...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>অর্ডার সম্পন্ন করুন ও লাইন অ্যাক্টিভ করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SUCCESS & INSTANT DIGITAL CREDENTIALS (PENDING ADMIN VERIFICATION) */}
            {checkoutStep === 'success' && createdClientResult && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-9 h-9 animate-pulse" />
                </div>

                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    এডমিন ভেরিফিকেশন অপেক্ষমান (Awaiting Admin Verification)
                  </span>
                  <h4 className="text-xl font-black text-slate-900">
                    প্যাকেজ অর্ডার সফলভাবে জমা হয়েছে!
                  </h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    আপনার পেমেন্ট ও তথ্যাদি এডমিন প্যানেলে জমা হয়েছে। এডমিন পেমেন্ট যাচাই করে অনুমোদন (Approve) করলেই মাইক্রোটিক রাউটারে আপনার লাইনটি সরাসরি এক্টিভ হয়ে যাবে।
                  </p>
                </div>

                {/* Step-by-step instructions for Hotspot / Router Login */}
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-4 text-left space-y-2.5">
                  <h5 className="font-black text-xs text-cyan-950 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-700" />
                    পরবর্তী ধাপ ও ইন্টারনেট ব্যবহারের নিয়ম:
                  </h5>
                  <ul className="text-[11px] text-cyan-900 space-y-1.5 leading-relaxed font-medium">
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-cyan-700 min-w-[16px]">১.</span>
                      <span>এডমিন পেমেন্ট ট্রানজেকশন আইডি (TrxID: <strong className="font-mono">{transactionId || 'CASH'}</strong>) ভেরিফাই করে অনুমোদন করবেন।</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-cyan-700 min-w-[16px]">২.</span>
                      <span>অনুমোদন হওয়ার সাথে সাথেই আপনার ইউজারনেম মাইক্রোটিক রাউটারে আপলোড হয়ে যাবে।</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-cyan-700 min-w-[16px]">৩.</span>
                      <span>এরপর মোবাইলে ওয়াইফাই কানেক্ট করে <strong>হটস্পট লগইন পেজে</strong> বা আপনার রাউটারে নিচের ইউজার আইডি ও পাসওয়ার্ড দিয়ে লগইন করুন।</span>
                    </li>
                  </ul>
                </div>

                {/* Digital Receipt / Credentials Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">গ্রাহকের নাম</span>
                    <span className="font-bold text-slate-900 text-xs">{createdClientResult.name}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">লগইন ইউজার আইডি (Phone)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-cyan-700 text-sm">{createdClientResult.userId}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(createdClientResult.userId)}
                        className="text-[10px] text-cyan-700 bg-cyan-100 hover:bg-cyan-200 px-2 py-0.5 rounded font-bold cursor-pointer"
                      >
                        কপি
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">লগইন পাসওয়ার্ড</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 text-sm">{createdClientResult.password}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(createdClientResult.password || '')}
                        className="text-[10px] text-slate-700 bg-slate-200 hover:bg-slate-300 px-2 py-0.5 rounded font-bold cursor-pointer"
                      >
                        কপি
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">প্যাকেজ & স্পিড</span>
                    <span className="font-bold text-slate-800 text-xs">{createdClientResult.package} ({createdClientResult.downloadSpeed})</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">সংযোগের ধরন</span>
                    <span className={`font-bold text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      createdClientResult.connectionType === 'Hotspot' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-blue-100 text-blue-900 border border-blue-200'
                    }`}>
                      {createdClientResult.connectionType === 'Hotspot' ? <Radio className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                      {createdClientResult.connectionType === 'Hotspot' ? 'হটস্পট ওয়াইফাই (Hotspot Mobile)' : 'হোম ফাইবার (PPPoE Router Line)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">পেমেন্ট মাধ্যম & TrxID</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{paymentMethod} - {transactionId || 'Cash'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">সংযোগ স্ট্যাটাস</span>
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-xs">
                      <Clock className="w-3 h-3" />
                      ভেরিফিকেশন অপেক্ষমান
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  {onDirectLoginAsClient ? (
                    <button
                      onClick={() => onDirectLoginAsClient(createdClientResult)}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>ক্লায়েন্ট প্রোফাইল দেখুন (View Account Portal)</span>
                    </button>
                  ) : (
                    <button
                      onClick={onGoToClientLogin}
                      className="w-full py-3.5 rounded-xl bg-[#3c8dbc] hover:bg-[#367fa9] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>ক্লায়েন্ট লগইন পেজে যান (Go to Client Login)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedPackage(null);
                      window.print();
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>রিসিপ্ট প্রিন্ট বা ডাউনলোড করুন (Print Receipt)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
