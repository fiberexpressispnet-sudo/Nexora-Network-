import sys
content = open('src/components/Topbar.tsx').read()

# Fix header container
content = content.replace(
    'bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 text-white',
    'bg-[#3c8dbc] text-white'
)
# Update text colors in header
content = content.replace(
    'text-slate-400 hover:text-white hover:bg-slate-800/80',
    'text-white hover:bg-[#367fa9]'
)
content = content.replace(
    'bg-slate-800/80 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700',
    'bg-[#367fa9] hover:bg-[#2b6688] text-white font-bold text-xs rounded border border-[#367fa9]'
)
content = content.replace(
    'bg-slate-800 text-slate-400 border border-slate-700/60',
    'bg-blue-600 text-white border border-blue-500'
)

# Search Input
content = content.replace(
    'bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-14 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500',
    'bg-white/10 border border-white/20 rounded pl-9 pr-14 py-1.5 text-xs text-white placeholder-blue-200 focus:outline-none focus:border-white focus:bg-white focus:text-slate-800 focus:placeholder-slate-400'
)
content = content.replace(
    'text-slate-500 w-4 h-4',
    'text-blue-200 w-4 h-4' # Update search icon color
)

# Quick Action Buttons
content = content.replace(
    'bg-slate-900 border-slate-700 hover:border-emerald-500 hover:text-emerald-400',
    'bg-green-600 border-green-500 hover:bg-green-700 hover:text-white text-white'
)
content = content.replace(
    'bg-slate-900 border-slate-700 hover:border-indigo-500 hover:text-indigo-400',
    'bg-blue-600 border-blue-500 hover:bg-blue-700 hover:text-white text-white'
)
content = content.replace(
    'bg-slate-900 border-slate-700 hover:border-violet-500 hover:text-violet-400',
    'bg-indigo-600 border-indigo-500 hover:bg-indigo-700 hover:text-white text-white'
)
content = content.replace(
    'bg-slate-900 border-slate-700 hover:border-amber-500 hover:text-amber-400',
    'bg-amber-500 border-amber-600 hover:bg-amber-600 hover:text-white text-white'
)

# Right actions
content = content.replace(
    'text-slate-300 hover:text-white hover:bg-slate-800/80',
    'text-white hover:bg-[#367fa9]'
)
content = content.replace(
    'bg-indigo-500',
    'bg-rose-500' # For badges
)

# Profile button
content = content.replace(
    'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-500/30 text-indigo-100',
    'bg-[#367fa9] border-[#367fa9] hover:bg-[#2b6688] text-white'
)
content = content.replace(
    'rounded-xl',
    'rounded'
)
content = content.replace(
    'rounded-2xl',
    'rounded'
)

open('src/components/Topbar.tsx', 'w').write(content)
