import React, { useState } from 'react';
import { User, Lock, ChevronRight, ArrowLeft } from 'lucide-react';
import { Client, AppSettings } from '../../types';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ClientLoginScreenProps {
 onBack: () => void;
 onLoginSuccess: (client: Client) => void;
 uid: string;
}

export const ClientLoginScreen: React.FC<ClientLoginScreenProps> = ({ onBack, onLoginSuccess, uid, settings }) => {
 const [userId, setUserId] = useState('');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');

 if (!userId || !password) {
 setError('Please enter both User ID and Password');
 return;
 }

 setLoading(true);

 try {
 let allClients: Client[] = [];
 
 // 0. Try local Express backend database
 try {
 const res = await fetch('/api/db/get?key=nexora_clients');
 const data = await res.json();
 if (data.success && data.value && Array.isArray(data.value) && data.value.length > 0) {
 allClients = data.value;
 }
 } catch (err) {
 console.warn("Backend db/get call failed", err);
 }
 
 // 1. Try global workspace path
 if (allClients.length === 0) {
 try {
 const workspaceRef = doc(db, 'ispWorkspace', 'mainData', 'collections', 'nexora_clients');
 const workspaceSnap = await getDoc(workspaceRef);
 if (workspaceSnap.exists() && workspaceSnap.data().value) {
 allClients = workspaceSnap.data().value;
 }
 } catch (err) {
 console.warn("Global path failed", err);
 }
 }
 
 // 2. Try user-specific path
 if (allClients.length === 0 && uid) {
 try {
 const clientsRef = doc(db, 'users', uid, 'appData', 'nexora_clients');
 const clientsSnap = await getDoc(clientsRef);
 if (clientsSnap.exists() && clientsSnap.data().value) {
 allClients = clientsSnap.data().value;
 }
 } catch (err) {
 console.warn("User-specific path failed", err);
 }
 }

 // 3. Try admin path
 if (allClients.length === 0) {
 try {
 const fallbackRef = doc(db, 'users', 'nexora_network_admin', 'appData', 'nexora_clients');
 const fallbackSnap = await getDoc(fallbackRef);
 if (fallbackSnap.exists() && fallbackSnap.data().value) {
 allClients = fallbackSnap.data().value;
 }
 } catch (err) {
 console.warn("Admin path failed", err);
 }
 }

 // 4. Try localStorage
 if (allClients.length === 0) {
 const local = localStorage.getItem('nexora_clients');
 if (local) {
 try {
 allClients = JSON.parse(local);
 } catch (e) {
 console.error(e);
 }
 }
 }

 const trimmedUserId = userId.trim().toLowerCase();
 const trimmedPassword = password.trim();

 const client = allClients.find(c => {
 const clientUid = (c.userId || '').trim().toLowerCase();
 const clientPass = (c.password || '').trim();
 const clientPhone = (c.phone || '').trim();
 return (clientUid === trimmedUserId || clientPhone === trimmedUserId) && clientPass === trimmedPassword;
 });
 
 if (client) {
 onLoginSuccess(client);
 } else {
 setError('Invalid credentials');
 }
 } catch (err) {
 console.error('Login error:', err);
 setError('An error occurred. Please try again.');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-[#ecf0f5] flex flex-col items-center justify-center p-4 font-sans relative">
 <div className="w-full max-w-[400px] bg-white pt-8 pb-10 px-8 rounded shadow-lg">
 
 {/* Logo Placeholder (matching the DFN green logo style) */}
 <div className="flex justify-center mb-4">
 <div className="relative flex flex-col items-center">
 <div className="flex items-center gap-1">
 <div className="text-4xl italic font-bold text-[#5cb85c]">F</div>
 <div className="text-4xl italic font-bold text-slate-800">E</div>
 <div className="text-4xl italic font-bold text-[#5cb85c]">N</div>
 </div>
 <div className="w-16 h-1 bg-white mt-1 transform -skew-x-12"></div>
 <span className="text-xs font-semibold text-slate-700 italic mt-0.5">Internet</span>
 </div>
 </div>
 
 <div className="text-center mb-6">
 <h1 className="text-lg font-bold text-[#333] mb-2">Nexora network ERP System</h1>
 <div className="inline-block border border-teal-600 text-teal-700 text-[11px] font-medium px-2 py-0.5 rounded mb-2">
 User Login
 </div>
 <p className="text-sm text-slate-800">Enter your credentials below</p>
 </div>
 
 <form onSubmit={handleLogin} className="space-y-4">
 
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 <User className="h-5 w-5 text-slate-800" />
 </div>
 <input
 type="text"
 value={userId}
 onChange={(e) => setUserId(e.target.value)}
 className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-[#3c8dbc] sm:text-sm text-slate-800"
 disabled={loading}
 />
 </div>
 
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 <Lock className="h-5 w-5 text-slate-800" />
 </div>
 <input
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Password"
 className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-[#3c8dbc] sm:text-sm text-slate-800"
 disabled={loading}
 />
 </div>
 
 {error && (
 <div className="text-rose-500 text-xs text-center font-medium">
 {error}
 </div>
 )}

 <div className="flex justify-end">
 <a href="#" className="text-sm text-[#208deb] hover:underline">
 UserID & Password?
 </a>
 </div>
 
 <button
 type="submit"
 disabled={loading}
 className="w-full bg-[#208deb] hover:bg-blue-600 text-white py-2.5 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
 >
 {loading ? 'Signing in...' : 'Sign in'} 
 {!loading && <ChevronRight className="w-4 h-4 border border-white rounded-full p-0.5" />}
 </button>
 
 </form>

 <div className="mt-6">
 <button
 onClick={onBack}
 className="text-sm text-[#208deb] hover:underline cursor-pointer"
 >
 Admin Login?
 </button>
 </div>
 
 </div>
 </div>
 );
};
