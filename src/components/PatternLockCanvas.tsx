import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface PatternLockCanvasProps {
 onComplete: (pattern: number[]) => void;
 status?: 'idle' | 'success' | 'error';
 disabled?: boolean;
 size?: number; // width & height in px (e.g. 280 to 320)
 showSequenceNumbers?: boolean;
 minPoints?: number;
}

export const PatternLockCanvas: React.FC<PatternLockCanvasProps> = ({
 onComplete,
 status = 'idle',
 disabled = false,
 size = 300,
 showSequenceNumbers = true,
 minPoints = 4,
}) => {
 const containerRef = useRef<HTMLDivElement>(null);
 const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
 const [isDrawing, setIsDrawing] = useState(false);
 const [currentCoord, setCurrentCoord] = useState<{ x: number; y: number } | null>(null);

 // 3x3 Grid node coordinates normalized (0..size)
 const padding = size * 0.16;
 const step = (size - 2 * padding) / 2;

 const nodePositions = [
 { id: 0, x: padding, y: padding },
 { id: 1, x: padding + step, y: padding },
 { id: 2, x: padding + 2 * step, y: padding },
 { id: 3, x: padding, y: padding + step },
 { id: 4, x: padding + step, y: padding + step },
 { id: 5, x: padding + 2 * step, y: padding + step },
 { id: 6, x: padding, y: padding + 2 * step },
 { id: 7, x: padding + step, y: padding + 2 * step },
 { id: 8, x: padding + 2 * step, y: padding + 2 * step },
 ];

 // Hit detection threshold around node centers
 const hitRadius = size * 0.12;

 const getPointerCoord = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
 if (!containerRef.current) return null;
 const rect = containerRef.current.getBoundingClientRect();
 let clientX = 0;
 let clientY = 0;

 if ('touches' in e && e.touches.length > 0) {
 clientX = e.touches[0].clientX;
 clientY = e.touches[0].clientY;
 } else if ('clientX' in e) {
 clientX = (e as MouseEvent).clientX;
 clientY = (e as MouseEvent).clientY;
 } else {
 return null;
 }

 return {
 x: clientX - rect.left,
 y: clientY - rect.top,
 };
 };

 const getNodeAtCoord = (coord: { x: number; y: number } | null) => {
 if (!coord) return null;
 for (const node of nodePositions) {
 const dist = Math.hypot(node.x - coord.x, node.y - coord.y);
 if (dist <= hitRadius) {
 return node.id;
 }
 }
 return null;
 };

 const triggerHaptic = () => {
 try {
 if (typeof window !== 'undefined' && 'vibrate' in navigator) {
 navigator.vibrate(25);
 }
 } catch {
 // ignore
 }
 };

 const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
 if (disabled) return;
 const coord = getPointerCoord(e);
 if (!coord) return;

 const node = getNodeAtCoord(coord);
 setIsDrawing(true);
 setCurrentCoord(coord);

 if (node !== null) {
 setSelectedNodes([node]);
 triggerHaptic();
 } else {
 setSelectedNodes([]);
 }
 };

 const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
 if (!isDrawing || disabled) return;
 const coord = getPointerCoord(e);
 if (!coord) return;

 setCurrentCoord(coord);
 const node = getNodeAtCoord(coord);

 if (node !== null && !selectedNodes.includes(node)) {
 setSelectedNodes((prev) => {
 const next = [...prev, node];
 triggerHaptic();
 return next;
 });
 }
 };

 const handleEnd = useCallback(() => {
 if (!isDrawing) return;
 setIsDrawing(false);
 setCurrentCoord(null);

 if (selectedNodes.length >= 1) {
 onComplete(selectedNodes);
 }
 }, [isDrawing, selectedNodes, onComplete]);

 // Handle global mouse/touch release
 useEffect(() => {
 const onGlobalEnd = () => {
 if (isDrawing) {
 handleEnd();
 }
 };
 window.addEventListener('mouseup', onGlobalEnd);
 window.addEventListener('touchend', onGlobalEnd);
 return () => {
 window.removeEventListener('mouseup', onGlobalEnd);
 window.removeEventListener('touchend', onGlobalEnd);
 };
 }, [isDrawing, handleEnd]);

 // Color scheme based on status
 let strokeColor = '#38bdf8'; // Sky blue
 let glowColor = 'rgba(56, 189, 248, 0.4)';
 let activeDotBg = '#0284c7';

 if (status === 'error') {
 strokeColor = '#f43f5e'; // Rose red
 glowColor = 'rgba(244, 63, 94, 0.4)';
 activeDotBg = '#e11d48';
 } else if (status === 'success') {
 strokeColor = '#10b981'; // Emerald green
 glowColor = 'rgba(16, 185, 129, 0.4)';
 activeDotBg = '#059669';
 }

 return (
 <div className="flex flex-col items-center select-none touch-none">
 <div
 ref={containerRef}
 style={{ width: size, height: size }}
 onMouseDown={handleStart}
 onMouseMove={handleMove}
 onTouchStart={handleStart}
 onTouchMove={handleMove}
 className={`relative rounded-3xl bg-slate-100 border border-slate-300/60 shadow-2xl backdrop-blur-xl p-2 cursor-pointer select-none touch-none transition-transform duration-200 ${
 status === 'error' ? 'animate-shake' : ''
 }`}
 >
 {/* SVG Path Layer */}
 <svg
 className="absolute inset-0 w-full h-full pointer-events-none z-10"
 style={{ width: size, height: size }}
 >
 <defs>
 <filter id="pattern-glow" x="-20%" y="-20%" width="140%" height="140%">
 <feGaussianBlur stdDeviation="4" result="blur" />
 <feComposite in="SourceGraphic" in2="blur" operator="over" />
 </filter>
 </defs>

 {/* Connected Lines */}
 {selectedNodes.map((nodeId, idx) => {
 if (idx === selectedNodes.length - 1) return null;
 const current = nodePositions[nodeId];
 const next = nodePositions[selectedNodes[idx + 1]];
 return (
 <line
 key={`line-${nodeId}-${idx}`}
 x1={current.x}
 y1={current.y}
 x2={next.x}
 y2={next.y}
 stroke={strokeColor}
 strokeWidth={size * 0.02}
 strokeLinecap="round"
 filter="url(#pattern-glow)"
 className="transition-all duration-150"
 />
 );
 })}

 {/* Active drag line to current pointer */}
 {isDrawing && currentCoord && selectedNodes.length > 0 && (
 <line
 x1={nodePositions[selectedNodes[selectedNodes.length - 1]].x}
 y1={nodePositions[selectedNodes[selectedNodes.length - 1]].y}
 x2={currentCoord.x}
 y2={currentCoord.y}
 stroke={strokeColor}
 strokeWidth={size * 0.016}
 strokeDasharray="4 4"
 strokeLinecap="round"
 opacity={0.8}
 />
 )}
 </svg>

 {/* 3x3 Nodes Grid */}
 <div className="absolute inset-0 pointer-events-none z-20">
 {nodePositions.map((node) => {
 const isSelected = selectedNodes.includes(node.id);
 const sequenceIndex = selectedNodes.indexOf(node.id);

 return (
 <div
 key={node.id}
 style={{
 left: node.x,
 top: node.y,
 transform: 'translate(-50%, -50%)',
 }}
 className="absolute flex items-center justify-center pointer-events-none"
 >
 {/* Outer Touch Target Circle */}
 <div
 className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
 isSelected
 ? 'scale-110'
 : 'hover:scale-105'
 }`}
 style={{
 backgroundColor: isSelected ? glowColor : 'rgba(255, 255, 255, 0.03)',
 border: isSelected ? `2px solid ${strokeColor}` : '1px solid rgba(255, 255, 255, 0.1)',
 }}
 >
 {/* Center Node Core */}
 <div
 className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
 isSelected
 ? 'scale-125'
 : 'bg-slate-400 '
 }`}
 style={{
 backgroundColor: isSelected ? activeDotBg : undefined,
 boxShadow: isSelected ? `0 0 12px ${strokeColor}` : undefined,
 }}
 />
 </div>

 {/* Optional Sequence Order Badge */}
 {showSequenceNumbers && isSelected && (
 <span
 className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-slate-800 flex items-center justify-center shadow"
 style={{ backgroundColor: activeDotBg }}
 >
 {sequenceIndex + 1}
 </span>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Helper text or points count */}
 <div className="mt-3 text-center">
 {selectedNodes.length > 0 && selectedNodes.length < minPoints && (
 <p className="text-[11px] font-medium text-amber-400 animate-pulse">
 কমপক্ষে {minPoints} টি ডট সংযুক্ত করুন (Connect at least {minPoints} dots)
 </p>
 )}
 </div>
 </div>
 );
};
