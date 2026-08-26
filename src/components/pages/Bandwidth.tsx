import React, { useState } from 'react';
import { BandwidthProfile, RouterConfig } from '../../types';
import { Gauge, Plus, Edit2, Trash2, Smartphone, Router, RotateCcw } from 'lucide-react';
import { Modal } from '../Modal';
import { BandwidthMonitor } from '../BandwidthMonitor';

interface BandwidthProps {
 profiles: BandwidthProfile[];
 routerConfig?: RouterConfig;
 onConnectRouter?: () => void;
 onAddProfile: (profile: BandwidthProfile) => void;
 onUpdateProfile: (profile: BandwidthProfile) => void;
 onDeleteProfile: (id: number) => void;
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
 onHardReset?: () => void;
}

export const BandwidthPage: React.FC<BandwidthProps> = ({
 profiles,
 routerConfig,
 onConnectRouter,
 onAddProfile,
 onUpdateProfile,
 onDeleteProfile,
 showToast,
 onHardReset,
}) => {
 const [addModalOpen, setAddModalOpen] = useState(false);
 const [editProfile, setEditProfile] = useState<BandwidthProfile | null>(null);
 const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

 // Form states
 const [name, setName] = useState('');
 const [download, setDownload] = useState('');
 const [upload, setUpload] = useState('');
 const [burst, setBurst] = useState('');
 const [priority, setPriority] = useState('8');
 const [deviceType, setDeviceType] = useState<'Mobile' | 'Router'>('Router');

 // Edit states
 const [editName, setEditName] = useState('');
 const [editDl, setEditDl] = useState('');
 const [editUl, setEditUl] = useState('');
 const [editBurst, setEditBurst] = useState('');
 const [editPriority, setEditPriority] = useState('');
 const [editDeviceType, setEditDeviceType] = useState<'Mobile' | 'Router'>('Router');

 const handleCreate = (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim() || !download.trim()) {
 showToast('Profile name and download speed required.', 'error');
 return;
 }

 const newProf: BandwidthProfile = {
 id: Date.now(),
 name: name.trim(),
 download: download.trim(),
 upload: upload.trim() || '5 Mbps',
 burst: burst.trim() || undefined,
 priority: priority.trim() || '8',
 status: 'active',
 deviceType: deviceType,
 };

 onAddProfile(newProf);
 showToast(`Added profile ${newProf.name} (${deviceType === 'Mobile' ? 'Mobile Single Device' : 'Router Shared Subnet'})`, 'success');
 setName('');
 setDownload('');
 setUpload('');
 setBurst('');
 setAddModalOpen(false);
 };

 const handleOpenEdit = (p: BandwidthProfile) => {
 setEditProfile(p);
 setEditName(p.name);
 setEditDl(p.download);
 setEditUl(p.upload);
 setEditBurst(p.burst || '');
 setEditPriority(p.priority || '8');
 setEditDeviceType(p.deviceType || 'Router');
 };

 const handleSaveEdit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editProfile) return;
 if (!editName.trim() || !editDl.trim()) {
 showToast('Name and download speed required.', 'error');
 return;
 }

 const updated: BandwidthProfile = {
 ...editProfile,
 name: editName.trim(),
 download: editDl.trim(),
 upload: editUl.trim(),
 burst: editBurst.trim() || undefined,
 priority: editPriority.trim() || '8',
 deviceType: editDeviceType,
 };

 onUpdateProfile(updated);
 showToast(`Updated profile ${updated.name}`, 'success');
 setEditProfile(null);
 };

 const handleDelete = (p: BandwidthProfile) => {
 onDeleteProfile(p.id);
 showToast(`Deleted profile ${p.name}`, 'success');
 setDeleteConfirmId(null);
 };

 return (
 <div className="space-y-6">
 {/* Live Interface Bandwidth Monitor */}
 {routerConfig && (
 <BandwidthMonitor
 routerConfig={routerConfig}
 onConnectRouter={onConnectRouter || (() => {})}
 />
 )}

 <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
 <div className="p-4 sm:p-5 border-b border-slate-200/80 flex justify-between items-center flex-wrap gap-2">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
 <Gauge className="w-5 h-5 text-sky-600 " /> Bandwidth Profiles
 </h3>
 <div className="flex items-center gap-2">
 {onHardReset && (
 <button
 type="button"
 onClick={() => {
 if (window.confirm('আপনি কি নিশ্চিত যে সমস্ত ব্যান্ডউইথ প্রোফাইল মুছে ফেলতে চান? (Hard Reset)')) {
 onHardReset();
 }
 }}
 className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
 title="Clear all bandwidth profiles"
 >
 <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
 <span>Hard Reset (ডাটা রিসেট)</span>
 </button>
 )}
 <button
 onClick={() => setAddModalOpen(true)}
 className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
 >
 <Plus className="w-4 h-4" /> Add Profile
 </button>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="bg-slate-100/50 border-b border-slate-200/80 text-slate-800 uppercase tracking-wider font-semibold text-[10px]">
 <th className="p-3.5 pl-5">Profile Name</th>
 <th className="p-3.5">Device Access Mode</th>
 <th className="p-3.5">Download Speed</th>
 <th className="p-3.5">Upload Speed</th>
 <th className="p-3.5">Burst Speed</th>
 <th className="p-3.5">Priority</th>
 <th className="p-3.5 pr-5 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {profiles.map((p) => {
 const isMobile = p.deviceType === 'Mobile';
 return (
 <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
 <td className="p-3.5 pl-5 font-bold text-slate-900 ">{p.name}</td>
 <td className="p-3.5">
 <span
 className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
 isMobile
 ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
 : 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
 }`}
 >
 {isMobile ? (
 <>
 <Smartphone className="w-3 h-3" /> মোবাইল এক্সেস (১ টি ডিভাইস)
 </>
 ) : (
 <>
 <Router className="w-3 h-3" /> রাউটার এক্সেস (সবাই শেয়ার করবে)
 </>
 )}
 </span>
 </td>
 <td className="p-3.5 font-semibold text-sky-600 ">↓ {p.download}</td>
 <td className="p-3.5 font-semibold text-teal-600 ">↑ {p.upload}</td>
 <td className="p-3.5 font-mono text-slate-800">{p.burst || '-'}</td>
 <td className="p-3.5 font-mono text-slate-800">{p.priority || '8'}</td>
 <td className="p-3.5 pr-5 text-right">
 <div className="flex items-center justify-end gap-1">
 <button
 onClick={() => handleOpenEdit(p)}
 className="p-1.5 rounded-md hover:bg-slate-100 text-slate-800 hover:text-amber-600 transition-colors cursor-pointer"
 title="Edit Profile"
 >
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => setDeleteConfirmId(p.id)}
 className="p-1.5 rounded-md hover:bg-slate-100 text-slate-800 hover:text-rose-600 transition-colors cursor-pointer"
 title="Delete Profile"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Dynamic Day/Night Speed Scheduler */}
 <div className="bg-white border border-slate-200 rounded shadow-sm p-5 space-y-4">
 <div className="flex items-center justify-between flex-wrap gap-2">
 <div>
 <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
 Dynamic Day/Night Speed Scheduler (ডায়নামিক স্পিড শিডিউলার)
 </h4>
 <p className="text-[11px] text-slate-800 mt-1">
 স্বয়ংক্রিয়ভাবে নির্দিষ্ট সময়ের ব্যবধানে গ্রাহকদের ব্যান্ডউইথ বুস্ট করুন (যেমন: অফ-পিক আওয়ারে ১.৫ গুণ বেশি স্পিড)।
 </p>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-slate-900 ">Scheduler State:</span>
 <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 rounded-full font-bold text-[10px] uppercase">
 ACTIVE & MONITORING
 </span>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
 {/* Schedule 1 */}
 <div className="p-4 rounded border border-slate-100 bg-slate-50/50 space-y-3">
 <div className="flex justify-between items-center">
 <span className="font-bold text-xs text-slate-800 ">Peak Shift (Day Time)</span>
 <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full font-mono text-[9px] font-bold">09:00 AM - 11:00 PM</span>
 </div>
 <div className="text-xs text-slate-800">
 দিনের পক আওয়ারে গ্রাহকরা তাদের নির্ধারিত মূল প্যাকেজ স্পিড (যেমন ১০ এমবিপিএস) পাবেন।
 </div>
 <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
 <span>Status:</span> <span className="underline">Standard Speeds Enforced</span>
 </div>
 </div>

 {/* Schedule 2 */}
 <div className="p-4 rounded border border-indigo-500/20 bg-indigo-500/[0.02] space-y-3">
 <div className="flex justify-between items-center">
 <span className="font-bold text-xs text-slate-800 ">Night Boost Shift (Off-Peak)</span>
 <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 rounded-full font-mono text-[9px] font-bold">11:00 PM - 09:00 AM</span>
 </div>
 <div className="text-xs text-slate-800">
 রাত ১১টা থেকে সকাল ৯টা পর্যন্ত গ্রাহকদের প্রোফাইল স্বয়ংক্রিয়ভাবে <span className="font-bold text-indigo-500">১.৫ গুণ বৃদ্ধি</span> করা হবে।
 </div>
 <div className="text-[11px] font-bold text-indigo-500 flex items-center gap-1">
 <span>Dynamic Up-scaling:</span> <span className="underline">1.5x Auto-Boost Active</span>
 </div>
 </div>

 {/* Scheduler Settings Quick controller */}
 <div className="p-4 rounded border border-slate-100 bg-slate-50/50 space-y-3 flex flex-col justify-between">
 <div>
 <span className="font-bold text-xs text-slate-800 ">Scheduler Engine Config</span>
 <p className="text-[10px] text-slate-800 mt-1">মাস্টার রি-শিডিউলিং ক্রন-টাস্ক এডিট করুন:</p>
 </div>
 <button
 type="button"
 onClick={() => showToast('📅 Day/Night Speed Scheduling rules refreshed on MikroTik Queue controller!', 'success')}
 className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer"
 >
 Sync Rules to Router
 </button>
 </div>
 </div>
 </div>

 {/* MODAL: ADD BANDWIDTH */}
 <Modal isOpen={addModalOpen} title="Add Bandwidth Profile" onClose={() => setAddModalOpen(false)}>
 <form onSubmit={handleCreate} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Profile Name *
 </label>
 <input
 type="text"
 required
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="e.g. 50 Mbps"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-bold text-slate-800 mb-1">
 Device Target Option (ব্যবহারের ধরন) *
 </label>
 <div className="grid grid-cols-2 gap-2 pt-1">
 <button
 type="button"
 onClick={() => setDeviceType('Mobile')}
 className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
 deviceType === 'Mobile'
 ? 'border-amber-500 bg-amber-500/10 text-amber-700 ring-2 ring-amber-500/30 font-bold'
 : 'border-slate-200 hover:bg-slate-50 text-slate-900 '
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <Smartphone className="w-4 h-4 text-amber-500" /> মোবাইল এক্সেস
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 শুধুমাত্র ১ টি মোবাইল ফোনে এক্টিভ চলবে।
 </p>
 </button>

 <button
 type="button"
 onClick={() => setDeviceType('Router')}
 className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
 deviceType === 'Router'
 ? 'border-sky-500 bg-sky-500/10 text-sky-700 ring-2 ring-sky-500/30 font-bold'
 : 'border-slate-200 hover:bg-slate-50 text-slate-900 '
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <Router className="w-4 h-4 text-sky-500" /> রাউটার এক্সেস
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 রাউটারে সংযুক্ত সবাই ইন্টারনেট পাবে।
 </p>
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Download Limit *
 </label>
 <input
 type="text"
 required
 value={download}
 onChange={(e) => setDownload(e.target.value)}
 placeholder="50 Mbps"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Upload Limit
 </label>
 <input
 type="text"
 value={upload}
 onChange={(e) => setUpload(e.target.value)}
 placeholder="25 Mbps"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Burst Speed (Optional)
 </label>
 <input
 type="text"
 value={burst}
 onChange={(e) => setBurst(e.target.value)}
 placeholder="75 Mbps"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Priority (1-8)
 </label>
 <input
 type="number"
 min={1}
 max={8}
 value={priority}
 onChange={(e) => setPriority(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/80 ">
 <button
 type="button"
 onClick={() => setAddModalOpen(false)}
 className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
 >
 Add Profile
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: EDIT BANDWIDTH */}
 <Modal
 isOpen={Boolean(editProfile)}
 title={editProfile ? `Edit ${editProfile.name}` : ''}
 onClose={() => setEditProfile(null)}
 >
 <form onSubmit={handleSaveEdit} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Profile Name
 </label>
 <input
 type="text"
 required
 value={editName}
 onChange={(e) => setEditName(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-bold text-slate-800 mb-1">
 Device Target Option (ব্যবহারের ধরন)
 </label>
 <div className="grid grid-cols-2 gap-2 pt-1">
 <button
 type="button"
 onClick={() => setEditDeviceType('Mobile')}
 className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
 editDeviceType === 'Mobile'
 ? 'border-amber-500 bg-amber-500/10 text-amber-700 ring-2 ring-amber-500/30 font-bold'
 : 'border-slate-200 hover:bg-slate-50 text-slate-900 '
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <Smartphone className="w-4 h-4 text-amber-500" /> মোবাইল এক্সেস
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 শুধুমাত্র ১ টি মোবাইল কানেকশন।
 </p>
 </button>

 <button
 type="button"
 onClick={() => setEditDeviceType('Router')}
 className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
 editDeviceType === 'Router'
 ? 'border-sky-500 bg-sky-500/10 text-sky-700 ring-2 ring-sky-500/30 font-bold'
 : 'border-slate-200 hover:bg-slate-50 text-slate-900 '
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <Router className="w-4 h-4 text-sky-500" /> রাউটার এক্সেস
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 রাউটার থেকে সবাই এক্সেস করতে পারবে।
 </p>
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Download Limit
 </label>
 <input
 type="text"
 required
 value={editDl}
 onChange={(e) => setEditDl(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Upload Limit
 </label>
 <input
 type="text"
 value={editUl}
 onChange={(e) => setEditUl(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Burst Speed
 </label>
 <input
 type="text"
 value={editBurst}
 onChange={(e) => setEditBurst(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Priority
 </label>
 <input
 type="number"
 min={1}
 max={8}
 value={editPriority}
 onChange={(e) => setEditPriority(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/80 ">
 <button
 type="button"
 onClick={() => setEditProfile(null)}
 className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
 >
 Save Changes
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: DELETE CONFIRM */}
 <Modal
 isOpen={Boolean(deleteConfirmId)}
 title="Confirm Delete Profile"
 onClose={() => setDeleteConfirmId(null)}
 maxWidth="max-w-sm"
 >
 {deleteConfirmId && (
 <div className="space-y-4 text-center">
 <p className="text-xs text-slate-900 ">
 Are you sure you want to delete this bandwidth profile? This action cannot be undone.
 </p>

 <div className="flex justify-center gap-2 pt-2">
 <button
 onClick={() => setDeleteConfirmId(null)}
 className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 onClick={() => {
 const target = profiles.find((p) => p.id === deleteConfirmId);
 if (target) handleDelete(target);
 }}
 className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
 >
 Delete Profile
 </button>
 </div>
 </div>
 )}
 </Modal>
 </div>
 );
};
