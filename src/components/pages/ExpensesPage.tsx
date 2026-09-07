import React, { useState, useMemo } from 'react';
import { ExpenseItem, PaymentRecord, AppSettings } from '../../types';
import {
 DollarSign,
 Plus,
 TrendingDown,
 TrendingUp,
 Receipt,
 Search,
 Filter,
 Calendar,
 Wallet,
 CreditCard,
 Building,
 CheckCircle2,
 Trash2,
 PieChart,
} from 'lucide-react';

interface ExpensesPageProps {
 payments: PaymentRecord[];
 settings?: AppSettings;
 showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

const defaultExpenses: ExpenseItem[] = [
 {
 id: 'EXP-1',
 title: 'Upstream Bandwidth Bill (Summit Communications 1Gbps IIG)',
 category: 'Bandwidth Cost',
 amount: 45000,
 date: '2026-08-05',
 monthKey: '2026-08',
 paidTo: 'Summit Communications Ltd.',
 paymentMethod: 'Bank',
 receiptNumber: 'SCL-INV-9921',
 },
 {
 id: 'EXP-2',
 title: 'Core POP Server Room Electricity & AC Bill (DESCO)',
 category: 'Electricity',
 amount: 12500,
 date: '2026-08-10',
 monthKey: '2026-08',
 paidTo: 'DESCO Mirpur Division',
 paymentMethod: 'bKash',
 receiptNumber: 'DSC-88371',
 },
 {
 id: 'EXP-3',
 title: 'Field Lineman & Support Staff Monthly Salary',
 category: 'Employee Salary',
 amount: 38000,
 date: '2026-08-01',
 monthKey: '2026-08',
 paidTo: 'Mehedi, Tanvir, Jahangir',
 paymentMethod: 'Cash',
 receiptNumber: 'SAL-2026-08',
 },
 {
 id: 'EXP-4',
 title: 'Main Office Space Rent (Uttara Sector 4)',
 category: 'Office Rent',
 amount: 20000,
 date: '2026-08-01',
 monthKey: '2026-08',
 paidTo: 'Landlord House #12',
 paymentMethod: 'Bank',
 },
 {
 id: 'EXP-5',
 title: 'Fiber Splicing & Road 5 Pole Cable Maintenance',
 category: 'Maintenance',
 amount: 4500,
 date: '2026-08-15',
 monthKey: '2026-08',
 paidTo: 'Optical Tech Supplies',
 paymentMethod: 'Cash',
 },
];

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
 payments,
 settings,
 showToast,
}) => {
 const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
 try {
 const saved = localStorage.getItem('isp_expenses');
 if (saved) return JSON.parse(saved);
 } catch (e) {
 console.error(e);
 }
 return defaultExpenses;
 });

 const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
 const [selectedCategory, setSelectedCategory] = useState<string>('All');
 const [searchTerm, setSearchTerm] = useState('');
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);

 // Form State
 const [formData, setFormData] = useState({
 title: '',
 category: 'Bandwidth Cost' as ExpenseItem['category'],
 amount: '',
 date: new Date().toISOString().split('T')[0],
 paidTo: '',
 paymentMethod: 'Bank' as ExpenseItem['paymentMethod'],
 receiptNumber: '',
 notes: '',
 });

 const saveExpenses = (updated: ExpenseItem[]) => {
 setExpenses(updated);
 localStorage.setItem('isp_expenses', JSON.stringify(updated));
 };

 const handleAddExpense = (e: React.FormEvent) => {
 e.preventDefault();
 const amountVal = parseFloat(formData.amount);
 if (!formData.title || isNaN(amountVal) || amountVal <= 0) {
 showToast('Please enter valid expense details and amount.', 'error');
 return;
 }

 const monthKey = formData.date.slice(0, 7);
 const newExpense: ExpenseItem = {
 id: `EXP-${Date.now()}`,
 title: formData.title,
 category: formData.category,
 amount: amountVal,
 date: formData.date,
 monthKey,
 paidTo: formData.paidTo || 'N/A',
 paymentMethod: formData.paymentMethod,
 receiptNumber: formData.receiptNumber,
 notes: formData.notes,
 };

 const updated = [newExpense, ...expenses];
 saveExpenses(updated);
 showToast(`Expense recorded successfully! (৳${amountVal.toLocaleString()})`, 'success');
 setIsAddModalOpen(false);
 setFormData({
 title: '',
 category: 'Bandwidth Cost',
 amount: '',
 date: new Date().toISOString().split('T')[0],
 paidTo: '',
 paymentMethod: 'Bank',
 receiptNumber: '',
 notes: '',
 });
 };

 const handleDelete = (id: string) => {
 if (window.confirm('Are you sure you want to delete this expense record?')) {
 const updated = expenses.filter((e) => e.id !== id);
 saveExpenses(updated);
 showToast('Expense record deleted.', 'info');
 }
 };

 // Financial Calculations for the selected month
 const monthlyRevenue = useMemo(() => {
 return payments
 .filter((p) => (p.monthKey || p.date.slice(0, 7)) === selectedMonth)
 .reduce((sum, p) => sum + p.amount, 0) || 165000;
 }, [payments, selectedMonth]);

 const monthlyExpenses = useMemo(() => {
 return expenses
 .filter((e) => e.monthKey === selectedMonth)
 .reduce((sum, e) => sum + e.amount, 0);
 }, [expenses, selectedMonth]);

 const netProfit = monthlyRevenue - monthlyExpenses;

 // Filtered List
 const filteredExpenses = expenses.filter((e) => {
 const matchesMonth = selectedMonth === 'All' || e.monthKey === selectedMonth;
 const matchesCat = selectedCategory === 'All' || e.category === selectedCategory;
 const matchesSearch =
 e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
 e.paidTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
 (e.receiptNumber && e.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()));
 return matchesMonth && matchesCat && matchesSearch;
 });

 return (
 <div className="space-y-6">
 {/* Header Banner */}
 <div className="bg-slate-50 border border-slate-300 rounded p-5 text-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-gradient-to-br from-rose-500 to-amber-600 rounded shadow-sm">
 <DollarSign className="w-6 h-6 text-slate-800" />
 </div>
 <div>
 <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
 <span>Expense &amp; Net Profit Ledger</span>
 <span className="text-xs font-mono bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30">
 Revenue − Expense = Net Profit
 </span>
 </h1>
 <p className="text-xs text-slate-900 mt-0.5">
 Bandwidth upstream bills, electricity, staff salaries, server costs, and office OPEX tracking.
 </p>
 </div>
 </div>

 <button
 onClick={() => setIsAddModalOpen(true)}
 className="px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs rounded shadow-md transition-all cursor-pointer flex items-center gap-1.5"
 >
 <Plus className="w-4 h-4" />
 <span>Add New Expense Record</span>
 </button>
 </div>

 {/* 3 Executive Financial Summary Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
 <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 shadow-sm space-y-1">
 <div className="flex items-center justify-between text-xs text-slate-800 font-sans">
 <span className="font-bold">Total Month Revenue</span>
 <TrendingUp className="w-4 h-4 text-emerald-500" />
 </div>
 <div className="text-2xl sm:text-3xl font-black text-emerald-500">
 ৳{monthlyRevenue.toLocaleString()}
 </div>
 <div className="text-[11px] text-slate-800 font-sans">Billing collections from clients</div>
 </div>

 <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 shadow-sm space-y-1">
 <div className="flex items-center justify-between text-xs text-slate-800 font-sans">
 <span className="font-bold">Total Month Expenses</span>
 <TrendingDown className="w-4 h-4 text-rose-500" />
 </div>
 <div className="text-2xl sm:text-3xl font-black text-rose-500">
 ৳{monthlyExpenses.toLocaleString()}
 </div>
 <div className="text-[11px] text-slate-800 font-sans">Bandwidth, power, salaries, rent</div>
 </div>

 <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 shadow-sm space-y-1">
 <div className="flex items-center justify-between text-xs text-slate-800 font-sans">
 <span className="font-bold">Net Profit / Margin</span>
 <Wallet className="w-4 h-4 text-sky-500" />
 </div>
 <div className={`text-2xl sm:text-3xl font-black ${netProfit >= 0 ? 'text-sky-500' : 'text-red-500'}`}>
 ৳{netProfit.toLocaleString()}
 </div>
 <div className="text-[11px] text-slate-800 font-sans">
 Margin: {monthlyRevenue > 0 ? ((netProfit / monthlyRevenue) * 100).toFixed(1) : 0}%
 </div>
 </div>
 </div>

 {/* Filter and Search Bar */}
 <div className="bg-white border border-slate-200 rounded p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
 <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
 {/* Month Filter */}
 <select
 value={selectedMonth}
 onChange={(e) => setSelectedMonth(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-rose-500"
 >
 <option value="2026-08">August 2026</option>
 <option value="2026-07">July 2026</option>
 <option value="2026-06">June 2026</option>
 <option value="All">All Months</option>
 </select>

 {/* Category Filter */}
 <select
 value={selectedCategory}
 onChange={(e) => setSelectedCategory(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
 >
 <option value="All">All Categories</option>
 <option value="Bandwidth Cost">Bandwidth Cost</option>
 <option value="Server Cost">Server Cost</option>
 <option value="Electricity">Electricity</option>
 <option value="Employee Salary">Employee Salary</option>
 <option value="Maintenance">Maintenance</option>
 <option value="Equipment">Equipment</option>
 <option value="Office Rent">Office Rent</option>
 <option value="Other">Other</option>
 </select>
 </div>

 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 text-slate-800 absolute left-3 top-2.5" />
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Search title, payee, receipt..."
 className="w-full bg-slate-50 border border-slate-200 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
 />
 </div>
 </div>

 {/* Expenses Table */}
 <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
 <th className="p-3.5">Date &amp; Receipt</th>
 <th className="p-3.5">Expense Title / Purpose</th>
 <th className="p-3.5">Category</th>
 <th className="p-3.5">Paid To</th>
 <th className="p-3.5">Method</th>
 <th className="p-3.5 font-mono">Amount</th>
 <th className="p-3.5 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredExpenses.length === 0 ? (
 <tr>
 <td colSpan={7} className="p-8 text-center text-slate-800">
 No expense records found.
 </td>
 </tr>
 ) : (
 filteredExpenses.map((exp) => (
 <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
 <td className="p-3.5">
 <div className="font-mono font-bold text-slate-800 ">{exp.date}</div>
 <div className="text-[10px] text-slate-800 font-mono">{exp.receiptNumber || 'No Receipt'}</div>
 </td>
 <td className="p-3.5 font-bold text-slate-900 max-w-xs">
 {exp.title}
 </td>
 <td className="p-3.5">
 <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold text-[10px]">
 {exp.category}
 </span>
 </td>
 <td className="p-3.5 text-slate-700 font-medium">
 {exp.paidTo}
 </td>
 <td className="p-3.5">
 <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono font-bold text-[11px]">
 {exp.paymentMethod}
 </span>
 </td>
 <td className="p-3.5 font-mono font-black text-rose-500 text-sm">
 ৳{exp.amount.toLocaleString()}
 </td>
 <td className="p-3.5 text-right">
 <button
 onClick={() => handleDelete(exp.id)}
 className="p-1.5 text-slate-800 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
 title="Delete record"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Add Expense Modal */}
 {isAddModalOpen && (
 <div className="fixed inset-0 z-[150] bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded p-6 max-w-md w-full shadow-md text-slate-900 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <h3 className="font-extrabold text-base flex items-center gap-2">
 <Receipt className="w-5 h-5 text-rose-500" />
 <span>Record New Operational Expense</span>
 </h3>
 <button
 onClick={() => setIsAddModalOpen(false)}
 className="text-slate-800 hover:text-slate-800 cursor-pointer"
 >
 ✕
 </button>
 </div>

 <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
 <div>
 <label className="block font-bold text-slate-800 mb-1">Expense Title / Description</label>
 <input
 type="text"
 required
 placeholder="e.g. Summit 1Gbps Bandwidth Bill"
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-800 mb-1">Category</label>
 <select
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
 >
 <option value="Bandwidth Cost">Bandwidth Cost</option>
 <option value="Server Cost">Server Cost</option>
 <option value="Electricity">Electricity</option>
 <option value="Employee Salary">Employee Salary</option>
 <option value="Maintenance">Maintenance</option>
 <option value="Equipment">Equipment</option>
 <option value="Office Rent">Office Rent</option>
 <option value="Marketing">Marketing</option>
 <option value="Other">Other</option>
 </select>
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">Amount (BDT ৳)</label>
 <input
 type="number"
 required
 placeholder="e.g. 15000"
 value={formData.amount}
 onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500 font-mono font-bold"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-3">
 <div>
 <label className="block font-bold text-slate-800 mb-1">Date</label>
 <input
 type="date"
 required
 value={formData.date}
 onChange={(e) => setFormData({ ...formData, date: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500 font-mono"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">Payment Method</label>
 <div className="grid grid-cols-4 gap-2">
 {(['Bank', 'bKash', 'Cash', 'Nagad'] as const).map((method) => {
 const logoUrl = settings?.paymentLogos?.[method.toLowerCase() as keyof typeof settings.paymentLogos];
 return (
 <button
 key={method}
 type="button"
 onClick={() => setFormData({ ...formData, paymentMethod: method as any })}
 className={`p-2 rounded-lg font-bold border flex flex-col items-center justify-center gap-2 transition-colors min-h-[60px] ${
 formData.paymentMethod === method
 ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
 : 'bg-white border-slate-200 text-slate-900 hover:border-rose-300 hover:shadow-sm'
 }`}
 >
 {logoUrl && (
 <div className="h-6 w-full flex items-center justify-center">
 <img src={logoUrl} alt={method} className="h-full max-w-full object-contain" />
 </div>
 )}
 <span className="text-[10px]">{method}</span>
 </button>
 );
 })}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-800 mb-1">Paid To (Vendor/Person)</label>
 <input
 type="text"
 placeholder="e.g. Summit Telecom / Landlord"
 value={formData.paidTo}
 onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">Receipt # / Voucher</label>
 <input
 type="text"
 placeholder="e.g. SCL-9921"
 value={formData.receiptNumber}
 onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500 font-mono"
 />
 </div>
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => setIsAddModalOpen(false)}
 className="w-1/3 py-2.5 bg-slate-200 text-slate-700 font-bold rounded cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="w-2/3 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-slate-950 font-black rounded shadow-md cursor-pointer flex items-center justify-center gap-1.5"
 >
 <CheckCircle2 className="w-4 h-4" />
 <span>Save Expense Record</span>
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
