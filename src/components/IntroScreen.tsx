import React, { useEffect, useState } from 'react';
import { AppSettings } from '../types';
import { Activity } from 'lucide-react';

export const IntroScreen = ({ settings, onComplete }: { settings: AppSettings, onComplete: () => void }) => {
 const [stage, setStage] = useState<'intro' | 'shatter' | 'done'>('intro');

 const handleSkip = () => {
 setStage('done');
 onComplete();
 };

 useEffect(() => {
 const t1 = setTimeout(() => {
 setStage('shatter');
 }, 1000); // Show logo for 1 second

 const t2 = setTimeout(() => {
 setStage('done');
 onComplete();
 }, 1500); // 0.5s shatter

 return () => {
 clearTimeout(t1);
 clearTimeout(t2);
 };
 }, [onComplete]);

 if (stage === 'done') return null;

 // Define glass shards based on a central break point (50% 50%)
 const shards = [
 { clipPath: 'polygon(0% 0%, 50% 0%, 30% 40%)', dx: -100, dy: -150, r: -45 },
 { clipPath: 'polygon(50% 0%, 100% 0%, 70% 40%)', dx: 100, dy: -150, r: 45 },
 { clipPath: 'polygon(100% 0%, 100% 50%, 65% 45%)', dx: 200, dy: -50, r: 60 },
 { clipPath: 'polygon(100% 50%, 100% 100%, 70% 65%)', dx: 200, dy: 100, r: 80 },
 { clipPath: 'polygon(100% 100%, 50% 100%, 65% 70%)', dx: 100, dy: 200, r: -30 },
 { clipPath: 'polygon(50% 100%, 0% 100%, 30% 70%)', dx: -100, dy: 200, r: -60 },
 { clipPath: 'polygon(0% 100%, 0% 50%, 35% 65%)', dx: -200, dy: 100, r: -80 },
 { clipPath: 'polygon(0% 50%, 0% 0%, 35% 45%)', dx: -200, dy: -50, r: -35 },
 // Inner center shards (closer to 50% 50%)
 { clipPath: 'polygon(30% 40%, 50% 0%, 70% 40%, 50% 50%)', dx: 20, dy: -100, r: 15 },
 { clipPath: 'polygon(70% 40%, 65% 45%, 100% 50%, 50% 50%)', dx: 100, dy: 20, r: 35 },
 { clipPath: 'polygon(100% 50%, 70% 65%, 65% 70%, 50% 50%)', dx: 80, dy: 100, r: -20 },
 { clipPath: 'polygon(65% 70%, 50% 100%, 30% 70%, 50% 50%)', dx: -20, dy: 120, r: 45 },
 { clipPath: 'polygon(30% 70%, 35% 65%, 0% 50%, 50% 50%)', dx: -120, dy: 40, r: -50 },
 { clipPath: 'polygon(0% 50%, 35% 45%, 30% 40%, 50% 50%)', dx: -80, dy: -60, r: 25 },
 ];

 return (
 <>
 <style>{`
 @keyframes fadeInScale {
 0% { opacity: 0; transform: scale(0.8); }
 100% { opacity: 1; transform: scale(1); }
 }
 @keyframes pulseGlow {
 0%, 100% { box-shadow: 0 0 0px rgba(56, 189, 248, 0); }
 50% { box-shadow: 0 0 60px rgba(56, 189, 248, 0.4); }
 }
 @keyframes shatter {
 0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--r)) scale(1.1); }
 }
 @keyframes flashOverlay {
 0% { opacity: 0.8; }
 100% { opacity: 0; }
 }
 .intro-container {
 animation: fadeInScale 0.6s ease-out forwards;
 }
 .logo-box {
 animation: pulseGlow 2s infinite ease-in-out;
 }
 .shard {
 animation: shatter 0.7s ease-out forwards;
 }
 .flash {
 animation: flashOverlay 0.3s ease-out forwards;
 }
 `}</style>
 
 <div
 onClick={handleSkip}
 className={`fixed inset-0 z-[99999] flex items-center justify-center cursor-pointer overflow-hidden ${
 stage === 'intro' ? 'bg-white' : 'pointer-events-none'
 }`}
 >
 {/* Background shards that fly away */}
 {stage === 'shatter' && (
 <>
 <div className="flash absolute inset-0 bg-white mix-blend-overlay" />
 {shards.map((shard, i) => (
 <div
 key={i}
 className="shard absolute inset-0 bg-white"
 style={{
 clipPath: shard.clipPath,
 //@ts-ignore - custom properties for animation
 '--dx': `${shard.dx * 1.5}px`,
 '--dy': `${shard.dy * 1.5}px`,
 '--r': `${shard.r}deg`
 }}
 />
 ))}
 </>
 )}

 {/* The main content */}
 {stage === 'intro' && (
 <div className="intro-container relative z-10 flex flex-col items-center justify-center">
 <div className="logo-box w-40 h-40 rounded bg-sky-500/10 border border-sky-400/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(56,189,248,0.2)] overflow-hidden">
 {settings.logo ? (
 <img src={settings.logo} alt="Logo" className="w-32 h-32 object-contain" />
 ) : (
 <Activity className="w-20 h-20 text-sky-400" />
 )}
 </div>
 <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 tracking-tight transition-all duration-300">
 {settings.appName || 'Nexora network'}
 </h1>
 </div>
 )}
 </div>
 </>
 );
};
