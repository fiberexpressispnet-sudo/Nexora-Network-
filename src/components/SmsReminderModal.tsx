import React, { useState, useEffect } from 'react';
import { Client, AppSettings } from '../types';
import { SMS_TEMPLATES, getClientExpiryInfo } from '../lib/expiryUtils';
import { Modal } from './Modal';
import {
 MessageSquare,
 Send,
 Copy,
 Check,
 Smartphone,
 Calendar,
 AlertTriangle,
 Sparkles,
 ExternalLink,
 Phone,
} from 'lucide-react';

interface SmsReminderModalProps {
 client: Client | null;
 settings: AppSettings;
 isOpen: boolean;
 onClose: () => void;
 onSmsSent?: (client: Client, messageText: string, channel: 'SMS' | 'WhatsApp' | 'Manual') => void;
 showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

export const SmsReminderModal: React.FC<SmsReminderModalProps> = ({
 client,
 settings,
 isOpen,
 onClose,
 onSmsSent,
 showToast,
}) => {
 const [selectedTemplateId, setSelectedTemplateId] = useState('standard_3day');
 const [messageText, setMessageText] = useState('');
 const [copied, setCopied] = useState(false);

 // When client changes or modal opens, pick best default template based on expiry
 useEffect(() => {
 if (!client) return;
 const info = getClientExpiryInfo(client.expiry);
 let defaultTpl = 'standard_3day';
 if (info.isExpired) {
 defaultTpl = 'expired_disconnect';
 } else if (info.isExpiringToday || info.daysLeft === 1) {
 defaultTpl = 'urgent_expiry';
 } else {
 defaultTpl = 'standard_3day';
 }
 setSelectedTemplateId(defaultTpl);

 const template = SMS_TEMPLATES.find((t) => t.id === defaultTpl) || SMS_TEMPLATES[0];
 setMessageText(template.generateText(client, settings));
 }, [client, isOpen, settings]);

 if (!client) return null;

 const expiryInfo = getClientExpiryInfo(client.expiry);
 const cleanPhone = client.phone.replace(/[^\d+]/g, '');
 const charCount = messageText.length;
 // Unicode/Bangla SMS is typically 70 chars per part, standard ASCII 160 chars
 const isUnicode = /[^\u0000-\u00ff]/.test(messageText);
 const maxPerSegment = isUnicode ? 70 : 160;
 const segmentCount = Math.max(1, Math.ceil(charCount / maxPerSegment));

 const handleSelectTemplate = (tplId: string) => {
 setSelectedTemplateId(tplId);
 const template = SMS_TEMPLATES.find((t) => t.id === tplId);
 if (template) {
 setMessageText(template.generateText(client, settings));
 }
 };

 const handleCopyText = async () => {
 try {
 await navigator.clipboard.writeText(messageText);
 setCopied(true);
 showToast('SMS text copied to clipboard!', 'success');
 setTimeout(() => setCopied(false), 2000);
 } catch {
 showToast('Could not copy text', 'error');
 }
 };

 const handleSendViaNativeSms = () => {
 const encodedBody = encodeURIComponent(messageText);
 const smsUrl = `sms:${cleanPhone}?body=${encodedBody}`;
 
 // Trigger mobile native SMS intent
 window.location.href = smsUrl;
 
 if (onSmsSent) {
 onSmsSent(client, messageText, 'SMS');
 }
 showToast(`📱 SMS app opened for ${client.name}!`, 'success');
 onClose();
 };

 const handleSendViaWhatsApp = () => {
 const formattedPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone.replace(/^0+/, '')}`;
 const encodedBody = encodeURIComponent(messageText);
 const waUrl = `https://wa.me/${formattedPhone}?text=${encodedBody}`;
 
 window.open(waUrl, '_blank');
 
 if (onSmsSent) {
 onSmsSent(client, messageText, 'WhatsApp');
 }
 showToast(`💬 Sending WhatsApp reminder to ${client.name}!`, 'success');
 onClose();
 };

 const handleMarkSentManually = () => {
 if (onSmsSent) {
 onSmsSent(client, messageText, 'Manual');
 }
 showToast(`✅ SMS reminder log saved for ${client.name}`, 'success');
 onClose();
 };

 return (
 <Modal
 isOpen={isOpen}
 title="Send SMS Subscription Reminder"
 onClose={onClose}
 maxWidth="max-w-xl"
 >
 <div className="space-y-4 text-xs">
 {/* Recipient Client Summary Header */}
 <div className="p-3.5 rounded bg-white text-slate-800 border border-slate-200 space-y-2">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm border border-sky-500/30 shrink-0">
 <MessageSquare className="w-5 h-5" />
 </div>
 <div>
 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
 <span>{client.name}</span>
 <span className="text-[10px] font-mono text-[#3c8dbc] bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
 ID: {client.userId}
 </span>
 </h4>
 <p className="text-[11px] text-[#00a65a] font-mono flex items-center gap-1 font-bold">
 <Phone className="w-3 h-3" /> {client.phone}
 </p>
 </div>
 </div>

 <div className="text-right">
 <span className={`px-2.5 py-1 rounded-lg text-[10px] inline-block ${expiryInfo.badgeClass}`}>
 {expiryInfo.badgeText}
 </span>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
 <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
 <span className="text-slate-800 block text-[10px]">Package</span>
 <strong className="text-sky-400 font-semibold">{client.package}</strong>
 </div>
 <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
 <span className="text-slate-800 block text-[10px]">Bill Amount</span>
 <strong className="text-[#00a65a] font-mono font-bold">৳{client.price || '500'}</strong>
 </div>
 <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
 <span className="text-slate-800 block text-[10px]">Expiry Date</span>
 <strong className="text-amber-400 font-mono font-semibold">{client.expiry}</strong>
 </div>
 </div>
 </div>

 {/* Template Selector */}
 <div className="space-y-1.5">
 <label className="block text-[11px] font-bold text-slate-700 ">
 Select Template:
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {SMS_TEMPLATES.map((tpl) => (
 <button
 key={tpl.id}
 type="button"
 onClick={() => handleSelectTemplate(tpl.id)}
 className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
 selectedTemplateId === tpl.id
 ? 'border-sky-500 bg-sky-500/10 text-sky-950 ring-1 ring-sky-500'
 : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 '
 }`}
 >
 <div className="flex items-center justify-between gap-1 mb-1">
 <span className="font-bold text-[11px] truncate">{tpl.badge}</span>
 {selectedTemplateId === tpl.id && (
 <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
 )}
 </div>
 <p className="text-[10px] text-slate-800 line-clamp-1">
 {tpl.description}
 </p>
 </button>
 ))}
 </div>
 </div>

 {/* Message Editor */}
 <div className="space-y-1.5">
 <div className="flex justify-between items-center">
 <label className="block text-[11px] font-bold text-slate-700 ">
 SMS Content (Message Body):
 </label>
 <div className="text-[10px] font-mono text-slate-800 flex items-center gap-2">
 <span>
 {charCount} chars ({isUnicode ? 'Unicode' : 'Standard ASCII'})
 </span>
 <span className="bg-slate-200 px-1.5 py-0.2 rounded font-bold">
 {segmentCount} SMS
 </span>
 </div>
 </div>

 <textarea
 rows={4}
 value={messageText}
 onChange={(e) => setMessageText(e.target.value)}
 placeholder="Type reminder message..."
 className="w-full p-3 rounded border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:border-[#3c8dbc] font-sans leading-relaxed resize-y"
 />
 </div>

 {/* Action Buttons */}
 <div className="pt-2 border-t border-slate-200 space-y-2.5">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {/* Native Device SMS */}
 <button
 type="button"
 onClick={handleSendViaNativeSms}
 className="py-2.5 px-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:brightness-110 text-white font-bold rounded flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
 >
 <Smartphone className="w-4 h-4" />
 <span>Send SMS</span>
 </button>

 {/* WhatsApp */}
 <button
 type="button"
 onClick={handleSendViaWhatsApp}
 className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
 >
 <Send className="w-4 h-4" />
 <span>Send WhatsApp</span>
 </button>
 </div>

 <div className="flex items-center justify-between gap-2">
 <button
 type="button"
 onClick={handleCopyText}
 className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 "
 >
 {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
 <span>{copied ? 'Copied!' : 'Copy Text'}</span>
 </button>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={handleMarkSentManually}
 className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
 >
 Log as Sent
 </button>
 <button
 type="button"
 onClick={onClose}
 className="py-1.5 px-3 bg-slate-100 text-slate-900 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 </div>
 </Modal>
 );
};
