import sys
content = open('src/components/pages/Dashboard.tsx').read()

# Make stat cards look more ERP-like with colored top borders
content = content.replace(
    'p-5 rounded bg-white border border-slate-300/70 hover:border-indigo-500/60 transition-all shadow-lg hover:shadow-indigo-500/10',
    'p-5 rounded bg-white border border-slate-200 border-t-[3px] border-t-indigo-500 transition-all shadow-sm hover:shadow-md'
)
content = content.replace(
    'p-5 rounded bg-white border border-slate-300/70 hover:border-emerald-500/60 transition-all shadow-lg hover:shadow-emerald-500/10',
    'p-5 rounded bg-white border border-slate-200 border-t-[3px] border-t-emerald-500 transition-all shadow-sm hover:shadow-md'
)
content = content.replace(
    'p-5 rounded bg-white border border-slate-300/70 hover:border-sky-500/60 transition-all shadow-lg hover:shadow-sky-500/10',
    'p-5 rounded bg-white border border-slate-200 border-t-[3px] border-t-sky-500 transition-all shadow-sm hover:shadow-md'
)
content = content.replace(
    'p-5 rounded bg-white border border-slate-300/70 hover:border-amber-500/60 transition-all shadow-lg hover:shadow-amber-500/10',
    'p-5 rounded bg-white border border-slate-200 border-t-[3px] border-t-amber-500 transition-all shadow-sm hover:shadow-md'
)

# Replace other generic panels to have a top blue border
content = content.replace(
    'rounded bg-white border border-slate-300 p-5',
    'rounded bg-white border border-slate-200 border-t-[3px] border-t-[#3c8dbc] p-5 shadow-sm'
)
content = content.replace(
    'border border-slate-300',
    'border border-slate-200'
)

open('src/components/pages/Dashboard.tsx', 'w').write(content)
