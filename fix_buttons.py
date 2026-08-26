import os
import glob
import re

files = glob.glob('src/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Revert text-slate-800 back to text-white for buttons and badges
    content = content.replace('hover:text-slate-800', 'hover:text-white') # if it was text-white
    content = content.replace('bg-indigo-600 text-slate-800', 'bg-indigo-600 text-white')
    content = content.replace('bg-cyan-600 text-slate-800', 'bg-cyan-600 text-white')
    content = content.replace('bg-emerald-600 text-slate-800', 'bg-emerald-600 text-white')
    content = content.replace('bg-rose-600 text-slate-800', 'bg-rose-600 text-white')
    content = content.replace('bg-blue-600 text-slate-800', 'bg-blue-600 text-white')
    content = content.replace('bg-[#3c8dbc] text-slate-800', 'bg-[#3c8dbc] text-white')
    content = content.replace('bg-[#00a65a] text-slate-800', 'bg-[#00a65a] text-white')
    content = content.replace('bg-[#dd4b39] text-slate-800', 'bg-[#dd4b39] text-white')
    content = content.replace('bg-slate-800 text-slate-800', 'bg-slate-800 text-white')
    
    # Just generic fix: any bg-color-something text-slate-800 where we want text-white
    # It's safer to just do a regex
    content = re.sub(r'(bg-[a-z]+-[56789]00[^>]*?)text-slate-800', r'\1text-white', content)
    content = re.sub(r'(bg-\[[^\]]+\][^>]*?)text-slate-800', r'\1text-white', content)
    content = re.sub(r'(bg-gradient[^>]*?)text-slate-800', r'\1text-white', content)
    
    with open(file, 'w') as f:
        f.write(content)

print("Replaced buttons")
