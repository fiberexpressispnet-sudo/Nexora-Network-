import os
import glob

files = glob.glob('src/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Admin Panel Container styling
    content = content.replace('bg-slate-900 border border-slate-800 p-6 rounded-3xl', 'bg-white border-t-[3px] border-[#3c8dbc] p-6 rounded shadow-sm')
    content = content.replace('bg-slate-900 border border-slate-800 p-8 rounded-3xl', 'bg-white border-t-[3px] border-[#3c8dbc] p-8 rounded shadow-sm')
    content = content.replace('bg-slate-900 border border-slate-800 p-4 rounded-3xl', 'bg-white border-t-[3px] border-[#3c8dbc] p-4 rounded shadow-sm')
    content = content.replace('bg-slate-900 border border-slate-800 rounded-3xl', 'bg-white border-t-[3px] border-[#3c8dbc] rounded shadow-sm')
    
    # Tables and lists
    content = content.replace('bg-slate-950 border border-slate-800/80 rounded-2xl', 'bg-slate-50 border border-slate-200 rounded')
    content = content.replace('bg-slate-950 border border-slate-800 rounded-2xl', 'bg-slate-50 border border-slate-200 rounded')
    content = content.replace('bg-slate-950 rounded-2xl', 'bg-slate-50 rounded')
    content = content.replace('border-slate-800/80', 'border-slate-200')
    content = content.replace('border-slate-800', 'border-slate-200')
    content = content.replace('border-slate-700', 'border-slate-300')
    
    # Common text
    content = content.replace('text-slate-400', 'text-slate-500')
    content = content.replace('text-slate-300', 'text-slate-600')
    
    with open(file, 'w') as f:
        f.write(content)

print("Replaced common styles")
