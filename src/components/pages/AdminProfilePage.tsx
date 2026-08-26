import React, { useState, useEffect } from 'react';
import {
 User,
 Shield,
 Smartphone,
 Key,
 Mail,
 Phone,
 Lock,
 CheckCircle2,
 Clock,
 Laptop,
 Globe,
 Camera,
 Save,
 MapPin,
} from 'lucide-react';

interface AdminProfilePageProps {
 adminProfile: {
  name: string;
  role: string;
  email: string;
  phone: string;
  address: string;
  avatar: string | null;
  twoFactor: boolean;
  timezone: string;
 };
 onSaveAdminProfile: (profile: any) => void;
 showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export const AdminProfilePage: React.FC<AdminProfilePageProps> = ({
 adminProfile,
 onSaveAdminProfile,
 showToast,
 }) => {
 const [profile, setProfile] = useState(() => ({
  name: adminProfile?.name || 'Md. Al-Amin (System Admin)',
  role: adminProfile?.role || 'Super Administrator / NOC Lead',
  email: adminProfile?.email || 'admin@nexoranetwork.net',
  phone: adminProfile?.phone || '+880 1711-223344',
  address: adminProfile?.address || 'Dhaka, Bangladesh',
  avatar: adminProfile?.avatar || null,
  twoFactor: adminProfile?.twoFactor !== undefined ? adminProfile.twoFactor : true,
  timezone: adminProfile?.timezone || 'Asia/Dhaka (GMT+6)',
 }));

 useEffect(() => {
  if (adminProfile) {
   setProfile({
    name: adminProfile.name || 'Md. Al-Amin (System Admin)',
    role: adminProfile.role || 'Super Administrator / NOC Lead',
    email: adminProfile.email || 'admin@nexoranetwork.net',
    phone: adminProfile.phone || '+880 1711-223344',
    address: adminProfile.address || 'Dhaka, Bangladesh',
    avatar: adminProfile.avatar || null,
    twoFactor: adminProfile.twoFactor !== undefined ? adminProfile.twoFactor : true,
    timezone: adminProfile.timezone || 'Asia/Dhaka (GMT+6)',
   });
  }
 }, [adminProfile]);

 const [currentPass, setCurrentPass] = useState('');
 const [newPass, setNewPass] = useState('');
 const [confirmPass, setConfirmPass] = useState('');

 const handleSaveProfile = (e: React.FormEvent) => {
  e.preventDefault();
  onSaveAdminProfile(profile);
  showToast('অ্যাডমিন প্রোফাইল সফলভাবে আপডেট করা হয়েছে!', 'success');
 };

 const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
   if (file.size > 1.5 * 1024 * 1024) {
    showToast('ফাইল সাইজ ১.৫ এমবি এর বেশি হতে পারবে না!', 'error');
    return;
   }
   const reader = new FileReader();
   reader.onload = (event) => {
    const base64String = event.target?.result as string;
    setProfile((prev) => ({ ...prev, avatar: base64String }));
    showToast('প্রোফাইল পিকচার সিলেক্ট করা হয়েছে। নিচে সেভ বাটনে ক্লিক করুন।', 'info');
   };
   reader.readAsDataURL(file);
  }
 };

 const handlePasswordSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (newPass !== confirmPass) {
   showToast('পাসওয়ার্ড কনফার্মেশন মিলছে না!', 'error');
   return;
  }
  showToast('পাসওয়ার্ড পরিবর্তন সফল হয়েছে!', 'success');
  setCurrentPass('');
  setNewPass('');
  setConfirmPass('');
 };

 return (
  <div className="space-y-6">
   {/* Header Banner */}
   <div className="bg-slate-50 border border-slate-300 rounded p-5 text-slate-800 shadow-md flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded shadow-sm">
      <User className="w-6 h-6 text-slate-800" />
     </div>
     <div>
      <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
       <span>Admin Profile &amp; Account Settings</span>
       <span className="text-xs font-mono bg-cyan-500/20 text-[#3c8dbc] px-2.5 py-0.5 rounded-full border border-cyan-500/30">
        Super Admin
       </span>
      </h1>
      <p className="text-xs text-slate-950 mt-0.5 font-medium">
       অ্যাডমিনিস্ট্রেটর অ্যাকাউন্ট তথ্য, সিকিউরিটি ক্রেডেনশিয়াল ও ডিভাইস সেশন কন্ট্রোল।
      </p>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Left Profile Card */}
    <div className="bg-white border border-slate-200 rounded p-6 shadow-sm flex flex-col items-center text-center space-y-4">
     <div className="relative">
      {profile.avatar ? (
       <img
        src={profile.avatar}
        alt="Admin Avatar"
        className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-slate-100"
       />
      ) : (
       <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-lg border-4 border-slate-100">
        {profile.name ? profile.name.charAt(0).toUpperCase() : 'A'}
       </div>
      )}
      <label className="absolute bottom-0 right-0 p-2 bg-white hover:bg-slate-100 text-slate-800 rounded-full border border-slate-300 shadow-sm cursor-pointer flex items-center justify-center">
       <Camera className="w-4 h-4" />
       <input
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
       />
      </label>
     </div>

     <div>
      <h2 className="text-lg font-black text-slate-900">{profile.name}</h2>
      <div className="text-xs font-bold text-cyan-600">{profile.role}</div>
      <div className="text-[11px] text-slate-900 font-bold mt-1">Nexora network Network Control</div>
     </div>

     <div className="w-full border-t border-slate-100 pt-4 space-y-2 text-xs text-left">
      <div className="flex items-center justify-between text-slate-900">
       <span className="font-semibold">Account Status:</span>
       <span className="text-emerald-600 font-bold flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Super Admin
       </span>
      </div>
      <div className="flex items-center justify-between text-slate-900">
       <span className="font-semibold">2FA Authentication:</span>
       <span className="text-indigo-600 font-bold">Enabled (Active)</span>
      </div>
      <div className="flex items-center justify-between text-slate-900">
       <span className="font-semibold">Timezone:</span>
       <span className="font-mono text-slate-900 font-bold">{profile.timezone}</span>
      </div>
      {profile.address && (
       <div className="border-t border-slate-100 pt-2 text-slate-900">
        <div className="font-semibold text-slate-700 flex items-center gap-1 mb-0.5">
         <MapPin className="w-3 h-3 text-cyan-600" />
         <span>Address</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-900 font-bold">{profile.address}</p>
       </div>
      )}
     </div>
    </div>

    {/* Right Edit Details & Password */}
    <div className="lg:col-span-2 space-y-6">
     {/* Edit Profile Info Form */}
     <div className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-4">
      <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
       <User className="w-4 h-4 text-cyan-500" />
       <span>Personal &amp; Contact Information</span>
      </h3>

      <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
         <label className="block font-bold text-slate-950 mb-1">Full Name</label>
         <input
          type="text"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc] font-bold text-xs"
          required
         />
        </div>

        <div>
         <label className="block font-bold text-slate-950 mb-1">Role Title</label>
         <input
          type="text"
          value={profile.role}
          onChange={(e) => setProfile({ ...profile, role: e.target.value })}
          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc] font-bold text-xs"
          required
         />
        </div>

        <div>
         <label className="block font-bold text-slate-950 mb-1">Official Email Address</label>
         <input
          type="email"
          value={profile.email}
          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc] font-bold text-xs font-mono"
          required
         />
        </div>

        <div>
         <label className="block font-bold text-slate-950 mb-1">Mobile / WhatsApp Number</label>
         <input
          type="text"
          value={profile.phone}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc] font-bold text-xs font-mono"
          required
         />
        </div>

        <div className="sm:col-span-2">
         <label className="block font-bold text-slate-950 mb-1">Address / ঠিকানা</label>
         <textarea
          rows={2}
          value={profile.address}
          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-[#3c8dbc] font-bold text-xs"
          placeholder="Enter address..."
         />
        </div>
       </div>

       <div className="flex justify-end pt-2 border-t border-slate-100">
        <button
         type="submit"
         className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-black rounded shadow-md cursor-pointer flex items-center gap-1.5 transition-all text-xs"
        >
         <Save className="w-4 h-4" />
         <span>Save Profile Updates</span>
        </button>
       </div>
      </form>
     </div>

     {/* Connected Device Sessions */}
     <div className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-4">
      <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
       <Laptop className="w-4 h-4 text-cyan-500" />
       <span>Connected Authorized Devices</span>
      </h3>

      <div className="space-y-2">
       {[
        { device: 'Windows 11 PC (Chrome 124)', ip: '103.145.12.5 (Dhaka, BD)', time: 'Active now (Current session)', current: true },
        { device: 'iPhone 15 Pro Max (iOS 17.5)', ip: '103.145.12.5 (Dhaka, BD)', time: 'Yesterday at 08:30 PM', current: false },
        { device: 'MacBook Air M2 (Safari)', ip: '172.56.21.9 (Uttara, BD)', time: '3 days ago at 11:20 AM', current: false },
       ].map((d, i) => (
        <div
         key={i}
         className="p-3 bg-slate-50 border border-slate-100 rounded flex items-center justify-between text-xs"
        >
         <div>
          <div className="font-bold text-slate-950 flex items-center gap-2">
           <span>{d.device}</span>
           {d.current && (
            <span className="bg-emerald-500/20 text-[#00a65a] text-[10px] px-2 py-0.2 rounded-full font-bold">
             Current
            </span>
           )}
          </div>
          <div className="text-[11px] text-slate-900 font-mono mt-0.5">{d.ip} • {d.time}</div>
         </div>

         {!d.current && (
          <button
           type="button"
           onClick={() => showToast(`Revoked session for ${d.device}`, 'info')}
           className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-[11px] font-black rounded-lg transition-colors cursor-pointer"
          >
           Revoke
          </button>
         )}
        </div>
       ))}
      </div>
     </div>
    </div>
   </div>
  </div>
 );
};
