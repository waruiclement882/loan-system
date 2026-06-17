"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "https://loan-system-h794.onrender.com";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function PARPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dues");
  const [parData, setParData] = useState<any>(null);
  const [dueData, setDueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueLoading, setDueLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<"week" | "date" | "month">("week");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadPar();
    loadDues();
  }, []);

  const loadPar = async () => {
    try {
      const res = await fetch(`${API}/api/reports/par`, { headers });
      const data = await res.json();
      setParData(data);
    } catch { }
    setLoading(false);
  };

  const loadDues = async (mode?: string, date?: string, month?: number, year?: number) => {
    setDueLoading(true);
    try {
      const m = mode || filterMode;
      const d = date !== undefined ? date : selectedDate;
      const mo = month || selectedMonth;
      const yr = year || selectedYear;
      let url = `${API}/api/reports/due-this-week`;
      if (m === "date" && d) url += `?date=${d}`;
      else if (m === "month") url += `?month=${mo}&year=${yr}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      setDueData(Array.isArray(data) ? data : []);
    } catch { setDueData([]); }
    setDueLoading(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return { label: "Today", color: "bg-orange-100 text-orange-700 border-orange-200" };
    if (diff === 1) return { label: "Tomorrow", color: "bg-amber-100 text-amber-700 border-amber-200" };
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "bg-red-200 text-red-800 border-red-300" };
    return {
      label: d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" }),
      color: "bg-blue-50 text-blue-700 border-blue-200"
    };
  };

  const overdueLoans = parData?.loans?.filter((l: any) => l.is_overdue) || [];
  const totalDueAmount = dueData.reduce((s, d) => s + parseFloat(d.amount_due || 0), 0);
  const totalPaidAmount = dueData.reduce((s, d) => s + parseFloat(d.amount_paid || 0), 0);
  const parColor = !parData ? "" : parseFloat(parData.par) === 0 ? "text-emerald-600" : parseFloat(parData.par) < 5 ? "text-amber-600" : "text-red-600";

  const groupedByDate = dueData.reduce((acc: any, inst: any) => {
    const dateKey = new Date(inst.due_date).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(inst);
    return acc;
  }, {});

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );

  const tabs = [
    { key: "dues", label: "📅 Dues", count: dueData.length },
    { key: "overdue", label: "🚨 Overdue", count: overdueLoans.length },
    { key: "par", label: "📊 PAR Report", count: null },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4 text-sm">
          {["dashboard", "loans", "customers", "payments"].map(p => (
            <button key={p} onClick={() => router.push("/" + p)}
              className="text-slate-500 hover:text-blue-600 capitalize transition-colors">{p}</button>
          ))}
          <button onClick={() => router.push("/collection")} className="text-slate-500 hover:text-blue-600">Collection</button>
          <button onClick={() => { <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">📅 PAR</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600">Statement</button>
          localStorage.clear(); router.push("/login"); }} className="text-red-400 hover:text-red-600">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Loan Monitoring</h2>
            <p className="text-slate-400 text-sm mt-0.5">Track due payments and overdue loans</p>
          </div>
          <button onClick={() => { loadPar(); loadDues(); }}
            className="text-sm text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            🔄 Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-1">Dues Shown</p>
            <p className="text-2xl font-bold text-blue-600">{dueData.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">KES {totalDueAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-1">Collected</p>
            <p className="text-2xl font-bold text-emerald-600">KES {totalPaidAmount.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">{totalDueAmount > 0 ? ((totalPaidAmount/totalDueAmount)*100).toFixed(0) : 0}% of shown</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <p className="text-xs text-red-400 mb-1">Overdue Loans</p>
            <p className="text-2xl font-bold text-red-600">{overdueLoans.length}</p>
            <p className="text-xs text-red-400 mt-0.5">KES {parseFloat(parData?.overdueBalance || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-1">PAR Rate</p>
            <p className={"text-2xl font-bold " + parColor}>{parData?.par || 0}%</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {parseFloat(parData?.par || 0) === 0 ? "Excellent" : parseFloat(parData?.par || 0) < 5 ? "Acceptable" : "High Risk"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.key ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-slate-500 hover:text-slate-700"
                }`}>
                {tab.label}
                {tab.count !== null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">

            {activeTab === "dues" && (
              <div className="space-y-5">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Filter Dues</p>
                  <div className="flex gap-2 mb-4">
                    {([
                      { key: "week", label: "📅 This Week" },
                      { key: "date", label: "🗓️ Specific Date" },
                      { key: "month", label: "📆 By Month" },
                    ] as const).map(m => (
                      <button key={m.key}
                        onClick={() => { setFilterMode(m.key); loadDues(m.key, selectedDate, selectedMonth, selectedYear); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          filterMode === m.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                        }`}>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {filterMode === "date" && (
                    <div className="flex items-center gap-3">
                      <input type="date" value={selectedDate}
                        onChange={e => { setSelectedDate(e.target.value); loadDues("date", e.target.value, selectedMonth, selectedYear); }}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
                      {selectedDate && (
                        <span className="text-xs text-slate-500">
                          {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  )}

                  {filterMode === "month" && (
                    <div className="flex items-center gap-3">
                      <select value={selectedMonth}
                        onChange={e => { const m = parseInt(e.target.value); setSelectedMonth(m); loadDues("month", selectedDate, m, selectedYear); }}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                        {MONTHS.map((name, i) => <option key={i+1} value={i+1}>{name}</option>)}
                      </select>
                      <select value={selectedYear}
                        onChange={e => { const y = parseInt(e.target.value); setSelectedYear(y); loadDues("month", selectedDate, selectedMonth, y); }}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <span className="text-xs text-slate-500 font-medium">{MONTHS[selectedMonth-1]} {selectedYear}</span>
                    </div>
                  )}

                  {filterMode === "week" && (
                    <p className="text-xs text-slate-400">Showing installments due from today through the next 7 days</p>
                  )}
                </div>

                {dueLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Loading dues...
                  </div>
                ) : dueData.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">🎉</p>
                    <p className="text-slate-500 font-medium">No installments found for this period</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Collection Progress</span>
                        <span className="text-sm text-slate-500">KES {totalPaidAmount.toLocaleString()} / {totalDueAmount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-emerald-500 h-2.5 rounded-full transition-all"
                          style={{ width: `${totalDueAmount > 0 ? Math.min((totalPaidAmount/totalDueAmount)*100, 100) : 0}%` }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-slate-400">{totalDueAmount > 0 ? ((totalPaidAmount/totalDueAmount)*100).toFixed(0) : 0}% collected</p>
                        <p className="text-xs text-red-400">KES {(totalDueAmount - totalPaidAmount).toLocaleString()} remaining</p>
                      </div>
                    </div>

                    {filterMode === "month" ? (
                      <div className="space-y-4">
                        {Object.keys(groupedByDate).sort().map(dateKey => {
                          const insts = groupedByDate[dateKey];
                          const { label, color } = getDayLabel(dateKey);
                          const dayTotal = insts.reduce((s: number, i: any) => s + parseFloat(i.amount_due || 0), 0);
                          return (
                            <div key={dateKey} className="border border-slate-200 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>{label}</span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(dateKey + "T00:00:00").toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-slate-500">{insts.length} installment{insts.length > 1 ? "s" : ""}</span>
                                  <span className="text-xs font-semibold text-slate-700">KES {dayTotal.toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {insts.map((inst: any) => (
                                  <div key={inst.id}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/loans/${inst.loan_id}`)}>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                                        {inst.customer_name?.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-800">{inst.customer_name}</p>
                                        <p className="text-xs text-slate-400">Loan #{inst.loan_id} · Week {inst.installment_no} · {inst.phone}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-slate-800">KES {parseFloat(inst.amount_due).toLocaleString()}</p>
                                      {parseFloat(inst.amount_paid) > 0 && (
                                        <p className="text-xs text-emerald-600">Paid: KES {parseFloat(inst.amount_paid).toLocaleString()}</p>
                                      )}
                                      <span className={`text-xs font-medium ${
                                        inst.status === "paid" ? "text-emerald-600" :
                                        inst.status === "overdue" ? "text-red-600" :
                                        inst.status === "partial" ? "text-amber-600" : "text-slate-400"
                                      }`}>{inst.status}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dueData.map((inst: any) => {
                          const { label, color } = getDayLabel(inst.due_date);
                          const isPast = new Date(inst.due_date).setHours(0,0,0,0) < today.getTime();
                          return (
                            <div key={inst.id}
                              className={`flex items-center justify-between p-4 border rounded-xl hover:shadow-sm transition-shadow cursor-pointer ${
                                isPast ? "bg-red-50 border-red-200" : label === "Today" ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200"
                              }`}
                              onClick={() => router.push(`/loans/${inst.loan_id}`)}>
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                                  isPast ? "bg-red-100 text-red-600" : label === "Today" ? "bg-orange-100 text-orange-600" : "bg-blue-50 text-blue-600"
                                }`}>
                                  {inst.customer_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{inst.customer_name}</p>
                                  <p className="text-xs text-slate-400">Loan #{inst.loan_id} · Week {inst.installment_no} · {inst.phone}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                <div>
                                  <p className="text-sm font-bold text-slate-800">KES {parseFloat(inst.amount_due).toLocaleString()}</p>
                                  {parseFloat(inst.amount_paid) > 0 && (
                                    <p className="text-xs text-emerald-600">Paid: KES {parseFloat(inst.amount_paid).toLocaleString()}</p>
                                  )}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${color}`}>{label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "overdue" && (
              <div>
                {overdueLoans.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="text-slate-500 font-medium">No overdue loans — great portfolio health!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overdueLoans.map((loan: any) => (
                      <div key={loan.id}
                        className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl hover:shadow-sm cursor-pointer"
                        onClick={() => router.push(`/loans/${loan.id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-sm font-bold text-red-600">
                            {loan.customer_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{loan.customer_name}</p>
                            <p className="text-xs text-slate-400">Loan #{loan.id} · {loan.overdue_count} missed installment{loan.overdue_count > 1 ? "s" : ""}</p>
                            {loan.customer_phone && <p className="text-xs text-blue-500">{loan.customer_phone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="text-sm font-bold text-red-700">KES {parseFloat(loan.balance).toLocaleString()}</p>
                            <p className="text-xs text-slate-400">outstanding</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full border font-medium bg-red-100 text-red-700 border-red-200">
                            {loan.days_overdue}d overdue
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "par" && parData && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-400 mb-1">PAR Rate</p>
                    <p className={"text-5xl font-bold " + parColor}>{parData.par}%</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {parseFloat(parData.par) === 0 ? "🟢 Excellent" : parseFloat(parData.par) < 5 ? "🟡 Acceptable" : "🔴 High Risk"}
                    </p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-400 mb-1">Total Portfolio</p>
                    <p className="text-2xl font-bold text-blue-600">KES {parseFloat(parData.totalPortfolio).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">{parData.totalLoans} active loans</p>
                  </div>
                  <div className="p-6 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-xs text-red-400 mb-1">At Risk Balance</p>
                    <p className="text-2xl font-bold text-red-600">KES {parseFloat(parData.overdueBalance).toLocaleString()}</p>
                    <p className="text-xs text-red-400 mt-1">{parData.overdueLoans} overdue loans</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Customer","Loan ID","Balance","Missed","Days Overdue","Status"].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parData.loans.map((loan: any) => (
                        <tr key={loan.id}
                          className={`border-b hover:bg-slate-50 cursor-pointer ${loan.is_overdue ? "bg-red-50/50" : ""}`}
                          onClick={() => router.push(`/loans/${loan.id}`)}>
                          <td className="py-3 px-3 font-medium text-slate-800">{loan.customer_name}</td>
                          <td className="py-3 px-3 text-blue-600 font-mono text-xs">#{loan.id}</td>
                          <td className="py-3 px-3">KES {parseFloat(loan.balance).toLocaleString()}</td>
                          <td className="py-3 px-3">{loan.overdue_count || 0}</td>
                          <td className="py-3 px-3">{loan.days_overdue > 0 ? `${loan.days_overdue} days` : "—"}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${loan.is_overdue ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {loan.is_overdue ? "Overdue" : "Current"}
                            </span>
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
      </div>
    </div>
  );
}

