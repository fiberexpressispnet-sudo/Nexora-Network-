import sys
content = open('src/components/pages/ClientDashboard.tsx').read()
start_marker = "        {/* 5. Receipts Tab */}"
end_marker = "      </div>\n\n      {/* ICONIC BKASH/NAGAD CHECKOUT MODAL */}"
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

new_receipts = """
        {/* 5. Receipts Tab */}
        {activeTab === 'receipts' && (
          <div className="bg-white border-t-[3px] border-[#00a65a] p-4 sm:p-6 rounded shadow-sm animate-in fade-in duration-300 space-y-4">
            <h2 className="text-base font-medium text-slate-800 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-[#00a65a]" /> Member Ledger Panel
            </h2>
            {billingHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">কোনো বিলিং রশিদ পাওয়া যায়নি।</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border border-slate-200">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Transaction ID</th>
                      <th className="px-4 py-3">Particulars</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((rec, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{rec.timestamp}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 text-xs">{rec.id}</td>
                        <td className="px-4 py-3 text-slate-600">
                          Package Renew: {rec.package} ({rec.paymentMethod})
                        </td>
                        <td className="px-4 py-3 text-right text-rose-500 font-semibold">৳{rec.amount}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-semibold">৳{rec.amount}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(rec)}
                            className="px-3 py-1.5 bg-[#00c0ef] hover:bg-[#0097bc] text-white rounded text-xs font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
"""

open('src/components/pages/ClientDashboard.tsx', 'w').write(before + new_receipts + "\n      </div>\n\n      {/* ICONIC BKASH/NAGAD CHECKOUT MODAL */}" + after)
