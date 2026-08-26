import os
import glob
import re

files = glob.glob('src/**/*.tsx', recursive=True) + ['src/index.css']

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # index.css specific
    if file.endswith('index.css'):
        content = content.replace('bg-[#0a0f1d]', 'bg-[#ecf0f5]')
        content = content.replace('text-slate-100', 'text-slate-800')
    else:
        # Very specific hex codes found in monitoring charts
        dark_hexes = [
            '#0a0f1d', '#0b132b', '#040814', '#0f1b38', '#0a1124', 
            '#050a16', '#0a1122', '#0e172e', '#080e1a', '#0d162c', 
            '#020612', '#030712'
        ]
        
        for hex_code in dark_hexes:
            content = content.replace(f'bg-[{hex_code}]', 'bg-white')
        
        # Other bg-slate-900/800 instances
        content = content.replace('bg-slate-900', 'bg-white')
        content = content.replace('bg-slate-800/80', 'bg-slate-100')
        content = content.replace('bg-slate-800', 'bg-slate-50')
        content = content.replace('bg-black/80', 'bg-slate-800/40')
        content = content.replace('bg-black/40', 'bg-slate-200')
        
        # Ensure text is readable on light bg
        content = content.replace('text-slate-100', 'text-slate-800')
        content = content.replace('text-cyan-300', 'text-[#3c8dbc]')
        content = content.replace('text-cyan-400', 'text-[#3c8dbc]')
        content = content.replace('text-emerald-400', 'text-[#00a65a]')
        
        # Chart and network specific texts that are still white/light
        content = content.replace('text-slate-200', 'text-slate-700')
        
        # Selection on dark
        content = content.replace('selection:bg-cyan-500 selection:text-slate-950', 'selection:bg-[#3c8dbc] selection:text-white')
        
        # Border fixes
        content = content.replace('border-slate-300/80', 'border-slate-300')
        
        # Intro Screen Shards
        if 'IntroScreen.tsx' in file:
            content = content.replace('bg-slate-950', 'bg-white')

    with open(file, 'w') as f:
        f.write(content)

print("Remaining dark theme backgrounds removed.")
