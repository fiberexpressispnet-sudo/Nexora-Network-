import sys
content = open('src/components/pages/ClientDashboard.tsx').read()

# Fix Renew Tab
content = content.replace(
    '          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-3xl animate-in fade-in duration-300">',
    '          <div className="bg-white border-t-[3px] border-[#3c8dbc] p-4 sm:p-6 rounded shadow-sm animate-in fade-in duration-300">'
)
content = content.replace(
    '            <h2 className="text-base font-extrabold text-white mb-2 flex items-center gap-2">',
    '            <h2 className="text-base font-medium text-slate-800 mb-2 flex items-center gap-2">'
)
content = content.replace(
    '            <p className="text-xs text-slate-400 mb-6 max-w-lg">',
    '            <p className="text-xs text-slate-500 mb-6 max-w-lg">'
)
content = content.replace(
    '                    className={`relative p-4 rounded-2xl border-2 text-left transition-all cursor-pointer overflow-hidden ${',
    '                    className={`relative p-4 rounded shadow-sm border text-left transition-all cursor-pointer overflow-hidden ${'
)
content = content.replace(
    "                      selectedPackage === pkg.name ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'",
    "                      selectedPackage === pkg.name ? 'border-[#3c8dbc] bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'"
)
content = content.replace(
    '                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800">',
    '                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">'
)
content = content.replace(
    '                        <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 uppercase tracking-wider">',
    '                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">'
)
content = content.replace(
    '                        <h3 className="font-black text-white text-base mt-2 flex items-center gap-1.5 group-hover:text-cyan-400 transition-colors">',
    '                        <h3 className="font-semibold text-slate-800 text-base mt-2 flex items-center gap-1.5 transition-colors">'
)
content = content.replace(
    '                          <span className="text-xl text-cyan-400">৳{pkg.price}</span><span className="text-slate-500 font-medium">/month</span>',
    '                          <span className="text-xl text-[#3c8dbc]">৳{pkg.price}</span><span className="text-slate-500 font-medium">/month</span>'
)
content = content.replace(
    '                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 mb-6">',
    '                  <div className="p-4 bg-slate-50 rounded shadow-sm border border-slate-200 mb-6">'
)
content = content.replace(
    '                    <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">',
    '                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">'
)
content = content.replace(
    '                        className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${',
    '                        className={`p-3 rounded border-2 flex items-center justify-center gap-2 transition-all cursor-pointer bg-white ${'
)
content = content.replace(
    "                          selectedPaymentMethod === 'bKash' ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/10' : 'border-slate-800 hover:border-slate-700'",
    "                          selectedPaymentMethod === 'bKash' ? 'border-[#E2125B] shadow-md' : 'border-slate-200 hover:border-pink-300'"
)
content = content.replace(
    "                          selectedPaymentMethod === 'Nagad' ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10' : 'border-slate-800 hover:border-slate-700'",
    "                          selectedPaymentMethod === 'Nagad' ? 'border-[#F04D22] shadow-md' : 'border-slate-200 hover:border-orange-300'"
)
content = content.replace(
    "                          selectedPaymentMethod === 'Rocket' ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10' : 'border-slate-800 hover:border-slate-700'",
    "                          selectedPaymentMethod === 'Rocket' ? 'border-[#8c2a91] shadow-md' : 'border-slate-200 hover:border-purple-300'"
)
content = content.replace(
    '                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors border-cyan-500">',
    '                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors border-[#3c8dbc]">'
)
content = content.replace(
    '                        <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full" />',
    '                        <div className="w-2.5 h-2.5 bg-[#3c8dbc] rounded-full" />'
)
content = content.replace(
    '                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">',
    '                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded flex items-start gap-3">'
)
content = content.replace(
    '                      <p className="text-xs text-emerald-300 leading-relaxed font-medium">',
    '                      <p className="text-xs text-emerald-700 leading-relaxed font-medium">'
)
content = content.replace(
    '                    <button',
    '                    <button'
)

# Fix Tickets (Complaints) Tab
content = content.replace(
    '        {activeTab === \'tickets\' && (',
    '        {/* 4. Complaints Tab */}\n        {activeTab === \'tickets\' && ('
)
content = content.replace(
    '          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">',
    '          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">\n            {/* New Ticket Form */}'
)
content = content.replace(
    '            <div className="md:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-3xl h-fit">',
    '            <div className="md:col-span-1 bg-white border-t-[3px] border-[#dd4b39] p-6 rounded shadow-sm h-fit">'
)
content = content.replace(
    '              <h2 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2">',
    '              <h2 className="text-sm font-medium text-slate-800 mb-4 flex items-center gap-2">'
)
content = content.replace(
    '                <label className="block text-xs font-bold text-slate-400 mb-1.5">বিষয় / ক্যাটাগরি</label>',
    '                <label className="block text-xs font-bold text-slate-600 mb-1.5">বিষয় / ক্যাটাগরি</label>'
)
content = content.replace(
    '                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"',
    '                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#3c8dbc]"'
)
content = content.replace(
    '                <label className="block text-xs font-bold text-slate-400 mb-1.5">বিস্তারিত বিবরণ</label>',
    '                <label className="block text-xs font-bold text-slate-600 mb-1.5">বিস্তারিত বিবরণ</label>'
)
content = content.replace(
    '                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[100px]"',
    '                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#3c8dbc] min-h-[100px]"'
)
content = content.replace(
    '                <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">',
    '                <button type="submit" className="w-full bg-[#dd4b39] hover:bg-red-600 text-white font-medium py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors">'
)

content = content.replace(
    '            <div className="md:col-span-2 space-y-4">',
    '            <div className="md:col-span-2 space-y-4">\n              {/* Ticket List */}'
)
content = content.replace(
    '              <h2 className="text-sm font-extrabold text-white mb-2 flex items-center gap-2">',
    '              <h2 className="text-sm font-medium text-slate-800 mb-2 flex items-center gap-2">'
)
content = content.replace(
    '                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center">',
    '                  <div className="bg-white border border-slate-200 p-8 rounded shadow-sm text-center">'
)
content = content.replace(
    '                    <p className="text-slate-400 text-sm mt-2">আপনার কোনো অভিযোগ লিস্টে নেই।</p>',
    '                    <p className="text-slate-500 text-sm mt-2">আপনার কোনো অভিযোগ লিস্টে নেই।</p>'
)
content = content.replace(
    '                    <div key={t.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl hover:border-slate-700 transition-colors">',
    '                    <div key={t.id} className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-[#3c8dbc] transition-colors">'
)
content = content.replace(
    '                          <h3 className="text-sm font-extrabold text-white">{t.subject}</h3>',
    '                          <h3 className="text-sm font-semibold text-slate-800">{t.subject}</h3>'
)
content = content.replace(
    '                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">',
    '                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">'
)
content = content.replace(
    '                        <p className="text-xs text-slate-300 mt-2 line-clamp-2">{t.description}</p>',
    '                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{t.description}</p>'
)

# Fix Receipts Tab
content = content.replace(
    '        {activeTab === \'receipts\' && (',
    '        {/* 5. Receipts Tab */}\n        {activeTab === \'receipts\' && ('
)
content = content.replace(
    '          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl animate-in fade-in duration-300 space-y-4">',
    '          <div className="bg-white border-t-[3px] border-[#00a65a] p-6 rounded shadow-sm animate-in fade-in duration-300 space-y-4">'
)
content = content.replace(
    '            <h2 className="text-base font-extrabold text-white flex items-center gap-2">',
    '            <h2 className="text-base font-medium text-slate-800 flex items-center gap-2">'
)
content = content.replace(
    '                  <div key={i} className="bg-slate-950 p-4 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">',
    '                  <div key={i} className="bg-slate-50 p-4 border border-slate-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">'
)
content = content.replace(
    '                        <span className="text-xs font-extrabold text-white">৳{rec.amount}</span>',
    '                        <span className="text-xs font-semibold text-slate-800">৳{rec.amount}</span>'
)
content = content.replace(
    '                      <span className="text-[10px] text-slate-400 block">{rec.timestamp}</span>',
    '                      <span className="text-[10px] text-slate-500 block">{rec.timestamp}</span>'
)
content = content.replace(
    '                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[10px] font-extrabold flex items-center gap-1 border border-slate-700/80 self-start sm:self-auto cursor-pointer"',
    '                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded text-[10px] font-semibold flex items-center gap-1 border border-slate-300 self-start sm:self-auto cursor-pointer"'
)

# Fix Ping Test Tab
content = content.replace(
    '        {activeTab === \'diagnostics\' && (',
    '        {/* 3. Diagnostics Tab */}\n        {activeTab === \'diagnostics\' && ('
)
content = content.replace(
    '          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl animate-in fade-in duration-300 text-center">',
    '          <div className="bg-white border-t-[3px] border-[#f39c12] p-6 rounded shadow-sm animate-in fade-in duration-300 text-center">'
)
content = content.replace(
    '            <h2 className="text-base font-extrabold text-white mb-2 flex items-center justify-center gap-2">',
    '            <h2 className="text-base font-medium text-slate-800 mb-2 flex items-center justify-center gap-2">'
)
content = content.replace(
    '            <p className="text-xs text-slate-400 mb-8 max-w-md mx-auto">',
    '            <p className="text-xs text-slate-500 mb-8 max-w-md mx-auto">'
)
content = content.replace(
    '              <button',
    '              <button'
)

open('src/components/pages/ClientDashboard.tsx', 'w').write(content)
