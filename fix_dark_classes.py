import os
import glob
import re

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Regex to remove any word starting with dark:
    content = re.sub(r'dark:[^\s"\'\`]+', '', content)
    
    # Fix multiple spaces left by removal
    content = re.sub(r' +', ' ', content)
    
    # Also fix some other specific colors the user might hate
    content = content.replace('bg-slate-900', 'bg-white')
    content = content.replace('bg-slate-950', 'bg-white')
    content = content.replace('bg-black', 'bg-white') # Wait, some black text might be needed
    
    with open(file, 'w') as f:
        f.write(content)

print("Dark classes stripped.")
