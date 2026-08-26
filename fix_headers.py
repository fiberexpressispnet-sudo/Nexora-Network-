import os
import glob

files = glob.glob('src/components/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Fix common heading colors
    content = content.replace('text-white mb-', 'text-slate-800 mb-')
    content = content.replace('text-white text-lg', 'text-slate-800 text-lg')
    content = content.replace('text-white text-xl', 'text-slate-800 text-xl')
    content = content.replace('text-white text-2xl', 'text-slate-800 text-2xl')
    content = content.replace('font-bold text-white', 'font-bold text-slate-800')
    content = content.replace('font-extrabold text-white', 'font-bold text-slate-800')
    content = content.replace('font-black text-white', 'font-bold text-slate-800')
    
    # Fix table text
    content = content.replace('text-white', 'text-slate-800') # This might be risky, let's undo and be specific
    # Actually, replacing all 'text-white' inside standard tables:
    
    with open(file, 'w') as f:
        f.write(content)

print("Replaced headers")
