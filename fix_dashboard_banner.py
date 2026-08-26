import sys
content = open('src/components/pages/Dashboard.tsx').read()

banner_start = '<div className="relative rounded bg-gradient-to-r from-[#3c8dbc] to-[#367fa9] border border-slate-300 p-5 sm:p-6 shadow-md overflow-hidden">'
banner_replacement = '''<div className="relative rounded bg-gradient-to-r from-[#3c8dbc] to-[#367fa9] border border-slate-300 p-5 sm:p-6 shadow-md overflow-hidden">
        {settings?.banner && (
          <>
            <img src={settings.banner} alt="Cover" className="absolute inset-0 w-full h-full object-cover z-0 opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/80 to-[#000000]/40 z-0" />
          </>
        )}
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none z-0" />
'''

content = content.replace(banner_start, banner_replacement)

# Fix text inside banner to be white instead of slate-800/600 since it's on a blue/image background
content = content.replace('<Sparkles className="w-3 h-3 text-[#3c8dbc]" />', '<Sparkles className="w-3 h-3 text-white" />')
content = content.replace('text-indigo-300', 'text-white')
content = content.replace('border-indigo-500/30', 'border-white/30')
content = content.replace('bg-indigo-500/20', 'bg-white/20')
content = content.replace('text-slate-500 font-mono">', 'text-blue-100 font-mono">')
content = content.replace('font-black text-slate-800 tracking-tight">', 'font-black text-white tracking-tight">')
content = content.replace('<p className="text-xs text-slate-600 max-w-2xl">', '<p className="text-xs text-blue-50 max-w-2xl">')

open('src/components/pages/Dashboard.tsx', 'w').write(content)
