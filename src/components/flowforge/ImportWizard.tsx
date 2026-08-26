import React, { useState } from 'react';
import { Client } from '../../types';
import {
 X,
 Upload,
 FileSpreadsheet,
 CheckCircle2,
 AlertCircle,
 ArrowRight,
 Database,
 RefreshCw,
 FileText,
 Layers,
} from 'lucide-react';

interface ImportWizardProps {
 isOpen: boolean;
 onClose: () => void;
 onImportClients: (newClients: Client[]) => void;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({
 isOpen,
 onClose,
 onImportClients,
}) => {
 if (!isOpen) return null;

 const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
 const [rawData, setRawData] = useState<string>('');
 const [parsedClients, setParsedClients] = useState<Client[]>([]);
 const [error, setError] = useState<string | null>(null);

 const sampleCsv = `Name,Phone,UserId,Package,Bandwidth,Price,Status,Expiry
Abdur Rahman,01711223344,fx_abdur,Starter 15M,15 Mbps,800,online,2026-09-30
Kamal Hossain,01822334455,fx_kamal,Standard 25M,25 Mbps,1200,online,2026-10-15
Sultana Begum,01933445566,fx_sultana,Ultra 40M,40 Mbps,1600,offline,2026-08-25`;

 const handleParseCsv = (text: string) => {
 try {
 setError(null);
 const lines = text.trim().split('\n');
 if (lines.length < 2) {
 setError('Please provide at least a header row and 1 client row.');
 return;
 }

 const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
 const result: Client[] = [];

 for (let i = 1; i < lines.length; i++) {
 const row = lines[i].split(',').map((c) => c.trim());
 if (row.length < 3 || !row[0]) continue;

 const name = row[0] || `Client ${i}`;
 const phone = row[1] || '01700000000';
 const userId = row[2] || `user_${Date.now()}_${i}`;
 const pkg = row[3] || 'Standard 20M';
 const bandwidth = row[4] || '20 Mbps';
 const price = row[5] || '1000';
 const status = (row[6] === 'offline' || row[6] === 'expired' || row[6] === 'suspended') ? row[6] : 'online';
 const expiry = row[7] || new Date(Date.now() + 30 * 86400000).toISOString();

 result.push({
 id: `imp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
 name,
 phone,
 userId,
 password: '123',
 package: pkg,
 bandwidth,
 downloadSpeed: bandwidth,
 uploadSpeed: bandwidth,
 price,
 status,
 expiry,
 router: 'MikroTik-Core-01',
 deviceType: 'Router',
 });
 }

 if (result.length === 0) {
 setError('No valid clients could be parsed from the input data.');
 return;
 }

 setParsedClients(result);
 setStep('preview');
 } catch (err: any) {
 setError(`Failed to parse CSV: ${err?.message || 'Invalid format'}`);
 }
 };

 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = (event) => {
 const content = event.target?.result as string;
 setRawData(content);
 handleParseCsv(content);
 };
 reader.readAsText(file);
 };

 const handleConfirmImport = () => {
 if (parsedClients.length === 0) return;
 onImportClients(parsedClients);
 setStep('success');
 setTimeout(() => {
 setStep('upload');
 setParsedClients([]);
 setRawData('');
 onClose();
 }, 1500);
 };

 return (
 <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-white backdrop-blur-md animate-fade-in">
 <div className="bg-white border border-slate-300 rounded w-full max-w-2xl shadow-md overflow-hidden text-slate-800 relative">
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
 <FileSpreadsheet className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
 <span>FlowForge Data Import Wizard</span>
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
 CSV / Excel / JSON
 </span>
 </h3>
 <p className="text-xs text-slate-800">
 Bulk import clients, subscribers, and fee ledgers into your database
 </p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-1.5 rounded-lg text-slate-800 hover:text-slate-800 hover:bg-white transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Wizard Content */}
 <div className="p-6 space-y-4">
 {step === 'upload' && (
 <div className="space-y-4">
 {/* Drag Drop / File Picker */}
 <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded p-6 text-center bg-white transition-all cursor-pointer relative group">
 <input
 type="file"
 accept=".csv,.txt,.json"
 onChange={handleFileUpload}
 className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
 />
 <div className="w-12 h-12 rounded bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-3 group-hover:scale-110 transition-transform">
 <Upload className="w-6 h-6" />
 </div>
 <div className="text-sm font-bold text-slate-800 mb-1">
 Click or drag and drop your CSV / Excel export file
 </div>
 <div className="text-xs text-slate-800">Supports .csv, .txt, or exported member spreadsheets</div>
 </div>

 {/* Paste or sample preview */}
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <label className="text-xs font-semibold text-slate-900">Or Paste CSV / Table Data Manually:</label>
 <button
 type="button"
 onClick={() => {
 setRawData(sampleCsv);
 handleParseCsv(sampleCsv);
 }}
 className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
 >
 Load Sample Template
 </button>
 </div>
 <textarea
 value={rawData}
 onChange={(e) => setRawData(e.target.value)}
 placeholder="Paste CSV rows here: Name,Phone,UserId,Package,Bandwidth,Price,Status,Expiry"
 className="w-full h-28 bg-white border border-slate-300 rounded p-3 text-xs font-mono text-slate-700 focus:outline-none focus:border-[#3c8dbc]"
 />
 </div>

 {error && (
 <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded flex items-center gap-2 text-xs text-rose-300">
 <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
 <span>{error}</span>
 </div>
 )}

 <div className="flex justify-end gap-2.5 pt-2">
 <button
 type="button"
 onClick={() => handleParseCsv(rawData)}
 disabled={!rawData.trim()}
 className="px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all cursor-pointer"
 >
 <span>Parse &amp; Preview</span>
 <ArrowRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}

 {step === 'preview' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between p-3 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
 <span className="font-bold flex items-center gap-2">
 <Database className="w-4 h-4 text-indigo-400" />
 <span>Found {parsedClients.length} clients ready to import</span>
 </span>
 <button
 type="button"
 onClick={() => setStep('upload')}
 className="text-xs text-slate-800 hover:text-slate-800 font-semibold underline"
 >
 Change File
 </button>
 </div>

 {/* Preview Table */}
 <div className="max-h-60 overflow-y-auto rounded border border-slate-200 bg-white">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-100 text-slate-800 uppercase font-mono text-[10px] sticky top-0">
 <tr>
 <th className="p-2.5">Name</th>
 <th className="p-2.5">User ID</th>
 <th className="p-2.5">Phone</th>
 <th className="p-2.5">Package</th>
 <th className="p-2.5">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {parsedClients.slice(0, 10).map((c, idx) => (
 <tr key={idx} className="hover:bg-white">
 <td className="p-2.5 font-bold text-slate-800">{c.name}</td>
 <td className="p-2.5 font-mono text-indigo-300">{c.userId}</td>
 <td className="p-2.5 text-slate-900">{c.phone}</td>
 <td className="p-2.5 text-slate-900">{c.package}</td>
 <td className="p-2.5">
 <span
 className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
 c.status === 'online'
 ? 'bg-emerald-500/20 text-emerald-300'
 : 'bg-rose-500/20 text-rose-300'
 }`}
 >
 {c.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {parsedClients.length > 10 && (
 <div className="text-center text-xs text-slate-800">
 + {parsedClients.length - 10} more rows will be imported
 </div>
 )}

 {/* Actions */}
 <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
 <button
 type="button"
 onClick={() => setStep('upload')}
 className="px-4 py-2 rounded text-xs font-semibold text-slate-800 hover:bg-white hover:text-slate-800"
 >
 Back
 </button>
 <button
 type="button"
 onClick={handleConfirmImport}
 className="px-5 py-2 rounded bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
 >
 <CheckCircle2 className="w-4 h-4" />
 <span>Import {parsedClients.length} Clients Now</span>
 </button>
 </div>
 </div>
 )}

 {step === 'success' && (
 <div className="py-8 text-center space-y-3">
 <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[#00a65a] mx-auto">
 <CheckCircle2 className="w-8 h-8" />
 </div>
 <h4 className="text-base font-bold text-slate-800">Import Successfully Completed!</h4>
 <p className="text-xs text-slate-800">
 {parsedClients.length} clients have been imported and synchronized with your database.
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};
