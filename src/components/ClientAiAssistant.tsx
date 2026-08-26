import React, { useState, useEffect, useRef } from 'react';
import { 
 Bot, Send, Sparkles, AlertTriangle, CheckCircle2, 
 Wrench, Shield, CreditCard, RefreshCw, X, UserCheck, 
 Wifi, HelpCircle, PhoneCall, ArrowRight, ShieldAlert, Cpu
} from 'lucide-react';
import { Client } from '../types';

interface Message {
 id: string;
 sender: 'user' | 'ai';
 text: string;
 timestamp: string;
 isDiagnostic?: boolean;
 isBlocked?: boolean;
 actionType?: 'RENEW' | 'AUTO_FIX' | 'PHONE_PROMPT' | 'NONE';
 targetUserId?: string;
 isNew?: boolean;
}

// Sub-component for smooth markdown rendering with typing effect
const FormattedMessageContent: React.FC<{ 
 text: string; 
 isTyping?: boolean; 
 onTypingComplete?: () => void;
}> = ({ text, isTyping = false, onTypingComplete }) => {
 const [displayedText, setDisplayedText] = useState(isTyping ? '' : text);
 const [typingDone, setTypingDone] = useState(!isTyping);

 useEffect(() => {
 if (!isTyping) {
 setDisplayedText(text);
 setTypingDone(true);
 return;
 }

 setDisplayedText('');
 setTypingDone(false);
 let currentIndex = 0;
 const step = Math.max(1, Math.floor(text.length / 80)); // dynamic step for natural reading speed
 const intervalTime = 14; // fast snappy typing speed

 const timer = setInterval(() => {
 currentIndex += step;
 if (currentIndex >= text.length) {
 setDisplayedText(text);
 setTypingDone(true);
 clearInterval(timer);
 if (onTypingComplete) onTypingComplete();
 } else {
 setDisplayedText(text.slice(0, currentIndex));
 }
 }, intervalTime);

 return () => clearInterval(timer);
 }, [text, isTyping]);

 return (
 <div className="whitespace-pre-wrap leading-relaxed space-y-1">
 {displayedText.split('\n').map((line, idx) => {
 if (!line.trim()) return <div key={idx} className="h-1" />;
 
 // Bold and code format rendering
 const boldFormatted = line.split(/(\*\*.*?\*\*|\`.*?\`)/g).map((chunk, cIdx) => {
 if (chunk.startsWith('**') && chunk.endsWith('**')) {
 return <strong key={cIdx} className="font-bold text-slate-800">{chunk.slice(2, -2)}</strong>;
 }
 if (chunk.startsWith('`') && chunk.endsWith('`')) {
 return <code key={cIdx} className="font-mono bg-slate-200 text-[#3c8dbc] px-1 py-0.5 rounded text-[11px]">{chunk.slice(1, -1)}</code>;
 }
 return chunk;
 });

 return <div key={idx}>{boldFormatted}</div>;
 })}
 {!typingDone && (
 <span className="inline-block w-1.5 h-3.5 bg-cyan-400 animate-pulse ml-0.5 align-middle rounded-xs" />
 )}
 </div>
 );
};

interface ClientAiAssistantProps {
 client?: Client;
 onNavigateToRenew?: () => void;
 onClientStatusUpdated?: (updatedClient: Client) => void;
}

export const ClientAiAssistant: React.FC<ClientAiAssistantProps> = ({ 
 client, 
 onNavigateToRenew, 
 onClientStatusUpdated 
}) => {
 const [isOpen, setIsOpen] = useState(false);
 const [inputMessage, setInputMessage] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [isDiagnosing, setIsDiagnosing] = useState(false);
 const [activeTargetUserId, setActiveTargetUserId] = useState<string>(client?.userId || '');
 const [messages, setMessages] = useState<Message[]>([]);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 // Sync client userId when client prop changes
 useEffect(() => {
 if (client?.userId) {
 setActiveTargetUserId(client.userId);
 }
 }, [client]);

 // Initialize greeting on first open or client load
 useEffect(() => {
 if (messages.length === 0) {
 const greetingText = client
 ? `আসসালামু আলাইকুম **${client.name}**! 👋\nআমি আপনার **নেক্সোরা নেটওয়ার্ক এআই সাপোর্ট (NexoraAI)**।\n\nআপনার ইন্টারনেট সংযোগ, বিলের মেয়াদ বা কোনো সমস্যা রয়েছে কি? নিচে সরাসরি লিখুন বা কুইক বাটনে চাপ দিন।`
 : `আসসালামু আলাইকুম! 👋\nআমি **নেক্সোরা নেটওয়ার্ক এআই সাপোর্ট অ্যাসিস্ট্যান্ট**।\n\nআপনার অ্যাকাউন্ট ইউজারনেম, পাসওয়ার্ড পুনরুদ্ধার বা লাইনের তথ্যের জন্য আমাকে আপনার নিবন্ধিত ফোন নম্বর জানাতে পারেন।`;

 setMessages([
 {
 id: 'welcome-1',
 sender: 'ai',
 text: greetingText,
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 }
 ]);
 }
 }, [client]);

 useEffect(() => {
 if (isOpen) {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }
 }, [messages, isOpen]);

 // Send message to backend Gemini / AI Router
 const handleSendMessage = async (textToSend?: string) => {
 const query = (textToSend || inputMessage).trim();
 if (!query || isLoading) return;

 const userMsg: Message = {
 id: `user-${Date.now()}`,
 sender: 'user',
 text: query,
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 };

 setMessages(prev => [...prev, userMsg]);
 if (!textToSend) setInputMessage('');
 setIsLoading(true);

 try {
 const res = await fetch('/api/ai/client-chat', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 message: query,
 client: client,
 history: messages.slice(-6).map(m => ({
 role: m.sender === 'user' ? 'user' : 'model',
 text: m.text
 }))
 })
 });

 const data = await res.json();

 if (data.success && data.reply) {
 let action: 'RENEW' | 'AUTO_FIX' | 'PHONE_PROMPT' | 'NONE' = 'NONE';
 if (data.diagnosis?.isExpired) {
 action = 'RENEW';
 } else if (data.diagnosis?.autoFixable) {
 action = 'AUTO_FIX';
 }

 const foundUserId = data.targetUserId || data.diagnosis?.targetUserId || data.verifiedClient?.userId || data.client?.userId;
 if (foundUserId) {
 setActiveTargetUserId(foundUserId);
 }

 const aiMsg: Message = {
 id: `ai-${Date.now()}`,
 sender: 'ai',
 text: data.reply,
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 isBlocked: !!data.isGuardrailBlocked,
 isDiagnostic: !!data.diagnosis,
 actionType: action,
 targetUserId: foundUserId,
 isNew: true,
 };

 setMessages(prev => [...prev, aiMsg]);

 if (data.client && onClientStatusUpdated) {
 onClientStatusUpdated(data.client);
 } else if (data.diagnosis?.fixed && client && onClientStatusUpdated) {
 onClientStatusUpdated({ ...client, status: 'online' });
 }
 } else {
 const errorMsg: Message = {
 id: `ai-${Date.now()}`,
 sender: 'ai',
 text: `দুঃখিত, সার্ভারের সাথে সংযোগে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন। (${data.error || 'Timeout'})`,
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 };
 setMessages(prev => [...prev, errorMsg]);
 }
 } catch (err: any) {
 console.error('AI chat error:', err);
 const errorMsg: Message = {
 id: `ai-${Date.now()}`,
 sender: 'ai',
 text: 'নেটওয়ার্ক সমস্যার কারণে এআই রেসপন্স পাওয়া যায়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করুন।',
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 };
 setMessages(prev => [...prev, errorMsg]);
 } finally {
 setIsLoading(false);
 }
 };

 // Direct 1-Click Line Auto-Fix
 const handleAutoFix = async (specificUserId?: string) => {
 if (isDiagnosing) return;
 setIsDiagnosing(true);

 const targetId = specificUserId || activeTargetUserId || client?.userId;

 try {
 const res = await fetch('/api/ai/auto-fix-line', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ 
 userId: targetId,
 phone: inputMessage 
 })
 });

 const data = await res.json();
 if (data.success) {
 setMessages(prev => [
 ...prev,
 {
 id: `ai-${Date.now()}`,
 sender: 'ai',
 text: `✅ **মাইক্রোটিক অটো-ফিক্স ও রিসেট সফল হয়েছে!**\n\n${data.message}\n\n💡 **করণীয়:** আপনার হোম ওয়াইফাই রাউটারটি ৫ সেকেন্ড বন্ধ রেখে চালু করুন (Reboot)। আপনার ইন্টারনেট লাইন এখন সম্পূর্ণ সচল ও সক্রিয়!`,
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 actionType: 'NONE',
 isNew: true
 }
 ]);
 if (data.client) {
 setActiveTargetUserId(data.client.userId);
 if (onClientStatusUpdated) {
 onClientStatusUpdated(data.client);
 }
 }
 } else {
 setMessages(prev => [
 ...prev,
 {
 id: `ai-${Date.now()}`,
 sender: 'ai',
 text: `⚠️ **অটো-ফিক্স ব্যর্থ হয়েছে:** ${data.error || 'মাইক্রোটিক সাড়া দেয়নি'}\n\nঅনুগ্রহ করে আপনার ইউজার আইডি (যেমন: user101) লিখে আবার চেষ্টা করুন।`,
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 }
 ]);
 }
 } catch (err: any) {
 console.error(err);
 setMessages(prev => [
 ...prev,
 {
 id: `ai-${Date.now()}`,
 sender: 'ai',
 text: `⚠️ সার্ভার কানেকশনে সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করে পুনরায় চেষ্টা করুন।`,
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 }
 ]);
 } finally {
 setIsDiagnosing(false);
 }
 };

 return (
 <>
 {/* Floating Action Button (FAB) */}
 {!isOpen && (
 <button
 onClick={() => setIsOpen(true)}
 className="fixed bottom-6 right-6 z-50 group flex items-center gap-2.5 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white p-3.5 sm:px-4.5 sm:py-3 rounded-full shadow-[0_8px_30px_rgb(6,182,212,0.35)] transition-all duration-300 transform hover:scale-105 active:scale-95 border border-cyan-400/40"
 title="NexoraAI Support Assistant"
 >
 <div className="relative">
 <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-white/20">
 <Bot className="w-5 h-5 text-[#3c8dbc] group-hover:rotate-12 transition-transform" />
 </div>
 <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#071320] rounded-full animate-pulse"></span>
 </div>
 <div className="hidden sm:flex flex-col text-left">
 <span className="text-xs font-black tracking-wide text-slate-800 flex items-center gap-1">
 NexoraAI Support <Sparkles className="w-3 h-3 text-amber-300 animate-spin" />
 </span>
 <span className="text-[10px] text-cyan-100 font-semibold">লাইন ও বিল ডায়াগনস্টিক</span>
 </div>
 </button>
 )}

 {/* Interactive AI Chat Panel Modal */}
 {isOpen && (
 <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] h-full sm:h-[620px] bg-slate-50 sm:bg-white border border-slate-300 sm:rounded shadow-md backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 font-sans">
 
 {/* Header */}
 <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 p-4 border-b border-slate-200 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="relative w-10 h-10 rounded bg-gradient-to-tr from-cyan-600 to-teal-500 p-0.5 shadow-lg shadow-cyan-500/20">
 <div className="w-full h-full bg-slate-50 rounded-[14px] flex items-center justify-center">
 <Bot className="w-5 h-5 text-[#3c8dbc]" />
 </div>
 <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
 </div>
 <div>
 <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
 <span>NexoraAI Assistant</span>
 <span className="text-[9px] font-bold uppercase tracking-wider bg-cyan-500/20 text-[#3c8dbc] px-1.5 py-0.5 rounded border border-cyan-500/30">
 Gemini 3.7
 </span>
 </h3>
 <p className="text-[10px] text-[#00a65a] font-semibold flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
 24/7 Smart Line Diagnostics & Support
 </p>
 </div>
 </div>

 <button
 onClick={() => setIsOpen(false)}
 className="p-2 text-slate-800 hover:text-slate-800 bg-slate-50 hover:bg-white rounded transition-colors cursor-pointer"
 title="Close Chat"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 {/* Quick Action Suggestion Chips */}
 <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
 <button
 onClick={() => handleSendMessage('আমার লাইনে প্রবলেম, কি সমস্যা হয়েছে?')}
 className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-[#3c8dbc] border border-cyan-500/30 hover:bg-cyan-500/20 whitespace-nowrap transition-colors cursor-pointer"
 >
 <Wrench className="w-3 h-3 text-[#3c8dbc]" /> লাইনে কি সমস্যা?
 </button>
 <button
 onClick={() => handleSendMessage('কিভাবে বিল পেমেন্ট করব?')}
 className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/30 hover:bg-pink-500/20 whitespace-nowrap transition-colors cursor-pointer"
 >
 <CreditCard className="w-3 h-3 text-pink-400" /> কিভাবে বিল দেব?
 </button>
 <button
 onClick={() => handleSendMessage('আমার ইউজার নেম এবং পাসওয়ার্ড কি?')}
 className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 whitespace-nowrap transition-colors cursor-pointer"
 >
 <UserCheck className="w-3 h-3 text-amber-400" /> আইডি ও পাসওয়ার্ড কি?
 </button>
 <button
 onClick={() => handleSendMessage('আমার বিলের মেয়াদ কতদিন আছে?')}
 className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 whitespace-nowrap transition-colors cursor-pointer"
 >
 <Wifi className="w-3 h-3 text-[#00a65a]" /> মেয়াদ চেক
 </button>
 <button
 onClick={() => handleSendMessage('পৃথিবীর বর্তমান বিজ্ঞান ও প্রযুক্তির খবর কি?')}
 className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 whitespace-nowrap transition-colors cursor-pointer"
 >
 <Sparkles className="w-3 h-3 text-purple-400" /> অলরাউন্ডার হেল্প
 </button>
 </div>

 {/* Messages Stream */}
 <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
 {messages.map((msg) => (
 <div
 key={msg.id}
 className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
 >
 {msg.sender === 'ai' && (
 <div className="w-7 h-7 rounded bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
 {msg.isBlocked ? (
 <ShieldAlert className="w-4 h-4 text-rose-400" />
 ) : (
 <Bot className="w-4 h-4 text-[#3c8dbc]" />
 )}
 </div>
 )}

 <div
 className={`max-w-[85%] rounded p-3.5 shadow-md ${
 msg.sender === 'user'
 ? 'bg-cyan-600 text-white rounded-br-xs'
 : msg.isBlocked
 ? 'bg-rose-950/40 border border-rose-500/30 text-rose-100 rounded-bl-xs'
 : 'bg-white border border-slate-300 text-slate-800 rounded-bl-xs'
 }`}
 >
 {/* Message body with Markdown & Typewriter effect */}
 {msg.sender === 'ai' ? (
 <FormattedMessageContent
 text={msg.text}
 isTyping={!!msg.isNew}
 onTypingComplete={() => {
 // Mark as no longer typing after complete
 setMessages(prev =>
 prev.map(m => m.id === msg.id ? { ...m, isNew: false } : m)
 );
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }}
 />
 ) : (
 <div className="whitespace-pre-wrap leading-relaxed space-y-1">
 {msg.text}
 </div>
 )}

 {/* Interactive Action Buttons inside AI response */}
 {msg.actionType === 'RENEW' && onNavigateToRenew && (
 <div className="mt-3 pt-2.5 border-t border-slate-300/60 flex items-center gap-2">
 <button
 onClick={() => {
 setIsOpen(false);
 onNavigateToRenew();
 }}
 className="w-full py-2 px-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold rounded text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/20 cursor-pointer"
 >
 <CreditCard className="w-3.5 h-3.5" /> বিকাশ/নগদে বিল পরিশোধ করুন <ArrowRight className="w-3.5 h-3.5" />
 </button>
 </div>
 )}

 {msg.actionType === 'AUTO_FIX' && (
 <div className="mt-3 pt-2.5 border-t border-slate-300/60 flex items-center gap-2">
 <button
 onClick={() => handleAutoFix(msg.targetUserId)}
 disabled={isDiagnosing}
 className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold rounded text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-98"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} /> 
 {isDiagnosing ? 'মাইক্রোটিক লাইন রিসেট হচ্ছে...' : '⚡ ১-ক্লিকে অটো-ফিক্স ও রিসেট করুন'}
 </button>
 </div>
 )}

 <div className="mt-1.5 text-[9px] text-right text-slate-800 font-mono">
 {msg.timestamp}
 </div>
 </div>
 </div>
 ))}

 {isLoading && (
 <div className="flex gap-2.5 items-center text-xs text-[#3c8dbc]">
 <div className="w-7 h-7 rounded bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center">
 <Bot className="w-4 h-4 text-[#3c8dbc] animate-spin" />
 </div>
 <div className="bg-white border border-slate-300 px-4 py-2.5 rounded rounded-bl-xs flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></span>
 <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
 <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
 <span className="text-[11px] text-slate-900 font-medium ml-1">এআই সিস্টেম ও লাইন যাচাই করছে...</span>
 </div>
 </div>
 )}

 <div ref={messagesEndRef} />
 </div>

 {/* Security Guardrail Notice Footer */}
 <div className="bg-white px-4 py-1 border-t border-slate-200/50 flex items-center justify-between text-[9px] text-slate-800">
 <span className="flex items-center gap-1">
 <Shield className="w-2.5 h-2.5 text-[#00a65a]" /> সিকিউরড ভেরিফিকেশন ও পলিসি এনফোর্সড
 </span>
 <span>Nexora network</span>
 </div>

 {/* Chat Input Bar */}
 <div className="p-3 bg-slate-50 border-t border-slate-200">
 <form
 onSubmit={(e) => {
 e.preventDefault();
 handleSendMessage();
 }}
 className="flex items-center gap-2"
 >
 <input
 type="text"
 value={inputMessage}
 onChange={(e) => setInputMessage(e.target.value)}
 placeholder="বিল পেমেন্ট, লাইন সমস্যা বা যেকোনো প্রশ্ন লিখুন..."
 disabled={isLoading}
 className="flex-1 bg-white border border-slate-300 rounded px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3c8dbc] transition-colors disabled:opacity-50"
 />
 <button
 type="submit"
 disabled={isLoading || !inputMessage.trim()}
 className="w-10 h-10 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md shadow-cyan-600/20 shrink-0 cursor-pointer"
 title="Send Message"
 >
 <Send className="w-4 h-4" />
 </button>
 </form>
 </div>

 </div>
 )}
 </>
 );
};
