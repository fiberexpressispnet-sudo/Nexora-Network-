import sys
content = open('src/components/pages/ClientDashboard.tsx').read()
start_marker = "        {/* 1. Overview Tab */}"
end_marker = "        {/* 2. Renew Connection & Checkout Tab */}"
parts = content.split(start_marker)
if len(parts) < 2:
    print("Could not find start marker")
    sys.exit(1)
before = parts[0]
after_parts = parts[1].split(end_marker)
if len(after_parts) < 2:
    print("Could not find end marker")
    sys.exit(1)
after = after_parts[1]

new_overview = """
        {/* 1. Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            
            {/* Top 4 Metrics Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Connection Type */}
              <div className="bg-white p-4 flex items-center justify-between rounded shadow-sm border-l-4 border-[#00c0ef]">
                <div>
                  <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Connection Type</div>
                  <div className="text-xl font-semibold text-slate-800">PPPOE</div>
                </div>
                <div className="w-10 h-10 bg-[#00c0ef] rounded flex items-center justify-center text-white opacity-80">
                  <Activity className="w-6 h-6" />
                </div>
              </div>

              {/* Status */}
              <div className="bg-white p-4 flex items-center justify-between rounded shadow-sm border-l-4 border-[#00a65a]">
                <div>
                  <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Status</div>
                  <div className={`text-xl font-semibold capitalize ${activeClient.status === 'online' ? 'text-[#00a65a]' : 'text-rose-500'}`}>
                    {activeClient.status || 'Offline'}
                  </div>
                </div>
                <div className="w-10 h-10 bg-[#00a65a] rounded flex items-center justify-center text-white opacity-80">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              {/* Secret (UserID) */}
              <div className="bg-white p-4 flex items-center justify-between rounded shadow-sm border-l-4 border-[#f39c12]">
                <div>
                  <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Secret</div>
                  <div className="text-xl font-semibold text-slate-800">{activeClient.userId}</div>
                </div>
                <div className="w-10 h-10 bg-[#f39c12] rounded flex items-center justify-center text-white opacity-80">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* IP Address */}
              <div className="bg-white p-4 flex items-center justify-between rounded shadow-sm border-l-4 border-[#dd4b39]">
                <div>
                  <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">IP Address</div>
                  <div className="text-xl font-semibold text-slate-800">{activeClient.ipAddress || 'Dynamic'}</div>
                </div>
                <div className="w-10 h-10 bg-[#dd4b39] rounded flex items-center justify-center text-white opacity-80">
                  <Wifi className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Welcome Message */}
            <div className="bg-white p-4 rounded shadow-sm border-t-[3px] border-[#3c8dbc]">
               <h3 className="text-lg font-medium text-slate-800">Hi.. {activeClient.name}</h3>
               <p className="text-sm text-slate-600 mt-1">
                 Welcome back. Your Profile is updated and secured with 2FA..
               </p>
            </div>

            {/* Profile Info Table */}
            <div className="bg-white rounded shadow-sm border-t-[3px] border-[#3c8dbc]">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <h3 className="font-medium text-slate-800 text-sm">Profile Info</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-sm text-left">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-4 font-semibold text-slate-700 w-1/3 sm:w-1/4 bg-slate-50">Name</th>
                      <td className="py-3 px-4 text-slate-600 font-medium">{activeClient.name}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-4 font-semibold text-slate-700 bg-slate-50">Mobile Number</th>
                      <td className="py-3 px-4 text-slate-600">{activeClient.phone || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-4 font-semibold text-slate-700 bg-slate-50">Email</th>
                      <td className="py-3 px-4 text-slate-600">N/A</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-4 font-semibold text-slate-700 bg-slate-50">MAC Address</th>
                      <td className="py-3 px-4 text-slate-600">{activeClient.macAddress || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-4 font-semibold text-slate-700 bg-slate-50">Address</th>
                      <td className="py-3 px-4 text-slate-600">{activeClient.address || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-4 font-semibold text-slate-700 bg-slate-50">Registration Date</th>
                      <td className="py-3 px-4 text-slate-600">N/A</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-4 font-semibold text-slate-700 bg-slate-50">Connection Type</th>
                      <td className="py-3 px-4 text-slate-600">PPPoE</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-4 font-semibold text-slate-700 bg-slate-50">Secret</th>
                      <td className="py-3 px-4 text-slate-600 font-mono bg-amber-50">{activeClient.userId}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-4 font-semibold text-slate-700 bg-slate-50">Active IP Address</th>
                      <td className="py-3 px-4 text-slate-600">{activeClient.ipAddress || 'Dynamic'}</td>
                    </tr>
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-700 bg-slate-50">Expiry Date</th>
                      <td className="py-3 px-4 text-slate-600 font-bold text-rose-500">{activeClient.expiry || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expired / Auto-Fix Actions */}
            {activeClient.status !== 'online' && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-4 mt-4 flex flex-col sm:flex-row sm:items-center justify-between rounded shadow-sm gap-4">
                <div>
                   <h3 className="text-rose-700 font-bold text-sm">Your connection is currently offline or expired.</h3>
                   <p className="text-rose-600 text-xs mt-1">Renew your package to restore services, or use 1-click Auto-Fix to diagnose router issues.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setActiveTab('renew')} className="bg-rose-500 text-white px-4 py-2 rounded text-xs font-semibold shadow hover:bg-rose-600 cursor-pointer">
                    Renew Package
                  </button>
                  <button onClick={handleAutoFixLine} disabled={isAutoFixing} className="bg-white border border-rose-200 text-rose-600 px-4 py-2 rounded text-xs font-semibold shadow hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
                    {isAutoFixing ? 'Fixing...' : 'Auto-Fix Line'}
                  </button>
                </div>
              </div>
            )}
            
          </div>
        )}

        {/* 2. Renew Connection & Checkout Tab */}"""

new_content = before + new_overview + after
open('src/components/pages/ClientDashboard.tsx', 'w').write(new_content)
