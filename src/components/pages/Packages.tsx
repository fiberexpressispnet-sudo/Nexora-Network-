import React, { useState } from 'react';
import { Package, DaysProfile } from '../../types';
import { Tags, Plus, Wifi, Edit2, Pause, Play, Trash2, Smartphone, Router, Zap, RotateCcw } from 'lucide-react';
import { Modal } from '../Modal';

interface PackagesProps {
 packages: Package[];
 daysProfiles?: DaysProfile[];
 onAddPackage: (pkg: Package) => void;
 onUpdatePackage: (pkg: Package) => void;
 onDeletePackage: (id: number) => void;
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
 onHardReset?: () => void;
}

export const PackagesPage: React.FC<PackagesProps> = ({
 packages,
 daysProfiles = [],
 onAddPackage,
 onUpdatePackage,
 onDeletePackage,
 showToast,
 onHardReset,
}) => {
 const [addModalOpen, setAddModalOpen] = useState(false);
 const [editPkg, setEditPkg] = useState<Package | null>(null);
 const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

 // Add form states
 const [newName, setNewName] = useState('');
 const [newPrice, setNewPrice] = useState('');
 const [newValidity, setNewValidity] = useState('30 Days');
 const [newSpeed, setNewSpeed] = useState('20 Mbps');
 const [newUpload, setNewUpload] = useState('10 Mbps');
 const [newDesc, setNewDesc] = useState('');
 const [newDeviceType, setNewDeviceType] = useState<'Mobile' | 'Router'>('Router');

 // Edit form states
 const [editName, setEditName] = useState('');
 const [editPrice, setEditPrice] = useState('');
 const [editValidity, setEditValidity] = useState('');
 const [editSpeed, setEditSpeed] = useState('');
 const [editUpload, setEditUpload] = useState('');
 const [editDesc, setEditDesc] = useState('');
 const [editDeviceType, setEditDeviceType] = useState<'Mobile' | 'Router'>('Router');

 const handleCreate = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newName.trim() || !newPrice.trim()) {
 showToast('Package name and price are required.', 'error');
 return;
 }

 const pkg: Package = {
 id: Date.now(),
 name: newName.trim(),
 price: newPrice.trim(),
 validity: newValidity.trim() || '30 Days',
 speed: newSpeed.trim() || '20 Mbps',
 upload: newUpload.trim() || '10 Mbps',
 installFee: '500',
 renewal: newPrice.trim(),
 description: newDesc.trim() || 'High Speed Internet',
 status: 'active',
 deviceType: newDeviceType,
 };

 onAddPackage(pkg);
 showToast(`Package ${pkg.name} created! Live-synced to Hotspot Login Page & Packages list.`, 'success');
 setNewName('');
 setNewPrice('');
 setNewDesc('');
 setAddModalOpen(false);
 };

 const handleOpenEdit = (p: Package) => {
 setEditPkg(p);
 setEditName(p.name);
 setEditPrice(p.price);
 setEditValidity(p.validity);
 setEditSpeed(p.speed);
 setEditUpload(p.upload);
 setEditDesc(p.description);
 setEditDeviceType(p.deviceType || 'Router');
 };

 const handleSaveEdit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editPkg) return;
 if (!editName.trim() || !editPrice.trim()) {
 showToast('Name and price required.', 'error');
 return;
 }

 const updated: Package = {
 ...editPkg,
 name: editName.trim(),
 price: editPrice.trim(),
 validity: editValidity.trim(),
 speed: editSpeed.trim(),
 upload: editUpload.trim(),
 description: editDesc.trim(),
 deviceType: editDeviceType,
 };

 onUpdatePackage(updated);
 showToast(`Updated package ${updated.name}! Live-synced to Hotspot Login Page.`, 'success');
 setEditPkg(null);
 };

 const handleToggleStatus = (p: Package) => {
 const updated: Package = {
 ...p,
 status: p.status === 'active' ? 'inactive' : 'active',
 };
 onUpdatePackage(updated);
 showToast(`${p.name} ${updated.status === 'active' ? 'activated' : 'deactivated'}`, 'info');
 };

 const handleDelete = (p: Package) => {
 onDeletePackage(p.id);
 showToast(`Deleted package ${p.name}`, 'success');
 setDeleteConfirmId(null);
 };

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center flex-wrap gap-3">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
 <Tags className="w-5 h-5 text-sky-600 " /> Broadband Packages
 </h3>
 <div className="flex items-center gap-2">
 {onHardReset && (
 <button
 type="button"
 onClick={() => {
 if (window.confirm('আপনি কি নিশ্চিত যে সমস্ত প্যাকেজ লিস্ট মুছে ফেলতে চান? (Hard Reset)')) {
 onHardReset();
 }
 }}
 className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
 title="Clear all package data"
 >
 <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
 <span>Hard Reset (ডাটা রিসেট)</span>
 </button>
 )}
 <button
 onClick={() => setAddModalOpen(true)}
 className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
 >
 <Plus className="w-4 h-4" /> New Package
 </button>
 </div>
 </div>

  {/* Summary Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
      <div className="p-3 bg-indigo-500 text-white rounded-xl">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <div>
        <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Total Packages</p>
        <p className="text-lg font-black text-slate-900">{packages.length}</p>
      </div>
    </div>

    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
      <div className="p-3 bg-emerald-500 text-white rounded-xl">
        <span className="text-xl font-bold">৳</span>
      </div>
      <div>
        <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Starting From</p>
        <p className="text-lg font-black text-slate-900">৳500</p>
      </div>
    </div>

    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
      <div className="p-3 bg-amber-500 text-white rounded-xl">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      <div>
        <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Highest Plan</p>
        <p className="text-lg font-black text-slate-900">৳3,675</p>
      </div>
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {packages.map((p, idx) => {
      const isMobile = p.deviceType === 'Mobile';
      const numericSpeed = p.speed.replace(/\D/g, '');
      
      const colorGradients = [
        // 1. Purple
        { bg: 'from-purple-600 via-indigo-600 to-violet-800' },
        // 2. Blue
        { bg: 'from-blue-600 via-blue-700 to-indigo-800' },
        // 3. Cyan
        { bg: 'from-cyan-500 via-teal-600 to-sky-700' },
        // 4. Green
        { bg: 'from-emerald-500 via-teal-600 to-green-700' },
        // 5. Pink
        { bg: 'from-pink-500 via-rose-500 to-purple-700' },
        // 6. Orange
        { bg: 'from-orange-500 via-amber-600 to-red-600' },
        // 7. Red
        { bg: 'from-red-600 via-rose-600 to-red-800' }
      ];
      
      const theme = colorGradients[idx % colorGradients.length];

      return (
        <div
          key={p.id}
          className={`flex flex-col rounded-[28px] overflow-hidden transition-all duration-300 bg-gradient-to-br ${theme.bg} shadow-lg hover:shadow-2xl hover:scale-[1.02] text-white border-0 relative p-6 space-y-4 text-center justify-between min-h-[460px]`}
        >
          {/* Badge & Type Section */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
              <Wifi className="w-3 h-3 animate-pulse text-white" />
              <span>Hotspot Plan</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20">
              {p.status}
            </span>
          </div>

          {/* Speed Indicator */}
          <div className="flex flex-col items-center py-1">
            <span className="text-5xl font-black tracking-tight drop-shadow-md leading-none">{numericSpeed || '0'}</span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-90 mt-1">Mbps Speed</span>
          </div>

          {/* Title & Validity */}
          <div className="space-y-1">
            <h3 className="text-sm font-black tracking-tight leading-snug uppercase max-w-[280px] mx-auto text-white">
              {p.name.replace(/\s*\(Monthly Pac\)\s*/i, '')}
            </h3>
            <p className="text-[10px] font-bold text-white/90 uppercase tracking-widest">
              📅 {p.validity} Unlimited Access
            </p>
          </div>

          {/* Features list */}
          <div className="bg-white/10 rounded-2xl p-4 text-center space-y-1.5 backdrop-blur-xs border border-white/10">
            <div className="text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
              <span>Shared Bandwidth (1:8)</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
              <span>Single Device Lock</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
              <span>Optical Fiber Powered</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
              <span>24/7 Priority Support</span>
            </div>
          </div>

          {/* Mobile vs Router Device Type indicator */}
          <div className="inline-block mx-auto px-3 py-1 bg-white/15 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-white/10">
            {isMobile ? '📱 Mobile Hotspot' : '📶 Router Hotspot'}
          </div>

          {/* Price Tag */}
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black drop-shadow-sm">৳{p.price}</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-80 mt-0.5">Renew: ৳{p.renewal || p.price}</span>
          </div>

          {/* Administrative Frosted Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
            <button
              onClick={() => handleOpenEdit(p)}
              className="px-2 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer backdrop-blur-xs"
              title="Edit Package"
            >
              <Edit2 className="w-3 h-3 text-white" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => handleToggleStatus(p)}
              className="px-2 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer backdrop-blur-xs"
              title={p.status === 'active' ? 'Deactivate' : 'Activate'}
            >
              {p.status === 'active' ? (
                <Pause className="w-3 h-3 text-amber-200" />
              ) : (
                <Play className="w-3 h-3 text-teal-200" />
              )}
              <span>{p.status === 'active' ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={() => setDeleteConfirmId(p.id)}
              className="px-2 py-2 rounded-xl bg-rose-500/30 hover:bg-rose-500/40 border border-rose-500/40 text-white text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer backdrop-blur-xs"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
              <span>Del</span>
            </button>
          </div>
        </div>
      );
    })}
  </div>

  
 {/* MODAL: ADD PACKAGE */}
 <Modal isOpen={addModalOpen} title="Create Package" onClose={() => setAddModalOpen(false)}>
 <form onSubmit={handleCreate} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Package Name *
 </label>
 <input
 type="text"
 required
 value={newName}
 onChange={(e) => setNewName(e.target.value)}
 placeholder="e.g. Fiber 50"
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
 onClick={() => setNewDeviceType('Mobile')}
 className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
 newDeviceType === 'Mobile'
 ? 'border-amber-500 bg-amber-500/10 text-amber-700 ring-2 ring-amber-500/30 font-bold'
 : 'border-slate-200 hover:bg-slate-50 text-slate-900 '
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <Smartphone className="w-4 h-4 text-amber-500" /> মোবাইল প্যাকেজ
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 মোবাইলে ব্যবহারের জন্য (১ টি ডিভাইস)।
 </p>
 </button>

 <button
 type="button"
 onClick={() => setNewDeviceType('Router')}
 className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
 newDeviceType === 'Router'
 ? 'border-sky-500 bg-sky-500/10 text-sky-700 ring-2 ring-sky-500/30 font-bold'
 : 'border-slate-200 hover:bg-slate-50 text-slate-900 '
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <Router className="w-4 h-4 text-sky-500" /> রাউটার প্যাকেজ
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 রাউটার কানেকশনের জন্য (শেয়ারড সাবনেট)।
 </p>
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Price (BDT) *
 </label>
 <input
 type="number"
 required
 value={newPrice}
 onChange={(e) => setNewPrice(e.target.value)}
 placeholder="1500"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Validity / Duration (মেয়াদ)
 </label>
 <div className="flex flex-wrap gap-1 mb-1.5">
 <button
 type="button"
 onClick={() => setNewValidity('24 Hours')}
 className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 border border-amber-500/30 text-[10px] font-bold transition-colors cursor-pointer"
 >
 ⚡ ২৪ ঘন্টা (24 Hours)
 </button>
 <button
 type="button"
 onClick={() => setNewValidity('30 Days')}
 className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer"
 >
 📅 ৩০ দিন (30 Days)
 </button>
 {daysProfiles.length > 0 && daysProfiles.map((dp) => (
 <button
 key={dp.id}
 type="button"
 onClick={() => setNewValidity(`${dp.days} Days`)}
 className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 border border-sky-500/20 text-[10px] font-semibold transition-colors cursor-pointer"
 >
 {dp.name} ({dp.days}D)
 </button>
 ))}
 </div>
 <input
 type="text"
 value={newValidity}
 onChange={(e) => setNewValidity(e.target.value)}
 placeholder="30 Days"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Download Speed
 </label>
 <input
 type="text"
 value={newSpeed}
 onChange={(e) => setNewSpeed(e.target.value)}
 placeholder="50 Mbps"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Upload Speed
 </label>
 <input
 type="text"
 value={newUpload}
 onChange={(e) => setNewUpload(e.target.value)}
 placeholder="25 Mbps"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Description
 </label>
 <input
 type="text"
 value={newDesc}
 onChange={(e) => setNewDesc(e.target.value)}
 placeholder="Package feature details..."
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
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
 Create Package
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: EDIT PACKAGE */}
 <Modal
 isOpen={Boolean(editPkg)}
 title={editPkg ? `Edit ${editPkg.name}` : ''}
 onClose={() => setEditPkg(null)}
 >
 <form onSubmit={handleSaveEdit} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Package Name
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
 <Smartphone className="w-4 h-4 text-amber-500" /> মোবাইল প্যাকেজ
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 ১ টি মোবাইল ডিভাইস।
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
 <Router className="w-4 h-4 text-sky-500" /> রাউটার প্যাকেজ
 </div>
 <p className="text-[10px] text-slate-800 mt-1 font-normal">
 রাউটার ব্রডব্যান্ড (শেয়ারড)।
 </p>
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Price (BDT)
 </label>
 <input
 type="number"
 required
 value={editPrice}
 onChange={(e) => setEditPrice(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Validity / Duration (মেয়াদ)
 </label>
 <div className="flex flex-wrap gap-1 mb-1.5">
 <button
 type="button"
 onClick={() => setEditValidity('24 Hours')}
 className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 border border-amber-500/30 text-[10px] font-bold transition-colors cursor-pointer"
 >
 ⚡ ২৪ ঘন্টা (24 Hours)
 </button>
 <button
 type="button"
 onClick={() => setEditValidity('30 Days')}
 className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer"
 >
 📅 ৩০ দিন (30 Days)
 </button>
 {daysProfiles.length > 0 && daysProfiles.map((dp) => (
 <button
 key={dp.id}
 type="button"
 onClick={() => setEditValidity(`${dp.days} Days`)}
 className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 border border-sky-500/20 text-[10px] font-semibold transition-colors cursor-pointer"
 >
 {dp.name} ({dp.days}D)
 </button>
 ))}
 </div>
 <input
 type="text"
 value={editValidity}
 onChange={(e) => setEditValidity(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Download Speed
 </label>
 <input
 type="text"
 value={editSpeed}
 onChange={(e) => setEditSpeed(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Upload Speed
 </label>
 <input
 type="text"
 value={editUpload}
 onChange={(e) => setEditUpload(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Description
 </label>
 <input
 type="text"
 value={editDesc}
 onChange={(e) => setEditDesc(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/80 ">
 <button
 type="button"
 onClick={() => setEditPkg(null)}
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
 title="Confirm Delete Package"
 onClose={() => setDeleteConfirmId(null)}
 maxWidth="max-w-sm"
 >
 {deleteConfirmId && (
 <div className="space-y-4 text-center">
 <p className="text-xs text-slate-900 ">
 Are you sure you want to delete this broadband package? This action cannot be undone.
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
 const target = packages.find((p) => p.id === deleteConfirmId);
 if (target) handleDelete(target);
 }}
 className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
 >
 Delete Package
 </button>
 </div>
 </div>
 )}
 </Modal>
 </div>
 );
};
