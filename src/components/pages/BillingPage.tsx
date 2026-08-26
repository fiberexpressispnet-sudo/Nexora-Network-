import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
 FileText,
 DollarSign,
 Calendar,
 CheckCircle2,
 Clock,
 AlertTriangle,
 Send,
 Printer,
 Download,
 Plus,
 Search,
 Filter,
 RefreshCw,
 Edit3,
 Trash2,
 Check,
 X,
 CreditCard,
 Building2,
 Smartphone,
 Phone,
 MessageSquare,
 Copy,
 Receipt,
 RotateCcw,
 Sparkles,
 ArrowUpDown,
 ChevronDown,
 Layers,
 FileCheck,
 Bell,
 Eye,
 Zap,
} from 'lucide-react';
import {
 Invoice,
 InvoiceItem,
 Client,
 Package,
 AppSettings,
 MikrotikRouter,
 PaymentRecord,
} from '../../types';

interface BillingPageProps {
 invoices: Invoice[];
 clients: Client[];
 packages: Package[];
 routers?: MikrotikRouter[];
 settings: AppSettings;
 onAddInvoice: (invoice: Invoice) => void;
 onUpdateInvoice: (invoice: Invoice) => void;
 onDeleteInvoice: (id: string) => void;
 onRecordPayment: (
 invoiceId: string,
 paidAmount: number,
 method: 'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank' | 'Online Gateway',
 trxId?: string,
 collector?: string,
 extendExpiry?: boolean
 ) => void;
 onBulkGenerateInvoices: (
 month: string,
 issueDate: string,
 dueDate: string,
 selectedClientIds?: string[]
 ) => void;
 onSendReminder: (invoiceId: string, channel: 'sms' | 'whatsapp' | 'gateway') => void;
 showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
 onHardReset?: () => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({
 invoices,
 clients,
 packages,
 routers = [],
 settings,
 onAddInvoice,
 onUpdateInvoice,
 onDeleteInvoice,
 onRecordPayment,
 onBulkGenerateInvoices,
 onSendReminder,
 showToast,
 onHardReset,
}) => {
 // State for search and filters
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
 const [monthFilter, setMonthFilter] = useState<string>('all');
 const [routerFilter, setRouterFilter] = useState<string>('all');

 // Modals
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
 const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
 const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
 const [isBulkReminderModalOpen, setIsBulkReminderModalOpen] = useState(false);
 const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);
 const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
 const [selectedInvoiceForReminder, setSelectedInvoiceForReminder] = useState<Invoice | null>(null);
 const [printFormat, setPrintFormat] = useState<'a4' | 'pos'>('a4');

 // Form states for Single Invoice Creation
 const [selectedClientId, setSelectedClientId] = useState('');
 const [formBillingMonth, setFormBillingMonth] = useState(() => {
 const d = new Date();
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
 });
 const [formIssueDate, setFormIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
 const [formDueDate, setFormDueDate] = useState(() => {
 const d = new Date();
 d.setDate(d.getDate() + 10);
 return d.toISOString().slice(0, 10);
 });
 const [formDiscount, setFormDiscount] = useState<number>(0);
 const [formTax, setFormTax] = useState<number>(0);
 const [formNotes, setFormNotes] = useState('');
 const [formItems, setFormItems] = useState<InvoiceItem[]>([
 {
 id: 'item-1',
 description: 'Monthly Internet Subscription (মাসিক ইন্টারনেট বিল)',
 quantity: 1,
 unitPrice: 500,
 total: 500,
 },
 ]);

 // Bulk Generator States
 const [bulkMonth, setBulkMonth] = useState(() => {
 const d = new Date();
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
 });
 const [bulkIssueDate, setBulkIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
 const [bulkDueDate, setBulkDueDate] = useState(() => {
 const d = new Date();
 d.setDate(d.getDate() + 10);
 return d.toISOString().slice(0, 10);
 });
 const [bulkRouterTarget, setBulkRouterTarget] = useState<string>('all');
 const [bulkClientSelection, setBulkClientSelection] = useState<'all' | 'online_only'>('all');

 // Payment Recording States
 const [paymentAmount, setPaymentAmount] = useState<number>(0);
 const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank' | 'Online Gateway'>('bKash');
 const [paymentTrxId, setPaymentTrxId] = useState('');
 const [paymentCollector, setPaymentCollector] = useState('Admin');
 const [paymentExtendExpiry, setPaymentExtendExpiry] = useState(true);

 // Reminder Custom Text State
 const [reminderLanguage, setReminderLanguage] = useState<'bn' | 'en'>('bn');
 const [customReminderText, setCustomReminderText] = useState('');

 // Auto calculate dynamic status for invoices (realtime overdue check)
 const evaluatedInvoices = useMemo(() => {
 const today = new Date().toISOString().slice(0, 10);
 return invoices.map((inv) => {
 if (inv.status === 'paid' || inv.dueAmount <= 0) {
 return { ...inv, status: 'paid' as const };
 }
 if (inv.dueDate && inv.dueDate < today) {
 return { ...inv, status: 'overdue' as const };
 }
 return { ...inv, status: 'pending' as const };
 });
 }, [invoices]);

 // Statistics calculation
 const stats = useMemo(() => {
 const totalCount = evaluatedInvoices.length;
 const totalAmount = evaluatedInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
 const paidCount = evaluatedInvoices.filter((i) => i.status === 'paid').length;
 const paidAmount = evaluatedInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
 const pendingCount = evaluatedInvoices.filter((i) => i.status === 'pending').length;
 const pendingAmount = evaluatedInvoices
 .filter((i) => i.status === 'pending')
 .reduce((sum, i) => sum + (i.dueAmount || 0), 0);
 const overdueCount = evaluatedInvoices.filter((i) => i.status === 'overdue').length;
 const overdueAmount = evaluatedInvoices
 .filter((i) => i.status === 'overdue')
 .reduce((sum, i) => sum + (i.dueAmount || 0), 0);
 const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

 return {
 totalCount,
 totalAmount,
 paidCount,
 paidAmount,
 pendingCount,
 pendingAmount,
 overdueCount,
 overdueAmount,
 collectionRate,
 };
 }, [evaluatedInvoices]);

 // Unique billing months for filter dropdown
 const availableMonths = useMemo(() => {
 const set = new Set<string>();
 evaluatedInvoices.forEach((inv) => {
 if (inv.billingMonth) set.add(inv.billingMonth);
 });
 return Array.from(set).sort().reverse();
 }, [evaluatedInvoices]);

 // Filtered invoices
 const filteredInvoices = useMemo(() => {
 return evaluatedInvoices.filter((inv) => {
 const q = searchQuery.toLowerCase().trim();
 const matchesQuery =
 !q ||
 inv.invoiceNumber.toLowerCase().includes(q) ||
 inv.clientName.toLowerCase().includes(q) ||
 inv.userId.toLowerCase().includes(q) ||
 inv.phone.includes(q) ||
 inv.package.toLowerCase().includes(q);

 const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
 const matchesMonth = monthFilter === 'all' || inv.billingMonth === monthFilter;
 const matchesRouter = routerFilter === 'all' || (inv.router || '').toLowerCase() === routerFilter.toLowerCase();

 return matchesQuery && matchesStatus && matchesMonth && matchesRouter;
 });
 }, [evaluatedInvoices, searchQuery, statusFilter, monthFilter, routerFilter]);

 // Handle client selection when creating invoice
 const handleClientSelectChange = (cId: string) => {
 setSelectedClientId(cId);
 const client = clients.find((c) => c.id === cId);
 if (client) {
 const pkg = packages.find((p) => p.name === client.package);
 const rawPrice = client.price || pkg?.price || '500';
 const parsedPrice = parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10) || 500;
 setFormItems([
 {
 id: `item-${Date.now()}`,
 description: `${client.package} Subscription (${client.bandwidth || 'Standard'}) - ${formBillingMonth}`,
 quantity: 1,
 unitPrice: parsedPrice,
 total: parsedPrice,
 },
 ]);
 }
 };

 // Add Item to Single Invoice
 const handleAddFormItem = () => {
 setFormItems((prev) => [
 ...prev,
 {
 id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 description: 'Additional Service / Static IP / Router Fee',
 quantity: 1,
 unitPrice: 0,
 total: 0,
 },
 ]);
 };

 const handleUpdateFormItem = (
 id: string,
 field: 'description' | 'quantity' | 'unitPrice',
 val: string | number
 ) => {
 setFormItems((prev) =>
 prev.map((item) => {
 if (item.id === id) {
 const updated = { ...item, [field]: val };
 if (field === 'quantity' || field === 'unitPrice') {
 const qty = field === 'quantity' ? Number(val) || 0 : item.quantity;
 const price = field === 'unitPrice' ? Number(val) || 0 : item.unitPrice;
 updated.total = qty * price;
 }
 return updated;
 }
 return item;
 })
 );
 };

 const handleRemoveFormItem = (id: string) => {
 if (formItems.length === 1) {
 showToast('At least one item is required in the invoice', 'warning');
 return;
 }
 setFormItems((prev) => prev.filter((i) => i.id !== id));
 };

 // Submit Single Invoice Creation
 const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedClientId) {
 showToast('অনুগ্রহ করে একজন গ্রাহক নির্বাচন করুন', 'warning');
 return;
 }
 const client = clients.find((c) => c.id === selectedClientId);
 if (!client) return;

 const subtotal = formItems.reduce((sum, item) => sum + item.total, 0);
 const totalAmount = Math.max(0, subtotal - (Number(formDiscount) || 0) + (Number(formTax) || 0));
 const randomNum = Math.floor(1000 + Math.random() * 9000);
 const invoiceNumber = `INV-${formBillingMonth.replace('-', '')}-${randomNum}`;

 const newInvoice: Invoice = {
 id: `inv-${Date.now()}-${randomNum}`,
 invoiceNumber,
 clientId: client.id,
 clientName: client.name,
 userId: client.userId,
 phone: client.phone,
 address: settings.address || '',
 router: client.router || 'Main Router',
 package: client.package,
 speed: client.downloadSpeed ? `${client.downloadSpeed} Mbps` : client.bandwidth,
 billingMonth: formBillingMonth,
 issueDate: formIssueDate,
 dueDate: formDueDate,
 items: formItems,
 subtotal,
 discount: Number(formDiscount) || 0,
 tax: Number(formTax) || 0,
 totalAmount,
 paidAmount: 0,
 dueAmount: totalAmount,
 status: 'pending',
 notes: formNotes || 'Payment is requested by due date.',
 remindersSentCount: 0,
 };

 onAddInvoice(newInvoice);
 setIsCreateModalOpen(false);
 showToast(`ইনভয়েস "${invoiceNumber}" সফলভাবে তৈরি হয়েছে!`, 'success');
 };

 // Submit Bulk Monthly Invoice Generation
 const handleBulkGenerateSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 let targetClients = clients;

 if (bulkRouterTarget !== 'all') {
 targetClients = targetClients.filter(
 (c) => (c.router || '').toLowerCase() === bulkRouterTarget.toLowerCase()
 );
 }

 if (bulkClientSelection === 'online_only') {
 targetClients = targetClients.filter((c) => c.status === 'online');
 }

 if (targetClients.length === 0) {
 showToast('কোনো গ্রাহক পাওয়া যায়নি', 'warning');
 return;
 }

 // Filter out clients who already have an invoice for this billingMonth
 const alreadyBilledClientIds = new Set(
 invoices
 .filter((inv) => inv.billingMonth === bulkMonth)
 .map((inv) => inv.clientId)
 );

 const eligibleClients = targetClients.filter(
 (c) => !alreadyBilledClientIds.has(c.id)
 );

 if (eligibleClients.length === 0) {
 showToast(`নির্বাচিত ${bulkMonth} মাসের জন্য সকল গ্রাহকের ইনভয়েস ইতিমধ্যে তৈরি করা আছে!`, 'info');
 setIsBulkModalOpen(false);
 return;
 }

 onBulkGenerateInvoices(
 bulkMonth,
 bulkIssueDate,
 bulkDueDate,
 eligibleClients.map((c) => c.id)
 );

 setIsBulkModalOpen(false);
 showToast(
 `${eligibleClients.length} জন গ্রাহকের জন্য "${bulkMonth}" মাসের ইনভয়েস স্বয়ংক্রিয়ভাবে তৈরি হয়েছে!`,
 'success'
 );
 };

 // Open Payment Recording Modal
 const handleOpenPaymentModal = (inv: Invoice) => {
 setSelectedInvoiceForPayment(inv);
 setPaymentAmount(inv.dueAmount > 0 ? inv.dueAmount : inv.totalAmount);
 setPaymentMethod('bKash');
 setPaymentTrxId('');
 setPaymentCollector('Admin');
 setPaymentExtendExpiry(true);
 setIsPaymentModalOpen(true);
 };

 // Submit Payment Recording
 const handlePaymentSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedInvoiceForPayment) return;
 if (paymentAmount <= 0) {
 showToast('পেমেন্টের পরিমাণ শূন্যের বেশি হতে হবে', 'warning');
 return;
 }

 onRecordPayment(
 selectedInvoiceForPayment.id,
 paymentAmount,
 paymentMethod,
 paymentTrxId.trim() || undefined,
 paymentCollector.trim() || 'Admin',
 paymentExtendExpiry
 );

 setIsPaymentModalOpen(false);
 setSelectedInvoiceForPayment(null);
 showToast(`ইনভয়েস ${selectedInvoiceForPayment.invoiceNumber} এর জন্য ৳${paymentAmount} পেমেন্ট রেকর্ড সম্পন্ন!`, 'success');
 };

 // Open Reminder Modal
 const handleOpenReminderModal = (inv: Invoice) => {
 setSelectedInvoiceForReminder(inv);
 const amount = inv.dueAmount > 0 ? inv.dueAmount : inv.totalAmount;
 const bnText = `সম্মানিত গ্রাহক ${inv.clientName} (ID: ${inv.userId}), আপনার ${inv.billingMonth} মাসের ইন্টারনেট বিল ৳${amount} টাকা ${inv.dueDate} তারিখের মধ্যে পরিশোধ করার অনুরোধ করা হচ্ছে। বিকাশ/নগদ: ${settings.phone || '01XXXXXXXXX'}। ধন্যবাদ, ${settings.companyName || settings.appName || 'Nexora network'}`;
 const enText = `Dear ${inv.clientName} (ID: ${inv.userId}), your internet bill for ${inv.billingMonth} of Tk ${amount} is due on ${inv.dueDate}. Please pay via bKash/Nagad: ${settings.phone || '01XXXXXXXXX'}. Thank you, ${settings.companyName || settings.appName || 'Nexora network'}`;
 
 setCustomReminderText(reminderLanguage === 'bn' ? bnText : enText);
 setIsReminderModalOpen(true);
 };

 const handleLanguageToggle = (lang: 'bn' | 'en') => {
 setReminderLanguage(lang);
 if (!selectedInvoiceForReminder) return;
 const inv = selectedInvoiceForReminder;
 const amount = inv.dueAmount > 0 ? inv.dueAmount : inv.totalAmount;
 if (lang === 'bn') {
 setCustomReminderText(`সম্মানিত গ্রাহক ${inv.clientName} (ID: ${inv.userId}), আপনার ${inv.billingMonth} মাসের ইন্টারনেট বিল ৳${amount} টাকা ${inv.dueDate} তারিখের মধ্যে পরিশোধ করার অনুরোধ করা হচ্ছে। বিকাশ/নগদ: ${settings.phone || '01XXXXXXXXX'}। ধন্যবাদ, ${settings.companyName || settings.appName || 'Nexora network'}`);
 } else {
 setCustomReminderText(`Dear ${inv.clientName} (ID: ${inv.userId}), your internet bill for ${inv.billingMonth} of Tk ${amount} is due on ${inv.dueDate}. Please pay via bKash/Nagad: ${settings.phone || '01XXXXXXXXX'}. Thank you, ${settings.companyName || settings.appName || 'Nexora network'}`);
 }
 };

 // Send WhatsApp Reminder
 const handleSendWhatsApp = () => {
 if (!selectedInvoiceForReminder) return;
 const cleanPhone = selectedInvoiceForReminder.phone.replace(/[^\d]/g, '');
 const intlPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
 const encodedText = encodeURIComponent(customReminderText);
 window.open(`https://wa.me/${intlPhone}?text=${encodedText}`, '_blank');
 onSendReminder(selectedInvoiceForReminder.id, 'whatsapp');
 showToast(`WhatsApp এ রিমাইন্ডার পাঠানো হচ্ছে...`, 'info');
 };

 // Send SMS (Device Intent)
 const handleSendDeviceSms = () => {
 if (!selectedInvoiceForReminder) return;
 const cleanPhone = selectedInvoiceForReminder.phone.replace(/[^\d]/g, '');
 const encodedText = encodeURIComponent(customReminderText);
 window.open(`sms:${cleanPhone}?body=${encodedText}`, '_blank');
 onSendReminder(selectedInvoiceForReminder.id, 'sms');
 showToast(`মোবাইল মেসেজে রিমাইন্ডার পাঠানো হচ্ছে...`, 'info');
 };

 // Copy Reminder Text
 const handleCopyReminder = () => {
 navigator.clipboard.writeText(customReminderText);
 showToast('রিমাইন্ডার মেসেজ কপি হয়েছে!', 'success');
 };

 // Trigger System Gateway SMS
 const handleSendGatewaySms = () => {
 if (!selectedInvoiceForReminder) return;
 onSendReminder(selectedInvoiceForReminder.id, 'gateway');
 showToast(`সিস্টেম SMS গেটওয়ে থেকে ${selectedInvoiceForReminder.phone} নম্বরে রিমাইন্ডার পাঠানো হয়েছে!`, 'success');
 setIsReminderModalOpen(false);
 };

 // Export Invoices to CSV
 const handleExportCSV = () => {
 if (invoices.length === 0) {
 showToast('কোনো ইনভয়েস ডাটা পাওয়া যায়নি', 'warning');
 return;
 }
 const headers = [
 'Invoice No',
 'Client Name',
 'User ID',
 'Phone',
 'Router',
 'Package',
 'Billing Month',
 'Issue Date',
 'Due Date',
 'Subtotal',
 'Discount',
 'Tax/VAT',
 'Total Amount',
 'Paid Amount',
 'Due Amount',
 'Status',
 'Payment Method',
 'TrxID',
 ];

 const rows = invoices.map((i) => [
 i.invoiceNumber,
 `"${i.clientName.replace(/"/g, '""')}"`,
 i.userId,
 i.phone,
 i.router || 'Main',
 i.package,
 i.billingMonth,
 i.issueDate,
 i.dueDate,
 i.subtotal,
 i.discount,
 i.tax,
 i.totalAmount,
 i.paidAmount,
 i.dueAmount,
 i.status,
 i.paymentMethod || 'N/A',
 i.transactionId || 'N/A',
 ]);

 const csvContent =
 'data:text/csv;charset=utf-8,' +
 [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

 const encodedUri = encodeURI(csvContent);
 const link = document.createElement('a');
 link.setAttribute('href', encodedUri);
 link.setAttribute('download', `ISP_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 showToast(`সফলভাবে ${invoices.length} টি ইনভয়েস CSV ফাইলে ডাউনলোড করা হয়েছে!`, 'success');
 };

 // Print Invoice Handler
 const handlePrint = () => {
 window.print();
 };

 return (
 <div className="space-y-6 animate-page-enter">
 {/* 1. Header Banner */}
 <div className="bg-slate-50 border border-slate-300 rounded p-5 shadow-lg text-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
 <div className="flex items-center gap-3.5">
 <div className="p-3 bg-sky-500/20 border border-sky-400/30 rounded shadow-inner text-sky-400">
 <Receipt className="w-7 h-7" />
 </div>
 <div>
 <div className="flex items-center gap-2.5 flex-wrap">
 <h2 className="text-xl font-black tracking-tight text-slate-800">
 Billing & Invoicing Panel (বিলিং ও ইনভয়েস)
 </h2>
 <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
 Automated ISP Billing
 </span>
 </div>
 <p className="text-xs text-slate-900 mt-1">
 গ্রাহকদের মাসিক প্যাকেজের ভিত্তিতে ইনভয়েস তৈরি, বিল স্ট্যাটাস (Paid/Pending/Overdue) মনিটরিং এবং SMS/WhatsApp পেমেন্ট রিমাইন্ডার পাঠান।
 </p>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex flex-wrap items-center gap-2.5">
 {onHardReset && (
 <button
 type="button"
 onClick={() => {
 if (window.confirm('আপনি কি নিশ্চিত যে সমস্ত ইনভয়েস ও বিলিং রেকর্ড মুছে ফেলে নতুনভাবে শুরু করতে চান?')) {
 onHardReset();
 }
 }}
 className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-lg border border-rose-500/40 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
 title="Reset all billing data"
 >
 <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
 <span>Hard Reset</span>
 </button>
 )}

 <button
 onClick={handleExportCSV}
 className="px-3.5 py-2 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
 >
 <Download className="w-3.5 h-3.5 text-sky-400" />
 <span>Export CSV</span>
 </button>

 <button
 onClick={() => setIsBulkReminderModalOpen(true)}
 disabled={stats.pendingCount + stats.overdueCount === 0}
 className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-lg border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
 >
 <Bell className="w-3.5 h-3.5 text-amber-400" />
 <span>Bulk Reminders ({stats.pendingCount + stats.overdueCount})</span>
 </button>

 <button
 onClick={() => setIsBulkModalOpen(true)}
 className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
 >
 <Sparkles className="w-3.5 h-3.5" />
 <span>Bulk Monthly Invoices</span>
 </button>

 <button
 onClick={() => {
 if (clients.length > 0) {
 handleClientSelectChange(clients[0].id);
 }
 setIsCreateModalOpen(true);
 }}
 className="px-4 py-2 bg-gradient-to-r from-sky-600 to-cyan-600 hover:brightness-110 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
 >
 <Plus className="w-4 h-4" />
 <span>Create Custom Invoice</span>
 </button>
 </div>
 </div>

 {/* 2. Key Analytics / Metric Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Total Invoiced */}
 <div className="bg-white border border-slate-200 rounded p-4.5 shadow-xs relative overflow-hidden">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-[11px] font-bold uppercase tracking-wider text-slate-800 ">
 Total Invoiced (মোট বিল)
 </p>
 <h3 className="text-2xl font-black text-slate-900 mt-1">
 ৳{stats.totalAmount.toLocaleString()}
 </h3>
 <p className="text-[11px] text-slate-800 mt-0.5">
 {stats.totalCount} টি মোট ইনভয়েস
 </p>
 </div>
 <div className="w-11 h-11 rounded bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
 <Receipt className="w-6 h-6" />
 </div>
 </div>
 </div>

 {/* Paid / Collected */}
 <div className="bg-white border border-slate-200 rounded p-4.5 shadow-xs relative overflow-hidden">
 <div className="flex items-center justify-between">
 <div>
 <div className="flex items-center gap-2">
 <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 ">
 Paid / Collected (আদায়কৃত)
 </p>
 <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 ">
 {stats.collectionRate}%
 </span>
 </div>
 <h3 className="text-2xl font-black text-emerald-600 mt-1">
 ৳{stats.paidAmount.toLocaleString()}
 </h3>
 <p className="text-[11px] text-slate-800 mt-0.5">
 {stats.paidCount} টি পরিশোধিত
 </p>
 </div>
 <div className="w-11 h-11 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
 <CheckCircle2 className="w-6 h-6" />
 </div>
 </div>
 {/* Visual Mini Progress Bar */}
 <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
 <div
 className="bg-emerald-500 h-full rounded-full transition-all duration-500"
 style={{ width: `${stats.collectionRate}%` }}
 />
 </div>
 </div>

 {/* Pending Bills */}
 <div className="bg-white border border-slate-200 rounded p-4.5 shadow-xs relative overflow-hidden">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 ">
 Pending Bills (চলতি বকেয়া)
 </p>
 <h3 className="text-2xl font-black text-amber-600 mt-1">
 ৳{stats.pendingAmount.toLocaleString()}
 </h3>
 <p className="text-[11px] text-slate-800 mt-0.5">
 {stats.pendingCount} টি অপেক্ষমান ইনভয়েস
 </p>
 </div>
 <div className="w-11 h-11 rounded bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
 <Clock className="w-6 h-6" />
 </div>
 </div>
 </div>

 {/* Overdue Bills */}
 <div className="bg-white border border-slate-200 rounded p-4.5 shadow-xs relative overflow-hidden">
 <div className="flex items-center justify-between">
 <div>
 <div className="flex items-center gap-1.5">
 <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 ">
 Overdue Bills (মেয়াদোত্তীর্ণ)
 </p>
 {stats.overdueCount > 0 && (
 <span className="animate-pulse w-2 h-2 rounded-full bg-rose-500" />
 )}
 </div>
 <h3 className="text-2xl font-black text-rose-600 mt-1">
 ৳{stats.overdueAmount.toLocaleString()}
 </h3>
 <p className="text-[11px] text-slate-800 mt-0.5">
 {stats.overdueCount} টি বিলের তারিখ পার হয়েছে
 </p>
 </div>
 <div className="w-11 h-11 rounded bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
 <AlertTriangle className="w-6 h-6" />
 </div>
 </div>
 </div>
 </div>

 {/* 3. Filters & Search Control Bar */}
 <div className="bg-white border border-slate-200 rounded p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
 {/* Search */}
 <div className="relative flex-1 min-w-[240px]">
 <Search className="w-4 h-4 text-slate-800 absolute left-3.5 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="ইনভয়েস নম্বর, ক্লায়েন্টের নাম, ইউজার আইডি বা মোবাইল..."
 className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3c8dbc]"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-800 hover:text-slate-900 "
 >
 <X className="w-3.5 h-3.5" />
 </button>
 )}
 </div>

 {/* Filter Dropdowns */}
 <div className="flex flex-wrap items-center gap-2">
 {/* Status Filter Tabs */}
 <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
 <button
 onClick={() => setStatusFilter('all')}
 className={`px-3 py-1.5 rounded-md transition-all ${
 statusFilter === 'all'
 ? 'bg-white text-sky-600 shadow-xs'
 : 'text-slate-800 hover:text-slate-800 '
 }`}
 >
 All ({evaluatedInvoices.length})
 </button>
 <button
 onClick={() => setStatusFilter('paid')}
 className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
 statusFilter === 'paid'
 ? 'bg-white text-emerald-600 shadow-xs'
 : 'text-slate-800 hover:text-slate-800 '
 }`}
 >
 <span className="w-2 h-2 rounded-full bg-emerald-500" />
 Paid ({stats.paidCount})
 </button>
 <button
 onClick={() => setStatusFilter('pending')}
 className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
 statusFilter === 'pending'
 ? 'bg-white text-amber-600 shadow-xs'
 : 'text-slate-800 hover:text-slate-800 '
 }`}
 >
 <span className="w-2 h-2 rounded-full bg-amber-500" />
 Pending ({stats.pendingCount})
 </button>
 <button
 onClick={() => setStatusFilter('overdue')}
 className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
 statusFilter === 'overdue'
 ? 'bg-white text-rose-600 shadow-xs'
 : 'text-slate-800 hover:text-slate-800 '
 }`}
 >
 <span className="w-2 h-2 rounded-full bg-rose-500" />
 Overdue ({stats.overdueCount})
 </button>
 </div>

 {/* Month Filter */}
 {availableMonths.length > 0 && (
 <select
 value={monthFilter}
 onChange={(e) => setMonthFilter(e.target.value)}
 className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="all">All Months (সকল মাস)</option>
 {availableMonths.map((m) => (
 <option key={m} value={m}>
 {m}
 </option>
 ))}
 </select>
 )}

 {/* Router Filter */}
 {routers.length > 0 && (
 <select
 value={routerFilter}
 onChange={(e) => setRouterFilter(e.target.value)}
 className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-sky-700 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="all">All Routers ({routers.length})</option>
 {routers.map((r) => (
 <option key={r.id} value={r.name}>
 {r.name}
 </option>
 ))}
 </select>
 )}
 </div>
 </div>

 {/* 4. Invoices Table */}
 <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
 <div className="p-4 border-b border-slate-200 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <FileText className="w-4 h-4 text-sky-500" />
 <h3 className="text-sm font-extrabold text-slate-900 ">
 Invoice Ledger ({filteredInvoices.length} টি ইনভয়েস)
 </h3>
 </div>
 <div className="text-xs text-slate-800 font-semibold">
 {stats.totalCount === 0 ? 'No invoices created yet' : `Total ৳${filteredInvoices.reduce((s, i) => s + i.totalAmount, 0).toLocaleString()}`}
 </div>
 </div>

 {filteredInvoices.length === 0 ? (
 <div className="p-12 text-center text-slate-800 ">
 <Receipt className="w-12 h-12 mx-auto text-slate-900 mb-3" />
 <p className="text-sm font-bold text-slate-700 ">
 কোনো ইনভয়েস পাওয়া যায়নি
 </p>
 <p className="text-xs text-slate-800 mt-1 max-w-sm mx-auto">
 নতুন ইনভয়েস তৈরি করতে ওপরের &quot;Create Custom Invoice&quot; অথবা &quot;Bulk Monthly Invoices&quot; বাটনে ক্লিক করুন।
 </p>
 <div className="flex items-center justify-center gap-3 mt-4">
 <button
 onClick={() => setIsBulkModalOpen(true)}
 className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all"
 >
 Bulk Generate for All Clients
 </button>
 </div>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-[10px]">
 <th className="py-3 px-4">Invoice # & Date</th>
 <th className="py-3 px-4">Client Details</th>
 <th className="py-3 px-4">Package & Month</th>
 <th className="py-3 px-4 text-right">Amount (৳)</th>
 <th className="py-3 px-4 text-center">Status</th>
 <th className="py-3 px-4 text-center">Reminders</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredInvoices.map((inv) => {
 const isOverdue = inv.status === 'overdue';
 const isPaid = inv.status === 'paid';
 const isPending = inv.status === 'pending';

 return (
 <tr
 key={inv.id}
 className="hover:bg-slate-50/80 transition-colors"
 >
 {/* Invoice # & Dates */}
 <td className="py-3.5 px-4">
 <div className="font-mono font-black text-slate-900 text-xs flex items-center gap-1.5">
 <span>{inv.invoiceNumber}</span>
 </div>
 <div className="text-[10px] text-slate-800 mt-0.5 flex items-center gap-2">
 <span>Issued: {inv.issueDate}</span>
 <span>•</span>
 <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
 Due: {inv.dueDate}
 </span>
 </div>
 </td>

 {/* Client Details */}
 <td className="py-3.5 px-4">
 <div className="font-bold text-slate-900 ">
 {inv.clientName}
 </div>
 <div className="text-[11px] text-slate-800 flex items-center gap-2 mt-0.5">
 <span className="font-mono text-sky-600 ">{inv.userId}</span>
 <span>•</span>
 <span>{inv.phone}</span>
 </div>
 {inv.router && (
 <div className="text-[9px] text-slate-800 mt-0.5">
 Node: {inv.router}
 </div>
 )}
 </td>

 {/* Package & Billing Month */}
 <td className="py-3.5 px-4">
 <div className="font-bold text-slate-800 ">
 {inv.package}
 </div>
 <div className="text-[11px] text-sky-600 font-semibold mt-0.5">
 Month: {inv.billingMonth}
 </div>
 {inv.speed && (
 <div className="text-[10px] text-slate-800">
 {inv.speed}
 </div>
 )}
 </td>

 {/* Amount & Due */}
 <td className="py-3.5 px-4 text-right">
 <div className="font-black text-slate-900 text-sm">
 ৳{inv.totalAmount.toLocaleString()}
 </div>
 {isPaid ? (
 <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
 Paid: ৳{inv.paidAmount.toLocaleString()} ({inv.paymentMethod || 'Paid'})
 </div>
 ) : (
 <div className="text-[10px] text-rose-600 font-bold mt-0.5">
 Due: ৳{inv.dueAmount.toLocaleString()}
 </div>
 )}
 </td>

 {/* Status Badge */}
 <td className="py-3.5 px-4 text-center">
 {isPaid && (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-300 ">
 <CheckCircle2 className="w-3 h-3 text-emerald-500" />
 PAID
 </span>
 )}
 {isPending && (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-300 ">
 <Clock className="w-3 h-3 text-amber-500" />
 PENDING
 </span>
 )}
 {isOverdue && (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
 <AlertTriangle className="w-3 h-3 text-rose-500" />
 OVERDUE
 </span>
 )}
 </td>

 {/* Reminders Count */}
 <td className="py-3.5 px-4 text-center">
 <div className="text-[11px] font-bold text-slate-700 ">
 {inv.remindersSentCount || 0} Sent
 </div>
 {inv.lastReminderSentAt && (
 <div className="text-[9px] text-slate-800">
 {inv.lastReminderSentAt.slice(0, 10)}
 </div>
 )}
 </td>

 {/* Actions */}
 <td className="py-3.5 px-4 text-right">
 <div className="flex items-center justify-end gap-1.5">
 {/* View & Print Button */}
 <button
 onClick={() => setSelectedInvoiceForView(inv)}
 className="p-1.5 text-slate-900 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-all cursor-pointer"
 title="View / Print Invoice"
 >
 <Eye className="w-4 h-4" />
 </button>

 {/* Record Payment / Mark as Paid */}
 {!isPaid && (
 <button
 onClick={() => handleOpenPaymentModal(inv)}
 className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
 title="Receive Payment"
 >
 <CreditCard className="w-3 h-3" />
 <span>Pay</span>
 </button>
 )}

 {/* Send Reminder (SMS / WhatsApp) */}
 {!isPaid && (
 <button
 onClick={() => handleOpenReminderModal(inv)}
 className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-all cursor-pointer"
 title="Send Payment Reminder (SMS/WhatsApp)"
 >
 <Send className="w-4 h-4" />
 </button>
 )}

 {/* Delete Invoice */}
 <button
 onClick={() => {
 if (window.confirm(`আপনি কি নিশ্চিত যে ইনভয়েস "${inv.invoiceNumber}" মুছে ফেলতে চান?`)) {
 onDeleteInvoice(inv.id);
 showToast(`ইনভয়েস ${inv.invoiceNumber} মুছে ফেলা হয়েছে`, 'info');
 }
 }}
 className="p-1.5 text-slate-800 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
 title="Delete Invoice"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* ========================================================================= */}
 {/* 5. MODAL: Single Custom Invoice Creation */}
 {/* ========================================================================= */}
 {isCreateModalOpen && (
 <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto">
 <div className="bg-white border border-slate-200 rounded w-full max-w-2xl max-h-[90vh] flex flex-col shadow-md overflow-hidden animate-page-enter">
 {/* Modal Header */}
 <div className="p-4.5 bg-white text-slate-800 flex items-center justify-between border-b border-slate-200">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
 <Plus className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-extrabold">Create Custom Invoice (নতুন ইনভয়েস)</h3>
 <p className="text-xs text-slate-800">নির্দিষ্ট গ্রাহকের জন্য কাস্টম বিল তৈরি করুন</p>
 </div>
 </div>
 <button
 onClick={() => setIsCreateModalOpen(false)}
 className="text-slate-800 hover:text-slate-800 p-1 rounded-lg hover:bg-white transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Modal Body */}
 <form onSubmit={handleCreateInvoiceSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
 {/* Client Selection */}
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Select Client (গ্রাহক নির্বাচন করুন) *
 </label>
 <select
 value={selectedClientId}
 onChange={(e) => handleClientSelectChange(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#3c8dbc]"
 required
 >
 <option value="">-- Choose a Client --</option>
 {clients.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name} (ID: {c.userId}) - {c.package} [৳{c.price || '500'}]
 </option>
 ))}
 </select>
 </div>

 {/* Billing Month, Issue Date, Due Date */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Billing Month (বিলের মাস) *
 </label>
 <input
 type="month"
 value={formBillingMonth}
 onChange={(e) => setFormBillingMonth(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#3c8dbc]"
 required
 />
 </div>
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Issue Date (ইস্যু তারিখ) *
 </label>
 <input
 type="date"
 value={formIssueDate}
 onChange={(e) => setFormIssueDate(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#3c8dbc]"
 required
 />
 </div>
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Due Date (পরিশোধের শেষ তারিখ) *
 </label>
 <input
 type="date"
 value={formDueDate}
 onChange={(e) => setFormDueDate(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#3c8dbc]"
 required
 />
 </div>
 </div>

 {/* Itemized Table */}
 <div className="border border-slate-200 rounded p-3 bg-slate-50 ">
 <div className="flex items-center justify-between mb-2">
 <span className="font-extrabold text-slate-800 ">
 Bill Items Breakdown (আইটেম বিবরণী)
 </span>
 <button
 type="button"
 onClick={handleAddFormItem}
 className="text-[11px] text-sky-600 font-bold hover:underline flex items-center gap-1"
 >
 <Plus className="w-3 h-3" />
 <span>Add Item</span>
 </button>
 </div>

 <div className="space-y-2">
 {formItems.map((item, idx) => (
 <div key={item.id} className="flex items-center gap-2">
 <input
 type="text"
 value={item.description}
 onChange={(e) => handleUpdateFormItem(item.id, 'description', e.target.value)}
 placeholder="Item Description"
 className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#3c8dbc]"
 required
 />
 <input
 type="number"
 min="1"
 value={item.quantity}
 onChange={(e) => handleUpdateFormItem(item.id, 'quantity', e.target.value)}
 className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold text-center focus:outline-none focus:border-[#3c8dbc]"
 title="Quantity"
 required
 />
 <input
 type="number"
 min="0"
 value={item.unitPrice}
 onChange={(e) => handleUpdateFormItem(item.id, 'unitPrice', e.target.value)}
 className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold text-right focus:outline-none focus:border-[#3c8dbc]"
 title="Unit Price ৳"
 required
 />
 <span className="font-mono font-bold text-slate-700 w-16 text-right">
 ৳{item.total}
 </span>
 {formItems.length > 1 && (
 <button
 type="button"
 onClick={() => handleRemoveFormItem(item.id)}
 className="p-1 text-slate-800 hover:text-rose-500"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 ))}
 </div>

 {/* Subtotal, Discount & Total */}
 <div className="border-t border-slate-200 mt-3 pt-3 space-y-1.5 text-right">
 <div className="text-slate-900 font-semibold">
 Subtotal: ৳{formItems.reduce((s, i) => s + i.total, 0)}
 </div>
 <div className="flex items-center justify-end gap-2">
 <span className="text-slate-900 ">Discount (ছাড় ৳):</span>
 <input
 type="number"
 min="0"
 value={formDiscount}
 onChange={(e) => setFormDiscount(Number(e.target.value) || 0)}
 className="w-24 px-2 py-1 rounded-md border border-slate-300 bg-white text-slate-900 text-right text-xs font-semibold"
 />
 </div>
 <div className="flex items-center justify-end gap-2">
 <span className="text-slate-900 ">Tax / VAT (ভ্যাট ৳):</span>
 <input
 type="number"
 min="0"
 value={formTax}
 onChange={(e) => setFormTax(Number(e.target.value) || 0)}
 className="w-24 px-2 py-1 rounded-md border border-slate-300 bg-white text-slate-900 text-right text-xs font-semibold"
 />
 </div>
 <div className="text-sm font-black text-slate-900 pt-1">
 Net Total (মোট প্রদেয়): ৳
 {Math.max(
 0,
 formItems.reduce((s, i) => s + i.total, 0) - formDiscount + formTax
 )}
 </div>
 </div>
 </div>

 {/* Notes */}
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Notes / Payment Terms (বিল সংক্রান্ত নির্দেশনা)
 </label>
 <input
 type="text"
 value={formNotes}
 onChange={(e) => setFormNotes(e.target.value)}
 placeholder="e.g. Please pay before 10th of this month via bKash."
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 {/* Submit Buttons */}
 <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setIsCreateModalOpen(false)}
 className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-gradient-to-r from-sky-600 to-cyan-600 hover:brightness-110 text-white font-bold rounded-lg shadow-sm transition-all"
 >
 Generate Invoice
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* 6. MODAL: Bulk Monthly Invoices Generator */}
 {/* ========================================================================= */}
 {isBulkModalOpen && (
 <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto">
 <div className="bg-white border border-slate-200 rounded w-full max-w-lg shadow-md overflow-hidden animate-page-enter">
 <div className="p-4.5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between border-b border-emerald-800">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
 <Sparkles className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-extrabold">Bulk Invoice Generator</h3>
 <p className="text-xs text-emerald-300/80">এক ক্লিকে সকল গ্রাহকের জন্য মাসিক বিল তৈরি</p>
 </div>
 </div>
 <button
 onClick={() => setIsBulkModalOpen(false)}
 className="text-slate-900 hover:text-slate-800 p-1 rounded-lg hover:bg-emerald-800 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleBulkGenerateSubmit} className="p-5 space-y-4 text-xs">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Billing Month (কোন মাসের জন্য বিল তৈরি করবেন?) *
 </label>
 <input
 type="month"
 value={bulkMonth}
 onChange={(e) => setBulkMonth(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
 required
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Issue Date (ইস্যু তারিখ) *
 </label>
 <input
 type="date"
 value={bulkIssueDate}
 onChange={(e) => setBulkIssueDate(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
 required
 />
 </div>
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Due Date (লাস্ট ডেট) *
 </label>
 <input
 type="date"
 value={bulkDueDate}
 onChange={(e) => setBulkDueDate(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
 required
 />
 </div>
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Target Router Node (নির্দিষ্ট রাউটার নোড)
 </label>
 <select
 value={bulkRouterTarget}
 onChange={(e) => setBulkRouterTarget(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
 >
 <option value="all">All Routers (সকল রাউটারের গ্রাহক)</option>
 {routers.map((r) => (
 <option key={r.id} value={r.name}>
 {r.name} ({r.ip})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Client Status Target (গ্রাহকের স্ট্যাটাস ফিল্টার)
 </label>
 <select
 value={bulkClientSelection}
 onChange={(e) => setBulkClientSelection(e.target.value as 'all' | 'online_only')}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
 >
 <option value="all">All Active / Registered Clients (সকল ক্লায়েন্ট)</option>
 <option value="online_only">Online Active Clients Only (শুধুমাত্র অনলাইন ক্লায়েন্ট)</option>
 </select>
 </div>

 <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] leading-relaxed">
 ℹ️ সিস্টেম প্রতিটি ক্লায়েন্টের প্যাকেজের নির্ধারিত রেট (Custom Client Price বা Package Base Price) হিসাব করে স্বয়ংক্রিয়ভাবে ডুপ্লিকেট বাদ দিয়ে ইনভয়েস তৈরি করবে।
 </div>

 <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setIsBulkModalOpen(false)}
 className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 "
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold rounded-lg shadow-sm"
 >
 Generate All Invoices
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* 7. MODAL: Record Payment / Mark as Paid */}
 {/* ========================================================================= */}
 {isPaymentModalOpen && selectedInvoiceForPayment && (
 <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto">
 <div className="bg-white border border-slate-200 rounded w-full max-w-md shadow-md overflow-hidden animate-page-enter">
 <div className="p-4.5 bg-gradient-to-r from-emerald-800 to-green-900 text-white flex items-center justify-between border-b border-emerald-700">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
 <CreditCard className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-extrabold">Receive Bill Payment (বিল গ্রহণ)</h3>
 <p className="text-xs text-emerald-300/80">
 Invoice: {selectedInvoiceForPayment.invoiceNumber}
 </p>
 </div>
 </div>
 <button
 onClick={() => setIsPaymentModalOpen(false)}
 className="text-slate-900 hover:text-slate-800 p-1 rounded-lg hover:bg-emerald-800 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4 text-xs">
 {/* Summary info box */}
 <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
 <div>
 <div className="font-bold text-slate-800 ">
 {selectedInvoiceForPayment.clientName}
 </div>
 <div className="text-[11px] text-slate-800">
 ID: {selectedInvoiceForPayment.userId} • Month: {selectedInvoiceForPayment.billingMonth}
 </div>
 </div>
 <div className="text-right">
 <div className="text-[10px] text-slate-800 font-bold uppercase">Total Due</div>
 <div className="text-sm font-black text-rose-600 ">
 ৳{selectedInvoiceForPayment.dueAmount || selectedInvoiceForPayment.totalAmount}
 </div>
 </div>
 </div>

 {/* Payment Amount */}
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Received Amount (গৃহীত টাকার পরিমাণ ৳) *
 </label>
 <input
 type="number"
 min="1"
 max={selectedInvoiceForPayment.dueAmount || selectedInvoiceForPayment.totalAmount}
 value={paymentAmount}
 onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-base font-black focus:outline-none focus:border-emerald-500"
 required
 />
 </div>

 {/* Payment Method */}
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Payment Method (পেমেন্টের মাধ্যম) *
 </label>
 <div className="grid grid-cols-5 gap-2">
 {(['bKash', 'Nagad', 'Rocket', 'Cash', 'Bank'] as const).map((method) => {
 const logoUrl = settings?.paymentLogos?.[method.toLowerCase() as keyof typeof settings.paymentLogos];
 return (
 <button
 key={method}
 type="button"
 onClick={() => setPaymentMethod(method)}
 className={`p-2 rounded-lg font-bold border flex flex-col items-center justify-center gap-2 transition-colors min-h-[60px] ${
 paymentMethod === method
 ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
 : 'bg-white border-slate-200 text-slate-900 hover:border-emerald-300 hover:shadow-sm'
 }`}
 >
 {logoUrl && (
 <div className="h-6 w-full flex items-center justify-center">
 <img src={logoUrl} alt={method} className="h-full max-w-full object-contain" />
 </div>
 )}
 <span className="text-[9px] sm:text-[10px]">{method}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Transaction ID */}
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Transaction ID / TrxID (ঐচ্ছিক ট্রানজেকশন নম্বর)
 </label>
 <input
 type="text"
 value={paymentTrxId}
 onChange={(e) => setPaymentTrxId(e.target.value)}
 placeholder="e.g. 9B7X2K4L9"
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
 />
 </div>

 {/* Collector */}
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Bill Collector (বিল আদায়কারী)
 </label>
 <input
 type="text"
 value={paymentCollector}
 onChange={(e) => setPaymentCollector(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
 />
 </div>

 {/* Auto Extend Client Expiry Checkbox */}
 <label className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded cursor-pointer">
 <input
 type="checkbox"
 checked={paymentExtendExpiry}
 onChange={(e) => setPaymentExtendExpiry(e.target.checked)}
 className="w-4 h-4 text-emerald-600 rounded"
 />
 <span className="text-slate-800 font-bold text-xs">
 গ্রাহকের ইন্টারনেট মেয়াদ স্বয়ংক্রিয়ভাবে ১ মাস (৩০ দিন) বৃদ্ধি করুন
 </span>
 </label>

 {/* Submit Buttons */}
 <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setIsPaymentModalOpen(false)}
 className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 "
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:brightness-110 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5"
 >
 <Check className="w-4 h-4" />
 <span>Confirm Payment</span>
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* 8. MODAL: Send Payment Reminder (SMS / WhatsApp) */}
 {/* ========================================================================= */}
 {isReminderModalOpen && selectedInvoiceForReminder && (
 <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto">
 <div className="bg-white border border-slate-200 rounded w-full max-w-lg shadow-md overflow-hidden animate-page-enter">
 <div className="p-4.5 bg-gradient-to-r from-amber-900 to-orange-950 text-white flex items-center justify-between border-b border-amber-800">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg">
 <Send className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-extrabold">Send Payment Reminder (পেমেন্ট রিমাইন্ডার)</h3>
 <p className="text-xs text-amber-300/80">
 To: {selectedInvoiceForReminder.clientName} ({selectedInvoiceForReminder.phone})
 </p>
 </div>
 </div>
 <button
 onClick={() => setIsReminderModalOpen(false)}
 className="text-slate-900 hover:text-slate-800 p-1 rounded-lg hover:bg-amber-800 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-5 space-y-4 text-xs">
 {/* Language Selector */}
 <div className="flex items-center justify-between">
 <span className="font-bold text-slate-700 ">Message Template:</span>
 <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 ">
 <button
 type="button"
 onClick={() => handleLanguageToggle('bn')}
 className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
 reminderLanguage === 'bn'
 ? 'bg-amber-500 text-white shadow-xs'
 : 'text-slate-800 '
 }`}
 >
 বাংলা (Bangla)
 </button>
 <button
 type="button"
 onClick={() => handleLanguageToggle('en')}
 className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
 reminderLanguage === 'en'
 ? 'bg-amber-500 text-white shadow-xs'
 : 'text-slate-800 '
 }`}
 >
 English
 </button>
 </div>
 </div>

 {/* Editable SMS Preview */}
 <div>
 <label className="block font-bold text-slate-700 mb-1">
 Message Text (মেসেজের বিবরণী)
 </label>
 <textarea
 rows={4}
 value={customReminderText}
 onChange={(e) => setCustomReminderText(e.target.value)}
 className="w-full px-3 py-2.5 rounded border border-slate-300 bg-slate-50 text-slate-900 font-medium text-xs focus:outline-none focus:border-amber-500"
 />
 </div>

 {/* Sending Channel Buttons */}
 <div className="space-y-2">
 <div className="font-bold text-slate-700 ">Choose Send Method:</div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {/* WhatsApp */}
 <button
 type="button"
 onClick={handleSendWhatsApp}
 className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
 >
 <MessageSquare className="w-4 h-4" />
 <span>Send via WhatsApp</span>
 </button>

 {/* Mobile SMS */}
 <button
 type="button"
 onClick={handleSendDeviceSms}
 className="p-3 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
 >
 <Smartphone className="w-4 h-4" />
 <span>Send via Mobile SMS</span>
 </button>

 {/* Copy Text */}
 <button
 type="button"
 onClick={handleCopyReminder}
 className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
 >
 <Copy className="w-4 h-4 text-slate-800" />
 <span>Copy Text</span>
 </button>

 {/* Gateway SMS */}
 <button
 type="button"
 onClick={handleSendGatewaySms}
 className="p-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white rounded font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
 >
 <Zap className="w-4 h-4" />
 <span>ISP SMS Gateway</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* 9. MODAL: Bulk Send Reminders */}
 {/* ========================================================================= */}
 {isBulkReminderModalOpen && (
 <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto">
 <div className="bg-white border border-slate-200 rounded w-full max-w-md shadow-md overflow-hidden animate-page-enter">
 <div className="p-4.5 bg-gradient-to-r from-amber-900 to-orange-950 text-white flex items-center justify-between border-b border-amber-800">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg">
 <Bell className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-extrabold">Bulk Reminders (একসাথে সকল বকেয়া রিমাইন্ডার)</h3>
 <p className="text-xs text-amber-300/80">
 {stats.pendingCount + stats.overdueCount} জন গ্রাহকের বকেয়া বিল রিমাইন্ডার
 </p>
 </div>
 </div>
 <button
 onClick={() => setIsBulkReminderModalOpen(false)}
 className="text-slate-900 hover:text-slate-800 p-1 rounded-lg hover:bg-amber-800 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-5 space-y-4 text-xs">
 <p className="text-slate-900 leading-relaxed">
 আপনি কি এক ক্লিকে সকল অপেক্ষমান (Pending) এবং মেয়াদোত্তীর্ণ (Overdue) <strong>{stats.pendingCount + stats.overdueCount}</strong> টি ইনভয়েসের জন্য গ্রাহকদের মোবাইল নম্বরে পেমেন্ট রিমাইন্ডার পাঠাতে চান?
 </p>

 <div className="p-3 bg-amber-50 border border-amber-200 rounded space-y-1 text-[11px] text-amber-800 ">
 <div>• মোট বকেয়া অ্যামাউন্ট: <strong>৳{(stats.pendingAmount + stats.overdueAmount).toLocaleString()}</strong></div>
 <div>• ওভারডিউ ইনভয়েস: <strong>{stats.overdueCount}</strong> টি</div>
 <div>• পেন্ডিং ইনভয়েস: <strong>{stats.pendingCount}</strong> টি</div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setIsBulkReminderModalOpen(false)}
 className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 "
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => {
 const targets = evaluatedInvoices.filter((i) => i.status === 'pending' || i.status === 'overdue');
 targets.forEach((t) => onSendReminder(t.id, 'gateway'));
 setIsBulkReminderModalOpen(false);
 showToast(`${targets.length} জন বকেয়া গ্রাহককে SMS রিমাইন্ডার কিউতে পাঠানো হয়েছে!`, 'success');
 }}
 className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
 >
 <Send className="w-4 h-4" />
 <span>Send All Reminders Now</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* 10. MODAL: View / Print Invoice (A4 & POS Thermal Slips) */}
 {/* ========================================================================= */}
 {selectedInvoiceForView && (
 <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
 <div className="bg-white border border-slate-200 rounded w-full max-w-3xl max-h-[92vh] flex flex-col shadow-md overflow-hidden animate-page-enter">
 {/* Top Toolbar (Non-printable) */}
 <div className="p-4 bg-white text-slate-800 flex items-center justify-between border-b border-slate-200 print:hidden">
 <div className="flex items-center gap-3">
 <span className="font-extrabold text-sm">Invoice: {selectedInvoiceForView.invoiceNumber}</span>
 {/* Switch between A4 & POS Thermal Slip */}
 <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-300 text-xs font-bold">
 <button
 onClick={() => setPrintFormat('a4')}
 className={`px-3 py-1 rounded transition-all ${
 printFormat === 'a4' ? 'bg-sky-500 text-white' : 'text-slate-800 hover:text-slate-800'
 }`}
 >
 A4 Invoice
 </button>
 <button
 onClick={() => setPrintFormat('pos')}
 className={`px-3 py-1 rounded transition-all ${
 printFormat === 'pos' ? 'bg-sky-500 text-white' : 'text-slate-800 hover:text-slate-800'
 }`}
 >
 Thermal POS Slip
 </button>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={handlePrint}
 className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
 >
 <Printer className="w-4 h-4" />
 <span>Print</span>
 </button>
 <button
 onClick={() => setSelectedInvoiceForView(null)}
 className="text-slate-800 hover:text-slate-800 p-1 rounded-lg hover:bg-white transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* Modal Body: Printable Invoice */}
 <div className="p-8 overflow-y-auto bg-white text-slate-900 font-sans" id="printable-invoice">
 {printFormat === 'a4' ? (
 /* A4 Standard Layout */
 <div className="space-y-6 max-w-2xl mx-auto">
 {/* Header / Brand */}
 <div className="flex items-start justify-between border-b border-slate-200 pb-6">
 <div>
 <div className="flex items-center gap-3">
 {settings.logo ? (
 <img src={settings.logo} alt="Logo" className="w-12 h-12 object-contain" />
 ) : (
 <div className="w-12 h-12 rounded bg-sky-600 text-white flex items-center justify-center font-black text-xl">
 FE
 </div>
 )}
 <div>
 <h1 className="text-xl font-black tracking-tight text-slate-900">
 {settings.companyName || settings.appName || 'Nexora network'}
 </h1>
 <p className="text-xs text-slate-800 font-semibold">High Speed Fiber Broadband Network</p>
 </div>
 </div>
 <p className="text-xs text-slate-900 mt-2">
 {settings.address || 'Dhaka, Bangladesh'}
 </p>
 <p className="text-xs text-slate-900">
 Phone: {settings.phone || '01XXXXXXXXX'} {settings.whatsapp && `• WhatsApp: ${settings.whatsapp}`}
 </p>
 </div>

 <div className="text-right">
 <div className="text-2xl font-black tracking-wider text-sky-700 uppercase">
 INVOICE
 </div>
 <div className="text-xs font-mono font-bold text-slate-800 mt-1">
 #{selectedInvoiceForView.invoiceNumber}
 </div>
 <div className="mt-2">
 {selectedInvoiceForView.status === 'paid' ? (
 <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-black text-xs uppercase tracking-wider">
 PAID (পরিশোধিত)
 </span>
 ) : selectedInvoiceForView.status === 'overdue' ? (
 <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded font-black text-xs uppercase tracking-wider">
 OVERDUE (বকেয়া)
 </span>
 ) : (
 <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded font-black text-xs uppercase tracking-wider">
 UNPAID / DUE
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Billed To & Dates Grid */}
 <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded border border-slate-100 text-xs">
 <div>
 <div className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">
 Billed To (গ্রাহকের বিবরণী):
 </div>
 <div className="font-extrabold text-sm text-slate-900">{selectedInvoiceForView.clientName}</div>
 <div className="text-slate-700 font-semibold mt-0.5">User ID: {selectedInvoiceForView.userId}</div>
 <div className="text-slate-700 mt-0.5">Mobile: {selectedInvoiceForView.phone}</div>
 {selectedInvoiceForView.router && (
 <div className="text-slate-800 mt-0.5">Router Node: {selectedInvoiceForView.router}</div>
 )}
 </div>

 <div className="text-right space-y-1">
 <div>
 <span className="text-slate-800 font-semibold">Billing Month: </span>
 <span className="font-bold text-slate-900">{selectedInvoiceForView.billingMonth}</span>
 </div>
 <div>
 <span className="text-slate-800 font-semibold">Issue Date: </span>
 <span className="font-bold text-slate-900">{selectedInvoiceForView.issueDate}</span>
 </div>
 <div>
 <span className="text-slate-800 font-semibold">Payment Due Date: </span>
 <span className="font-bold text-rose-700">{selectedInvoiceForView.dueDate}</span>
 </div>
 {selectedInvoiceForView.paidAt && (
 <div>
 <span className="text-slate-800 font-semibold">Paid Date: </span>
 <span className="font-bold text-emerald-700">{selectedInvoiceForView.paidAt}</span>
 </div>
 )}
 </div>
 </div>

 {/* Items Table */}
 <table className="w-full text-xs text-left border-collapse">
 <thead>
 <tr className="border-b-2 border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
 <th className="py-2.5">Description</th>
 <th className="py-2.5 text-center">Qty</th>
 <th className="py-2.5 text-right">Rate (৳)</th>
 <th className="py-2.5 text-right">Amount (৳)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {selectedInvoiceForView.items.map((item, idx) => (
 <tr key={idx}>
 <td className="py-3 font-semibold text-slate-800">{item.description}</td>
 <td className="py-3 text-center text-slate-900">{item.quantity}</td>
 <td className="py-3 text-right font-mono text-slate-900">৳{item.unitPrice}</td>
 <td className="py-3 text-right font-mono font-bold text-slate-900">৳{item.total}</td>
 </tr>
 ))}
 </tbody>
 </table>

 {/* Summary & QR Code */}
 <div className="flex items-start justify-between border-t-2 border-slate-200 pt-4">
 {/* Payment QR Code */}
 <div className="flex items-center gap-3">
 <div className="p-2 border border-slate-200 rounded-lg bg-white shadow-xs">
 <QRCodeSVG
 value={`bKash/Nagad Merchant: ${settings.phone || '01XXXXXXXXX'} | Amount: ৳${selectedInvoiceForView.dueAmount || selectedInvoiceForView.totalAmount} | Inv: ${selectedInvoiceForView.invoiceNumber}`}
 size={70}
 />
 </div>
 <div className="text-[11px] text-slate-900">
 <div className="font-bold text-slate-800">Scan & Pay (বিকাশ / নগদ)</div>
 <div>Merchant: {settings.phone || '01XXXXXXXXX'}</div>
 <div className="text-[10px] text-slate-800">Ref: {selectedInvoiceForView.userId}</div>
 </div>
 </div>

 {/* Calculation Totals */}
 <div className="w-56 space-y-1.5 text-xs text-right">
 <div className="flex justify-between text-slate-900">
 <span>Subtotal:</span>
 <span className="font-mono">৳{selectedInvoiceForView.subtotal}</span>
 </div>
 {selectedInvoiceForView.discount > 0 && (
 <div className="flex justify-between text-emerald-600">
 <span>Discount:</span>
 <span className="font-mono">-৳{selectedInvoiceForView.discount}</span>
 </div>
 )}
 {selectedInvoiceForView.tax > 0 && (
 <div className="flex justify-between text-slate-900">
 <span>VAT / Tax:</span>
 <span className="font-mono">+৳{selectedInvoiceForView.tax}</span>
 </div>
 )}
 <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-300 pt-1.5">
 <span>Total Payable:</span>
 <span className="font-mono">৳{selectedInvoiceForView.totalAmount}</span>
 </div>
 <div className="flex justify-between text-emerald-700 font-bold">
 <span>Paid Amount:</span>
 <span className="font-mono">৳{selectedInvoiceForView.paidAmount}</span>
 </div>
 <div className="flex justify-between text-rose-700 font-black text-sm border-t border-slate-200 pt-1">
 <span>Due Balance:</span>
 <span className="font-mono">৳{selectedInvoiceForView.dueAmount}</span>
 </div>
 </div>
 </div>

 {/* Notes & Footer Signatures */}
 <div className="border-t border-slate-200 pt-6 mt-6 flex items-end justify-between text-[11px] text-slate-800">
 <div className="max-w-xs">
 <div className="font-bold text-slate-700">Terms & Conditions:</div>
 <div>{selectedInvoiceForView.notes || 'Please pay the bill by due date to avoid service disconnection.'}</div>
 </div>

 <div className="text-center">
 <div className="w-36 border-b border-slate-400 mb-1" />
 <div className="font-bold text-slate-700">Authorized Signature</div>
 <div className="text-[10px] text-slate-800">{settings.companyName || 'Nexora network'}</div>
 </div>
 </div>
 </div>
 ) : (
 /* Thermal 80mm POS Receipt Layout */
 <div className="max-w-[320px] mx-auto text-xs font-mono p-4 border border-slate-300 rounded-lg space-y-3 text-center">
 <div className="font-black text-base uppercase">{settings.companyName || settings.appName || 'Nexora network'}</div>
 <div className="text-[11px] text-slate-900">{settings.address || 'Dhaka, Bangladesh'}</div>
 <div className="text-[11px] text-slate-900">Tel: {settings.phone || '01XXXXXXXXX'}</div>
 <div className="border-b border-dashed border-slate-400 my-2" />

 <div className="text-left text-[11px] space-y-0.5">
 <div>Invoice: #{selectedInvoiceForView.invoiceNumber}</div>
 <div>Date: {selectedInvoiceForView.issueDate} | Due: {selectedInvoiceForView.dueDate}</div>
 <div>Client: {selectedInvoiceForView.clientName}</div>
 <div>User ID: {selectedInvoiceForView.userId}</div>
 <div>Phone: {selectedInvoiceForView.phone}</div>
 <div>Month: {selectedInvoiceForView.billingMonth}</div>
 </div>

 <div className="border-b border-dashed border-slate-400 my-2" />

 <div className="text-left space-y-1 text-[11px]">
 {selectedInvoiceForView.items.map((item, idx) => (
 <div key={idx} className="flex justify-between">
 <span>{item.description}</span>
 <span className="font-bold">৳{item.total}</span>
 </div>
 ))}
 </div>

 <div className="border-b border-dashed border-slate-400 my-2" />

 <div className="space-y-1 text-right text-xs">
 <div className="flex justify-between font-black text-sm">
 <span>TOTAL:</span>
 <span>৳{selectedInvoiceForView.totalAmount}</span>
 </div>
 <div className="flex justify-between text-emerald-700 font-bold">
 <span>PAID:</span>
 <span>৳{selectedInvoiceForView.paidAmount}</span>
 </div>
 <div className="flex justify-between text-rose-700 font-black">
 <span>DUE:</span>
 <span>৳{selectedInvoiceForView.dueAmount}</span>
 </div>
 </div>

 <div className="border-b border-dashed border-slate-400 my-2" />

 <div className="flex justify-center my-2">
 <QRCodeSVG
 value={`bKash:${settings.phone} Amount:৳${selectedInvoiceForView.dueAmount || selectedInvoiceForView.totalAmount}`}
 size={60}
 />
 </div>

 <div className="text-[10px] text-slate-800">
 Thank you for choosing our fiber service!
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
