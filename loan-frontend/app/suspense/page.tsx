"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function SuspensePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("pending");
  const [pending, setPending] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyForm, setApplyForm] = useState<any>({ customer_id: "", amount: "", use_case: "installment", loan_id: "", notes: "" });
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, balancesRes] = await Promise.all([
        fetch(`${API}/api/suspense/pending`, { headers }),
        fetch(`${API}/api/suspense/balances`, { headers })
      ]);
      const pendingData = await pendingRes.json();
      const balancesData = await balancesRes.json();
      setPending(Array.isArray(pendingData) ? pendingData : []);
      setBalances(Array.isArray(balancesData) ? balancesData : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const approveOverpayment = async (id: number) => {
    if (!confirm("Approve this overpayment and move to suspense balance?")) return;
    try {
      const res = await fetch(`${API}/api/suspense/pending/${id}/approve`, { method: "POST", headers });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { alert("✅ Overpayment approved and moved to suspense"); loadData(); }
    } catch { alert("Failed to approve"); }
  };

  const loadHistory = async (customerId: number, customerName: string) => {
    try {
      const res = await fetch(`${API}/api/suspense/history/${customerId}`, { headers });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
      setSelectedCustomer(customerName);
      setShowHistory(true);
    } catch { alert("Failed to load history"); }
  };

  const handleApply = async () => {
    if (!applyForm.customer_id || !applyForm.amount || !applyForm.use_case) {
      alert("Customer, amount and use case are required");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`${API}/api/suspense/apply`, {
        method: "POST", headers,
        body: JSON.stringify(applyForm)
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        alert("✅ Suspense balance applied successfully");
        setShowApplyForm(false);
        setApplyForm({ customer_id: "", amount: "", use_case: "installment", loan_id: "", notes: "" });
        loadData();
      }
    } catch { alert("Failed to apply suspense"); }
    setApplying(false);
  };

  const tabs = [
    { key: "pending", label: "⏳ Pending Overpayments", count: pending.length },
    { key: "balances", label: "💰 Suspense Balances", count: balances.length },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4 items-center">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600 text-sm">Dashboard</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600 text-sm">Loans</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600 text-sm">Payments</button>
          <button onClick={() => router.push("/matching")} className="text-gray-600 hover:text-blue-600 text-sm">Match</button>
          <button onClick={() => router.push("/reports")} className="text-gray-600 hover:text-blue-600 text-sm">Reports</button>
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600 text-sm">📅 PAR</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600 text-sm">Statement</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 text-sm">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">💼 Suspense Account</h2>
          <div className="flex gap-2">
            <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">🔄 Refresh</button>
            {balances.length > 0 && (
              <button onClick={() => setShowApplyForm(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                + Apply Suspense
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Pending Overpayments</p>
            <p className="text-3xl font-bold text-orange-600">{pending.length}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting admin review</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Customers with Balance</p>
            <p className="text-3xl font-bold text-blue-600">{balances.length}</p>
            <p className="text-xs text-gray-400 mt-1">Have suspense funds</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Suspense Funds</p>
            <p className="text-3xl font-bold text-green-600">
              KSh {balances.reduce((s, b) => s + parseFloat(b.suspense_balance || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">Across all customers</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Pending Overpayments Tab */}
            {activeTab === "pending" && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="font-bold text-lg">⏳ Overpayments Awaiting Review</h3>
                  <p className="text-sm text-gray-500 mt-1">These payments exceeded the loan balance. Review and approve to move excess to suspense.</p>
                </div>
                {pending.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="text-gray-500">No pending overpayments</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-left text-gray-500">
                        <th className="px-6 py-3">Customer</th>
                        <th className="px-6 py-3">Loan #</th>
                        <th className="px-6 py-3">Payment Amount</th>
                        <th className="px-6 py-3">Balance Before</th>
                        <th className="px-6 py-3">Excess (Overpayment)</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((op: any) => (
                        <tr key={op.id} className="border-b hover:bg-orange-50">
                          <td className="px-6 py-3 font-medium">{op.customer_name}</td>
                          <td className="px-6 py-3 text-blue-600">#{op.loan_id}</td>
                          <td className="px-6 py-3">KSh {parseFloat(op.payment_amount).toLocaleString()}</td>
                          <td className="px-6 py-3">KSh {parseFloat(op.loan_balance_before).toLocaleString()}</td>
                          <td className="px-6 py-3 font-bold text-orange-600">KSh {parseFloat(op.excess_amount).toLocaleString()}</td>
                          <td className="px-6 py-3 text-gray-400">{new Date(op.detected_at).toLocaleDateString("en-KE")}</td>
                          <td className="px-6 py-3">
                            <button onClick={() => approveOverpayment(op.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">
                              ✅ Approve to Suspense
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Suspense Balances Tab */}
            {activeTab === "balances" && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="font-bold text-lg">💰 Customer Suspense Balances</h3>
                  <p className="text-sm text-gray-500 mt-1">Customers with funds held in suspense. Apply to loans or process refunds.</p>
                </div>
                {balances.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-4xl mb-3">💼</p>
                    <p className="text-gray-500">No suspense balances</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-left text-gray-500">
                        <th className="px-6 py-3">Customer</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3">Suspense Balance</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.map((b: any) => (
                        <tr key={b.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium">{b.name}</td>
                          <td className="px-6 py-3 text-gray-500">{b.phone}</td>
                          <td className="px-6 py-3 font-bold text-green-600">KSh {parseFloat(b.suspense_balance).toLocaleString()}</td>
                          <td className="px-6 py-3 flex gap-2">
                            <button onClick={() => {
                              setApplyForm({ ...applyForm, customer_id: b.id, amount: b.suspense_balance });
                              setShowApplyForm(true);
                            }} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
                              Apply
                            </button>
                            <button onClick={() => loadHistory(b.id, b.name)}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-200">
                              History
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        {/* Apply Suspense Modal */}
        {showApplyForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-4">Apply Suspense Balance</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">Customer ID</label>
                  <input value={applyForm.customer_id} onChange={e => setApplyForm({ ...applyForm, customer_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Customer ID" />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Amount (KSh)</label>
                  <input type="number" value={applyForm.amount} onChange={e => setApplyForm({ ...applyForm, amount: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Amount" />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Use Case</label>
                  <select value={applyForm.use_case} onChange={e => setApplyForm({ ...applyForm, use_case: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                    <option value="installment">Apply to Loan Installment</option>
                    <option value="processing_fee">Pay Processing Fee</option>
                    <option value="refund">Refund to Customer</option>
                  </select>
                </div>
                {(applyForm.use_case === "installment" || applyForm.use_case === "processing_fee") && (
                  <div>
                    <label className="text-sm text-gray-500">Loan ID</label>
                    <input value={applyForm.loan_id} onChange={e => setApplyForm({ ...applyForm, loan_id: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Loan ID" />
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">Notes (optional)</label>
                  <input value={applyForm.notes} onChange={e => setApplyForm({ ...applyForm, notes: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Notes" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleApply} disabled={applying}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                  {applying ? "Applying..." : "✅ Apply"}
                </button>
                <button onClick={() => setShowApplyForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Suspense History — {selectedCustomer}</h3>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              {history.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No transactions found</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-gray-500">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Source</th>
                      <th className="px-4 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h: any) => (
                      <tr key={h.id} className="border-b">
                        <td className="px-4 py-2 text-gray-400">{new Date(h.created_at).toLocaleDateString("en-KE")}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${h.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {h.type === "credit" ? "↑ Credit" : "↓ Debit"}
                          </span>
                        </td>
                        <td className={`px-4 py-2 font-bold ${h.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                          KSh {parseFloat(h.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{h.source}</td>
                        <td className="px-4 py-2 text-gray-400">{h.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
