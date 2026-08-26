import sys
content = open('src/App.tsx').read()

# Fix layout wrapper
content = content.replace(
    '<div className="min-h-screen bg-[#080e1e] text-slate-100 font-sans flex relative">',
    '<div className="min-h-screen bg-[#ecf0f5] text-slate-800 font-sans flex relative">'
)

# Fix back navigation bar
content = content.replace(
    '<div className="bg-[#1e293b] border border-slate-700/80 rounded-xl px-4 py-3 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs text-white">',
    '<div className="bg-white border border-slate-200 rounded px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">'
)
content = content.replace(
    'className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-sky-600 hover:brightness-110 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"',
    'className="px-3.5 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white font-semibold rounded shadow-sm flex items-center gap-2 cursor-pointer transition-all"'
)
content = content.replace(
    '<div className="flex items-center gap-2 text-slate-300 font-medium">',
    '<div className="flex items-center gap-2 text-slate-600 font-medium">'
)
content = content.replace(
    'className="hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors"',
    'className="hover:text-[#3c8dbc] flex items-center gap-1 cursor-pointer transition-colors"'
)
content = content.replace(
    '<Home className="w-4 h-4 text-slate-400" />',
    '<Home className="w-4 h-4 text-slate-500" />'
)
content = content.replace(
    '<ChevronRight className="w-3.5 h-3.5 text-slate-500" />',
    '<ChevronRight className="w-3.5 h-3.5 text-slate-400" />'
)
content = content.replace(
    'className="text-cyan-400 font-extrabold capitalize bg-slate-800/90 px-2.5 py-0.5 rounded-md border border-slate-700"',
    'className="text-[#3c8dbc] font-bold capitalize bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100"'
)
content = content.replace(
    'className="text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"',
    'className="text-slate-600 hover:text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded border border-slate-300 transition-colors"'
)
content = content.replace(
    '<RotateCcw className="w-3.5 h-3.5 text-cyan-400" />',
    '<RotateCcw className="w-3.5 h-3.5 text-slate-500" />'
)

# Fix loading screen
content = content.replace(
    '<div className="min-h-screen bg-[#071320] flex flex-col items-center justify-center p-4 text-white font-sans">',
    '<div className="min-h-screen bg-[#ecf0f5] flex flex-col items-center justify-center p-4 text-slate-800 font-sans">'
)
content = content.replace(
    '<div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />',
    '<div className="w-16 h-16 border-4 border-slate-200 border-t-[#3c8dbc] rounded-full animate-spin" />'
)
content = content.replace(
    '<div className="absolute w-8 h-8 rounded-full bg-cyan-500/20 animate-ping" />',
    '<div className="absolute w-8 h-8 rounded-full bg-[#3c8dbc]/20 animate-ping" />'
)
content = content.replace(
    'text-cyan-300',
    'text-slate-700'
)
content = content.replace(
    'text-cyan-400',
    'text-[#3c8dbc]'
)
content = content.replace(
    '<p className="text-xs text-slate-400">Loading secure workspace...</p>',
    '<p className="text-xs text-slate-500">Loading secure workspace...</p>'
)

# Fix Select screen
content = content.replace(
    '<div className="max-w-md w-full bg-slate-900/80 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-xl shadow-2xl text-center">',
    '<div className="max-w-md w-full bg-white p-8 rounded border-t-4 border-t-[#3c8dbc] shadow-md text-center">'
)
content = content.replace(
    '<div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-2 ring-cyan-500/30">',
    '<div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-2 ring-blue-100">'
)
content = content.replace(
    '<h1 className="text-2xl font-bold text-white mb-2">Fiber Express ISP</h1>',
    '<h1 className="text-2xl font-bold text-slate-800 mb-2">Fiber Express ISP</h1>'
)
content = content.replace(
    '<p className="text-slate-400 mb-8 text-sm">Please select your login type</p>',
    '<p className="text-slate-500 mb-8 text-sm">Please select your login type</p>'
)
content = content.replace(
    '<button\n              onClick={handleClientSelect}\n              className="w-full p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-3 text-cyan-400 font-bold group"\n            >',
    '<button\n              onClick={handleClientSelect}\n              className="w-full p-4 rounded border border-[#00c0ef] bg-white hover:bg-cyan-50 transition-all flex items-center justify-center gap-3 text-[#00c0ef] font-bold group shadow-sm"\n            >'
)
content = content.replace(
    '<button\n              onClick={handleAdminSelect}\n              className="w-full p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-3 text-rose-400 font-bold group"\n            >',
    '<button\n              onClick={handleAdminSelect}\n              className="w-full p-4 rounded border border-[#dd4b39] bg-white hover:bg-red-50 transition-all flex items-center justify-center gap-3 text-[#dd4b39] font-bold group shadow-sm"\n            >'
)

open('src/App.tsx', 'w').write(content)
