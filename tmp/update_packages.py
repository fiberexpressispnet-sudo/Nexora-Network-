import os

path = 'src/components/pages/Packages.tsx'
content = open(path).read()

target = '''  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
    {packages.map((p) => {
      const isMobile = p.deviceType === 'Mobile';
      return (
        <div
          key={p.id}
          className="bg-white/70 backdrop-blur-md border border-white/40 rounded p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 ">{p.name}</h4>
                  <span className="text-xs text-slate-800">{p.validity}</span>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                  p.status === 'active'
                    ? 'bg-teal-500/10 text-teal-600 '
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {p.status}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isMobile
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    : 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
                }`}
              >
                {isMobile ? (
                  <>
                    <Smartphone className="w-3 h-3" /> মোবাইল প্যাকেজ
                  </>
                ) : (
                  <>
                    <Router className="w-3 h-3" /> রাউটার প্যাকেজ
                  </>
                )}
              </span>
            </div>

            <div className="text-2xl font-extrabold text-sky-600 ">
              ৳{p.price}{' '}
              <span className="text-xs font-normal text-slate-800">/ month</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 pt-1">
              <span>↓ {p.speed}</span>
              <span>↑ {p.upload}</span>
            </div>

            <p className="text-xs text-slate-800 leading-relaxed">
              {p.description}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-200/80 ">
            <button
              onClick={() => handleOpenEdit(p)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => handleToggleStatus(p)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title={p.status === 'active' ? 'Deactivate' : 'Activate'}
            >
              {p.status === 'active' ? (
                <Pause className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Play className="w-3.5 h-3.5 text-teal-500" />
              )}
            </button>
            <button
              onClick={() => setDeleteConfirmId(p.id)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    })}
  </div>'''

replacement = '''  {/* Summary Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
      <div className="p-3 bg-indigo-500 text-white rounded-xl">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <div>
        <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Total Packages</p>
        <p className="text-lg font-black text-slate-900">{packages.length}</p>
      </div>
    </div>

    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
      <div className="p-3 bg-emerald-500 text-white rounded-xl">
        <span className="text-xl font-bold">৳</span>
      </div>
      <div>
        <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Starting From</p>
        <p className="text-lg font-black text-slate-900">৳500</p>
      </div>
    </div>

    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
      <div className="p-3 bg-amber-500 text-white rounded-xl">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      <div>
        <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Highest Plan</p>
        <p className="text-lg font-black text-slate-900">৳3,675</p>
      </div>
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {packages.map((p, idx) => {
      const isMobile = p.deviceType === 'Mobile';
      const numericSpeed = p.speed.replace(/\\D/g, '');
      
      const themes = [
        { bg: 'from-indigo-600 to-indigo-500', text: 'text-indigo-600', selectBg: 'bg-indigo-600', border: 'border-indigo-100' },
        { bg: 'from-orange-400 to-orange-500', text: 'text-orange-600', selectBg: 'bg-orange-500', border: 'border-orange-100' },
        { bg: 'from-sky-500 to-sky-400', text: 'text-sky-600', selectBg: 'bg-sky-500', border: 'border-sky-100' },
        { bg: 'from-emerald-500 to-emerald-400', text: 'text-emerald-600', selectBg: 'bg-emerald-500', border: 'border-emerald-100' },
        { bg: 'from-indigo-600 to-indigo-500', text: 'text-indigo-600', selectBg: 'bg-indigo-600', border: 'border-indigo-100' },
        { bg: 'from-amber-500 to-amber-400', text: 'text-amber-500', selectBg: 'bg-amber-500', border: 'border-amber-100' },
        { bg: 'from-violet-600 to-violet-500', text: 'text-violet-600', selectBg: 'bg-violet-600', border: 'border-violet-100' },
        { bg: 'from-red-500 to-rose-400', text: 'text-red-600', selectBg: 'bg-red-500', border: 'border-red-100' }
      ];
      const theme = themes[idx % themes.length];

      return (
        <div
          key={p.id}
          className="flex flex-col rounded-[24px] overflow-hidden transition-all duration-300 bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:scale-[1.01]"
        >
          {/* Header section */}
          <div className={`py-6 bg-gradient-to-br ${theme.bg} text-white flex flex-col items-center justify-center relative min-h-[120px]`}>
            <span className="text-4xl font-extrabold tracking-tight">{numericSpeed || '0'}</span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-90 mt-0.5">Mbps</span>
            
            <span
              className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/20 text-white`}
            >
              {p.status}
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xs font-extrabold text-slate-800 tracking-tight leading-snug">
                  {p.name}
                </h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  {numericSpeed} Mbps (24 Hours || Shared)
                </p>
                <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 border border-slate-200/60 rounded-full text-[9px] font-extrabold text-slate-500">
                  {isMobile ? 'মোবাইল প্যাকেজ' : 'রাউটার প্যাকেজ'}
                </span>
              </div>

              {/* Feature details */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <span className={`w-3.5 h-3.5 rounded-full ${theme.selectBg} text-white flex items-center justify-center text-[8px] flex-shrink-0`}>✓</span>
                  <span>Bandwidth Shared (1:8 Ratio)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <span className={`w-3.5 h-3.5 rounded-full ${theme.selectBg} text-white flex items-center justify-center text-[8px] flex-shrink-0`}>✓</span>
                  <span>Optical Fiber Connection</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <span className={`w-3.5 h-3.5 rounded-full ${theme.selectBg} text-white flex items-center justify-center text-[8px] flex-shrink-0`}>✓</span>
                  <span>Connection Charge Free</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <span className={`w-3.5 h-3.5 rounded-full ${theme.selectBg} text-white flex items-center justify-center text-[8px] flex-shrink-0`}>✓</span>
                  <span>24/7 Customer Support</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="flex flex-col items-center mb-4">
                <span className={`text-2xl font-black ${theme.text}`}>৳{p.price}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Per Month</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(p)}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title={p.status === 'active' ? 'Deactivate' : 'Activate'}
                >
                  {p.status === 'active' ? (
                    <Pause className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-teal-500" />
                  )}
                </button>
                <button
                  onClick={() => setDeleteConfirmId(p.id)}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>'''

if target in content:
    print("Direct match found!")
    new_content = content.replace(target, replacement)
    with open(path, 'w') as f:
        f.write(new_content)
    print("File successfully updated!")
else:
    print("Direct match failed. Trying normalized match.")
    # Fallback to normalized replacement
    normalized_target = target.replace('\r\n', '\n').strip()
    normalized_content = content.replace('\r\n', '\n')
    if normalized_target in normalized_content:
        print("Normalized match found!")
        new_content = normalized_content.replace(normalized_target, replacement)
        with open(path, 'w') as f:
            f.write(new_content)
        print("File successfully updated with normalization!")
    else:
        print("Could not match package grid block.")
