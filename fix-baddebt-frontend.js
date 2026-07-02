const fs = require('fs');
const filePath = 'loan-frontend/app/expenses/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add written-off state variables after existing states
content = content.replace(
  `const [totalExpenses, setTotalExpenses] = useState(0);`,
  `const [totalExpenses, setTotalExpenses] = useState(0);
  const [writtenOff, setWrittenOff] = useState<any>({ loans: [], totalWrittenOff: 0, totalRecovered: 0 });
  const [recoveryForm, setRecoveryForm] = useState({ loan_id: "", amount: "", transaction_code: "", notes: "" });
  const [showRecoveryForm, setShowRecoveryForm] = useState<number | null>(null);
  const [submittingRecovery, setSubmittingRecovery] = useState(false);`
);

// 2. Add loadWrittenOff function after loadPnl
content = content.replace(
  `const handleSubmit = async () => {`,
  `const loadWrittenOff = async () => {
    try {
      const res = await fetch(\`\${API}/api/expenses/written-off\`, { headers });
      const data = await res.json();
      setWrittenOff(data || { loans: [], totalWrittenOff: 0, totalRecovered: 0 });
    } catch {}
  };

  const handleBadDebtRecovery = async (loanId: number) => {
    if (!recoveryForm.amount) { setMsg({ type: "error", text: "Amount is required" }); return; }
    setSubmittingRecovery(true);
    try {
      const res = await fetch(\`\${API}/api/expenses/bad-debt-recovery\`, {
        method: "POST", headers,
        body: JSON.stringify({ loan_id: loanId, ...recoveryForm })
      });
      const data = await res.json();
      if (data.error) setMsg({ type: "error", text: data.error });
      else {
        setMsg({ type: "success", text: data.message });
        setShowRecoveryForm(null);
        setRecoveryForm({ loan_id: "", amount: "", transaction_code: "", notes: "" });
        loadWrittenOff();
      }
    } catch { setMsg({ type: "error", text: "Failed to record recovery" }); }
    setSubmittingRecovery(false);
  };

  const handleSubmit = async () => {`
);

// 3. Add loadWrittenOff to useEffect
content = content.replace(
  `loadCategories(); loadExpenses(); loadPnl();`,
  `loadCategories(); loadExpenses(); loadPnl(); loadWrittenOff();`
);

// 4. Add Written Off tab to the tabs list
content = content.replace(
  `{ key: "new_loans", label: "✨ New Loans This Month" },`,
  `{ key: "new_loans", label: "✨ New Loans This Month" },
                    { key: "bad_debt", label: "⚠️ Bad Debt" },`
);

// 5. Add bad debt to P&L summary cards - after Total Expenses card
content = content.replace(
  `<div className={`+ '`' + `border rounded-xl p-5 text-center \${pnl.net_profit >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}\`` + `}>`,
  `{pnl.bad_debt?.total > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                      <p className="text-xs text-red-400 font-medium uppercase tracking-wide">Bad Debt Written Off</p>
                      <p className="text-3xl font-bold text-red-700 mt-1">KES {fmt(pnl.bad_debt?.total || 0)}</p>
                      <p className="text-xs text-red-400 mt-1">{pnl.bad_debt?.count || 0} loan(s)</p>
                    </div>
                  )}
                  {pnl.bad_debt_recovery?.total > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                      <p className="text-xs text-green-400 font-medium uppercase tracking-wide">Bad Debt Recovered</p>
                      <p className="text-3xl font-bold text-green-700 mt-1">KES {fmt(pnl.bad_debt_recovery?.total || 0)}</p>
                    </div>
                  )}
                  <div className={\`border rounded-xl p-5 text-center \${pnl.net_profit >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}\`}>`
);

// 6. Add bad_debt tab content - find where new_loans tab content ends
const badDebtTab = `
                {/* Bad Debt Tab */}
                {pnlTab === "bad_debt" && (
                  <div>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-red-400 uppercase font-medium">Total Written Off</p>
                        <p className="text-2xl font-bold text-red-600">KES {(writtenOff.totalWrittenOff || 0).toLocaleString()}</p>
                        <p className="text-xs text-red-400 mt-1">{writtenOff.loans?.length || 0} loan(s)</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-green-400 uppercase font-medium">Total Recovered</p>
                        <p className="text-2xl font-bold text-green-600">KES {(writtenOff.totalRecovered || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-400 uppercase font-medium">Net Bad Debt Loss</p>
                        <p className="text-2xl font-bold text-gray-700">
                          KES {((writtenOff.totalWrittenOff || 0) - (writtenOff.totalRecovered || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Written Off Loans Table */}
                    {writtenOff.loans?.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">No written-off loans</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr className="text-left text-gray-500 border-b">
                              <th className="p-3">Loan</th>
                              <th className="p-3">Customer</th>
                              <th className="p-3">Written Off</th>
                              <th className="p-3">Recovered</th>
                              <th className="p-3">Net Loss</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {writtenOff.loans?.map((loan: any) => (
                              <tr key={loan.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">#{loan.id}</td>
                                <td className="p-3">{loan.customer_name}</td>
                                <td className="p-3 text-red-600 font-bold">KES {parseFloat(loan.written_off_amount || 0).toLocaleString()}</td>
                                <td className="p-3 text-green-600">KES {parseFloat(loan.recovered_amount || 0).toLocaleString()}</td>
                                <td className="p-3 text-gray-700 font-medium">
                                  KES {(parseFloat(loan.written_off_amount || 0) - parseFloat(loan.recovered_amount || 0)).toLocaleString()}
                                </td>
                                <td className="p-3 text-gray-400 text-xs">
                                  {loan.written_off_at ? new Date(loan.written_off_at).toLocaleDateString() : "—"}
                                </td>
                                <td className="p-3">
                                  {showRecoveryForm === loan.id ? (
                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                      <input type="number" placeholder="Amount (KES)"
                                        value={recoveryForm.amount}
                                        onChange={e => setRecoveryForm({...recoveryForm, amount: e.target.value})}
                                        className="border rounded px-2 py-1 text-xs w-full" />
                                      <input type="text" placeholder="Transaction code (optional)"
                                        value={recoveryForm.transaction_code}
                                        onChange={e => setRecoveryForm({...recoveryForm, transaction_code: e.target.value})}
                                        className="border rounded px-2 py-1 text-xs w-full" />
                                      <div className="flex gap-1">
                                        <button onClick={() => handleBadDebtRecovery(loan.id)}
                                          disabled={submittingRecovery}
                                          className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50">
                                          {submittingRecovery ? "..." : "✅ Save"}
                                        </button>
                                        <button onClick={() => setShowRecoveryForm(null)}
                                          className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button onClick={() => setShowRecoveryForm(loan.id)}
                                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
                                      + Recovery
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}`;

// Insert bad debt tab content before closing of P&L section
content = content.replace(
  `{/* P&L Sub-tabs */}`,
  badDebtTab + `\n                {/* P&L Sub-tabs */}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Bad debt frontend added!');
console.log('Has writtenOff state:', content.includes('writtenOff'));
console.log('Has bad_debt tab:', content.includes('pnlTab === "bad_debt"'));
console.log('Has recovery form:', content.includes('handleBadDebtRecovery'));