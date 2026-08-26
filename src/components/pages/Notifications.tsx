import React from 'react';
import { NotificationItem, HotspotPackageRequest, BroadbandRenewalRequest, PageId } from '../../types';
import { Bell, CheckCheck, Trash2, UserPlus, Wifi, AlertTriangle, Sparkles, Smartphone, ArrowRight, RotateCcw, CreditCard, CheckCircle2, XCircle } from 'lucide-react';

interface NotificationsProps {
 notifications: NotificationItem[];
 hotspotRequests?: HotspotPackageRequest[];
  renewalRequests?: BroadbandRenewalRequest[];
 onMarkAllRead: () => void;
 onClearAll: () => void;
 onToggleRead: (id: number) => void;
 onApproveRequest?: (id: string, createdUserId?: string) => void;
 onRejectRequest?: (id: string) => void;
  onApproveBroadbandRenewal?: (reqId: string) => void;
  onRejectBroadbandRenewal?: (reqId: string) => void;
 onNavigate?: (page: PageId) => void;
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
 onHardReset?: () => void;
}

export const NotificationsPage: React.FC<NotificationsProps> = ({
 notifications,
 hotspotRequests = [],
  renewalRequests = [],
 onMarkAllRead,
 onClearAll,
 onToggleRead,
 onApproveRequest,
 onRejectRequest,
  onApproveBroadbandRenewal,
  onRejectBroadbandRenewal,
 onNavigate,
 showToast,
 onHardReset,
}) => {
 const pendingRequests = hotspotRequests.filter((r) => r.status === 'pending');
  const pendingBroadbandRenewals = renewalRequests.filter((r) => r.status === 'pending');

 return (
 <div className="space-y-6">

      {/* Broadband Payment & Renewal Requests Section */}
      {pendingBroadbandRenewals.length > 0 && (
        <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded p-4 sm:p-5 text-slate-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white font-bold">
                <CreditCard className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-emerald-900 font-mono">
                অনলাইন পেমেন্ট রিনিউয়াল আবেদন ({pendingBroadbandRenewals.length}টি পেন্ডিং)
              </h3>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("subscriptions")}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <span>Subscriptions পেইজে যান</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingBroadbandRenewals.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-emerald-500/30 rounded p-3.5 space-y-2.5 shadow-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <strong className="text-sm text-slate-900 block font-bold">{req.clientName}</strong>
                    <span className="text-xs font-mono font-semibold text-slate-600">ID: {req.userId}</span>
                    {req.phone && (
                      <span className="text-xs font-mono font-bold text-emerald-600 block">📞 {req.phone}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {req.requestedPackage}
                    </span>
                    <div className="text-sm font-bold text-emerald-600 font-mono mt-0.5">৳{req.price}</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded text-xs space-y-1 font-mono border border-slate-200/80">
                  <div className="flex justify-between">
                    <span className="text-slate-500">পেমেন্ট মেথড:</span>
                    <span className="font-bold text-slate-800">{req.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TrxID:</span>
                    <span className="font-bold text-sky-600">{req.transactionId}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>সময়:</span>
                    <span>{req.requestedAt}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {onApproveBroadbandRenewal && (
                    <button
                      type="button"
                      onClick={() => onApproveBroadbandRenewal(req.id)}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>একসেপ্ট করুন (Accept)</span>
                    </button>
                  )}
                  {onRejectBroadbandRenewal && (
                    <button
                      type="button"
                      onClick={() => onRejectBroadbandRenewal(req.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>বাতিল</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

 {/* Hotspot Package Buy Requests Section */}
 {pendingRequests.length > 0 && (
 <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded p-4 sm:p-5 text-slate-900 shadow-sm space-y-3">
 <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
 <div className="flex items-center gap-2">
 <span className="p-1.5 rounded-lg bg-amber-500 text-white font-bold">
 <Smartphone className="w-4 h-4" />
 </span>
 <h3 className="text-sm font-bold text-amber-900 ">
 হটস্পট ক্লায়েন্ট নতুন প্যাকেজ আবেদন ({pendingRequests.length}টি পেন্ডিং)
 </h3>
 </div>
 {onNavigate && (
 <button
 onClick={() => onNavigate('clients')}
 className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
 >
 <span>Clients পেইজে যান</span>
 <ArrowRight className="w-3.5 h-3.5" />
 </button>
 )}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {pendingRequests.map((req) => (
 <div
 key={req.id}
 className="bg-white border border-amber-500/30 rounded p-3 space-y-2 shadow-2xs"
 >
 <div className="flex justify-between items-start">
 <div>
 <strong className="text-xs text-slate-900 block">{req.clientName}</strong>
 <span className="text-xs font-mono font-bold text-emerald-600 ">📞 {req.phone}</span>
 </div>
 <div className="text-right">
 <span className="text-[11px] font-bold text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded">
 {req.package}
 </span>
 <div className="text-xs font-bold text-amber-600 font-mono">৳{req.price}</div>
 </div>
 </div>

 <div className="flex items-center justify-between text-[10px] text-slate-800 pt-1 border-t border-slate-100 ">
 <span>MAC: {req.macAddress || 'Auto'}</span>
 <span>⏰ {req.requestedAt}</span>
 </div>

 {onNavigate && (
 <button
 onClick={() => onNavigate('hotspot')}
 className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
 >
 <Sparkles className="w-3.5 h-3.5 text-amber-300" />
 <span>আইডি তৈরি ও ক্লাইন্টকে SMS পাঠান</span>
 </button>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* General Notifications Container */}
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded shadow-sm overflow-hidden">
 <div className="p-4 sm:p-5 border-b border-slate-200/80 flex justify-between items-center">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
 <Bell className="w-5 h-5 text-sky-600 " /> Notifications &amp; Alerts
 </h3>

 <div className="flex gap-2">
 {onHardReset && (
 <button
 type="button"
 onClick={() => {
 if (window.confirm('আপনি কি নিশ্চিত যে সমস্ত নোটিফিকেশন ও অ্যালার্ট ডাটা মুছে ফেলতে চান? (Hard Reset)')) {
 onHardReset();
 }
 }}
 className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
 title="Clear all notification data"
 >
 <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
 <span>Hard Reset (ডাটা রিসেট)</span>
 </button>
 )}

 <button
 onClick={() => {
 onMarkAllRead();
 showToast('Marked all notifications as read', 'info');
 }}
 className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <CheckCheck className="w-3.5 h-3.5 text-teal-600" /> Mark All Read
 </button>
 <button
 onClick={() => {
 onClearAll();
 showToast('Cleared all notifications', 'info');
 }}
 className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <Trash2 className="w-3.5 h-3.5" /> Clear All
 </button>
 </div>
 </div>

 <div className="divide-y divide-slate-100 ">
 {notifications.length === 0 ? (
 <div className="p-8 text-center text-slate-800">
 No notifications at this time.
 </div>
 ) : (
 notifications.map((item) => {
 const isEmoji = item.icon && typeof item.icon === 'string' && (item.icon.includes('🚨') || item.icon.includes('⚠️') || item.icon.includes('⏰') || item.icon.includes('⚡'));
 let IconComp = Bell;
 if (item.icon === 'UserPlus') IconComp = UserPlus;
 if (item.icon === 'Wifi') IconComp = Wifi;
 if (item.icon === 'AlertTriangle') IconComp = AlertTriangle;

 const isRenewalAlert = item.text.toLowerCase().includes('renewal request') || item.text.toLowerCase().includes('রিনিউয়াল') || item.text.toLowerCase().includes('রিনিউ');
 const isHotspotAlert = item.text.toLowerCase().includes('hotspot request') || item.text.toLowerCase().includes('হটস্পট');
 const isExpiryAlert = item.text.includes('মেয়াদ') || item.text.includes('Expiry') || item.text.includes('SMS');

 if (isRenewalAlert || item.icon === 'CreditCard') IconComp = CreditCard;

 return (
 <div
 key={item.id}
 className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
 !item.read
 ? 'bg-sky-500/5 font-semibold'
 : 'hover:bg-slate-50/50 '
 }`}
 >
 <div
 onClick={() => {
 onToggleRead(item.id);
 if (isRenewalAlert && onNavigate) {
 onNavigate('subscriptions');
 } else if (isHotspotAlert && onNavigate) {
 onNavigate('hotspot');
 } else if (isExpiryAlert && onNavigate) {
 onNavigate('clients');
 }
 }}
 className="flex items-center gap-3 cursor-pointer flex-1"
 >
 <div
 className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${
 !item.read
 ? isExpiryAlert
 ? 'bg-rose-500 text-white shadow-xs'
 : isRenewalAlert
 ? 'bg-emerald-500 text-white shadow-xs'
 : isHotspotAlert
 ? 'bg-amber-500 text-white shadow-xs'
 : 'bg-sky-500 text-white shadow-xs'
 : 'bg-slate-100 text-slate-800'
 }`}
 >
 {isEmoji ? (
 <span className="text-base">{item.icon}</span>
 ) : (
 <IconComp className="w-4 h-4" />
 )}
 </div>
 <div>
 <p className="text-xs text-slate-800 ">{item.text}</p>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-[10px] text-slate-800">{item.time}</span>
 {isExpiryAlert && (
 <span className="text-[9px] bg-rose-500/15 text-rose-600 font-bold px-1.5 py-0.2 rounded">
 EXPIRY ALERT
 </span>
 )}
 {isRenewalAlert && (
 <span className="text-[9px] bg-emerald-500/15 text-emerald-600 font-bold px-1.5 py-0.2 rounded animate-pulse">
 RENEWAL REQUEST
 </span>
 )}
 {isHotspotAlert && (
 <span className="text-[9px] bg-amber-500/15 text-amber-600 font-bold px-1.5 py-0.2 rounded">
 HOTSPOT ALERT
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 self-end sm:self-center">
 {isRenewalAlert && onNavigate && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onNavigate('subscriptions');
 }}
 className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
 >
 <span>অনুমোদন করুন (Verify)</span>
 <ArrowRight className="w-3 h-3" />
 </button>
 )}

 {isHotspotAlert && onNavigate && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onNavigate('hotspot');
 }}
 className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
 >
 <span>হটস্পট অনুমোদন</span>
 <ArrowRight className="w-3 h-3" />
 </button>
 )}

 {isExpiryAlert && onNavigate && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onNavigate('clients');
 }}
 className="px-2.5 py-1 bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
 >
 <span>SMS পাঠান (Clients)</span>
 <ArrowRight className="w-3 h-3" />
 </button>
 )}

 <button
 type="button"
 onClick={() => onToggleRead(item.id)}
 className="p-1 text-slate-800 hover:text-slate-900 cursor-pointer text-[10px]"
 title={item.read ? 'Mark as unread' : 'Mark as read'}
 >
 {!item.read ? (
 <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
 ) : (
 <span className="text-slate-800">Read</span>
 )}
 </button>
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>
 </div>
 );
};
