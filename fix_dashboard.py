import sys
content = open('src/components/pages/Dashboard.tsx').read()

# Replace main cards
content = content.replace(
    'bg-slate-900 border border-slate-800 p-6 rounded-3xl',
    'bg-white border-t-[3px] border-[#3c8dbc] p-6 rounded shadow-sm'
)
# Quick fix for specific colors
content = content.replace('bg-indigo-500/10 border-indigo-500/20 text-indigo-400', 'bg-blue-50 border-blue-200 text-blue-600')
content = content.replace('bg-emerald-500/10 border-emerald-500/20 text-emerald-400', 'bg-green-50 border-green-200 text-green-600')
content = content.replace('bg-rose-500/10 border-rose-500/20 text-rose-400', 'bg-red-50 border-red-200 text-red-600')
content = content.replace('bg-amber-500/10 border-amber-500/20 text-amber-400', 'bg-yellow-50 border-yellow-200 text-yellow-600')
content = content.replace('bg-cyan-500/10 border-cyan-500/20 text-cyan-400', 'bg-cyan-50 border-cyan-200 text-cyan-600')
content = content.replace('bg-violet-500/10 border-violet-500/20 text-violet-400', 'bg-purple-50 border-purple-200 text-purple-600')

# Text colors
content = content.replace('text-white', 'text-slate-800')
content = content.replace('text-slate-400', 'text-slate-500')
content = content.replace('text-slate-300', 'text-slate-600')
content = content.replace('text-indigo-400', 'text-[#3c8dbc]')
content = content.replace('text-emerald-400', 'text-[#00a65a]')
content = content.replace('text-amber-400', 'text-[#f39c12]')
content = content.replace('text-rose-400', 'text-[#dd4b39]')

# Inner cards
content = content.replace('bg-slate-950', 'bg-slate-50')
content = content.replace('border-slate-800', 'border-slate-200')
content = content.replace('border-slate-700', 'border-slate-300')
content = content.replace('border-slate-800/80', 'border-slate-200')

# Rounded classes
content = content.replace('rounded-3xl', 'rounded')
content = content.replace('rounded-2xl', 'rounded')
content = content.replace('rounded-xl', 'rounded')

open('src/components/pages/Dashboard.tsx', 'w').write(content)
