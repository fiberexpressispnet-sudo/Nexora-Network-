import os
import glob
import re

files = glob.glob('src/**/*.tsx', recursive=True)
exclude_files = [
    'src/components/Sidebar.tsx',
    'src/components/Topbar.tsx',
    'src/App.tsx',
    'src/components/pages/ClientDashboard.tsx',
    'src/components/PatternLockScreen.tsx',
    'src/components/PatternLockCanvas.tsx'
]

for file in files:
    if any(file.endswith(ex) for ex in exclude_files):
        continue
        
    with open(file, 'r') as f:
        content = f.read()

    # Base background styles
    content = content.replace('bg-[#090d16]', 'bg-[#ecf0f5]')
    content = content.replace('bg-[#080e1e]', 'bg-[#ecf0f5]')
    content = content.replace('bg-[#071320]', 'bg-[#ecf0f5]')
    content = content.replace('bg-[#0f172a]', 'bg-white')
    content = content.replace('bg-[#1e293b]', 'bg-slate-50')
    
    # Overlays
    content = content.replace('bg-slate-950/70', 'bg-slate-800/40')
    content = content.replace('bg-slate-950/80', 'bg-slate-800/40')
    content = content.replace('bg-black/70', 'bg-slate-800/40')
    
    # Dark Mode Backgrounds
    content = re.sub(r'bg-slate-900(/[0-9]+)?', 'bg-white', content)
    content = re.sub(r'bg-slate-950(/[0-9]+)?', 'bg-slate-50', content)
    content = re.sub(r'bg-slate-800/60', 'bg-slate-50', content)
    content = re.sub(r'bg-slate-800/80', 'bg-slate-100', content)
    content = re.sub(r'bg-slate-800(/[0-9]+)?', 'bg-white', content)
    content = re.sub(r'bg-white/50 dark:bg-slate-900/50', 'bg-white', content)
    
    # Dark Mode Borders
    content = re.sub(r'border-slate-800(/[0-9]+)?', 'border-slate-200', content)
    content = re.sub(r'border-slate-700(/[0-9]+)?', 'border-slate-300', content)
    content = re.sub(r'border-slate-600(/[0-9]+)?', 'border-slate-300', content)
    
    # Dark Mode Hovers
    content = re.sub(r'hover:bg-slate-800(/[0-9]+)?', 'hover:bg-slate-100', content)
    content = re.sub(r'hover:bg-slate-700(/[0-9]+)?', 'hover:bg-slate-200', content)
    content = re.sub(r'hover:border-slate-700(/[0-9]+)?', 'hover:border-slate-300', content)
    content = re.sub(r'hover:border-slate-600(/[0-9]+)?', 'hover:border-slate-400', content)
    
    # Fix Text Colors
    content = content.replace('text-slate-400', 'text-slate-500')
    content = content.replace('text-slate-300', 'text-slate-600')
    content = content.replace('text-slate-200', 'text-slate-700')
    content = content.replace('text-white', 'text-slate-800')
    
    # Form elements specific fixes
    content = content.replace('focus:border-sky-500', 'focus:border-[#3c8dbc]')
    content = content.replace('focus:border-cyan-500', 'focus:border-[#3c8dbc]')
    content = content.replace('focus:border-indigo-500', 'focus:border-[#3c8dbc]')
    content = content.replace('focus:border-blue-500', 'focus:border-[#3c8dbc]')
    content = content.replace('placeholder-slate-500', 'placeholder-slate-400')
    
    # Table styling
    content = content.replace('divide-slate-800', 'divide-slate-200')
    content = content.replace('divide-slate-700', 'divide-slate-200')
    
    # Restore text-white on primary colored elements (buttons, badges)
    content = re.sub(r'(bg-(?:blue|indigo|emerald|cyan|rose|amber|red|green|purple|sky|teal|violet|fuchsia|pink)-[567]00[^>]*?)text-slate-800', r'\1text-white', content)
    content = re.sub(r'(bg-\[#(?:3c8dbc|dd4b39|00a65a|f39c12|00c0ef|367fa9|2b6688|E2125B|F04D22|8c2a91)\][^>]*?)text-slate-800', r'\1text-white', content)
    content = re.sub(r'(bg-gradient-to-[a-z]+[^>]*?)text-slate-800', r'\1text-white', content)
    
    # Also restore hover text white on these buttons if they had it
    content = re.sub(r'(hover:bg-(?:blue|indigo|emerald|cyan|rose|amber|red|green|purple|sky|teal|violet)-[67]00[^>]*?)text-slate-800', r'\1text-white', content)
    
    # Make modal and card borders look like ERP (top border blue)
    # The previous script did this for main panels, let's just ensure clean rounded classes
    content = content.replace('rounded-3xl', 'rounded')
    content = content.replace('rounded-2xl', 'rounded')
    content = content.replace('rounded-xl', 'rounded')
    
    # Reduce extreme shadows
    content = content.replace('shadow-2xl', 'shadow-md')
    content = content.replace('shadow-xl', 'shadow-md')

    with open(file, 'w') as f:
        f.write(content)

print("Inner design fixed.")
