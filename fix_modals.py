import os
import glob

files = glob.glob('src/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Fix modal backdrops that incorrectly became white
    content = content.replace('fixed inset-0 bg-white backdrop-blur', 'fixed inset-0 bg-slate-800/40 backdrop-blur')
    content = content.replace('fixed inset-0 z-[150] bg-white backdrop-blur', 'fixed inset-0 z-[150] bg-slate-800/40 backdrop-blur')
    content = content.replace('fixed inset-0 bg-white/70 backdrop-blur', 'fixed inset-0 bg-slate-800/40 backdrop-blur')
    content = content.replace('fixed inset-0 bg-white flex', 'fixed inset-0 bg-slate-800/40 backdrop-blur-sm flex')

    with open(file, 'w') as f:
        f.write(content)

print("Modal backdrops fixed.")
