import React, { useState, useEffect, useRef } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { LogIn, RefreshCw, ArrowLeft, Home, ChevronRight, RotateCcw, Globe, Users, Shield } from 'lucide-react';
import {
 PageId,
 Client,
 Package,
 BandwidthProfile,
 DaysProfile,
 HotspotUser,
 HotspotPackageRequest,
 AppSettings,
 RouterConfig,
 NotificationItem,
 AuditLog,
 ToastMessage,
 PaymentRecord,
 MikrotikRouter,
 Invoice,
 BroadbandRenewalRequest,
} from './types';
import {
 initialClients,
 initialPackages,
 initialBandwidthProfiles,
 initialDaysProfiles,
 initialHotspotUsers,
 initialHotspotRequests,
 initialSettings,
 initialRouterConfig,
 initialNotifications,
 initialAuditLogs,
 initialPayments,
 initialRouters,
 initialInvoices,
} from './data/initialData';

import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ToastContainer } from './components/Toast';

import { Dashboard } from './components/pages/Dashboard';
import { ClientsPage } from './components/pages/Clients';
import { BillingPage } from './components/pages/BillingPage';
import { PackagesPage } from './components/pages/Packages';
import { BandwidthPage } from './components/pages/Bandwidth';
import { DaysProfilePage } from './components/pages/DaysProfile';
import { MikrotikConfigurePage } from './components/pages/MikrotikConfigure';
import { MikrotikManagementPage } from './components/pages/MikrotikManagement';
import { MikrotikSecurityPage } from './components/pages/MikrotikSecurity';
import { HotspotPage } from './components/pages/Hotspot';
import { HotspotConfigPage, buildDynamicHotspotHtml } from './components/pages/HotspotConfig';
import { ReportsPage } from './components/pages/Reports';
import { NotificationsPage } from './components/pages/Notifications';
import { AuditLogsPage } from './components/pages/AuditLogs';
import { SettingsPage } from './components/pages/Settings';
import { IspDigitalModulePage } from './components/pages/IspDigitalModules';
import { RevenueTrackerPage } from './components/pages/RevenueTracker';
import { SubscriptionsPage } from './components/pages/SubscriptionsPage';
import { LiveBandwidthPage } from './components/pages/LiveBandwidthPage';
import { SupportTicketsPage } from './components/pages/SupportTicketsPage';
import { SmsNotificationPage } from './components/pages/SmsNotificationPage';
import { ExpensesPage } from './components/pages/ExpensesPage';
import { NetworkCoverageMap } from './components/pages/NetworkCoverageMap';
import { SecurityPage } from './components/pages/SecurityPage';
import { InvoicePrintPage } from './components/pages/InvoicePrintPage';
import { AdminProfilePage } from './components/pages/AdminProfilePage';
import { ClientLoginScreen } from './components/pages/ClientLoginScreen';
import { ClientDashboard } from './components/pages/ClientDashboard';
import { IntroScreen } from './components/IntroScreen';
import { TechBackground, TouchSparkleOverlay } from './components/TechEffects';
import { PatternLockScreen } from './components/PatternLockScreen';
import { getClientExpiryInfo } from './lib/expiryUtils';
import { BillingModal } from './components/flowforge/BillingModal';
import { ImportWizard } from './components/flowforge/ImportWizard';
import { TownViewModal } from './components/flowforge/TownViewModal';

const sanitizeForStorage = (value: any) => {
 if (!value) return value;
 if (Array.isArray(value)) {
 return value.map((item) => {
 if (item && typeof item === 'object' && typeof item.photo === 'string' && item.photo.length > 800000) {
 return { ...item, photo: null };
 }
 return item;
 });
 } else if (typeof value === 'object') {
 const sanitized = { ...value } as any;
 if (sanitized.logo && typeof sanitized.logo === 'string' && sanitized.logo.length > 1500000) sanitized.logo = null;
 if (sanitized.banner && typeof sanitized.banner === 'string' && sanitized.banner.length > 1500000) sanitized.banner = null;
 return sanitized;
 }
 return value;
};

const writeTimeouts: Record<string, any> = {};
const firstTimeInitAttempted = new Set<string>();

function usePersistentState<T>(key: string, initialValue: T, uid: string): [T, React.Dispatch<React.SetStateAction<T>>] {
 const [state, setState] = useState<T>(() => {
 try {
 const item = localStorage.getItem(key);
 if (!item) return initialValue;
 const parsed = JSON.parse(item);
 if (parsed === null || parsed === undefined) return initialValue;
 return sanitizeForStorage(parsed) as T;
 } catch {
 return initialValue;
 }
 });

 const stateRef = useRef<T>(state);
 stateRef.current = state;
 const isLocalUpdateRef = useRef(false);

 // Immediate synchronous LocalStorage write + Async debounced sync
 const setPersistentState: React.Dispatch<React.SetStateAction<T>> = (value) => {
 isLocalUpdateRef.current = true;
 
 let nextVal: T;
 if (typeof value === 'function') {
 nextVal = (value as (prev: T) => T)(stateRef.current);
 } else {
 nextVal = value;
 }
 
 const sanitized = sanitizeForStorage(nextVal);
 
 // Deep value equality check to completely prevent redundant updates & write-stream loops
 const currentStr = JSON.stringify(stateRef.current);
 const nextStr = JSON.stringify(sanitized);
 if (currentStr === nextStr) {
 return;
 }

 const now = Date.now();
 stateRef.current = sanitized;
 setState(sanitized);

 try {
 localStorage.setItem(key, nextStr);
 localStorage.setItem(`${key}_updatedAt`, now.toString());
 } catch (e) {
 try {
 localStorage.removeItem('nexora_audit_logs');
 localStorage.setItem(key, nextStr);
 localStorage.setItem(`${key}_updatedAt`, now.toString());
 } catch {
 // ignore
 }
 }

 // Cancel any pending debounced writes to conserve quota
 if (writeTimeouts[key]) {
 clearTimeout(writeTimeouts[key]);
 }

 // Debounce Firestore and Backend write by 1500ms to preserve quota limits
 writeTimeouts[key] = setTimeout(() => {
 // 1. Sync with zero-quota backend server database (High Reliability Master)
 fetch('/api/db/set', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ key, value: sanitized })
 }).catch(err => console.warn('Backend db/set sync warning:', err));

 // 2. Sync with Firebase Firestore (Parallel Backup)
 const docRef = doc(db, 'ispWorkspace', 'mainData', 'collections', key);
 setDoc(docRef, { value: sanitized, updatedAt: now }).catch((err) => {
 console.warn(`Firestore save error for ${key}:`, err);
 });

 if (uid && uid !== 'nexora_network_admin') {
 setDoc(doc(db, 'users', uid, 'appData', key), { value: sanitized, updatedAt: now }).catch(() => {});
 }
 }, 1500);
 };

 // Realtime Sync Listener across devices/tabs & page refreshes (Dual API: Express Backend Polling + Firestore Snapshot fallback)
 useEffect(() => {
 let active = true;

 // Helper to process fetched data from either server or Firestore
 const applyRemoteData = (remoteVal: any, remoteUpdatedAt: number) => {
 if (!active || remoteVal === undefined || remoteVal === null) return;

 // Only guard if we have a pending local write in progress
 if (writeTimeouts[key]) {
 return;
 }

 const currentStr = JSON.stringify(stateRef.current);
 const remoteStr = JSON.stringify(remoteVal);
 if (currentStr !== remoteStr) {
 stateRef.current = remoteVal;
 setState(remoteVal as T);
 try {
 localStorage.setItem(key, remoteStr);
 localStorage.setItem(`${key}_updatedAt`, (remoteUpdatedAt || Date.now()).toString());
 } catch {
 // ignore
 }
 }
 };

 // A. Express Backend Database sync (Fast, zero-quota, cross-device reliable)
 const syncWithBackend = () => {
 fetch(`/api/db/get?key=${key}`)
 .then(res => res.json())
 .then(data => {
 if (data.success && data.value !== null) {
 applyRemoteData(data.value, data.updatedAt || 0);
 } else if (data.success && data.value === null) {
 // First time initializer fallback
 const initialData = sanitizeForStorage(stateRef.current);
 fetch('/api/db/set', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ key, value: initialData })
 }).catch(() => {});
 }
 })
 .catch(err => console.warn("Backend db/get sync warning:", err));
 };

 // Initial load
 syncWithBackend();

 // Poll backend database every 3 seconds for lightweight, zero-quota real-time updates
 const pollInterval = setInterval(syncWithBackend, 3000);

 // B. Firebase Firestore snapshot sync (Parallel Backup)
 const docRef = doc(db, 'ispWorkspace', 'mainData', 'collections', key);
 const unsub = onSnapshot(
 docRef,
 (snap) => {
 if (snap.metadata.hasPendingWrites) {
 return;
 }

 if (snap.exists()) {
 const cloudVal = snap.data().value;
 const cloudUpdatedAt = snap.data().updatedAt || 0;
 applyRemoteData(cloudVal, cloudUpdatedAt);
 } else {
 // Guard first-time initialization to prevent looping
 if (!firstTimeInitAttempted.has(key)) {
 firstTimeInitAttempted.add(key);
 const initialData = sanitizeForStorage(stateRef.current);
 setDoc(docRef, { value: initialData, updatedAt: Date.now() }).catch((err) => {
 console.warn(`First-time initialization failed for ${key}:`, err);
 });
 }
 }
 },
 (err) => {
 console.warn(`Firestore onSnapshot error for ${key}:`, err);
 }
 );

 return () => {
 active = false;
 clearInterval(pollInterval);
 unsub();
 if (writeTimeouts[key]) {
 clearTimeout(writeTimeouts[key]);
 }
 };
 }, [key]);

 return [state, setPersistentState];
}

export function MainApp({ uid, onLockApp }: { uid: string; onLockApp?: () => void }) {
 const [showIntro, setShowIntro] = useState(false);
 const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
 const [pageHistory, setPageHistory] = useState<PageId[]>(['dashboard']);
 const [sidebarOpen, setSidebarOpen] = useState(false);

 const handleNavigate = (page: PageId) => {
 if (page !== currentPage) {
 setPageHistory((prev) => [...prev, page]);
 setCurrentPage(page);
 }
 };

 const handleGoBack = () => {
 if (pageHistory.length > 1) {
 const newHistory = [...pageHistory];
 newHistory.pop();
 const prevPage = newHistory[newHistory.length - 1] || 'dashboard';
 setPageHistory(newHistory);
 setCurrentPage(prevPage);
 } else {
 setCurrentPage('dashboard');
 }
 };
 const [isDark, setIsDark] = useState<boolean>(() => {
 const saved = localStorage.getItem('nexora_dark');
 return saved !== null ? JSON.parse(saved) : true;
 });

 const [clients, setClients] = usePersistentState<Client[]>('nexora_clients', initialClients, uid);
 const hasAutoOfflinedRef = useRef(false);
 const [packages, setPackages] = usePersistentState<Package[]>('nexora_packages', initialPackages, uid);

  // Auto-migration: if the database packages are the dummy fallback list (Fiber 10) or empty, restore the 26 real packages
  useEffect(() => {
    if (packages && ((packages.length === 5 && packages[0]?.name === 'Fiber 10') || packages.length === 0)) {
      setPackages(initialPackages);
    }
  }, [packages, setPackages]);
 const [bandwidthProfiles, setBandwidthProfiles] = usePersistentState<BandwidthProfile[]>(
 'nexora_bandwidth',
 initialBandwidthProfiles,
 uid
 );
 const [daysProfiles, setDaysProfiles] = usePersistentState<DaysProfile[]>(
 'nexora_days_profiles',
 initialDaysProfiles,
 uid
 );
 const [hotspotUsers, setHotspotUsers] = usePersistentState<HotspotUser[]>(
 'nexora_hotspot_users',
 initialHotspotUsers,
 uid
 );
 const [hotspotRequests, setHotspotRequests] = usePersistentState<HotspotPackageRequest[]>(
 'nexora_hotspot_requests',
 initialHotspotRequests,
 uid
 );
 const [settings, setSettings] = usePersistentState<AppSettings>('nexora_settings', initialSettings, uid);
  const [adminProfile, setAdminProfile] = usePersistentState<any>('nexora_admin_profile', {
    name: 'Md. Al-Amin (System Admin)',
    role: 'Super Administrator / NOC Lead',
    email: 'admin@nexoranetwork.net',
    phone: '+880 1711-223344',
    address: 'Dhaka, Bangladesh',
    avatar: null,
    twoFactor: true,
    timezone: 'Asia/Dhaka (GMT+6)',
  }, uid);
 const [routerConfig, setRouterConfig] = usePersistentState<RouterConfig>(
 'nexora_router_config',
 initialRouterConfig,
 uid
 );
 const [notifications, setNotifications] = usePersistentState<NotificationItem[]>(
 'nexora_notifications',
 initialNotifications,
 uid
 );
 const [auditLogs, setAuditLogs] = usePersistentState<AuditLog[]>('nexora_audit_logs', initialAuditLogs, uid);
 const [payments, setPayments] = usePersistentState<PaymentRecord[]>('nexora_payments', initialPayments, uid);
 const [invoices, setInvoices] = usePersistentState<Invoice[]>(
 'nexora_invoices',
 initialInvoices,
 uid
 );
 const [routers, setRouters] = usePersistentState<MikrotikRouter[]>(
 'nexora_routers',
 initialRouters,
 uid
 );
 const [renewalRequests, setRenewalRequests] = usePersistentState<BroadbandRenewalRequest[]>(
 'nexora_renewal_requests',
 [],
 uid
 );
 const [selectedRouterId, setSelectedRouterId] = useState<string>(
 initialRouters[0]?.id || 'mk-01'
 );

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
 const [canAutoGenerateInvoices, setCanAutoGenerateInvoices] = useState(false);

 useEffect(() => {
 const timer = setTimeout(() => {
 setCanAutoGenerateInvoices(true);
 }, 4000);
 return () => clearTimeout(timer);
 }, []);

 // FlowForge Global Modals
 const [globalBillingModalOpen, setGlobalBillingModalOpen] = useState(false);
 const [globalImportWizardOpen, setGlobalImportWizardOpen] = useState(false);
 const [globalTownViewOpen, setGlobalTownViewOpen] = useState(false);
 const [selectedLedgerClient, setSelectedLedgerClient] = useState<Client | null>(null);

 // Invoice Handlers
 const handleAddInvoice = (newInvoice: Invoice) => {
 setInvoices((prev) => [newInvoice, ...prev]);
 addAuditLog('Create Invoice', `${newInvoice.invoiceNumber} - ${newInvoice.clientName} (৳${newInvoice.totalAmount})`);
 };

 const handleUpdateInvoice = (updated: Invoice) => {
 setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
 addAuditLog('Update Invoice', updated.invoiceNumber);
 };

 const handleDeleteInvoice = (id: string) => {
 const target = invoices.find((i) => i.id === id);
 setInvoices((prev) => prev.filter((i) => i.id !== id));
 addAuditLog('Delete Invoice', target?.invoiceNumber || id);
 };

 const handleRecordInvoicePayment = (
 invoiceId: string,
 paidAmount: number,
 method: 'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank' | 'Online Gateway',
 trxId?: string,
 collector: string = 'Admin',
 extendExpiry: boolean = true
 ) => {
 const target = invoices.find((i) => i.id === invoiceId);
 if (!target) return;

 const now = new Date();
 const dateStr = now.toISOString().slice(0, 10);
 const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
 const fullTimestamp = `${dateStr} ${timeStr}`;
 const newPaidTotal = (target.paidAmount || 0) + paidAmount;
 const newDue = Math.max(0, target.totalAmount - newPaidTotal);
 const newStatus: 'paid' | 'pending' | 'overdue' = newDue <= 0 ? 'paid' : target.status;

 // Update invoice
 setInvoices((prev) =>
 prev.map((inv) => {
 if (inv.id === invoiceId) {
 return {
 ...inv,
 paidAmount: newPaidTotal,
 dueAmount: newDue,
 status: newStatus,
 paymentMethod: method,
 transactionId: trxId || inv.transactionId,
 paidAt: fullTimestamp,
 };
 }
 return inv;
 })
 );

 // Also record transaction in payments ledger for RevenueTracker
 const paymentRec: PaymentRecord = {
 id: `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
 clientName: target.clientName,
 userId: target.userId,
 package: target.package,
 amount: paidAmount,
 paymentMethod: (method === 'Online Gateway' ? 'bKash' : method) as any,
 transactionType: 'Broadband Renewal',
 collector: collector || 'Admin',
 timestamp: fullTimestamp,
 dateKey: dateStr,
 monthKey: dateStr.slice(0, 7),
 status: 'Completed',
 notes: `Invoice: ${target.invoiceNumber}${trxId ? ` | TrxID: ${trxId}` : ''}`,
 };
 setPayments((prev) => [paymentRec, ...prev]);

 // Optionally extend client expiry by 30 days if paid in full
 if (extendExpiry && newDue <= 0 && target.clientId) {
 setClients((prev) =>
 prev.map((c) => {
 if (c.id === target.clientId) {
 const currentExp = new Date(c.expiry || Date.now());
 const baseDate = currentExp > now ? currentExp : now;
 baseDate.setDate(baseDate.getDate() + 30);
 return {
 ...c,
 expiry: baseDate.toISOString().slice(0, 10),
 status: 'online',
 };
 }
 return c;
 })
 );
 }

 addAuditLog('Record Payment', `${target.invoiceNumber} - ৳${paidAmount} via ${method}`);
 };

 const handleBulkGenerateInvoices = (
 month: string,
 issueDate: string,
 dueDate: string,
 selectedClientIds?: string[]
 ) => {
 const targetClients = selectedClientIds
 ? clients.filter((c) => selectedClientIds.includes(c.id))
 : clients;

 const newInvoices: Invoice[] = targetClients.map((client, idx) => {
 const pkg = packages.find((p) => p.name === client.package);
 const rawPrice = client.price || pkg?.price || '500';
 const parsedPrice = parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10) || 500;
 const randomNum = Math.floor(1000 + Math.random() * 9000);
 const invoiceNumber = `INV-${month.replace('-', '')}-${randomNum}`;

 return {
 id: `inv-${Date.now()}-${idx}-${randomNum}`,
 invoiceNumber,
 clientId: client.id,
 clientName: client.name,
 userId: client.userId,
 phone: client.phone,
 address: settings.address || '',
 router: client.router || 'Main Router',
 package: client.package,
 speed: client.downloadSpeed ? `${client.downloadSpeed} Mbps` : client.bandwidth,
 billingMonth: month,
 issueDate,
 dueDate,
 items: [
 {
 id: `item-${Date.now()}-${idx}`,
 description: `${client.package} Subscription (${client.bandwidth || 'Standard'}) - ${month}`,
 quantity: 1,
 unitPrice: parsedPrice,
 total: parsedPrice,
 },
 ],
 subtotal: parsedPrice,
 discount: 0,
 tax: 0,
 totalAmount: parsedPrice,
 paidAmount: 0,
 dueAmount: parsedPrice,
 status: 'pending',
 notes: 'Monthly broadband internet subscription bill.',
 remindersSentCount: 0,
 };
 });

 setInvoices((prev) => [...newInvoices, ...prev]);
 addAuditLog('Bulk Generate Invoices', `${newInvoices.length} invoices generated for ${month}`);
 };

 const handleSendInvoiceReminder = (invoiceId: string, channel: 'sms' | 'whatsapp' | 'gateway') => {
 const now = new Date();
 const dateStr = now.toISOString().slice(0, 10);
 const target = invoices.find((i) => i.id === invoiceId);

 setInvoices((prev) =>
 prev.map((inv) => {
 if (inv.id === invoiceId) {
 return {
 ...inv,
 remindersSentCount: (inv.remindersSentCount || 0) + 1,
 lastReminderSentAt: dateStr,
 };
 }
 return inv;
 })
 );

 if (target) {
 addAuditLog('Payment Reminder Sent', `${target.invoiceNumber} (${target.clientName}) via ${channel.toUpperCase()}`);
 }
 };

 // Multi-MikroTik Router Handlers
 const handleAddRouter = (newRouter: MikrotikRouter) => {
 setRouters((prev) => [...prev, newRouter]);
 showToast(`নতুন MikroTik Router "${newRouter.name}" সফলভাবে যুক্ত হয়েছে!`, 'success');
 addAuditLog('Add Router Node', `${newRouter.name} (${newRouter.ip})`);
 };

 const handleUpdateRouter = (updated: MikrotikRouter) => {
 setRouters((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
 showToast(`MikroTik Router "${updated.name}" কনফিগারেশন আপডেট হয়েছে!`, 'success');
 addAuditLog('Update Router Node', updated.name);
 };

 const handleDeleteRouter = (id: string) => {
 const target = routers.find((r) => r.id === id);
 setRouters((prev) => prev.filter((r) => r.id !== id));
 if (selectedRouterId === id) {
 const remaining = routers.filter((r) => r.id !== id);
 if (remaining.length > 0) {
 setSelectedRouterId(remaining[0].id);
 }
 }
 showToast(`MikroTik Router "${target?.name || id}" মুছে ফেলা হয়েছে!`, 'warning');
 addAuditLog('Delete Router Node', id);
 };

 const handleToggleRouterConnection = async (id: string) => {
 const targetRouter = routers.find((r) => r.id === id);
 if (!targetRouter) return;

 if (targetRouter.connected) {
 // Disconnecting
 setRouters((prev) =>
 prev.map((r) => (r.id === id ? { ...r, connected: false, errorReason: undefined } : r))
 );
 showToast(`Router "${targetRouter.name}" সংযোগ বিচ্ছিন্ন করা হয়েছে`, 'info');
 addAuditLog('Disconnect Router', targetRouter.name);
 return;
 }

 // Connecting: Perform real socket handshake & authentication check
 showToast(`MikroTik (${targetRouter.ip}:${targetRouter.apiPort || 8728}) এর সাথে অথেনটিকেশন যাচাই করা হচ্ছে...`, 'info');

 try {
 const isDemoRouter = targetRouter.isDefault || targetRouter.name.toLowerCase().includes('demo') || targetRouter.ip === '127.0.0.1';

 const res = await fetch('/api/mikrotik/test-connection', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 host: targetRouter.ip,
 port: targetRouter.apiPort || 8728,
 username: targetRouter.username,
 password: targetRouter.password,
 isDemo: isDemoRouter,
 }),
 });

 const data = await res.json();

 if (data.connected) {
 setRouters((prev) =>
 prev.map((r) => {
 if (r.id === id) {
 return {
 ...r,
 connected: true,
 uptime: data.router?.uptime || r.uptime,
 version: data.router?.version || r.version,
 cpu: data.router?.cpuLoad || r.cpu,
 ram: data.router?.ramUsage || r.ram,
 errorReason: undefined,
 };
 }
 return r;
 })
 );

 if (data.isDemo) {
 showToast(`Demo MikroTik Simulator সক্রিয় হয়েছে (Testing/Preview Mode)`, 'success');
 } else {
 showToast(`MikroTik Router "${targetRouter.name}" (${targetRouter.ip}) আসল হার্ডওয়্যারে সফলভাবে অথেনটিকেটেড ও কানেক্ট হয়েছে!`, 'success');
 }
 addAuditLog('Connect Router', `${targetRouter.name} (${targetRouter.ip})`, 'Success');
 } else {
 setRouters((prev) =>
 prev.map((r) => (r.id === id ? { ...r, connected: false, errorReason: data.errorClass || 'Connection Failed' } : r))
 );
 showToast(
 `কানেকশন ব্যর্থ: ${data.error || 'মাইক্রোটিক রাউটার আইপিতে কানেক্ট করা যায়নি। (ভুয়া কানেকশন দেখানো হয়নি)'}`,
 'error'
 );
 addAuditLog('Connect Router Attempt', `${targetRouter.name} (${targetRouter.ip})`, 'Failed');
 }
 } catch (err: any) {
 setRouters((prev) =>
 prev.map((r) => (r.id === id ? { ...r, connected: false, errorReason: 'Timeout' } : r))
 );
 showToast(
 `কানেকশন এরর: ${err.message || 'নেটওয়ার্ক সকেট কানেক্ট করা যায়নি'}`,
 'error'
 );
 }
 };

 // Dark Mode side effect
 useEffect(() => {
 localStorage.setItem('nexora_dark', JSON.stringify(isDark));
 if (isDark) {
 document.documentElement.classList.add('dark');
 } else {
 document.documentElement.classList.remove('dark');
 }
 }, [isDark]);

 // Automated live status polling from MikroTik Router Board
 useEffect(() => {
 const connectedRouter = routers.find((r) => r.connected);
 if (!connectedRouter) return;

 const checkActiveSessions = async () => {
 try {
 const res = await fetch('/api/mikrotik/active-users', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ router: connectedRouter }),
 });
 const data = await res.json();
 
 if (data.success && Array.isArray(data.activeUsers)) {
 const activeIds = new Set(data.activeUsers.map((u: any) => u.userId));
 
 setClients((prevClients) => {
 let changed = false;
 const updated = prevClients.map((client) => {
 // Match clients belonging to this router
 if (client.router && client.router !== connectedRouter.name) return client;

 const isCurrentlyActiveOnMikrotik = activeIds.has(client.userId);
 
 // Only toggle state for billing 'online' or billing 'offline' (not suspended or expired)
 if (client.status === 'online' && !isCurrentlyActiveOnMikrotik) {
 changed = true;
 return { ...client, status: 'offline' };
 } else if (client.status === 'offline' && isCurrentlyActiveOnMikrotik) {
 changed = true;
 return { ...client, status: 'online' };
 }
 return client;
 });
 return changed ? updated : prevClients;
 });
 }
 } catch (err) {
 console.warn("MikroTik Live Status Polling failed:", err);
 }
 };

 // Initial pull, then poll every 15 seconds
 checkActiveSessions();
 const interval = setInterval(checkActiveSessions, 15000);
 return () => clearInterval(interval);
 }, [routers, setClients]);

 // Toast Helper
 const showToast = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
 const id = Math.random().toString(36).substring(2, 9);
 setToasts((prev) => [...prev, { id, message, type }]);
 setTimeout(() => {
 setToasts((prev) => prev.filter((t) => t.id !== id));
 }, 4000);
 };

 const dismissToast = (id: string) => {
 setToasts((prev) => prev.filter((t) => t.id !== id));
 };

 const addAuditLog = (action: string, target: string, result: 'Success' | 'Failed' = 'Success') => {
 const log: AuditLog = {
 id: Math.random().toString(36).substring(2, 9),
 admin: 'admin',
 action,
 target,
 time: new Date().toLocaleString(),
 ip: '127.0.0.1',
 result,
 };
 setAuditLogs((prev) => [log, ...prev]);
 };

 // Router Connection Actions
 const handleConnectRouter = () => {
 setRouterConfig((prev) => ({ ...prev, connected: true }));
 showToast(`Connected to MikroTik Router at ${routerConfig.ip}`, 'success');
 addAuditLog('Connected Router', routerConfig.ip);
 };

 const handleDisconnectRouter = () => {
 setRouterConfig((prev) => ({ ...prev, connected: false }));
 showToast('Disconnected from MikroTik Router', 'warning');
 addAuditLog('Disconnected Router', routerConfig.ip);
 };

 // MikroTik Router API Live Synchronization Helpers
 const syncClientToMikrotik = async (client: Client, targetRouter?: MikrotikRouter) => {
 const router = targetRouter || routers.find(r => r.name === client.router) || routers.find(r => r.id === selectedRouterId) || routers[0];
 if (!router) {
 showToast("⚠️ কোন রাউটার কনফিগারেশন পাওয়া যায়নি। ক্লায়েন্ট শুধুমাত্র লোকাল ডাটাবেজে সংরক্ষিত হয়েছে।", "warning");
 return;
 }

 try {
 const res = await fetch('/api/mikrotik/sync-client', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ router, client }),
 });
 const data = await res.json();
 if (data.success) {
 showToast(`⚡ ক্লায়েন্ট ${client.name} (${client.userId}) সফলভাবে মাইক্রোটিক রাউটারে (${router.name}) সিঙ্ক ও একটিভ হয়েছে!`, 'success');
 addAuditLog('MikroTik API Sync', `${client.name} - Sync & Active`);
 
 // Auto-mark router connected since the query succeeded
 if (!router.connected) {
 setRouters(prev => prev.map(r => r.id === router.id ? { ...r, connected: true } : r));
 }
 } else {
 showToast(`⚠️ মাইক্রোটিক রাউটার সিঙ্ক করতে ব্যর্থ: ${data.error || 'সংযোগ টাইমআউট বা ভুল পাসওয়ার্ড'}`, 'error');
 }
 } catch (err: any) {
 console.error("MikroTik Sync Error:", err);
 showToast(`❌ রাউটার সংযোগ সমস্যা: ${err.message || 'কানেকশন টাইমআউট'}`, 'error');
 }
 };

 const toggleClientOnMikrotik = async (userId: string, enabled: boolean, targetRouter?: MikrotikRouter) => {
 const client = clients.find(c => c.userId === userId);
 const router = targetRouter || (client ? routers.find(r => r.name === client.router) : null) || routers.find(r => r.id === selectedRouterId) || routers[0];
 if (!router) {
 return;
 }

 try {
 const res = await fetch('/api/mikrotik/toggle-client', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ router, userId, enabled }),
 });
 const data = await res.json();
 if (data.success) {
 showToast(`⚡ মাইক্রোটিক পোর্টে Hotspot ইউজার ${userId} সফলভাবে ${enabled ? 'সক্রিয় (ENABLED)' : 'নিষ্ক্রিয় (DISABLED)'} করা হয়েছে!`, enabled ? 'success' : 'info');
 addAuditLog('MikroTik API Toggle', `${userId} - ${enabled ? 'Enabled' : 'Disabled'}`);
 
 // Auto-mark router connected since the query succeeded
 if (!router.connected) {
 setRouters(prev => prev.map(r => r.id === router.id ? { ...r, connected: true } : r));
 }
 } else {
 showToast(`⚠️ রাউটারে ইউজার স্ট্যাটাস পরিবর্তন ব্যর্থ: ${data.error || 'সংযোগ সংযোগ বিচ্ছিন্ন'}`, 'error');
 }
 } catch (err: any) {
 console.error("MikroTik Toggle Error:", err);
 showToast(`❌ রাউটার সংযোগ সমস্যা: ${err.message || 'কানেকশন টাইমআউট'}`, 'error');
 }
 };

 // Helper to log payment automatically
 const autoLogPayment = (client: Client, type: 'New Client Activation' | 'Broadband Renewal') => {
 const rawPrice = client.price || packages.find((p) => p.name === client.package)?.price || '500';
 const amount = parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10) || 500;
 if (amount <= 0) return;

 const now = new Date();
 const newPayment: PaymentRecord = {
 id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
 clientName: client.name,
 userId: client.userId,
 package: client.package,
 amount: amount,
 paymentMethod: 'Cash',
 transactionType: type,
 collector: 'Auto Billed',
 timestamp: now.toLocaleString(),
 dateKey: now.toISOString().slice(0, 10),
 monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
 status: 'Completed',
 };
 setPayments((prev) => [newPayment, ...prev]);
 };

 // Client CRUD
 const handleAddClient = (client: Client) => {
 setClients((prev) => [client, ...prev]);
 addAuditLog('Create Client', client.name);
 autoLogPayment(client, 'New Client Activation');
 syncClientToMikrotik(client);
 };

 const handleUpdateClient = (updated: Client) => {
 let finalClient = { ...updated };

 setClients((prev) => prev.map((c) => (c.id === finalClient.id ? finalClient : c)));
 addAuditLog('Update Client Expiry/Details', finalClient.name);
 syncClientToMikrotik(finalClient);
 };

 const handleDeleteClient = (id: string) => {
 const target = clients.find((c) => c.id === id);
 setClients((prev) => prev.filter((c) => c.id !== id));
 if (target) {
 addAuditLog('Delete Client', target.name);
 toggleClientOnMikrotik(target.userId, false);
 }
 };

 const handleRenewClient = (id: string, months: number = 1, amount?: number, paymentMethod?: string) => {
 const targetClient = clients.find(c => c.id === id);
 if (!targetClient) return;

 const currentExp = new Date(targetClient.expiry).getTime();
 const now = Date.now();
 const baseDate = isNaN(currentExp) || currentExp < now ? now : currentExp;
 const newExp = new Date(baseDate + (months * 30) * 86400000).toISOString().split('T')[0];

 const updatedClient: Client = {
 ...targetClient,
 expiry: newExp,
 status: 'online',
 };

 if (amount !== undefined && paymentMethod) {
 const nowTime = new Date();
 const newPayment: PaymentRecord = {
 id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
 clientName: targetClient.name,
 userId: targetClient.userId,
 package: targetClient.package,
 amount: amount,
 paymentMethod: paymentMethod as any,
 transactionType: 'Broadband Renewal',
 collector: 'Admin Portal',
 timestamp: nowTime.toLocaleString(),
 dateKey: nowTime.toISOString().slice(0, 10),
 monthKey: `${nowTime.getFullYear()}-${String(nowTime.getMonth() + 1).padStart(2, '0')}`,
 status: 'Completed',
 };
 setPayments((prevP) => [newPayment, ...prevP]);
 } else {
 autoLogPayment(targetClient, 'Broadband Renewal');
 }

 setClients((prev) =>
 prev.map((c) => (c.id === id ? updatedClient : c))
 );
 addAuditLog('Renew Subscription', id);
 syncClientToMikrotik(updatedClient);
 };

 const handleCollectPayment = (paymentData: {
 clientId: string;
 amount: number;
 months: number;
 paymentMethod: string;
 transactionId?: string;
 discount?: number;
 notes?: string;
 }) => {
 handleRenewClient(paymentData.clientId, paymentData.months, paymentData.amount, paymentData.paymentMethod);
 showToast(`✅ Payment of ৳${paymentData.amount} recorded & subscriber renewed!`, 'success');
 };

 const handleBulkImportClients = (importedList: Client[]) => {
 setClients((prev) => [...importedList, ...prev]);
 addAuditLog('Bulk CSV Import', `${importedList.length} clients imported`);
 showToast(`🚀 Successfully imported ${importedList.length} clients!`, 'success');
 };

 const handleToggleStatus = (id: string) => {
 let targetClient: Client | undefined;
 setClients((prev) =>
 prev.map((c) => {
 if (c.id === id) {
 const newStatus = c.status === 'online' ? 'offline' : 'online';
 let expiry = c.expiry;
 
 // Auto-renew expired clients by 30 days when manually toggled to 'online'
 const info = getClientExpiryInfo(c.expiry);
 if (newStatus === 'online' && info.isExpired) {
 const futureDate = new Date(Date.now() + 30 * 86400000);
 expiry = futureDate.toISOString().split('T')[0];
 showToast(`🔄 Client ${c.name} is activated! Auto-renewed package expiry by 30 days (till: ${expiry})`, 'success');
 }
 
 targetClient = { ...c, status: newStatus, expiry };
 return targetClient;
 }
 return c;
 })
 );
 addAuditLog('Toggle Client Status', id);
 if (targetClient) {
 toggleClientOnMikrotik((targetClient as Client).userId, (targetClient as Client).status === 'online');
 }
 };

 // Real-time Billing & Invoice Reconciliation Engine
 useEffect(() => {
 if (!invoices || !payments || invoices.length === 0 || payments.length === 0) return;

 let changed = false;
 const updatedInvoices = invoices.map((inv) => {
 // If invoice is already paid, nothing to reconcile
 if (inv.status === 'paid' || inv.dueAmount <= 0) return inv;

 // Find if there is a Completed payment record for this client and billing month
 const matchingPayment = payments.find(
 (pay) =>
 pay.userId === inv.userId &&
 pay.monthKey === inv.billingMonth &&
 pay.status === 'Completed'
 );

 if (matchingPayment) {
 changed = true;
 const newPaidTotal = (inv.paidAmount || 0) + matchingPayment.amount;
 const newDue = Math.max(0, inv.totalAmount - newPaidTotal);
 return {
 ...inv,
 paidAmount: newPaidTotal,
 dueAmount: newDue,
 status: newDue <= 0 ? 'paid' as const : inv.status,
 paymentMethod: matchingPayment.paymentMethod as any,
 transactionId: matchingPayment.id,
 paidAt: matchingPayment.timestamp,
 };
 }
 return inv;
 });

 if (changed) {
 setInvoices(updatedInvoices);
 showToast('🔄 রিয়েল-টাইম বিলিং সিঙ্ক: নতুন পেমেন্ট ইনভয়েসের সাথে যুক্ত করা হয়েছে!', 'success');
 }
 }, [payments, invoices, setInvoices]);

 // Auto-generate Monthly Invoices for Registered Clients
 useEffect(() => {
 if (!canAutoGenerateInvoices || !clients || clients.length === 0) return;

 const now = new Date();
 const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
 
 // Find clients who do NOT have an invoice for the current month
 const clientsWithoutInvoice = clients.filter((client) => {
 return !invoices.some(
 (inv) => inv.clientId === client.id && inv.billingMonth === currentMonth
 );
 });

 if (clientsWithoutInvoice.length > 0) {
 const issueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
 const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`;

 const newInvoices: Invoice[] = clientsWithoutInvoice.map((client, idx) => {
 const pkg = packages.find((p) => p.name === client.package);
 const rawPrice = client.price || pkg?.price || '500';
 const parsedPrice = parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10) || 500;
 const randomNum = Math.floor(1000 + Math.random() * 9000);
 const invoiceNumber = `INV-${currentMonth.replace('-', '')}-${randomNum}`;

 return {
 id: `inv-${Date.now()}-${idx}-${randomNum}`,
 invoiceNumber,
 clientId: client.id,
 clientName: client.name,
 userId: client.userId,
 phone: client.phone || '',
 address: settings.address || '',
 router: client.router || 'Main Router',
 package: client.package,
 speed: client.downloadSpeed ? `${client.downloadSpeed} Mbps` : client.bandwidth,
 billingMonth: currentMonth,
 issueDate,
 dueDate,
 items: [
 {
 id: `item-${Date.now()}-${idx}`,
 description: `${client.package} Subscription (${client.bandwidth || 'Standard'}) - ${currentMonth}`,
 quantity: 1,
 unitPrice: parsedPrice,
 total: parsedPrice,
 },
 ],
 subtotal: parsedPrice,
 discount: 0,
 tax: 0,
 totalAmount: parsedPrice,
 paidAmount: 0,
 dueAmount: parsedPrice,
 status: 'pending',
 notes: 'Monthly broadband internet subscription bill.',
 remindersSentCount: 0,
 };
 });

 setInvoices((prev) => [...newInvoices, ...prev]);
 addAuditLog('Auto Generate Invoices', `${newInvoices.length} billing statements auto-generated for ${currentMonth}`);
 showToast(`📊 ${newInvoices.length} জন গ্রাহকের জন্য চলতি মাসের বিল রিয়েল-টাইমে তৈরি করা হয়েছে!`, 'info');
 }
 }, [canAutoGenerateInvoices, clients, invoices, packages, settings.address, setInvoices]);

 // Automated Subscription Expiry Notification & Auto-Offline System
 useEffect(() => {
 if (!clients || clients.length === 0) return;

 // Check for clients whose expiry passed and are still marked 'online' -> auto-offline
 const expiredOnline = clients.filter((c) => {
 const info = getClientExpiryInfo(c.expiry);
 return info.isExpired && c.status === 'online';
 });

 if (expiredOnline.length > 0 && !hasAutoOfflinedRef.current) {
 hasAutoOfflinedRef.current = true;
 setClients((prev) =>
 prev.map((c) => {
 const info = getClientExpiryInfo(c.expiry);
 if (info.isExpired && c.status === 'online') {
 return { ...c, status: 'offline' };
 }
 return c;
 })
 );
 showToast(`⚠️ ${expiredOnline.length} জন গ্রাহকের প্যাকেজের মেয়াদ শেষ হওয়ায় লাইন স্বয়ংক্রিয়ভাবে অফলাইন করা হয়েছে!`, 'warning');
 addAuditLog('Auto-Disconnect Expired Lines', `${expiredOnline.length} Clients Auto-Deactivated`);
 }

 const expiringClients = clients.filter((c) => {
 const info = getClientExpiryInfo(c.expiry);
 return info.isExpiringSoon;
 });

 if (expiringClients.length === 0) return;

 setNotifications((prev) => {
 const existingTexts = new Set(prev.map((n) => n.text));
 const newNotifs: NotificationItem[] = [];

 expiringClients.forEach((c) => {
 const info = getClientExpiryInfo(c.expiry);
 let notifText = '';
 let icon = '⏰';

 if (info.isExpired) {
 notifText = `⚠️ মেয়াদোত্তীর্ণ সতর্কতা: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, মেয়াদ ${c.expiry} তারিখে শেষ হয়েছে (সংযোগ অটো-অফলাইন)!`;
 icon = '🚨';
 } else if (info.isExpiringToday) {
 notifText = `🚨 আজই মেয়াদ শেষ: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, অবিলম্বে SMS রিমাইন্ডার পাঠান!`;
 icon = '🚨';
 } else if (info.daysLeft === 1) {
 notifText = `⚠️ ১ দিন বাকি: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, মেয়াদ কাল শেষ হচ্ছে (${c.expiry})!`;
 icon = '⚠️';
 } else {
 notifText = `⏰ ${info.daysLeft} দিন বাকি: ${c.name} (${c.userId}) - প্যাকেজ ${c.package}, বিল ৳${c.price || '500'}, মেয়াদ ${c.expiry} তারিখে শেষ হবে।`;
 icon = '⏰';
 }

 if (!existingTexts.has(notifText)) {
 newNotifs.push({
 id: Date.now() + Math.floor(Math.random() * 10000),
 icon,
 text: notifText,
 time: 'Auto-Alert',
 read: false,
 });
 }
 });

 if (newNotifs.length > 0) {
 return [...newNotifs, ...prev];
 }
 return prev;
 });
 }, [clients]);

 const handleSendSmsReminder = (client: Client, messageText: string, channel: 'SMS' | 'WhatsApp' | 'Manual') => {
 addAuditLog(`Sent ${channel} Expiry Reminder`, `${client.name} (${client.phone})`);
 };

 // Package CRUD
 const handleAddPackage = (pkg: Package) => {
 const updated = [...packages, pkg];
 setPackages(updated);
 addAuditLog('Create Package', pkg.name);

 // Auto sync to hotspot login page
 try {
 const html = buildDynamicHotspotHtml(updated, settings);
 localStorage.setItem('nexora_hotspot_html', html);
 } catch (e) {
 // ignore
 }
 showToast(`⚡ প্যাকেজ "${pkg.name}" তৈরি হয়েছে এবং মাইক্রোটিক হটস্পট লগইন পেজে অটো সিঙ্ক হয়েছে!`, 'success');
 };

 const handleUpdatePackage = (pkg: Package) => {
 const updated = packages.map((p) => (p.id === pkg.id ? pkg : p));
 setPackages(updated);
 addAuditLog('Update Package', pkg.name);

 try {
 const html = buildDynamicHotspotHtml(updated, settings);
 localStorage.setItem('nexora_hotspot_html', html);
 } catch (e) {
 // ignore
 }
 showToast(`⚡ প্যাকেজ "${pkg.name}" আপডেট করা হয়েছে এবং হটস্পট পেজে সিঙ্ক হয়েছে!`, 'info');
 };

 const handleDeletePackage = (id: number) => {
 const target = packages.find((p) => p.id === id);
 const updated = packages.filter((p) => p.id !== id);
 setPackages(updated);
 addAuditLog('Delete Package', String(id));

 try {
 const html = buildDynamicHotspotHtml(updated, settings);
 localStorage.setItem('nexora_hotspot_html', html);
 } catch (e) {
 // ignore
 }
 if (target) {
 showToast(`প্যাকেজ "${target.name}" মুছে ফেলা হয়েছে এবং হটস্পট পেজ সিঙ্ক করা হয়েছে।`, 'warning');
 }
 };

 // Bandwidth CRUD
 const handleAddBandwidth = (b: BandwidthProfile) => {
 setBandwidthProfiles((prev) => [...prev, b]);
 addAuditLog('Create Bandwidth Profile', b.name);
 };

 const handleUpdateBandwidth = (b: BandwidthProfile) => {
 setBandwidthProfiles((prev) => prev.map((p) => (p.id === b.id ? b : p)));
 addAuditLog('Update Bandwidth Profile', b.name);
 };

 const handleDeleteBandwidth = (id: number) => {
 setBandwidthProfiles((prev) => prev.filter((p) => p.id !== id));
 addAuditLog('Delete Bandwidth Profile', String(id));
 };

 // Days Profile CRUD
 const handleAddDaysProfile = (dp: DaysProfile) => {
 if (dp.isDefault) {
 setDaysProfiles((prev) => prev.map((p) => ({ ...p, isDefault: false })));
 }
 setDaysProfiles((prev) => [...prev, dp]);
 addAuditLog('Create Days Profile', dp.name);
 };

 const handleUpdateDaysProfile = (dp: DaysProfile) => {
 setDaysProfiles((prev) =>
 prev.map((p) => {
 if (dp.isDefault && p.id !== dp.id) {
 return { ...p, isDefault: false };
 }
 return p.id === dp.id ? dp : p;
 })
 );
 addAuditLog('Update Days Profile', dp.name);
 };

 const handleDeleteDaysProfile = (id: number) => {
 setDaysProfiles((prev) => prev.filter((p) => p.id !== id));
 addAuditLog('Delete Days Profile', String(id));
 };

 // Hotspot User Actions
 const handleAddHotspotUser = (user: HotspotUser) => {
 setHotspotUsers((prev) => [user, ...prev]);
 addAuditLog('Add Hotspot User', user.username);
 };

 const handleDisconnectHotspotUser = (mac: string) => {
 setHotspotUsers((prev) => prev.filter((u) => u.mac !== mac));
 addAuditLog('Disconnect Hotspot User', mac);
 };

 // Hotspot Package Request Handlers
 const handleAddHotspotRequest = (req: Omit<HotspotPackageRequest, 'id' | 'requestedAt' | 'status'>) => {
 const newReq: HotspotPackageRequest = {
 ...req,
 id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
 requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 status: 'pending',
 };
 setHotspotRequests((prev) => [newReq, ...prev]);

 const newNotif: NotificationItem = {
 id: Date.now(),
 icon: '⚡',
 text: `নতুন হটস্পট রিকুয়েস্ট: ${req.clientName} (${req.phone}) - ${req.package} [৳${req.price}]`,
 time: 'Just Now',
 read: false,
 };
 setNotifications((prev) => [newNotif, ...prev]);

 showToast(`🔔 নতুন হটস্পট রিকুয়েস্ট এসেছে! ${req.clientName} (${req.phone})`, 'success');
 addAuditLog('Hotspot Package Request', req.clientName);
 };

 const handleAddPayment = (payment: Omit<PaymentRecord, 'id'>) => {
 const newRecord: PaymentRecord = {
 ...payment,
 id: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
 };
 setPayments((prev) => [newRecord, ...prev]);
 addAuditLog('Recharge Payment', `${newRecord.clientName} (৳${newRecord.amount})`);
 };

 const handleApproveHotspotRequest = (reqId: string, createdUserId?: string) => {
 const targetReq = hotspotRequests.find((r) => r.id === reqId);
 setHotspotRequests((prev) =>
 prev.map((r) => (r.id === reqId ? { ...r, status: 'approved', createdUserId } : r))
 );

 if (targetReq) {
 const now = new Date();
 const dateKey = now.toISOString().slice(0, 10);
 const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

 const autoPayment: PaymentRecord = {
 id: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
 clientName: targetReq.clientName,
 userId: createdUserId || targetReq.phone,
 package: targetReq.package,
 amount: parseInt(String(targetReq.price).replace(/[^\d]/g, ''), 10) || 500,
 paymentMethod: (targetReq.gateway as any) || 'Hotspot Portal',
 transactionType: 'Hotspot Voucher',
 collector: 'Admin Portal',
 timestamp: `${dateKey} ${timeStr}`,
 dateKey: dateKey,
 monthKey: dateKey.slice(0, 7),
 status: 'Completed',
 };
 setPayments((prev) => [autoPayment, ...prev]);
 }

 addAuditLog('Approved Hotspot Request', reqId);
 };

 const handleRejectHotspotRequest = (reqId: string) => {
 setHotspotRequests((prev) =>
 prev.map((r) => (r.id === reqId ? { ...r, status: 'rejected' } : r))
 );
 showToast('Hotspot request rejected', 'warning');
 addAuditLog('Rejected Hotspot Request', reqId);
 };

 const handleApproveBroadbandRenewal = (reqId: string, customMessageText?: string) => {
 const targetReq = renewalRequests.find((r) => r.id === reqId);
 if (!targetReq) return;

 const targetClient = clients.find((c) => c.id === targetReq.clientId || c.userId === targetReq.userId);
 if (targetClient) {
 const selectedPkg = packages.find((p) => p.name === targetReq.requestedPackage);
 let validityDays = 30;
 if (selectedPkg && selectedPkg.validity) {
 const daysMatch = selectedPkg.validity.match(/\d+/);
 if (daysMatch) validityDays = parseInt(daysMatch[0], 10);
 }

 const currentExp = new Date(targetClient.expiry).getTime();
 const now = Date.now();
 const baseDate = isNaN(currentExp) || currentExp < now ? now : currentExp;
 const newExp = new Date(baseDate + (validityDays * 86400000)).toISOString().split('T')[0];

 const updatedClient: Client = {
 ...targetClient,
 package: targetReq.requestedPackage,
 price: targetReq.price,
 expiry: newExp,
 status: 'online',
 downloadSpeed: selectedPkg?.speed || targetClient.downloadSpeed,
 uploadSpeed: selectedPkg?.upload || targetClient.uploadSpeed,
 };

 setClients((prev) => prev.map((c) => (c.id === targetClient.id ? updatedClient : c)));
 syncClientToMikrotik(updatedClient);

 const nowTime = new Date();
 const amount = parseInt(targetReq.price.replace(/[^\d]/g, ''), 10) || 500;
 const newPayment: PaymentRecord = {
 id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
 clientName: targetClient.name,
 userId: targetClient.userId,
 package: targetReq.requestedPackage,
 amount: amount,
 paymentMethod: targetReq.paymentMethod as any,
 transactionType: 'Broadband Renewal',
 collector: 'Online Gateway Approved',
 timestamp: nowTime.toLocaleString(),
 dateKey: nowTime.toISOString().slice(0, 10),
 monthKey: `${nowTime.getFullYear()}-${String(nowTime.getMonth() + 1).padStart(2, '0')}`,
 status: 'Completed',
 notes: `Transaction ID: ${targetReq.transactionId}. Approved from Online Client Panel.`,
 };
 setPayments((prev) => [newPayment, ...prev]);

 const smsMessage = customMessageText || `Dear ${targetClient.name}, your account is successfully renewed with ${targetReq.requestedPackage}. Valid till ${newExp}. TrxID: ${targetReq.transactionId}. Nexora network.`;
 
 try {
 const localLogs = localStorage.getItem('isp_sms_logs');
 const currentLogs = localLogs ? JSON.parse(localLogs) : [];
 const newLogItem = {
 id: `SMS-${Math.floor(1000 + Math.random() * 9000)}`,
 recipientName: targetClient.name,
 phone: targetClient.phone,
 type: 'Payment Received',
 message: smsMessage,
 sentAt: new Date().toLocaleString(),
 status: 'Delivered',
 };
 localStorage.setItem('isp_sms_logs', JSON.stringify([newLogItem, ...currentLogs]));
 } catch (err) {
 console.error("Failed to write to SMS logs:", err);
 }

 showToast(`Renewal approved! Client ${targetClient.name} is now ONLINE.`, 'success');
 addAuditLog('Approve Broadband Renewal', targetClient.name);
 } else {
 showToast(`Error: Client not found for renewal`, 'error');
 }

 setRenewalRequests((prev) =>
 prev.map((r) => (r.id === reqId ? { ...r, status: 'approved' } : r))
 );
 };

 const handleRejectBroadbandRenewal = (reqId: string) => {
 setRenewalRequests((prev) =>
 prev.map((r) => (r.id === reqId ? { ...r, status: 'rejected' } : r))
 );
 showToast('Broadband renewal request rejected', 'warning');
 addAuditLog('Reject Broadband Renewal', reqId);
 };

 // Notification Actions
 const handleMarkAllNotificationsRead = () => {
 setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
 };

 const handleClearNotifications = () => {
 setNotifications([]);
 };

 const handleToggleNotificationRead = (id: number) => {
 setNotifications((prev) =>
 prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
 );
 };

 const handleResetAllData = () => {
 setClients([]);
 setHotspotUsers([]);
 setHotspotRequests([]);
 setNotifications([]);
 setAuditLogs([]);
 setPayments([]);
 const moduleKeys = [
 'configuration',
 'hr-payroll',
 'network-diagram',
 'leave-management',
 'mac-reseller',
 'events-holidays',
 'support-ticketing',
 'task-management',
 'bandwidth-buy',
 'bandwidth-sale',
 'purchase',
 'inventory',
 'assets',
 'billing',
 ];
 moduleKeys.forEach((k) => localStorage.removeItem(`isp_module_records_${k}`));
 localStorage.removeItem('nexora_clients');
 localStorage.removeItem('nexora_payments');
 localStorage.removeItem('nexora_hotspot_users');
 localStorage.removeItem('nexora_hotspot_requests');
 localStorage.removeItem('nexora_notifications');
 localStorage.removeItem('nexora_audit_logs');
 showToast('সমস্ত পুরানো তথ্য রিসেট করা হয়েছে। আপনার অ্যাপ এখন একদম নতুন (0 Clients)!', 'success');
 };

 const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

 return (
 <div className="min-h-screen bg-[#ecf0f5] text-slate-800 font-sans flex relative">
 {/* Sidebar Navigation */}
 <Sidebar
 currentPage={currentPage}
 onNavigate={handleNavigate}
 isOpen={sidebarOpen}
 onClose={() => setSidebarOpen(false)}
 unreadNotifications={unreadNotificationsCount}
 settings={settings}
 />

 {/* Main Content Area */}
 <div className="flex-1 min-w-0 lg:pl-[270px] flex flex-col min-h-screen w-full">
 <Topbar
 currentPage={currentPage}
 onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
 onNavigate={handleNavigate}
 onGoBack={handleGoBack}
 unreadCount={unreadNotificationsCount}
 isDark={isDark}
 onToggleTheme={() => setIsDark(!isDark)}
 settings={settings}
 clients={clients}
 onLock={onLockApp}
 onOpenBillingModal={() => setGlobalBillingModalOpen(true)}
 onOpenImportWizard={() => setGlobalImportWizardOpen(true)}
 onOpenTownView={() => setGlobalTownViewOpen(true)}
 />

 <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
 {/* Back Navigation Bar for Inner Pages */}
 {currentPage !== 'dashboard' && (
 <div className="bg-white border border-slate-200 rounded px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
 <div className="flex items-center gap-3">
 <button
 onClick={handleGoBack}
 className="px-3.5 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white font-semibold rounded shadow-sm flex items-center gap-2 cursor-pointer transition-all"
 >
 <ArrowLeft className="w-4 h-4" />
 <span>Go Back</span>
 </button>

 <div className="flex items-center gap-2 text-slate-900 font-medium">
 <button
 onClick={() => handleNavigate('dashboard')}
 className="hover:text-[#3c8dbc] flex items-center gap-1 cursor-pointer transition-colors"
 >
 <Home className="w-4 h-4 text-slate-800" />
 <span>Dashboard</span>
 </button>
 <ChevronRight className="w-3.5 h-3.5 text-slate-800" />
 <span className="text-[#3c8dbc] font-bold capitalize bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
 {currentPage.replace('-', ' ')}
 </span>
 </div>
 </div>

 <button
 onClick={() => handleNavigate('dashboard')}
 className="text-slate-900 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded border border-slate-300 transition-colors"
 >
 <RotateCcw className="w-3.5 h-3.5 text-slate-800" />
 <span>Main Dashboard</span>
 </button>
 </div>
 )}

 <div key={currentPage} className="animate-page-enter">
 {currentPage === 'dashboard' && (
 <Dashboard
 clients={clients}
 payments={payments}
 hotspotUsers={hotspotUsers}
 hotspotRequests={hotspotRequests}
 routerConfig={routerConfig}
 settings={settings}
 onConnectRouter={handleConnectRouter}
 onDisconnectRouter={handleDisconnectRouter}
 onNavigate={handleNavigate}
 onApproveRequest={handleApproveHotspotRequest}
 onRejectRequest={handleRejectHotspotRequest}
 onHardResetAll={handleResetAllData}
 onCollectPayment={handleCollectPayment}
 onBulkImportClients={handleBulkImportClients}
 />
 )}

 {currentPage === 'clients' && (
 <ClientsPage
 clients={clients}
 routers={routers}
 packages={packages}
 bandwidthProfiles={bandwidthProfiles}
 daysProfiles={daysProfiles}
 hotspotRequests={hotspotRequests}
 settings={settings}
 routerConnected={routerConfig.connected}
 onAddClient={handleAddClient}
 onUpdateClient={handleUpdateClient}
 onDeleteClient={handleDeleteClient}
 onRenewClient={handleRenewClient}
 onToggleStatus={handleToggleStatus}
 onApproveRequest={handleApproveHotspotRequest}
 onRejectRequest={handleRejectHotspotRequest}
 onSendSmsReminder={handleSendSmsReminder}
 onGenerateInvoice={(c) => {
 setCurrentPage('billing');
 showToast(`গ্রাহক "${c.name}" এর জন্য ইনভয়েস ও বিলিং পেজ ওপেন করা হয়েছে`, 'info');
 }}
 showToast={showToast}
 onHardReset={() => {
 setClients([]);
 localStorage.removeItem('nexora_clients');
 if (uid) setDoc(doc(db, 'users', uid, 'appData', 'nexora_clients'), { value: [] }).catch(console.error);
 showToast('সকল ক্লায়েন্ট ডাটা মুছে ফেলা হয়েছে', 'success');
 }}
 />
 )}

 {currentPage === 'packages' && (
 <PackagesPage
 packages={packages}
 daysProfiles={daysProfiles}
 onAddPackage={handleAddPackage}
 onUpdatePackage={handleUpdatePackage}
 onDeletePackage={handleDeletePackage}
 showToast={showToast}
 onHardReset={() => {
 setPackages(initialPackages);
 showToast('প্যাকেজ ডাটা সফলভাবে রিসেট করে ২৬টি প্যাকেজ লোড করা হয়েছে!', 'success');
 }}
 />
 )}

 {currentPage === 'bandwidth' && (
 <BandwidthPage
 profiles={bandwidthProfiles}
 routerConfig={routerConfig}
 onConnectRouter={handleConnectRouter}
 onAddProfile={handleAddBandwidth}
 onUpdateProfile={handleUpdateBandwidth}
 onDeleteProfile={handleDeleteBandwidth}
 showToast={showToast}
 onHardReset={() => {
 setBandwidthProfiles([]);
 localStorage.removeItem('nexora_bandwidth');
 if (uid) setDoc(doc(db, 'users', uid, 'appData', 'nexora_bandwidth'), { value: [] }).catch(console.error);
 showToast('সকল ব্যান্ডউইথ প্রোফাইল মুছে ফেলা হয়েছে', 'success');
 }}
 />
 )}

 {currentPage === 'days-profile' && (
 <DaysProfilePage
 daysProfiles={daysProfiles}
 onAddDaysProfile={handleAddDaysProfile}
 onUpdateDaysProfile={handleUpdateDaysProfile}
 onDeleteDaysProfile={handleDeleteDaysProfile}
 showToast={showToast}
 onHardReset={() => {
 setDaysProfiles([]);
 localStorage.removeItem('nexora_days_profiles');
 if (uid) setDoc(doc(db, 'users', uid, 'appData', 'nexora_days_profiles'), { value: [] }).catch(console.error);
 showToast('সকল মেয়াদের প্রোফাইল মুছে ফেলা হয়েছে', 'success');
 }}
 />
 )}

 {(currentPage === 'mikrotik-management' || currentPage === 'mikrotik-configure') && (
 <MikrotikManagementPage
 routers={routers}
 selectedRouterId={selectedRouterId}
 onSelectRouter={setSelectedRouterId}
 onAddRouter={handleAddRouter}
 onUpdateRouter={handleUpdateRouter}
 onDeleteRouter={handleDeleteRouter}
 onToggleRouterConnection={handleToggleRouterConnection}
 clients={clients}
 packages={packages}
 bandwidthProfiles={bandwidthProfiles}
 daysProfiles={daysProfiles}
 settings={settings}
 onAddClient={handleAddClient}
 onUpdateClient={handleUpdateClient}
 onDeleteClient={handleDeleteClient}
 onToggleClientStatus={handleToggleStatus}
 onSendSmsReminder={handleSendSmsReminder}
 showToast={showToast}
 />
 )}

 {currentPage === 'mikrotik-security' && (
 <MikrotikSecurityPage
 routerConfig={routerConfig}
 showToast={showToast}
 />
 )}

 {currentPage === 'hotspot' && (
 <HotspotPage
 hotspotUsers={hotspotUsers}
 packages={packages}
 hotspotRequests={hotspotRequests}
 onAddHotspotUser={handleAddHotspotUser}
 onDisconnectHotspotUser={handleDisconnectHotspotUser}
 onAddHotspotRequest={handleAddHotspotRequest}
 onApproveRequest={handleApproveHotspotRequest}
 onRejectRequest={handleRejectHotspotRequest}
 onNavigate={handleNavigate}
 showToast={showToast}
 onHardReset={() => {
 setHotspotUsers([]);
 setHotspotRequests([]);
 localStorage.removeItem('nexora_hotspot_users');
 localStorage.removeItem('nexora_hotspot_requests');
 if (uid) {
 setDoc(doc(db, 'users', uid, 'appData', 'nexora_hotspot_users'), { value: [] }).catch(console.error);
 setDoc(doc(db, 'users', uid, 'appData', 'nexora_hotspot_requests'), { value: [] }).catch(console.error);
 }
 showToast('সকল হটস্পট ইউজার ও রিকুয়েস্ট ডাটা মুছে ফেলা হয়েছে', 'success');
 }}
 />
 )}

 {currentPage === 'hotspot-config' && (
 <HotspotConfigPage
 packages={packages}
 settings={settings}
 onAddHotspotRequest={handleAddHotspotRequest}
 showToast={showToast}
 />
 )}

 {currentPage === 'billing' && (
 <BillingPage
 invoices={invoices}
 clients={clients}
 packages={packages}
 routers={routers}
 settings={settings}
 onAddInvoice={handleAddInvoice}
 onUpdateInvoice={handleUpdateInvoice}
 onDeleteInvoice={handleDeleteInvoice}
 onRecordPayment={handleRecordInvoicePayment}
 onBulkGenerateInvoices={handleBulkGenerateInvoices}
 onSendReminder={handleSendInvoiceReminder}
 showToast={showToast}
 onHardReset={() => {
 setInvoices([]);
 localStorage.removeItem('nexora_invoices');
 if (uid) setDoc(doc(db, 'users', uid, 'appData', 'nexora_invoices'), { value: [] }).catch(console.error);
 showToast('সকল ইনভয়েস ও বিলিং ডাটা মুছে ফেলা হয়েছে', 'success');
 }}
 />
 )}

 {currentPage === 'reports' && (
 <RevenueTrackerPage
 payments={payments}
 clients={clients}
 packages={packages}
 settings={settings}
 onAddPayment={handleAddPayment}
 showToast={showToast}
 onHardReset={() => {
 setPayments([]);
 localStorage.removeItem('nexora_payments');
 if (uid) setDoc(doc(db, 'users', uid, 'appData', 'nexora_payments'), { value: [] }).catch(console.error);
 showToast('সকল বিলিং ও পেমেন্ট হিস্ট্রি ডাটা মুছে ফেলা হয়েছে', 'success');
 }}
 />
 )}

 {currentPage === 'notifications' && (
 <NotificationsPage
 notifications={notifications}
 hotspotRequests={hotspotRequests}
 renewalRequests={renewalRequests}
 onApproveBroadbandRenewal={handleApproveBroadbandRenewal}
 onRejectBroadbandRenewal={handleRejectBroadbandRenewal}
 onMarkAllRead={handleMarkAllNotificationsRead}
 onClearAll={handleClearNotifications}
 onToggleRead={handleToggleNotificationRead}
 onApproveRequest={handleApproveHotspotRequest}
 onRejectRequest={handleRejectHotspotRequest}
 onNavigate={handleNavigate}
 showToast={showToast}
 onHardReset={() => {
 setNotifications([]);
 setHotspotRequests([]);
 localStorage.removeItem('nexora_notifications');
 localStorage.removeItem('nexora_hotspot_requests');
 if (uid) {
 setDoc(doc(db, 'users', uid, 'appData', 'nexora_notifications'), { value: [] }).catch(console.error);
 setDoc(doc(db, 'users', uid, 'appData', 'nexora_hotspot_requests'), { value: [] }).catch(console.error);
 }
 showToast('সকল নোটিফিকেশন ও রিকুয়েস্ট ডাটা মুছে ফেলা হয়েছে', 'success');
 }}
 />
 )}

 {currentPage === 'subscriptions' && (
 <SubscriptionsPage
 clients={clients}
 packages={packages}
 settings={settings}
 onRenewClient={handleRenewClient}
 onSendSmsReminder={(client) => handleSendSmsReminder(client, '', 'SMS')}
 onToggleStatus={handleToggleStatus}
 onNavigate={handleNavigate}
 showToast={showToast}
 renewalRequests={renewalRequests}
 onApproveRenewalRequest={handleApproveBroadbandRenewal}
 onRejectRenewalRequest={handleRejectBroadbandRenewal}
 />
 )}

 {currentPage === 'live-bandwidth' && (
 <LiveBandwidthPage
 clients={clients}
 routerConfig={routerConfig}
 showToast={showToast}
 />
 )}

 {currentPage === 'support-tickets' && (
 <SupportTicketsPage
 clients={clients}
 showToast={showToast}
 />
 )}

 {currentPage === 'sms-notifications' && (
 <SmsNotificationPage
 clients={clients}
 settings={settings}
 showToast={showToast}
 />
 )}

 {currentPage === 'expenses' && (
 <ExpensesPage
 payments={payments}
 clients={clients}
 settings={settings}
 showToast={showToast}
 />
 )}

 {currentPage === 'network-map' && (
 <NetworkCoverageMap
 clients={clients}
 routers={routers}
 showToast={showToast}
 />
 )}

 {currentPage === 'invoices' && (
 <InvoicePrintPage
 clients={clients}
 settings={settings}
 payments={payments}
 showToast={showToast}
 />
 )}

 {currentPage === 'security' && (
 <SecurityPage
 settings={settings}
 clients={clients}
 payments={payments}
 routerConfig={routerConfig}
 showToast={showToast}
 onRestoreData={(restored) => {
 if (restored.clients) setClients(restored.clients);
 if (restored.settings) setSettings(restored.settings);
 if (restored.payments) setPayments(restored.payments);
 if (restored.routerConfig) setRouterConfig(restored.routerConfig);
 }}
 />
 )}

 {currentPage === 'admin-profile' && (
 <AdminProfilePage
  adminProfile={adminProfile}
  onSaveAdminProfile={setAdminProfile}
  showToast={showToast}/>
 )}

 {['configuration', 'network-diagram', 'support-ticketing', 'purchase', 'inventory'].includes(currentPage) && (
 <IspDigitalModulePage
 key={currentPage}
 pageId={currentPage}
 clients={clients}
 settings={settings}
 showToast={showToast}
 uid={uid}
 />
 )}

 {currentPage === 'audit' && (
 <AuditLogsPage
 logs={auditLogs}
 onHardReset={() => {
 setAuditLogs([]);
 localStorage.removeItem('nexora_audit_logs');
 if (uid) setDoc(doc(db, 'users', uid, 'appData', 'nexora_audit_logs'), { value: [] }).catch(console.error);
 showToast('সকল সিস্টেমেিক অডিট লগ ডাটা মুছে ফেলা হয়েছে', 'success');
 }}
 />
 )}

 {currentPage === 'settings' && (
 <SettingsPage
 settings={settings}
 onSaveSettings={(s) => {
 setSettings(s);
 addAuditLog('Updated Settings', 'App');
 }}
 showToast={showToast}
 onResetAllData={handleResetAllData}
 />
 )}
 </div>
 </main>
 </div>

 {/* Floating Toast Notification Container */}
 <ToastContainer toasts={toasts} onDismiss={dismissToast} />

 {/* Global FlowForge Modals */}
 <BillingModal
 isOpen={globalBillingModalOpen}
 onClose={() => setGlobalBillingModalOpen(false)}
 clients={clients}
 onConfirmPayment={handleCollectPayment}
 currencySymbol={settings.currency || '৳'}
 />

 <ImportWizard
 isOpen={globalImportWizardOpen}
 onClose={() => setGlobalImportWizardOpen(false)}
 onImportClients={handleBulkImportClients}
 />

 <TownViewModal
 isOpen={globalTownViewOpen}
 onClose={() => setGlobalTownViewOpen(false)}
 clients={clients}
 payments={payments}
 onSelectClient={(c) => {
 setSelectedLedgerClient(c);
 setGlobalTownViewOpen(false);
 }}
 currencySymbol={settings.currency || '৳'}
 />
 </div>
 );
}

export function App() {
 const [user, setUser] = useState<User | null>(null);
 const [authChecking, setAuthChecking] = useState(true);
 const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
 const [loginMode, setLoginMode] = useState<'select' | 'admin' | 'client'>('select');
 const [loggedInClient, setLoggedInClient] = useState<Client | null>(null);

 // Background silent authentication to maintain Firebase Firestore connectivity across all devices
 useEffect(() => {
 const safetyTimer = setTimeout(() => {
 setAuthChecking(false);
 if (!user) {
 setUser({ uid: 'nexora_network_admin' } as User);
 }
 }, 1000);

 const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
 clearTimeout(safetyTimer);
 if (currentUser) {
 setUser(currentUser);
 setAuthChecking(false);
 } else {
 try {
 const res = await signInAnonymously(auth);
 setUser(res.user);
 } catch {
 setUser({ uid: 'nexora_network_admin' } as User);
 } finally {
 setAuthChecking(false);
 }
 }
 });

 return () => {
 clearTimeout(safetyTimer);
 unsubscribe();
 };
 }, []);

 const effectiveUid = user?.uid || 'nexora_network_admin';
 const [settings, setSettings] = usePersistentState<AppSettings>('nexora_settings', initialSettings, effectiveUid);

 // If Auth check is in progress during initial boot, show smooth loader
 if (authChecking) {
 return (
 <div className="min-h-screen bg-[#ecf0f5] flex flex-col items-center justify-center p-4 text-slate-800 font-sans">
 <div className="relative flex items-center justify-center">
 <div className="w-16 h-16 border-4 border-slate-200 border-t-[#3c8dbc] rounded-full animate-spin" />
 <div className="absolute w-8 h-8 rounded-full bg-[#3c8dbc]/20 animate-ping" />
 </div>
 <div className="mt-6 text-center space-y-1">
 <p className="font-mono text-sm font-bold text-slate-700 tracking-wider uppercase flex items-center justify-center gap-2">
 <RefreshCw className="w-4 h-4 animate-spin text-[#3c8dbc]" />
 <span>NEXORA NETWORK ISP</span>
 </p>
 <p className="text-xs text-slate-800">Loading secure workspace...</p>
 </div>
 </div>
 );
 }

 const handleAdminSelect = () => {
 setLoginMode('admin');
 };

 const handleClientSelect = () => {
 setLoginMode('client');
 };

 if (loginMode === 'select') {
 return (
 <div className="min-h-screen bg-[#ecf0f5] flex flex-col items-center justify-center p-4 text-slate-800 font-sans">
 <div className="max-w-md w-full bg-white p-8 rounded border-t-4 border-t-[#3c8dbc] shadow-md text-center">
 <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-2 ring-blue-100">
 <Globe className="w-10 h-10 text-[#3c8dbc]" />
 </div>
 <h1 className="text-2xl font-bold text-slate-800 mb-2">Nexora network</h1>
 <p className="text-slate-800 mb-8 text-sm">Please select your login type</p>
 
 <div className="space-y-4">
 <button
 onClick={handleClientSelect}
 className="w-full p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-3 text-[#3c8dbc] font-bold group"
 >
 <Users className="w-6 h-6 group-hover:scale-110 transition-transform" />
 Client Login (গ্রাহক লগইন)
 </button>
 <button
 onClick={handleAdminSelect}
 className="w-full p-4 rounded border border-[#dd4b39] bg-white hover:bg-red-50 transition-all flex items-center justify-center gap-3 text-[#dd4b39] font-bold group shadow-sm"
 >
 <Shield className="w-6 h-6 group-hover:scale-110 transition-transform" />
 Admin Login (এডমিন লগইন)
 </button>
 </div>
 </div>
 </div>
 );
 }

 if (loginMode === 'client' && !loggedInClient) {
 return (
 <ClientLoginScreen 
 onBack={() => setLoginMode('select')}
 onLoginSuccess={(client) => setLoggedInClient(client)}
 uid={effectiveUid}
 />
 );
 }

 if (loginMode === 'client' && loggedInClient) {
 return (
 <ClientDashboard 
 client={loggedInClient} 
 onLogout={() => {
 setLoggedInClient(null);
 setLoginMode('select');
 }}
 uid={effectiveUid}
 settings={settings}
 />
 );
 }

 // Security layer: If pattern lock is enabled and session is not yet unlocked
 if (loginMode === 'admin' && settings.patternLockEnabled !== false && !isUnlocked) {
 return (
 <div className="relative min-h-screen">
 <button 
 onClick={() => setLoginMode('select')}
 className="absolute top-6 left-6 z-50 text-slate-800 hover:text-white flex items-center gap-2"
 >
 <ArrowLeft className="w-5 h-5" /> Back
 </button>
 <PatternLockScreen
 settings={settings}
 onUnlock={() => setIsUnlocked(true)}
 onSaveSettings={setSettings}
 />
 </div>
 );
 }

 if (loginMode === 'admin' && isUnlocked) {
 return (
 <MainApp
 uid={effectiveUid}
 onLockApp={() => {
 setIsUnlocked(false);
 setLoginMode('select');
 }}
 />
 );
 }

 return null;
}

export default App;
