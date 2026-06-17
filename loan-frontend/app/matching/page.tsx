"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function MatchingPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<any>(null);
  const [selectedLoan, setSelectedLoan] = useState("");
  const [matchType, setMatchType] = useState("repayment");
  const [matching, setMatching] = useState(false);
  const [message, setMessage] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    loan_id: "", amount: "", source: "cash", transaction_code: "", notes: "", type: "repayment"
  });
  const [saving, setSaving] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!["admin", "cashier"].includes(user.role)) { router.push("/dashboard"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txRes, loanRes] = await Promise.all([
        fetch(`${API}/api/payments/unmatched`, { headers: getHeaders() }),
        fetch(`${API}/api/loans`, { headers: getHeaders() })
      ]);
      const txData = await txRes.json();
      const loanData = await loanRes.json();
      setTransactions(Array.isArray(txData) ? txData : []);
      setLoans(Array.isArray(loanData) ? loanData.filter((l: any) => ["approved", "active"].includes(l.status)) : []);
    } catch {}
    setLoading(false);
  };

  const handleMatch = async () => {
    if (!matchModal || !selectedLoan) return;
    setMatching(true);
    try {
      const res = await fetch(`${API}/api/payments/match`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          transaction_id: matchModal.id,
          loan_id: parseInt(selectedLoan),
          type: matchType
        })
      });
      const data = await res.json();
      if (data.error) { setMessage("Error: " + data.error); }
      else {
        setMessage("✅ Payment matched successfully!");
        setMatchModal(null);
        setSelectedLoan("");
        loadData();
      }
    } catch { setMessage("Failed to match payment"); }
    setMatching(false);
  };

  const handleManualPayment = async () => {
    if (!manualForm.loan_id || !manualForm.amount) return;
    setSaving(true);
    try {
      const payload = {
        loan_id: parseInt(manualForm.loan_id),
        amount: parseFloat(manualForm.amount),
        source: manualForm.source || "cash",
        transaction_code: manualForm.transaction_code || "",
        notes: manualForm.notes || "",
        type: manualForm.type || "repayment"
      };

      // FIXED: Added the missing fetch request execution
      const res = await fetch(`${API}/api/payments/manual`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.error) { setMessage("Error: " + data.error); }
      else {
        setMessage("✅ Payment recorded successfully!");
        setShowManual(false);
        // FIXED: Included type reset in form cleanup
        setManualForm({ loan_id: "", amount: "", source: "cash", transaction_code: "", notes: "", type: "repayment" });
        loadData();
      }
    } catch (e: any) { setMessage("Failed to record payment: " + e.message); }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-4 md:px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600 text-sm">Dashboard</button>
          <button onClick={() => router.push("/approvals")} className="text-gray-600 hover:text-blue-600 text-sm">Approvals</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600 text-sm">Payments</button>
          <button onClick={() => router.push("/reports")} className="text-gray-600 hover:text-blue-600 text-sm">Reports</button>
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600 text-sm">📅 PAR</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600 text-sm">Statement</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 text-sm">Logout</button>
        </div>
      </nav>

      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Payment Matching</h2>
            <p className="text-gray-500 text-sm mt-1">Match incoming KCB Paybill 522522 payments to loans</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowManual(!showManual)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
              + Manual Payment
            </button>
            <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
              🔄 Refresh
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message}
            <button onClick={() => setMessage("")} className="ml-4 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 font-medium">📱 KCB Paybill Payment Instructions for Customers</p>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Paybill:</span> <span className="font-bold">522522</span></div>
            <div><span className="text-gray-500">Account:</span> <span className="font-bold">8086860</span></div>
            <div><span className="text-gray-500">Amount:</span> <span className="font-bold">As instructed</span></div>
          </div>
        </div>

        {/* Manual Payment Form */}
        {showManual && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-green-500">
            <h3 className="font-bold text-lg mb-4 text-green-700">📝 Record Manual Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Loan *</label>
                <select value={manualForm.loan_id}
                  onChange={e => setManualForm({...manualForm, loan_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">-- Select loan --</option>
                  {loans.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      #{l.id} — {l.customer_name} — KSh {parseFloat(l.amount).toLocaleString()} ({l.status}) — Balance: KSh {parseFloat(l.balance || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Added Payment Type Selectors right here after Loan selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setManualForm({...manualForm, type: "repayment"})}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${manualForm.type === "repayment" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                    💳 Loan Repayment
                  </button>
                  <button type="button" onClick={() => setManualForm({...manualForm, type: "processing_fee"})}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${manualForm.type === "processing_fee" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                    🏷 Processing Fee
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KSh) *</label>
                <input type="number" value={manualForm.amount}
                  onChange={e => setManualForm({...manualForm, amount: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 1000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Source</label>
                <select value={manualForm.source}
                  onChange={e => setManualForm({...manualForm, source: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="cash">💵 Cash</option>
                  <option value="mpesa">📱 M-PESA</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="kcb_paybill">KCB Paybill</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {manualForm.source === "mpesa" ? "M-PESA Code" : "Receipt No."}
                </label>
                <input type="text" value={manualForm.transaction_code}
                  onChange={e => setManualForm({...manualForm, transaction_code: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder={manualForm.source === "mpesa" ? "e.g. QA12BC345" : "Optional"} />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <input type="text" value={manualForm.notes}
                  onChange={e => setManualForm({...manualForm, notes: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Customer paid at office" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleManualPayment}
                disabled={saving || !manualForm.loan_id || !manualForm.amount}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm">
                {saving ? "Saving..." : "✅ Record Payment"}
              </button>
              <button onClick={() => setShowManual(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Unmatched Transactions Table */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3">📥 Unmatched KCB Paybill Payments</h3>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-4xl mb-4">✅</p>
              <p className="text-gray-500 font-medium">No unmatched payments</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b bg-yellow-50">
                <p className="text-yellow-800 font-medium">⚠ {transactions.length} unmatched payment{transactions.length > 1 ? "s" : ""} waiting</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="p-4">Transaction Ref</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-mono text-xs">{tx.transaction_reference}</td>
                        <td className="p-4 font-bold text-green-600">KSh {parseFloat(tx.amount).toLocaleString()}</td>
                        <td className="p-4">{tx.customer_name || "—"}</td>
                        <td className="p-4 text-gray-500">{tx.customer_phone || "—"}</td>
                        <td className="p-4 text-gray-400">{new Date(tx.created_at).toLocaleString()}</td>
                        <td className="p-4">
                          <button onClick={() => { setMatchModal(tx); setSelectedLoan(""); setMatchType("repayment"); }}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
                            🔗 Match
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Match Modal */}
      {matchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4 text-blue-600">Match Payment to Loan</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-mono text-sm">{matchModal.transaction_reference}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">KSh {parseFloat(matchModal.amount).toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{matchModal.customer_name} · {matchModal.customer_phone}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
              <div className="flex gap-3">
                <button onClick={() => setMatchType("repayment")}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium ${matchType === "repayment" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border-gray-300"}`}>
                  💳 Loan Repayment
                </button>
                <button onClick={() => setMatchType("processing_fee")}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium ${matchType === "processing_fee" ? "bg-orange-500 text-white" : "bg-white text-gray-600 border-gray-300"}`}>
                  🏷 Processing Fee
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Loan</label>
              <select value={selectedLoan} onChange={e => setSelectedLoan(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">-- Select loan --</option>
                {loans.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    #{l.id} — {l.customer_name} — KSh {parseFloat(l.amount).toLocaleString()} ({l.status}) Balance: KSh {parseFloat(l.balance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleMatch} disabled={!selectedLoan || matching}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                {matching ? "Matching..." : "✅ Confirm Match"}
              </button>
              <button onClick={() => setMatchModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}