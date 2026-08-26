import sys
content = open('src/components/pages/ClientDashboard.tsx').read()
content = content.split('      {/* Floating Smart AI Line Diagnostic & Support Assistant */}')[0]
content += """      {/* Floating Smart AI Line Diagnostic & Support Assistant */}
      <ClientAiAssistant
        client={activeClient}
        onNavigateToRenew={() => setActiveTab('renew')}
        onClientStatusUpdated={(updated) => setActiveClient(updated)}
      />
        </main>
      </div>
    </div>
  );
};
"""
open('src/components/pages/ClientDashboard.tsx', 'w').write(content)
