import sys
content = open('src/components/PatternLockScreen.tsx').read()

# Fix layout
content = content.replace(
    '<div className="min-h-screen bg-[#071320] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">',
    '<div className="min-h-screen bg-[#ecf0f5] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">'
)
content = content.replace(
    'bg-slate-900/80 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-xl shadow-2xl relative',
    'bg-white p-8 rounded border-t-4 border-[#3c8dbc] shadow-md relative'
)
content = content.replace(
    '<h1 className="text-2xl font-bold text-white mb-2 tracking-tight flex items-center justify-center gap-2">',
    '<h1 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight flex items-center justify-center gap-2">'
)
content = content.replace(
    '<p className="text-slate-400 mb-6 text-sm flex items-center justify-center gap-1">',
    '<p className="text-slate-500 mb-6 text-sm flex items-center justify-center gap-1">'
)
content = content.replace(
    'text-white', 'text-slate-800'
)
# Fix buttons and active links which should still be white text inside blue bg
content = content.replace(
    'bg-[#3c8dbc] text-slate-800', 'bg-[#3c8dbc] text-white'
)
content = content.replace(
    'bg-indigo-600 text-slate-800', 'bg-indigo-600 text-white'
)

open('src/components/PatternLockScreen.tsx', 'w').write(content)
