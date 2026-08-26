import sys

content = open('src/components/pages/Dashboard.tsx').read()

start_marker = '{/* 1. FlowForge Modern Header Banner */}'
end_marker = '{/* Pending Hotspot Requests Alert if any */}'

if start_marker in content and end_marker in content:
    before = content.split(start_marker)[0]
    after = content.split(end_marker)[1]
    
    # We want to extract the Quick Action Buttons so we don't lose them
    import re
    # Extract just the buttons div block
    buttons_match = re.search(r'(<div className="flex flex-wrap items-center gap-2 shrink-0">.*?)</div>\s*</div>\s*</div>', content.split(start_marker)[1], re.DOTALL)
    
    buttons_html = ""
    if buttons_match:
        buttons_html = buttons_match.group(1) + "</div>"

    new_banner = """{/* 1. Cover Photo Banner */}
      {settings?.banner && (
        <div className="relative rounded-lg overflow-hidden shadow-sm border border-slate-200 h-40 sm:h-56">
          <img src={settings.banner} alt="Cover" className="absolute inset-0 w-full h-full object-cover z-0" />
        </div>
      )}

      {/* Quick Action Toolbar */}
      """ + buttons_html + """

      {/* Pending Hotspot Requests Alert if any */}"""

    with open('src/components/pages/Dashboard.tsx', 'w') as f:
        f.write(before + new_banner + after)
    print("Banner updated successfully.")
else:
    print("Could not find markers.")
