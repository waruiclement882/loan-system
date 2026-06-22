"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "https://loan-system-h794.onrender.com";

export default function FloatPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    person_name: "",
    amount_given: "",
    amount_returned: "",
    notes: "",
    transaction_date: new Date().toISOString().split("T")[0],
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/float`, { headers });
      const d = await res.json();
      setData(d);
    } catch { }
    setLoading(false);
  };

  const profit = form.amount_given && form.amount_returned
    ? parseFloat(form.amount_returned) - parseFloat(form.amount_given)
    : null;

  const handleSubmit = async () => {
    if (!form.person_name || !form.amount_given || !form.amount_returned) {
      setMsg({ type: "error", text: "Please fill in all required fields" });
      return;
    }
    if (profit !== null && profit < 0) {
      setMsg({ type: "error", text: "Amount returned must be greater than amount given" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/float`, {
        method: "POST", headers,
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.error) {
        setMsg({ type: "error", text: d.error });
      } else {
        setMsg({ type: "success", text: "Float transaction recorded successfully!" });
        setForm({ person_name: "", amount_given: "", amount_returned: "", notes: "", transaction_date: new Date().toISOString().split("T")[0] });
        setShowForm(false);
        loadData();
      }
    } catch {
      setMsg({ type: "error", text: "Failed to record transaction" });
    }
    setSubmitting(false);
    setTimeout(() => setMsg(null), 4000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await fetch(`${API}/api/float/${id}`, { method: "DELETE", headers });
      loadData();
    } catch { }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4 text-sm">
          {["dashboard", "loans", "customers", "payments"].map(p => (
            <button key={p} onClick={() => router.push("/" + p)}
              className="text-slate-500 hover:text-blue-600 capitalize transition-colors">{p}</button>
          ))}
          <button onClick={() => router.push("/reports")} className="text-slate-500 hover:text-blue-600">Reports</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-400 hover:text-red-600">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">💰 Float Income</h2>
            <p className="text-slate-400 text-sm mt-0.5">Track same-day lending and passive income</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadData}
              className="text-sm text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
              🔄 Refresh
            </button>
            <button onClick={() => setShowForm(!showForm)}
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
              + Record Float
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {data && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Total Given Out</p>
              <p className="text-2xl font-bold text-slate-700">KES {parseFloat(data.totalGivenOut || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Total Returned</p>
              <p className="text-2xl font-bold text-blue-600">KES {parseFloat(data.totalReturned || 0).toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
              <p className="text-xs text-emerald-500 mb-1">Total Float Income</p>
              <p className="text-2xl font-bold text-emerald-600">KES {parseFloat(data.totalProfit || 0).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Flash message */}
        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm border flex items-center gap-2 ${
            msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
          }`}>
            {msg.type === "success" ? "✅" : "⚠️"} {msg.text}
          </div>
        )}

        {/* Record Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h3 className="font-semibold text-slate-700 mb-4">Record Float Transaction</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Person Name *</label>
                <input
                  placeholder="e.g. John Kamau"
                  value={form.person_name}
                  onChange={e => setForm({ ...form, person_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Date *</label>
                <input
                  type="date"
                  value={form.transaction_date}
                  onChange={e => setForm({ ...form, transaction_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Amount Given Out (KES) *</label>
                <input
                  type="number"
                  placeholder="e.g. 4050"
                  value={form.amount_given}
                  onChange={e => setForm({ ...form, amount_given: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Amount Returned (KES) *</label>
                <input
                  type="number"
                  placeholder="e.g. 4420"
                  value={form.amount_returned}
                  onChange={e => setForm({ ...form, amount_returned: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1 font-medium">Notes</label>
                <input
                  placeholder="Optional notes"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>

            {/* Profit preview */}
            {profit !== null && (
              <div className={`rounded-xl p-4 mb-4 border ${profit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Given Out</p>
                    <p className="font-bold text-slate-700">KES {parseFloat(form.amount_given || "0").toLocaleString()}</p>
                  </div>
                  <span className="text-slate-400 text-xl">→</span>
                  <div>
                    <p className="text-xs text-slate-500">Returned</p>
                    <p className="font-bold text-slate-700">KES {parseFloat(form.amount_returned || "0").toLocaleString()}</p>
                  </div>
                  <span className="text-slate-400 text-xl">=</span>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Float Income</p>
                    <p className={`text-xl font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      KES {profit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleSubmit} disabled={submitting}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {submitting ? "Saving..." : "💾 Save Transaction"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="text-slate-500 border border-slate-200 px-5 py-2 rounded-lg text-sm hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Transaction History</h3>
            <span className="text-xs text-slate-400">{data?.transactions?.length || 0} records</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          ) : !data?.transactions?.length ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">💰</p>
              <p className="text-slate-400 text-sm">No float transactions recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Date", "Person", "Given Out", "Returned", "Float Income", "Notes", ""].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx: any) => (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {new Date(tx.transaction_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{tx.person_name}</td>
                      <td className="py-3 px-4 text-slate-600">KES {parseFloat(tx.amount_given).toLocaleString()}</td>
                      <td className="py-3 px-4 text-blue-600">KES {parseFloat(tx.amount_returned).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-600">KES {parseFloat(tx.profit).toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{tx.notes || "—"}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleDelete(tx.id)}
                          className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-2 py-1 rounded-lg transition-colors">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 font-semibold text-slate-600 text-sm">Totals</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">KES {parseFloat(data.totalGivenOut || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold text-blue-600">KES {parseFloat(data.totalReturned || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">KES {parseFloat(data.totalProfit || 0).toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
