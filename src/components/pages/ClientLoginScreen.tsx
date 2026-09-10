import React, { useState, useEffect } from 'react';
import { User, Lock, ChevronRight, ArrowLeft, Shield } from 'lucide-react';
import { Client, AppSettings } from '../../types';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { setClientToken } from '../../lib/apiClient';

interface ClientLoginScreenProps {
  onBack: () => void;
  onLoginSuccess: (client: Client) => void;
  uid: string;
  settings?: AppSettings;
}

export const ClientLoginScreen: React.FC<ClientLoginScreenProps> = ({ 
  onBack, 
  onLoginSuccess, 
  uid, 
  settings 
}) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<AppSettings | undefined>(() => {
    if (settings?.logo) return settings;
    try {
      const local = localStorage.getItem('nexora_settings');
      if (local) {
        const parsed = JSON.parse(local);
        return { ...settings, ...parsed };
      }
    } catch {}
    return settings;
  });

  // Synchronize settings (logo, company name) from props, backend database, Firestore, and localStorage
  useEffect(() => {
    if (settings) {
      setCurrentSettings(prev => ({
        ...prev,
        ...settings,
        // Preserve previous logo if the incoming settings prop has null/undefined
        logo: settings.logo || prev?.logo || null,
      }));
    }
  }, [settings]);

  useEffect(() => {
    const loadSettings = async () => {
      // 1. Try local Express backend database
      try {
        const res = await fetch('/api/db/get?key=nexora_settings');
        const data = await res.json();
        if (data.success && data.value) {
          setCurrentSettings(prev => ({
            ...prev,
            ...data.value,
            logo: data.value.logo || prev?.logo || null,
          }));
          return;
        }
      } catch (err) {
        console.warn('Backend settings get error:', err);
      }

      // 2. Try Firestore workspace path
      try {
        const settingsRef = doc(db, 'ispWorkspace', 'mainData', 'collections', 'nexora_settings');
        const snap = await getDoc(settingsRef);
        if (snap.exists() && snap.data().value) {
          const val = snap.data().value;
          setCurrentSettings(prev => ({
            ...prev,
            ...val,
            logo: val.logo || prev?.logo || null,
          }));
          return;
        }
      } catch (err) {
        console.warn('Firestore settings fetch error:', err);
      }

      // 3. Try LocalStorage
      try {
        const local = localStorage.getItem('nexora_settings');
        if (local) {
          const parsed = JSON.parse(local);
          setCurrentSettings(prev => ({
            ...prev,
            ...parsed,
            logo: parsed.logo || prev?.logo || null,
          }));
        }
      } catch {
        // ignore
      }
    };

    loadSettings();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userId || !password) {
      setError('Please enter both User ID and Password');
      return;
    }

    setLoading(true);

    try {
      // 0. Primary Secure Path: Call Server-Side Client Authentication Endpoint
      try {
        const authRes = await fetch('/api/auth/client-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId.trim(), password: password.trim() }),
        });
        const authData = await authRes.json();
        if (authData.success && authData.client) {
          if (authData.token) {
            setClientToken(authData.token);
          }
          onLoginSuccess(authData.client);
          return;
        } else if (authData.message && !authRes.ok && authRes.status !== 404) {
          setError(authData.message || 'Invalid credentials.');
          return;
        }
      } catch (authErr) {
        console.warn('Direct backend auth failed, trying client fallback', authErr);
      }

      let allClients: Client[] = [];
      
      // 1. Try global workspace path
      try {
        const workspaceRef = doc(db, 'ispWorkspace', 'mainData', 'collections', 'nexora_clients');
        const workspaceSnap = await getDoc(workspaceRef);
        if (workspaceSnap.exists() && workspaceSnap.data().value) {
          allClients = workspaceSnap.data().value;
        }
      } catch (err) {
        console.warn("Global path failed", err);
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
        setError('Invalid credentials. Please check your User ID / Mobile and Password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const companyDisplayName = currentSettings?.companyName || currentSettings?.appName || 'Nexora network';

  return (
    <div className="min-h-screen bg-[#ecf0f5] flex flex-col items-center justify-center p-4 font-sans relative">
      <div className="w-full max-w-[420px] bg-white pt-8 pb-10 px-8 rounded-xl shadow-lg border border-slate-200">
        
        {/* Dynamic Company Logo */}
        <div className="flex flex-col items-center justify-center mb-5">
          {currentSettings?.logo ? (
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center mb-1">
              <img 
                src={currentSettings.logo} 
                alt={companyDisplayName} 
                className="max-h-24 max-w-[240px] w-auto object-contain drop-shadow-xs"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = document.getElementById('client-login-logo-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            </div>
          ) : null}
          <div 
            id="client-login-logo-fallback"
            className={`logo-fallback ${currentSettings?.logo ? 'hidden' : 'flex'} flex-col items-center`}
          >
            <div className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-sm">
              <Shield className="w-6 h-6 text-cyan-400" />
              <span className="text-xl font-black tracking-tight">{companyDisplayName}</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 italic mt-1.5">Fiber & Wireless Broadband</span>
          </div>
        </div>
        
        <div className="text-center mb-6">
          <h1 className="text-lg font-black text-slate-800 mb-1.5">{companyDisplayName} ERP System</h1>
          <div className="inline-block border border-teal-600 text-teal-700 bg-teal-50/60 text-[11px] font-bold px-3 py-0.5 rounded-full mb-2">
            Subscriber / Client Portal
          </div>
          <p className="text-xs text-slate-600">Enter your credentials below to log in</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">User ID or Mobile Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. user01 or 018XXXXXXXX"
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#3c8dbc] sm:text-sm text-slate-900 placeholder-slate-400"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#3c8dbc] sm:text-sm text-slate-900 placeholder-slate-400"
                disabled={loading}
              />
            </div>
          </div>
          
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center font-semibold rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <span className="text-xs text-[#208deb] font-medium">
              Need help with UserID / Password? Contact Helpline: {currentSettings?.phone || '01817681233'}
            </span>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#208deb] hover:bg-blue-600 text-white py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign in to Client Portal</span>
                <ChevronRight className="w-4 h-4 border border-white rounded-full p-0.5" />
              </>
            )}
          </button>
          
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal Select
          </button>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-[#208deb] hover:underline font-bold cursor-pointer"
          >
            Admin Login
          </button>
        </div>
        
      </div>
    </div>
  );
};
