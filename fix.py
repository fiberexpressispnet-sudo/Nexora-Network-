import sys
content = open('src/components/pages/ClientDashboard.tsx').read()
content = content.replace('    </div>\n  );\n};\n', '        </main>\n      </div>\n    </div>\n  );\n};\n')
open('src/components/pages/ClientDashboard.tsx', 'w').write(content)
