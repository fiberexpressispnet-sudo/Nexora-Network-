import os
import glob
import re

files = glob.glob('src/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Make light slate text much darker (more black)
    content = content.replace('text-slate-500', 'text-slate-800')
    content = content.replace('text-slate-600', 'text-slate-900')
    
    # Just to be sure, any specific text-slate-400 that survived
    content = content.replace('text-slate-400', 'text-slate-700')
    
    # And specifically for cards in dashboard, let's make sure the titles and labels are black
    if 'Dashboard.tsx' in file:
        content = content.replace('text-slate-800', 'text-slate-900') # Even darker for dashboard!

    with open(file, 'w') as f:
        f.write(content)

print("Text colors darkened.")
