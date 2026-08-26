import sys
content = open('src/components/Sidebar.tsx').read()

# Fix container background
content = content.replace(
    'bg-[#090d16] border-r border-slate-800/80',
    'bg-[#222d32] border-r-0'
)

# Fix Brand Header
content = content.replace(
    'bg-gradient-to-b from-[#0e1526] to-[#090d16]',
    'bg-[#367fa9] text-white'
)
content = content.replace(
    'bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-700 border border-indigo-400/30',
    'bg-white/20'
)
content = content.replace(
    'text-indigo-100',
    'text-white'
)
content = content.replace(
    'text-indigo-300/80',
    'text-blue-100'
)
content = content.replace(
    'bg-emerald-400',
    'bg-green-400'
)
content = content.replace(
    'border-b border-slate-800/80',
    'border-b-0'
)

# Fix Active link logic
content = content.replace(
    'bg-gradient-to-r from-indigo-600/30 to-violet-600/10 text-white font-bold border-l-2 border-indigo-500 shadow-sm shadow-indigo-500/10',
    'bg-[#1e282c] text-white font-semibold border-l-4 border-[#3c8dbc]'
)
content = content.replace(
    'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100',
    'text-[#b8c7ce] hover:bg-[#1e282c] hover:text-white border-l-4 border-transparent'
)
content = content.replace(
    'text-indigo-400',
    'text-white'
)
content = content.replace(
    'text-slate-500',
    'text-[#b8c7ce]'
)
content = content.replace(
    'rounded-xl',
    'rounded-none'
)
content = content.replace(
    'bg-indigo-500',
    'bg-[#00c0ef]'
)

# Fix Section Headers
content = content.replace(
    'text-slate-500 px-3 pb-1.5',
    'text-[#4b646f] px-4 py-3 bg-[#1a2226]'
)
content = content.replace(
    'border-t border-slate-800/60',
    ''
)
content = content.replace(
    'bg-indigo-500/20 text-indigo-300',
    'bg-blue-500 text-white'
)
content = content.replace(
    'bg-slate-800 text-slate-400',
    'bg-gray-600 text-white'
)

# Fix Footer
content = content.replace(
    'border-t border-slate-800/80 bg-[#070a12]',
    'bg-[#1a2226]'
)
content = content.replace(
    'bg-slate-900/80 border border-slate-800',
    'bg-[#222d32] border border-[#1a2226]'
)
content = content.replace(
    'bg-emerald-500/10',
    'bg-green-500/10'
)
content = content.replace(
    'text-emerald-400',
    'text-green-400'
)

# Ensure rounded-none instead of rounded-xl for links
content = content.replace('className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl', 'className={`w-full flex items-center gap-3 px-4 py-3 rounded-none')
content = content.replace('className={`w-full flex items-center gap-3 px-3 py-2 rounded-none', 'className={`w-full flex items-center gap-3 px-4 py-3 rounded-none')

open('src/components/Sidebar.tsx', 'w').write(content)
