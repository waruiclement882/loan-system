"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "https://loan-system-h794.onrender.com";

export default function PARPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("due");
  const [parData, setParData] = useState<any>(null);
  const [dueData, setDueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [parRes, dueRes] = await Promise.all([
        fetch(`${API}/api/reports/par`, { headers }),
        fetch(`${API}/api/reports/due-this-week`, { headers }),
      ]);
      const [par, due] = await Promise.all([parRes.json(), dueRes.json()]);
      setParData(par);
      setDueData(Array.isArray(due) ? due : []);
    } catch { }
    setLoading(false);
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

  // Filter by selected date or show all
  const filteredDue = selectedDate
    ? dueData.filter(d => new Date(d.due_date).toISOString().split("T")[0] === selectedDate)
    : dueData;

  const dueToday = filteredDue.filter(d => {
    const dd = new Date(d.due_date); dd.setHours(0, 0, 0, 0);
    return dd.getTime() === today.getTime();
  });
  const dueSoon = filteredDue.filter(d => {
    const dd = new Date(d.due_date); dd.setHours(0, 0, 0, 0);
    return dd.getTime() > today.getTime();
  });
  const pastDue = filteredDue.filter(d => {
    const dd = new Date(d.due_date); dd.setHours(0, 0, 0, 0);
    return dd.getTime() < today.getTime();
  });

  const totalDueAmount = filteredDue.reduce((s, d) => s + parseFloat(d.amount_due || 0), 0);
  const totalPaidAmount = filteredDue.reduce((s, d) => s + parseFloat(d.amount_paid || 0), 0);

  const parColor = !parData ? "" : parseFloat(parData.par) === 0
    ? "text-emerald-600" : parseFloat(parData.par) < 5
    ? "text-amber-600" : "text-red-600";

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading report...</p>
      </div>
    </div>
  );

  const tabs = [
    { key: "due", label: "📅 Due This Week", count: dueData.length },
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
          <button onClick={() => router.push("/collection")}
            className="text-slate-500 hover:text-blue-600 transition-colors">Collection</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }}
            className="text-red-400 hover:text-red-600 transition-colors">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Loan Monitoring</h2>
            <p className="text-slate-400 text-sm mt-0.5">Track due payments and overdue loans</p>
          </div>
          <button onClick={loadAll}
            className="text-sm text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            🔄 Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-1">Due This Week</p>
            <p className="text-2xl font-bold text-blue-600">{dueData.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">KES {dueData.reduce((s,d) => s + parseFloat(d.amount_due||0),0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-1">Due Today</p>
            <p className="text-2xl font-bold text-orange-500">
              {dueData.filter(d => { const dd = new Date(d.due_date); dd.setHours(0,0,0,0); return dd.getTime() === today.getTime(); }).length}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">installments</p>
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

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                {tab.label}
                {tab.count !== null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* DUE THIS WEEK TAB */}
            {activeTab === "due" && (
              <div className="space-y-5">

                {/* Date filter */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">Filter by date:</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  {selectedDate && (
                    <button onClick={() => setSelectedDate("")}
                      className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-2 rounded-lg transition-colors">
                      ✕ Clear
                    </button>
                  )}
                  <span className="text-xs text-slate-400">
                    {selectedDate
                      ? `${filteredDue.length} installment(s) on ${new Date(selectedDate + "T00:00:00").toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}`
                      : `Showing all ${dueData.length} due this week`}
                  </span>
                </div>

                {filteredDue.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">🎉</p>
                    <p className="text-slate-500 font-medium">
                      {selectedDate ? "No installments due on this date" : "No installments due this week"}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Collection progress */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Collection Progress</span>
                        <span className="text-sm text-slate-500">
                          KES {totalPaidAmount.toLocaleString()} / {totalDueAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${totalDueAmount > 0 ? Math.min((totalPaidAmount / totalDueAmount) * 100, 100) : 0}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {totalDueAmount > 0 ? ((totalPaidAmount / totalDueAmount) * 100).toFixed(0) : 0}% collected
                      </p>
                    </div>

                    {/* Past due */}
                    {pastDue.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span>
                          Past Due ({pastDue.length})
                        </h4>
                        <div className="space-y-2">
                          {pastDue.map((inst: any) => {
                            const { label, color } = getDayLabel(inst.due_date);
                            return (
                              <div key={inst.id}
                                className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl hover:shadow-sm transition-shadow cursor-pointer"
                                onClick={() => router.push(`/loans/${inst.loan_id}`)}>
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center text-sm font-bold text-red-600">
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
                      </div>
                    )}

                    {/* Due today */}
                    {dueToday.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-500 rounded-full inline-block"></span>
                          Due Today ({dueToday.length})
                        </h4>
                        <div className="space-y-2">
                          {dueToday.map((inst: any) => (
                            <div key={inst.id}
                              className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl hover:shadow-sm transition-shadow cursor-pointer"
                              onClick={() => router.push(`/loans/${inst.loan_id}`)}>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-sm font-bold text-orange-600">
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
                                <span className="text-xs px-2 py-1 rounded-full border font-medium bg-orange-100 text-orange-700 border-orange-200">Today</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upcoming */}
                    {dueSoon.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                          Upcoming ({dueSoon.length})
                        </h4>
                        <div className="space-y-2">
                          {dueSoon.map((inst: any) => {
                            const { label, color } = getDayLabel(inst.due_date);
                            return (
                              <div key={inst.id}
                                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow cursor-pointer"
                                onClick={() => router.push(`/loans/${inst.loan_id}`)}>
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
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
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${color}`}>{label}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* OVERDUE TAB */}
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
                        className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => router.push(`/loans/${loan.id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-sm font-bold text-red-600">
                            {loan.customer_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{loan.customer_name}</p>
                            <p className="text-xs text-slate-400">
                              Loan #{loan.id} · {loan.overdue_count} missed installment{loan.overdue_count > 1 ? "s" : ""}
                            </p>
                            {loan.customer_phone && (
                              <p className="text-xs text-blue-500">{loan.customer_phone}</p>
                            )}
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

            {/* PAR REPORT TAB */}
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
                        {["Customer", "Loan ID", "Balance", "Missed", "Days Overdue", "Status"].map(h => (
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
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              loan.is_overdue ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
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