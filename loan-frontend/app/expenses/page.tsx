"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "https://loan-system-h794.onrender.com";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function ExpensesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("expenses");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pnl, setPnl] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState("");
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [form, setForm] = useState({
    category: "",
    description: "",
    amount: "",
    payment_method: "cash",
    reference: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };
  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadCategories();
    loadExpenses();
    loadPnl();
  }, []);

  useEffect(() => { loadExpenses(); }, [filterMonth, filterYear, filterCategory]);
  useEffect(() => { loadPnl(); }, [filterMonth, filterYear]);

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API}/api/expenses/categories`, { headers });
      const data = await res.json();
      setCategories(data.map((c: any) => c.name));
    } catch { }
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/expenses?month=${filterMonth}&year=${filterYear}`;
      if (filterCategory) url += `&category=${encodeURIComponent(filterCategory)}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      setExpenses(data.expenses || []);
      setTotalExpenses(data.total || 0);
    } catch { }
    setLoading(false);
  };

  const loadPnl = async () => {
    try {
      const res = await fetch(`${API}/api/expenses/pnl?month=${filterMonth}&year=${filterYear}`, { headers });
      const data = await res.json();
      setPnl(data);
    } catch { }
  };

  const handleSubmit = async () => {
    if (!form.category || !form.description || !form.amount) {
      setMsg({ type: "error", text: "Please fill in all required fields" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/expenses`, {
        method: "POST", headers, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) {
        setMsg({ type: "error", text: data.error });
      } else {
        setMsg({ type: "success", text: "Expense recorded successfully!" });
        setForm({ category: "", description: "", amount: "", payment_method: "cash", reference: "", expense_date: new Date().toISOString().split("T")[0] });
        setShowForm(false);
        loadExpenses();
        loadPnl();
      }
    } catch {
      setMsg({ type: "error", text: "Failed to record expense" });
    }
    setSubmitting(false);
    setTimeout(() => setMsg(null), 4000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this expense?")) return;
    await fetch(`${API}/api/expenses/${id}`, { method: "DELETE", headers });
    loadExpenses();
    loadPnl();
  };

  const getCategoryColor = (cat: string) => {
    const colors: any = {
      "Salaries": "bg-blue-100 text-blue-700",
      "Rent": "bg-purple-100 text-purple-700",
      "Airtime": "bg-green-100 text-green-700",
      "Transport": "bg-orange-100 text-orange-700",
      "Utilities": "bg-yellow-100 text-yellow-700",
      "Bad Debt": "bg-red-100 text-red-700",
      "Bank Charges": "bg-slate-100 text-slate-700",
      "Stationery": "bg-teal-100 text-teal-700",
      "Marketing": "bg-pink-100 text-pink-700",
    };
    return colors[cat] || "bg-slate-100 text-slate-600";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4 text-sm">
          {["dashboard", "loans", "customers", "payments"].map(p => (
            <button key={p} onClick={() => router.push("/" + p)}
              className="text-slate-500 hover:text-blue-600 capitalize">{p}</button>
          ))}
          <button onClick={() => router.push("/reports")} className="text-slate-500 hover:text-blue-600">Reports</button>
          <button onClick={() => router.push("/float")} className="text-slate-500 hover:text-blue-600">Float</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-400 hover:text-red-600">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">📊 Expenses & P&L</h2>
            <p className="text-slate-400 text-sm mt-0.5">Track operational costs and monthly profit & loss</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + Record Expense
          </button>
        </div>

        {/* Month/Year Filter */}
        <div className="flex items-center gap-3 mb-6 bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Period:</span>
          <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-sm font-medium text-slate-600">{MONTHS[filterMonth-1]} {filterYear}</span>
          <button onClick={() => window.print()}
            className="ml-auto text-sm text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
            🖨️ Print
          </button>
        </div>

        {/* Flash message */}
        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${
            msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
          }`}>
            {msg.type === "success" ? "✅" : "⚠️"} {msg.text}
          </div>
        )}

        {/* Record Expense Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h3 className="font-semibold text-slate-700 mb-4">Record Expense</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Category *</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Amount (KES) *</label>
                <input type="number" placeholder="e.g. 5000" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Date *</label>
                <input type="date" value={form.expense_date}
                  onChange={e => setForm({ ...form, expense_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1 font-medium">Description *</label>
                <input placeholder="e.g. June salary for loan officer" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Payment Method</label>
                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Reference / Receipt No.</label>
                <input placeholder="Optional" value={form.reference}
                  onChange={e => setForm({ ...form, reference: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSubmit} disabled={submitting}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {submitting ? "Saving..." : "💾 Save Expense"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="text-slate-500 border border-slate-200 px-5 py-2 rounded-lg text-sm hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            {[
              { key: "expenses", label: "💸 Expenses" },
              { key: "pnl", label: "📈 P&L Report" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-slate-500 hover:text-slate-700"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* EXPENSES TAB */}
            {activeTab === "expenses" && (
              <div>
                {/* Filter by category */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">Filter:</span>
                  <button onClick={() => setFilterCategory("")}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${!filterCategory ? "bg-blue-600 text-white border-blue-600" : "text-slate-500 border-slate-200 hover:border-blue-300"}`}>
                    All
                  </button>
                  {categories.map(c => (
                    <button key={c} onClick={() => setFilterCategory(c === filterCategory ? "" : c)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterCategory === c ? "bg-blue-600 text-white border-blue-600" : "text-slate-500 border-slate-200 hover:border-blue-300"}`}>
                      {c}
                    </button>
                  ))}
                </div>

                {/* Summary */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-red-400 font-medium uppercase tracking-wide">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">KES {parseFloat(totalExpenses.toString()).toLocaleString()}</p>
                    <p className="text-xs text-red-400">{expenses.length} records for {MONTHS[filterMonth-1]} {filterYear}</p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-sm">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-3xl mb-2">💸</p>
                    <p className="text-slate-400 text-sm">No expenses recorded for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {["Date", "Category", "Description", "Method", "Reference", "Amount", ""].map(h => (
                            <th key={h} className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((exp: any) => (
                          <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-3 px-3 text-slate-500 text-xs">
                              {new Date(exp.expense_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(exp.category)}`}>
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-700">{exp.description}</td>
                            <td className="py-3 px-3 text-slate-500 capitalize text-xs">{exp.payment_method}</td>
                            <td className="py-3 px-3 text-slate-400 text-xs font-mono">{exp.reference || "—"}</td>
                            <td className="py-3 px-3 font-bold text-red-600">KES {parseFloat(exp.amount).toLocaleString()}</td>
                            <td className="py-3 px-3">
                              <button onClick={() => handleDelete(exp.id)}
                                className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-2 py-1 rounded-lg">
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={5} className="py-3 px-3 font-semibold text-slate-600 text-sm">Total</td>
                          <td className="py-3 px-3 font-bold text-red-600">KES {parseFloat(totalExpenses.toString()).toLocaleString()}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* P&L TAB */}
            {activeTab === "pnl" && pnl && (
              <div className="space-y-6">
                <div className="text-center pb-4 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-800">Profit & Loss Statement</h3>
                  <p className="text-slate-400 text-sm">{MONTHS[pnl.month - 1]} {pnl.year}</p>
                </div>

                {/* P&L Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                    <p className="text-xs text-emerald-500 font-medium uppercase tracking-wide">Total Income</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">KES {parseFloat(pnl.income.total).toLocaleString()}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                    <p className="text-xs text-red-400 font-medium uppercase tracking-wide">Total Expenses</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">KES {parseFloat(pnl.expenses.total).toLocaleString()}</p>
                  </div>
                  <div className={`border rounded-xl p-5 text-center ${pnl.net_profit >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
                    <p className={`text-xs font-medium uppercase tracking-wide ${pnl.net_profit >= 0 ? "text-blue-500" : "text-orange-500"}`}>
                      Net {pnl.net_profit >= 0 ? "Profit" : "Loss"}
                    </p>
                    <p className={`text-3xl font-bold mt-1 ${pnl.net_profit >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                      KES {Math.abs(pnl.net_profit).toLocaleString()}
                    </p>
                    <p className={`text-xs mt-1 ${pnl.net_profit >= 0 ? "text-blue-400" : "text-orange-400"}`}>
                      {pnl.profit_margin}% margin
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Income Breakdown */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-emerald-600 px-4 py-3">
                      <h4 className="font-semibold text-white text-sm">Income Breakdown</h4>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {[
                        { label: "Loan Repayments", value: pnl.income.repayments.total, count: pnl.income.repayments.count, sub: "payments" },
                        { label: "Processing Fees", value: pnl.income.processing_fees.total, count: pnl.income.processing_fees.count, sub: "loans" },
                        { label: "Float Income", value: pnl.income.float_income.total, count: pnl.income.float_income.count, sub: "transactions" },
                      ].map(item => (
                        <div key={item.label} className="flex justify-between items-center px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{item.label}</p>
                            <p className="text-xs text-slate-400">{item.count} {item.sub}</p>
                          </div>
                          <p className="font-bold text-emerald-600">KES {parseFloat(item.value).toLocaleString()}</p>
                        </div>
                      ))}
                      <div className="flex justify-between items-center px-4 py-3 bg-emerald-50">
                        <p className="font-bold text-slate-700">Total Income</p>
                        <p className="font-bold text-emerald-600 text-lg">KES {parseFloat(pnl.income.total).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Expenses Breakdown */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-red-600 px-4 py-3">
                      <h4 className="font-semibold text-white text-sm">Expenses Breakdown</h4>
                    </div>
                    {pnl.expenses.breakdown.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm">No expenses recorded</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {pnl.expenses.breakdown.map((exp: any) => (
                          <div key={exp.category} className="flex justify-between items-center px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{exp.category}</p>
                              <p className="text-xs text-slate-400">{exp.count} record{exp.count > 1 ? "s" : ""}</p>
                            </div>
                            <p className="font-bold text-red-600">KES {parseFloat(exp.total).toLocaleString()}</p>
                          </div>
                        ))}
                        <div className="flex justify-between items-center px-4 py-3 bg-red-50">
                          <p className="font-bold text-slate-700">Total Expenses</p>
                          <p className="font-bold text-red-600 text-lg">KES {parseFloat(pnl.expenses.total).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Loans Disbursed */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Loans Disbursed This Month</p>
                    <p className="text-xs text-slate-400">{pnl.disbursed.count} loans issued</p>
                  </div>
                  <p className="text-xl font-bold text-blue-600">KES {parseFloat(pnl.disbursed.total).toLocaleString()}</p>
                </div>

                {/* Net Result */}
                <div className={`rounded-xl border p-5 ${pnl.net_profit >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-700 text-lg">Net {pnl.net_profit >= 0 ? "Profit" : "Loss"} — {MONTHS[pnl.month-1]} {pnl.year}</p>
                      <p className="text-slate-500 text-sm">Income KES {parseFloat(pnl.income.total).toLocaleString()} − Expenses KES {parseFloat(pnl.expenses.total).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${pnl.net_profit >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                        {pnl.net_profit >= 0 ? "+" : "-"}KES {Math.abs(pnl.net_profit).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">{pnl.profit_margin}% profit margin</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
