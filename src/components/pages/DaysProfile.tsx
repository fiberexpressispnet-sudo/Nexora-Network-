import React, { useState } from 'react';
import { DaysProfile as DaysProfileType } from '../../types';
import {
 Calendar,
 Clock,
 Plus,
 Edit2,
 Trash2,
 Check,
 Star,
 Search,
 Smartphone,
 Router,
 Layers,
 Sparkles,
 RotateCcw,
} from 'lucide-react';
import { Modal } from '../Modal';

interface DaysProfileProps {
 daysProfiles: DaysProfileType[];
 onAddDaysProfile: (profile: DaysProfileType) => void;
 onUpdateDaysProfile: (profile: DaysProfileType) => void;
 onDeleteDaysProfile: (id: number) => void;
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
 onHardReset?: () => void;
}

export const DaysProfilePage: React.FC<DaysProfileProps> = ({
 daysProfiles,
 onAddDaysProfile,
 onUpdateDaysProfile,
 onDeleteDaysProfile,
 showToast,
 onHardReset,
}) => {
 const [search, setSearch] = useState('');
 const [addModalOpen, setAddModalOpen] = useState(false);
 const [editProfile, setEditProfile] = useState<DaysProfileType | null>(null);
 const [deleteProfile, setDeleteProfile] = useState<DaysProfileType | null>(null);

 // Form states for Add
 const [name, setName] = useState('');
 const [days, setDays] = useState<number>(30);
 const [graceDays, setGraceDays] = useState<number>(0);
 const [deviceType, setDeviceType] = useState<'All' | 'Mobile' | 'Router'>('All');
 const [description, setDescription] = useState('');
 const [isDefault, setIsDefault] = useState(false);

 // Form states for Edit
 const [editName, setEditName] = useState('');
 const [editDays, setEditDays] = useState<number>(30);
 const [editGraceDays, setEditGraceDays] = useState<number>(0);
 const [editDeviceType, setEditDeviceType] = useState<'All' | 'Mobile' | 'Router'>('All');
 const [editDescription, setEditDescription] = useState('');
 const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
 const [editIsDefault, setEditIsDefault] = useState(false);

 // Test Calculator State
 const [testProfileId, setTestProfileId] = useState<number>(daysProfiles[0]?.id || 1);
 const [testStartDate, setTestStartDate] = useState<string>(
 new Date().toISOString().split('T')[0]
 );

 const filteredProfiles = daysProfiles.filter((p) =>
 (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
 String(p.days ?? '').includes(search) ||
 (p.description || '').toLowerCase().includes(search.toLowerCase())
 );

 const handleCreate = (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim()) {
 showToast('Profile name is required.', 'error');
 return;
 }
 if (days <= 0) {
 showToast('Days count must be at least 1.', 'error');
 return;
 }

 const newId = Math.max(...daysProfiles.map((d) => d.id), 0) + 1;
 const newProf: DaysProfileType = {
 id: newId,
 name: name.trim(),
 days: Number(days),
 graceDays: Number(graceDays) || 0,
 deviceType,
 status: 'active',
 description: description.trim() || `${days} Days validity profile`,
 isDefault,
 };

 onAddDaysProfile(newProf);
 showToast(`Days Profile "${newProf.name}" created!`, 'success');

 // Reset Form
 setName('');
 setDays(30);
 setGraceDays(0);
 setDeviceType('All');
 setDescription('');
 setIsDefault(false);
 setAddModalOpen(false);
 };

 const handleOpenEdit = (p: DaysProfileType) => {
 setEditProfile(p);
 setEditName(p.name);
 setEditDays(p.days);
 setEditGraceDays(p.graceDays);
 setEditDeviceType(p.deviceType);
 setEditDescription(p.description);
 setEditStatus(p.status);
 setEditIsDefault(Boolean(p.isDefault));
 };

 const handleSaveEdit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editProfile) return;
 if (!editName.trim()) {
 showToast('Profile name is required.', 'error');
 return;
 }

 const updated: DaysProfileType = {
 ...editProfile,
 name: editName.trim(),
 days: Number(editDays),
 graceDays: Number(editGraceDays) || 0,
 deviceType: editDeviceType,
 status: editStatus,
 description: editDescription.trim(),
 isDefault: editIsDefault,
 };

 onUpdateDaysProfile(updated);
 showToast(`Updated Days Profile "${updated.name}"!`, 'success');
 setEditProfile(null);
 };

 const handleDelete = (p: DaysProfileType) => {
 onDeleteDaysProfile(p.id);
 showToast(`Deleted Days Profile "${p.name}"`, 'success');
 setDeleteProfile(null);
 };

 // Calculate Expiry Date for Test Calculator
 const getCalculatedExpiry = () => {
 const selected = daysProfiles.find((dp) => dp.id === Number(testProfileId));
 if (!selected || !testStartDate) return 'N/A';
 const start = new Date(testStartDate);
 const totalDays = selected.days + (selected.graceDays || 0);
 start.setDate(start.getDate() + totalDays);
 return start.toISOString().split('T')[0];
 };

 return (
 <div className="space-y-6">
 {/* Page Header */}
 <div className="bg-gradient-to-r from-sky-600/10 via-indigo-600/10 to-teal-600/10 border border-sky-500/20 rounded p-5 sm:p-6 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
 <div className="space-y-1">
 <div className="flex items-center gap-2.5">
 <div className="p-2.5 bg-sky-500/20 text-sky-600 rounded border border-sky-500/30">
 <Calendar className="w-6 h-6" />
 </div>
 <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
 Days Profiles (মেয়াদের প্রোফাইল)
 </h2>
 </div>
 <p className="text-xs text-slate-900 max-w-2xl">
 ক্লাইন্ট আইডি তৈরি ও রিনিউ করার সময় কতদিন মেয়াদ (যেমন ১, ৭, ১৫, ৩০, ৯০ বা ৩৬৫ দিন) হবে তা সেভ করে রাখুন। ক্লাইন্ট যুক্ত করতে গেলে ১-ক্লিকেই অটোমেটিক এক্সপায়ারি ডেট হিসাব হয়ে যাবে!
 </p>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 {onHardReset && (
 <button
 type="button"
 onClick={() => {
 if (window.confirm('আপনি কি নিশ্চিত যে মেয়াদের সমস্ত প্রোফাইল ডাটা মুছে ফেলতে চান? (Hard Reset)')) {
 onHardReset();
 }
 }}
 className="px-3.5 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border border-rose-500/30 font-bold rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
 title="Clear all days profile data"
 >
 <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
 <span>Hard Reset (ডাটা রিসেট)</span>
 </button>
 )}

 <button
 onClick={() => setAddModalOpen(true)}
 className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
 >
 <Plus className="w-4 h-4" /> নতুন Days Profile খুলুন
 </button>
 </div>
 </div>

 {/* Expiry Calculator Preview Widget */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-4 sm:p-5 shadow-xs">
 <div className="flex items-center gap-2 text-xs font-bold text-sky-600 mb-3 uppercase tracking-wider">
 <Sparkles className="w-4 h-4" /> টেস্ট মেয়াদের ক্যালকুলেটর (Quick Validity Test)
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
 <div>
 <label className="block text-[11px] font-semibold text-slate-800 mb-1">
 Select Days Profile (প্রোফাইল নির্বাচন)
 </label>
 <select
 value={testProfileId}
 onChange={(e) => setTestProfileId(Number(e.target.value))}
 className="w-full px-3 py-2 rounded border border-slate-200 bg-white/60 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 {daysProfiles.map((p) => (
 <option key={p.id} value={p.id}>
 {p.name} ({p.days} দিন {p.graceDays > 0 ? `+${p.graceDays} গ্রেস` : ''})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-[11px] font-semibold text-slate-800 mb-1">
 Start Date (মেয়াদের শুরুর তারিখ)
 </label>
 <input
 type="date"
 value={testStartDate}
 onChange={(e) => setTestStartDate(e.target.value)}
 className="w-full px-3 py-2 rounded border border-slate-200 bg-white/60 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div className="p-3 bg-gradient-to-br from-sky-500/10 to-teal-500/10 border border-sky-500/20 rounded flex items-center justify-between">
 <div>
 <span className="text-[10px] text-slate-800 font-bold uppercase block">
 Calculated Expiry Date
 </span>
 <span className="text-sm font-extrabold font-mono text-sky-600 ">
 {getCalculatedExpiry()}
 </span>
 </div>
 <Clock className="w-5 h-5 text-teal-500" />
 </div>
 </div>
 </div>

 {/* Profile List Toolbar */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-800" />
 <input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search profiles..."
 className="w-full pl-9 pr-3 py-2 rounded border border-slate-200 bg-white/70 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 <div className="text-xs text-slate-800 font-medium">
 Total Profiles: <strong>{daysProfiles.length}</strong>
 </div>
 </div>

 {/* Profiles Cards Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredProfiles.map((p) => {
 return (
 <div
 key={p.id}
 className={`bg-white/70 backdrop-blur-md border rounded p-5 space-y-4 shadow-xs relative transition-all hover:shadow-md ${
 p.isDefault
 ? 'border-sky-500 ring-2 ring-sky-500/20'
 : 'border-slate-200/80 '
 }`}
 >
 {/* Default Badge */}
 {p.isDefault && (
 <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500 text-white flex items-center gap-1 shadow-xs">
 <Star className="w-3 h-3 fill-current" /> Default Profile
 </div>
 )}

 {/* Title & Duration */}
 <div>
 <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
 <Clock className="w-4 h-4 text-sky-500" /> {p.name}
 </h3>
 <p className="text-xs text-slate-800 mt-1 line-clamp-2">
 {p.description}
 </p>
 </div>

 {/* Specs Badge Pill */}
 <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
 <div className="p-2.5 rounded bg-slate-100/70 border border-slate-200/60 ">
 <span className="text-[10px] text-slate-800 block font-semibold">মেয়াদ (Duration)</span>
 <span className="font-extrabold text-slate-900 font-mono text-sm">
 {p.days} দিন
 </span>
 </div>

 <div className="p-2.5 rounded bg-slate-100/70 border border-slate-200/60 ">
 <span className="text-[10px] text-slate-800 block font-semibold">গ্রেস বোনাস</span>
 <span className="font-bold text-teal-600 font-mono text-xs">
 +{p.graceDays} দিন বোনাস
 </span>
 </div>
 </div>

 {/* Device Target & Status */}
 <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 ">
 <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 ">
 {p.deviceType === 'Mobile' ? (
 <>
 <Smartphone className="w-3.5 h-3.5 text-amber-500" /> মোবাইল
 </>
 ) : p.deviceType === 'Router' ? (
 <>
 <Router className="w-3.5 h-3.5 text-sky-500" /> রাউটার
 </>
 ) : (
 <>
 <Layers className="w-3.5 h-3.5 text-indigo-500" /> সব ডিভাইস
 </>
 )}
 </span>

 <span
 className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
 p.status === 'active'
 ? 'bg-teal-500/10 text-teal-600 '
 : 'bg-slate-200 text-slate-800'
 }`}
 >
 {p.status}
 </span>
 </div>

 {/* Actions Footer */}
 <div className="flex items-center justify-between pt-2 border-t border-slate-100 ">
 {!p.isDefault ? (
 <button
 onClick={() => {
 onUpdateDaysProfile({ ...p, isDefault: true });
 showToast(`Set "${p.name}" as default profile`, 'success');
 }}
 className="text-[11px] font-semibold text-sky-600 hover:underline cursor-pointer flex items-center gap-1"
 >
 <Check className="w-3.5 h-3.5" /> Make Default
 </button>
 ) : (
 <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
 <Check className="w-3.5 h-3.5" /> Active Default
 </span>
 )}

 <div className="flex items-center gap-1">
 <button
 onClick={() => handleOpenEdit(p)}
 className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-800 hover:text-amber-600 transition-colors cursor-pointer"
 title="Edit Profile"
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => setDeleteProfile(p)}
 className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-800 hover:text-rose-600 transition-colors cursor-pointer"
 title="Delete Profile"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* MODAL: ADD DAYS PROFILE */}
 <Modal
 isOpen={addModalOpen}
 title="নতুন Days Profile যুক্ত করুন"
 onClose={() => setAddModalOpen(false)}
 >
 <form onSubmit={handleCreate} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 প্রোফাইলের নাম (Profile Name) *
 </label>
 <input
 type="text"
 required
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="যেমন: ৩০ দিনের নিয়মিত মান্থলি, ৭ দিনের ট্রায়াল..."
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 মেয়াদের দিন সংখ্যা (Days) *
 </label>
 <input
 type="number"
 min={1}
 required
 value={days}
 onChange={(e) => setDays(Number(e.target.value))}
 placeholder="30"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 গ্রেস বোনাস দিন (Grace Days)
 </label>
 <input
 type="number"
 min={0}
 value={graceDays}
 onChange={(e) => setGraceDays(Number(e.target.value))}
 placeholder="0"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 ডিভাইসের টাইপ পছন্দ (Device Target)
 </label>
 <select
 value={deviceType}
 onChange={(e) => setDeviceType(e.target.value as 'All' | 'Mobile' | 'Router')}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="All">সব ডিভাইস (All Access)</option>
 <option value="Mobile">শুধুমাত্র মোবাইল (Mobile Access)</option>
 <option value="Router">শুধুমাত্র রাউটার (Router Access)</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 বিবরণ (Description)
 </label>
 <textarea
 rows={2}
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="যেমন: ১ মাসের স্ট্যান্ডার্ড ব্রডব্যান্ড কানেকশন..."
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] resize-none"
 />
 </div>

 <div className="flex items-center gap-2 pt-1">
 <input
 type="checkbox"
 id="chkDefault"
 checked={isDefault}
 onChange={(e) => setIsDefault(e.target.checked)}
 className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
 />
 <label htmlFor="chkDefault" className="text-xs font-semibold text-slate-700 cursor-pointer">
 ডিফল্ট মেয়াদের প্রোফাইল হিসেবে সেট করুন (Set as Default)
 </label>
 </div>

 <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/80 ">
 <button
 type="button"
 onClick={() => setAddModalOpen(false)}
 className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
 >
 বাতিল
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
 >
 সেভ করুন
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: EDIT DAYS PROFILE */}
 <Modal
 isOpen={Boolean(editProfile)}
 title={editProfile ? `Edit Profile: ${editProfile.name}` : ''}
 onClose={() => setEditProfile(null)}
 >
 <form onSubmit={handleSaveEdit} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 প্রোফাইলের নাম *
 </label>
 <input
 type="text"
 required
 value={editName}
 onChange={(e) => setEditName(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 মেয়াদের দিন সংখ্যা (Days) *
 </label>
 <input
 type="number"
 min={1}
 required
 value={editDays}
 onChange={(e) => setEditDays(Number(e.target.value))}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 গ্রেস বোনাস দিন
 </label>
 <input
 type="number"
 min={0}
 value={editGraceDays}
 onChange={(e) => setEditGraceDays(Number(e.target.value))}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 ডিভাইসের টাইপ
 </label>
 <select
 value={editDeviceType}
 onChange={(e) => setEditDeviceType(e.target.value as 'All' | 'Mobile' | 'Router')}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="All">সব ডিভাইস</option>
 <option value="Mobile">মোবাইল</option>
 <option value="Router">রাউটার</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 স্ট্যাটাস
 </label>
 <select
 value={editStatus}
 onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 >
 <option value="active">Active</option>
 <option value="inactive">Inactive</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 বিবরণ (Description)
 </label>
 <textarea
 rows={2}
 value={editDescription}
 onChange={(e) => setEditDescription(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc] resize-none"
 />
 </div>

 <div className="flex items-center gap-2 pt-1">
 <input
 type="checkbox"
 id="chkEditDefault"
 checked={editIsDefault}
 onChange={(e) => setEditIsDefault(e.target.checked)}
 className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
 />
 <label htmlFor="chkEditDefault" className="text-xs font-semibold text-slate-700 cursor-pointer">
 ডিফল্ট মেয়াদের প্রোফাইল হিসেবে সেট করুন
 </label>
 </div>

 <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/80 ">
 <button
 type="button"
 onClick={() => setEditProfile(null)}
 className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
 >
 বাতিল
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
 >
 পরিবর্তন সেভ করুন
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: DELETE CONFIRMATION */}
 <Modal
 isOpen={Boolean(deleteProfile)}
 title="প্রোফাইল মুছুন"
 onClose={() => setDeleteProfile(null)}
 maxWidth="max-w-sm"
 >
 {deleteProfile && (
 <div className="space-y-4 text-center">
 <p className="text-xs text-slate-900 ">
 আপনি কি নিশ্চিত যে <strong className="text-slate-900 ">{deleteProfile.name}</strong> মুছতে চান?
 </p>

 <div className="flex justify-center gap-2 pt-2">
 <button
 onClick={() => setDeleteProfile(null)}
 className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
 >
 বাতিল
 </button>
 <button
 onClick={() => handleDelete(deleteProfile)}
 className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
 >
 হ্যাঁ, মুছে ফেলুন
 </button>
 </div>
 </div>
 )}
 </Modal>
 </div>
 );
};
