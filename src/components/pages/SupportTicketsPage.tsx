import React, { useState } from 'react';
import { SupportTicket, Client, AppSettings } from '../../types';
import {
 Headphones,
 Plus,
 Search,
 Filter,
 CheckCircle2,
 Clock,
 AlertTriangle,
 Send,
 UserCheck,
 Phone,
 MessageSquare,
 Wrench,
 Radio,
 FileText,
 Trash2,
 Edit,
} from 'lucide-react';

interface SupportTicketsPageProps {
 clients: Client[];
 settings: AppSettings;
 showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

const defaultTickets: SupportTicket[] = [
 {
 id: 'TCK-101',
 ticketNumber: 'TK-2026-001',
 clientId: 'CL-101',
 clientName: 'Tanvir Ahmed',
 phone: '01711223344',
 category: 'Fiber LOS',
 priority: 'Urgent',
 status: 'Working',
 subject: 'Red LOS blinking on ONU after thunderstorm',
 description: 'Road 5 pole wire was tangled with tree branches. Client has no optical signal (-40 dBm).',
 assignedStaff: 'Mehedi Hasan (Field Lineman)',
 createdAt: '2026-08-19 09:30 AM',
 location: 'Sector 10, Road 5, House 12',
 },
 {
 id: 'TCK-102',
 ticketNumber: 'TK-2026-002',
 clientId: 'CL-102',
 clientName: 'Nusrat Jahan',
 phone: '01812345678',
 category: 'Slow Speed',
 priority: 'Medium',
 status: 'Assigned',
 subject: 'YouTube 4K buffer & packet drop during evening',
 description: 'Client subscribed to 20 Mbps package but getting high jitter on WiFi 2.4GHz channel.',
 assignedStaff: 'Tanvir Hossain (Support Desk)',
 createdAt: '2026-08-19 10:15 AM',
 location: 'Mirpur 11, Block B',
 },
 {
 id: 'TCK-103',
 ticketNumber: 'TK-2026-003',
 clientId: 'CL-103',
 clientName: 'Mahmudul Hasan',
 phone: '01911998877',
 category: 'Router Problem',
 priority: 'Low',
 status: 'Resolved',
 subject: 'WiFi password reset & 5GHz SSID configuration',
 description: 'Reconfigured client dual-band router remotely via WAN web admin.',
 assignedStaff: 'Md. Jahangir Alam (Network Eng)',
 createdAt: '2026-08-18 04:00 PM',
 resolvedAt: '2026-08-18 04:45 PM',
 resolution: 'Remotely logged in and reset SSID to NexoraNetwork_5G with WPA3 security.',
 location: 'Uttara Sector 4',
 },
 {
 id: 'TCK-104',
 ticketNumber: 'TK-2026-004',
 clientId: 'CL-104',
 clientName: 'Dr. Rafiqul Islam',
 phone: '01799887766',
 category: 'Payment Issue',
 priority: 'High',
 status: 'Open',
 subject: 'bKash Auto-payment deducted but account suspended',
 description: 'Client provided bKash TrxID: 9H87G65F. Needs ledger reconciliation and instant unblock.',
 createdAt: '2026-08-19 11:20 AM',
 location: 'Banani Road 11',
 },
];

export const SupportTicketsPage: React.FC<SupportTicketsPageProps> = ({
 clients,
 settings,
 showToast,
}) => {
 const [tickets, setTickets] = useState<SupportTicket[]>(() => {
 try {
 const saved = localStorage.getItem('isp_support_tickets');
 if (saved) return JSON.parse(saved);
 } catch (e) {
 console.error(e);
 }
 return defaultTickets;
 });

 const [activeTab, setActiveTab] = useState<'All' | 'Open' | 'Assigned' | 'Working' | 'Resolved' | 'Closed'>('All');
 const [searchTerm, setSearchTerm] = useState('');
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

 // Form State
 const [formData, setFormData] = useState({
 clientId: '',
 category: 'No Internet' as SupportTicket['category'],
 priority: 'Medium' as SupportTicket['priority'],
 subject: '',
 description: '',
 assignedStaff: 'Mehedi Hasan (Field Lineman)',
 location: '',
 });

 const saveTickets = (updated: SupportTicket[]) => {
 setTickets(updated);
 localStorage.setItem('isp_support_tickets', JSON.stringify(updated));
 };

 const handleCreateTicket = (e: React.FormEvent) => {
 e.preventDefault();
 const selectedClient = clients.find((c) => c.id === formData.clientId);
 const newTicket: SupportTicket = {
 id: `TCK-${Date.now()}`,
 ticketNumber: `TK-2026-${String(tickets.length + 1).padStart(3, '0')}`,
 clientId: formData.clientId,
 clientName: selectedClient ? selectedClient.name : 'Walk-in Client',
 phone: selectedClient ? selectedClient.phone : '01700000000',
 category: formData.category,
 priority: formData.priority,
 status: 'Open',
 subject: formData.subject,
 description: formData.description,
 assignedStaff: formData.assignedStaff,
 createdAt: new Date().toLocaleString(),
 location: formData.location || (selectedClient ? selectedClient.router : 'Main Coverage Area'),
 };

 const updated = [newTicket, ...tickets];
 saveTickets(updated);
 showToast(`Ticket #${newTicket.ticketNumber} has been opened successfully!`, 'success');
 setIsCreateModalOpen(false);
 setFormData({
 clientId: '',
 category: 'No Internet',
 priority: 'Medium',
 subject: '',
 description: '',
 assignedStaff: 'Mehedi Hasan (Field Lineman)',
 location: '',
 });
 };

 const handleUpdateStatus = (ticketId: string, nextStatus: SupportTicket['status']) => {
 const updated = tickets.map((t) => {
 if (t.id === ticketId) {
 return {
 ...t,
 status: nextStatus,
 resolvedAt: nextStatus === 'Resolved' || nextStatus === 'Closed' ? new Date().toLocaleString() : t.resolvedAt,
 };
 }
 return t;
 });
 saveTickets(updated);
 showToast(`Ticket status '${nextStatus}' updated.`, 'info');
 };

 const filteredTickets = tickets.filter((t) => {
 const matchesTab = activeTab === 'All' || t.status === activeTab;
 const matchesSearch =
 t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
 t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 t.phone.includes(searchTerm) ||
 t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
 t.category.toLowerCase().includes(searchTerm.toLowerCase());
 return matchesTab && matchesSearch;
 });

 return (
 <div className="space-y-6">
 {/* Header Banner */}
 <div className="bg-slate-50 border border-slate-300 rounded p-5 text-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-600 rounded shadow-sm">
 <Headphones className="w-6 h-6 text-slate-800" />
 </div>
 <div>
 <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
 <span>Support Desk &amp; Field Lineman Ticket System</span>
 <span className="text-xs font-mono bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30">
 SLA Priority Queue
 </span>
 </h1>
 <p className="text-xs text-slate-900 mt-0.5">
 Subscriber complaint resolution, field technician assignment, Red LOS fault recovery, and live status tracker.
 </p>
 </div>
 </div>

 <button
 onClick={() => setIsCreateModalOpen(true)}
 className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-110 text-white font-extrabold text-xs rounded shadow-md transition-all cursor-pointer flex items-center gap-1.5"
 >
 <Plus className="w-4 h-4" />
 <span>Create New Support Ticket</span>
 </button>
 </div>

 {/* Ticket Stage Stat Cards */}
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
 {[
 { id: 'Open', label: 'New / Open', count: tickets.filter((t) => t.status === 'Open').length, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
 { id: 'Assigned', label: 'Assigned', count: tickets.filter((t) => t.status === 'Assigned').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
 { id: 'Working', label: 'Field In-Progress', count: tickets.filter((t) => t.status === 'Working').length, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
 { id: 'Resolved', label: 'Resolved Today', count: tickets.filter((t) => t.status === 'Resolved').length, color: 'text-[#00a65a]', bg: 'bg-emerald-500/10 border-emerald-500/30' },
 { id: 'All', label: 'Total Tickets', count: tickets.length, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as any)}
 className={`p-3.5 rounded border text-left transition-all cursor-pointer ${
 activeTab === tab.id
 ? `${tab.bg} ring-2 ring-rose-400 shadow-sm`
 : 'bg-white border-slate-200 '
 }`}
 >
 <div className="text-[11px] font-bold text-slate-800 ">{tab.label}</div>
 <div className={`text-2xl font-black mt-1 ${tab.color}`}>{tab.count}</div>
 </button>
 ))}
 </div>

 {/* Search and Filters */}
 <div className="bg-white border border-slate-200 rounded p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
 <div className="relative w-full sm:max-w-md">
 <Search className="w-4 h-4 text-slate-800 absolute left-3 top-3" />
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Search by ticket #, client, phone, problem type..."
 className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
 />
 </div>

 {/* Workflow Tabs */}
 <div className="flex items-center gap-1 bg-slate-100 p-1 rounded font-mono text-xs overflow-x-auto w-full sm:w-auto">
 {(['All', 'Open', 'Assigned', 'Working', 'Resolved', 'Closed'] as const).map((tab) => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
 activeTab === tab
 ? 'bg-rose-500 text-white shadow-xs'
 : 'text-slate-800 hover:text-slate-900 '
 }`}
 >
 {tab}
 </button>
 ))}
 </div>
 </div>

 {/* Tickets List View */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {filteredTickets.length === 0 ? (
 <div className="col-span-2 p-12 text-center bg-white border border-slate-200 rounded text-slate-800">
 No support tickets found.
 </div>
 ) : (
 filteredTickets.map((ticket) => (
 <div
 key={ticket.id}
 className="bg-white border border-slate-200 hover:border-slate-300 rounded p-5 shadow-xs transition-all space-y-3"
 >
 <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-mono text-xs font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
 {ticket.ticketNumber}
 </span>
 <span
 className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
 ticket.priority === 'Urgent'
 ? 'bg-red-500/20 text-red-500 border border-red-500/30'
 : ticket.priority === 'High'
 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
 : 'bg-sky-500/20 text-sky-400'
 }`}
 >
 {ticket.priority} Priority
 </span>
 </div>
 <h3 className="font-bold text-sm text-slate-900 mt-1.5">{ticket.subject}</h3>
 </div>

 <span
 className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
 ticket.status === 'Open'
 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
 : ticket.status === 'Working'
 ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
 : ticket.status === 'Resolved'
 ? 'bg-emerald-500/20 text-[#00a65a] border border-emerald-500/30'
 : 'bg-slate-500/20 text-slate-800'
 }`}
 >
 {ticket.status}
 </span>
 </div>

 <p className="text-xs text-slate-900 line-clamp-2">{ticket.description}</p>

 <div className="bg-slate-50 p-3 rounded text-[11px] space-y-1 font-mono border border-slate-100 ">
 <div className="flex justify-between">
 <span className="text-slate-800 font-sans">Client Name:</span>
 <span className="font-bold text-slate-900 font-sans">
 {ticket.clientName} ({ticket.phone})
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800 font-sans">Category:</span>
 <span className="text-amber-500 font-bold">{ticket.category}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-800 font-sans">Assigned Tech:</span>
 <span className="text-sky-400 font-bold">{ticket.assignedStaff || 'Unassigned'}</span>
 </div>
 <div className="flex justify-between text-[10px] text-slate-800 pt-1 border-t border-slate-200 ">
 <span>Logged: {ticket.createdAt}</span>
 <span>{ticket.location}</span>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-between pt-1">
 <div className="flex items-center gap-1.5">
 <button
 onClick={() => {
 const tel = `tel:${ticket.phone}`;
 window.open(tel);
 }}
 className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
 title="Call Customer"
 >
 <Phone className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() =>
 showToast(`SMS sent to ${ticket.clientName}: Tech dispatched for ticket #${ticket.ticketNumber}`, 'success')
 }
 className="p-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
 title="Send Progress SMS"
 >
 <Send className="w-3.5 h-3.5" />
 </button>
 </div>

 <div className="flex items-center gap-1.5">
 {ticket.status !== 'Working' && ticket.status !== 'Resolved' && (
 <button
 onClick={() => handleUpdateStatus(ticket.id, 'Working')}
 className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
 >
 Start Working
 </button>
 )}
 {ticket.status !== 'Resolved' && (
 <button
 onClick={() => handleUpdateStatus(ticket.id, 'Resolved')}
 className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
 >
 Mark Resolved
 </button>
 )}
 </div>
 </div>
 </div>
 ))
 )}
 </div>

 {/* Create Ticket Modal */}
 {isCreateModalOpen && (
 <div className="fixed inset-0 z-[150] bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded p-6 max-w-lg w-full shadow-md text-slate-900 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <h3 className="font-extrabold text-base flex items-center gap-2">
 <Headphones className="w-5 h-5 text-rose-500" />
 <span>Open Support &amp; Complaint Ticket</span>
 </h3>
 <button
 onClick={() => setIsCreateModalOpen(false)}
 className="text-slate-800 hover:text-slate-800 cursor-pointer"
 >
 ✕
 </button>
 </div>

 <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
 <div>
 <label className="block font-bold text-slate-800 mb-1">Select Affected Client</label>
 <select
 required
 value={formData.clientId}
 onChange={(e) => {
 const c = clients.find((item) => item.id === e.target.value);
 setFormData({
 ...formData,
 clientId: e.target.value,
 location: c ? c.router || 'Central POP' : '',
 });
 }}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500"
 >
 <option value="">-- Choose Client --</option>
 {clients.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name} (@{c.userId} - {c.phone})
 </option>
 ))}
 </select>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block font-bold text-slate-800 mb-1">Problem Category</label>
 <select
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500"
 >
 <option value="No Internet">No Internet</option>
 <option value="Slow Speed">Slow Speed</option>
 <option value="Router Problem">Router Problem</option>
 <option value="Payment Issue">Payment Issue</option>
 <option value="Connection Problem">Connection Problem</option>
 <option value="Fiber LOS">Fiber LOS (Red Light)</option>
 <option value="Other">Other</option>
 </select>
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">Urgency Priority</label>
 <select
 value={formData.priority}
 onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500"
 >
 <option value="Low">Low</option>
 <option value="Medium">Medium</option>
 <option value="High">High</option>
 <option value="Urgent">Urgent (Red LOS)</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">Subject / Short Title</label>
 <input
 type="text"
 required
 placeholder="e.g. Red Optical light blinking since morning"
 value={formData.subject}
 onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">Detailed Description &amp; Address</label>
 <textarea
 rows={3}
 required
 placeholder="Provide details about pole location, cable damage, or router reboot findings..."
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500"
 />
 </div>

 <div>
 <label className="block font-bold text-slate-800 mb-1">Assign Staff / Lineman</label>
 <select
 value={formData.assignedStaff}
 onChange={(e) => setFormData({ ...formData, assignedStaff: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500"
 >
 <option value="Mehedi Hasan (Field Lineman)">Mehedi Hasan (Field Lineman)</option>
 <option value="Tanvir Hossain (Support Desk)">Tanvir Hossain (Support Desk)</option>
 <option value="Md. Jahangir Alam (Network Eng)">Md. Jahangir Alam (Network Eng)</option>
 <option value="Ariful Islam (Hotspot Ops)">Ariful Islam (Hotspot Ops)</option>
 </select>
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => setIsCreateModalOpen(false)}
 className="w-1/3 py-2.5 bg-slate-200 text-slate-700 font-bold rounded cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="w-2/3 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-110 text-white font-black rounded shadow-md cursor-pointer flex items-center justify-center gap-1.5"
 >
 <CheckCircle2 className="w-4 h-4" />
 <span>Open &amp; Dispatch Ticket</span>
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
