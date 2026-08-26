import React from 'react';
import { AuditLog } from '../../types';
import { History, ShieldCheck, RotateCcw } from 'lucide-react';

interface AuditLogsProps {
 logs: AuditLog[];
 onHardReset?: () => void;
}

export const AuditLogsPage: React.FC<AuditLogsProps> = ({ logs, onHardReset }) => {
 return (
 <div className="space-y-6">
 <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded shadow-sm overflow-hidden">
 <div className="p-4 sm:p-5 border-b border-slate-200/80 flex justify-between items-center flex-wrap gap-2">
 <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
 <History className="w-5 h-5 text-sky-600 " /> Admin Audit Logs
 </h3>
 <div className="flex items-center gap-2">
 {onHardReset && (
 <button
 type="button"
 onClick={() => {
 if (window.confirm('আপনি কি নিশ্চিত যে সমস্ত সিস্টেম অডিট লগ মুছে ফেলতে চান? (Hard Reset)')) {
 onHardReset();
 }
 }}
 className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
 title="Clear all audit logs"
 >
 <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
 <span>Hard Reset (ডাটা রিসেট)</span>
 </button>
 )}
 <span className="text-xs text-slate-800 font-mono">{logs.length} Total Events</span>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="bg-slate-100/50 border-b border-slate-200/80 text-slate-800 uppercase tracking-wider font-semibold text-[10px]">
 <th className="p-3.5 pl-5">Timestamp</th>
 <th className="p-3.5">Admin</th>
 <th className="p-3.5">Action</th>
 <th className="p-3.5">Target</th>
 <th className="p-3.5">IP Address</th>
 <th className="p-3.5 pr-5 text-right">Result</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 font-mono">
 {logs.map((log) => (
 <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
 <td className="p-3.5 pl-5 text-slate-800 text-[11px]">{log.time}</td>
 <td className="p-3.5 font-bold text-slate-900 ">{log.admin}</td>
 <td className="p-3.5 text-sky-600 font-sans font-semibold">
 {log.action}
 </td>
 <td className="p-3.5 text-slate-700 font-sans">{log.target}</td>
 <td className="p-3.5 text-slate-800">{log.ip}</td>
 <td className="p-3.5 pr-5 text-right">
 <span
 className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-sans ${
 log.result === 'Success'
 ? 'bg-teal-500/10 text-teal-600 '
 : 'bg-rose-500/10 text-rose-600'
 }`}
 >
 <ShieldCheck className="w-3 h-3" /> {log.result}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
};
