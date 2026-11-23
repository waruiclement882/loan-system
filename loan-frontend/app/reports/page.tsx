"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function ReportsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [par, setPar] = useState<any>(null);
  const [income, setIncome] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [userRole, setUserRole] = useState("");

  const getHeaders = () => ({ "Content-Type":"application/json", Authorization:"Bearer " + localStorage.getItem("token") });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, mRes, pRes, iRes] = await Promise.all([
        fetch(API + "/api/reports/summary", { headers: getHeaders() }),
        fetch(API + "/api/reports/monthly", { headers: getHeaders() }),
        fetch(API + "/api/reports/par", { headers: getHeaders() }),
        fetch(API + "/api/reports/income", { headers: getHeaders() }),
      ]);
      const [s, m, p, i] = await Promise.all([sRes.json(), mRes.json(), pRes.json(), iRes.json()]);
      setSummary(s); setMonthly(m); setPar(p); setIncome(i);
    } catch {}
    setLoading(false);
  };

  const fmt = (n: number) => "KSh " + Math.round(n||0).toLocaleString();
  const fmtN = (n: number) => Math.round(n||0).toLocaleString();

  const tabs = [
    { id:"overview", label:"Overview" },
    { id:"monthly", label:"Monthly Breakdown" },
    { id:"par", label:"PAR Analysis" },
    { id:"income", label:"Income" },
  ];

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0B2545]">Reports</h1>
            <p className="text-xs text-gray-400 mt-0.5">Portfolio analytics and performance metrics</p>
          </div>
          <button onClick={loadAll}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={"px-4 py-2 rounded-xl text-sm font-medium transition-colors " +
                (activeTab === t.id ? "bg-[#0B2545] text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200")}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && summary && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label:"Total Loans", val:fmtN(summary.total_loans), sub:"All time", color:"#1565C0", bg:"#EAF2FB", border:"#BFDBFE",
                      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>' },
                    { label:"Active Loans", val:fmtN(summary.active_loans), sub:"Currently outstanding", color:"#D97706", bg:"#FEF3C7", border:"#FDE68A",
                      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
                    { label:"Total Disbursed", val:fmt(summary.total_disbursed), sub:"Principal lent out", color:"#059669", bg:"#D1FAE5", border:"#A7F3D0",
                      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
                    { label:"Total Collected", val:fmt(summary.total_repaid), sub:summary.collection_rate+"% rate", color:"#7C3AED", bg:"#EDE9FE", border:"#C4B5FD",
                      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>' },
                  ].map(k => (
                    <div key={k.label} className="bg-white rounded-2xl p-4 border flex items-center gap-3 shadow-sm" style={{ borderColor: k.border }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: k.bg }}
                        dangerouslySetInnerHTML={{ __html: k.icon }} />
                      <div>
                        <p className="text-xs text-gray-400">{k.label}</p>
                        <p className="text-lg font-bold" style={{ color: k.color }}>{k.val}</p>
                        <p className="text-[10px] text-gray-400">{k.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Collection rate bar */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-[#0B2545] text-sm">Collection Performance</p>
                    <span className="text-2xl font-bold text-[#059669]">{summary.collection_rate}%</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all bg-gradient-to-r from-[#059669] to-[#34D399]"
                      style={{ width: Math.min(summary.collection_rate, 100) + "%" }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>0%</span><span>Target: 100%</span>
                  </div>
                </div>

                {/* Quick stats grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">Loan Status Breakdown</p>
                    {[
                      { label:"Active", val:summary.active_loans, color:"#1565C0", bg:"#EAF2FB" },
                      { label:"Paid", val:summary.paid_loans, color:"#059669", bg:"#D1FAE5" },
                      { label:"Outstanding", val:fmt(summary.total_outstanding), color:"#D97706", bg:"#FEF3C7" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-gray-600">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: item.color }}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">Processing Fees</p>
                    <p className="text-3xl font-bold text-[#7C3AED]">{fmt(summary.processing_fees || 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">{summary.fee_count || 0} loans with fees</p>
                    <div className="mt-4 p-3 bg-[#EDE9FE] rounded-xl">
                      <p className="text-xs text-[#7C3AED] font-medium">Average per loan</p>
                      <p className="text-sm font-bold text-[#7C3AED]">
                        {summary.fee_count > 0 ? fmt((summary.processing_fees || 0) / summary.fee_count) : "KSh 0"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">Quick Actions</p>
                    <div className="space-y-2">
                      {[
                        { label:"Collection Sheet", path:"/collection", color:"#1565C0", bg:"#EAF2FB" },
                        { label:"PAR Report", path:"/par", color:"#DC2626", bg:"#FEE2E2" },
                        { label:"Financial Statements", path:"/financial-statements", color:"#059669", bg:"#D1FAE5" },
                        { label:"Export Data", path:"/export", color:"#7C3AED", bg:"#EDE9FE" },
                      ].map(a => (
                        <button key={a.label} onClick={() => router.push(a.path)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:opacity-80"
                          style={{ backgroundColor: a.bg, color: a.color }}>
                          {a.label}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MONTHLY TAB */}
            {activeTab === "monthly" && monthly && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-[#0B2545]">Monthly Breakdown</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Loans disbursed and payments collected per month</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["Month","Loans Disbursed","Amount Disbursed","Payments","Amount Collected","Processing Fees"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(monthly.rows || []).map((r: any, i: number) => (
                        <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50/50"}>
                          <td className="px-4 py-3 font-medium text-gray-800">{r.month}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">{r.loans_disbursed}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{fmt(r.amount_disbursed)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full">{r.payment_count}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#059669]">{fmt(r.amount_collected)}</td>
                          <td className="px-4 py-3 text-gray-600">{fmt(r.processing_fees)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {monthly.totals && (
                      <tfoot className="bg-[#0B2545]">
                        <tr>
                          <td className="px-4 py-3 text-white font-bold text-xs">TOTALS</td>
                          <td className="px-4 py-3 text-center text-white font-bold text-xs">{monthly.totals.loans_disbursed}</td>
                          <td className="px-4 py-3 text-white font-bold text-xs">{fmt(monthly.totals.amount_disbursed)}</td>
                          <td className="px-4 py-3 text-center text-white font-bold text-xs">{monthly.totals.payment_count}</td>
                          <td className="px-4 py-3 text-[#34D399] font-bold text-xs">{fmt(monthly.totals.amount_collected)}</td>
                          <td className="px-4 py-3 text-white font-bold text-xs">{fmt(monthly.totals.processing_fees)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* PAR TAB */}
            {activeTab === "par" && par && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label:"Total Portfolio", val:fmt(par.totalPortfolio||0), color:"#1565C0", bg:"#EAF2FB", border:"#BFDBFE" },
                    { label:"Overdue Balance", val:fmt(par.overdueBalance||0), color:"#DC2626", bg:"#FEE2E2", border:"#FECACA" },
                    { label:"PAR Rate", val:(par.par||0)+"%", color:"#D97706", bg:"#FEF3C7", border:"#FDE68A" },
                    { label:"Overdue Loans", val:par.overdueLoans||0, color:"#7C3AED", bg:"#EDE9FE", border:"#C4B5FD" },
                  ].map(k => (
                    <div key={k.label} className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: k.border }}>
                      <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                      <p className="text-2xl font-bold" style={{ color: k.color }}>{k.val}</p>
                    </div>
                  ))}
                </div>
                {par.loans?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h3 className="font-bold text-[#0B2545]">Overdue Loans</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            {["Loan #","Customer","Balance","Days Overdue","Status"].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {par.loans.filter((l: any) => l.is_overdue).map((l: any) => (
                            <tr key={l.id} onClick={() => router.push("/loans/" + l.id)} className="hover:bg-gray-50 cursor-pointer">
                              <td className="px-4 py-3 text-xs font-mono text-gray-400">#{l.id}</td>
                              <td className="px-4 py-3 font-medium text-gray-800">{l.customer_name}</td>
                              <td className="px-4 py-3 font-bold text-red-600">{fmt(parseFloat(l.balance||0))}</td>
                              <td className="px-4 py-3">
                                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">{l.days_overdue}d</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">Overdue</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* INCOME TAB */}
            {activeTab === "income" && income && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#0B2545]">Company Income</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Processing fees and other income</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="text-lg font-bold text-[#059669]">{fmt(income.total||0)}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["Date","Customer","Type","Amount","Transaction Code","Recorded By"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(income.income || []).map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(item.created_at).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" })}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{item.customer_name || "-"}</td>
                          <td className="px-4 py-3">
                            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full capitalize">
                              {(item.type || "").replace("_"," ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-[#059669]">{fmt(parseFloat(item.amount||0))}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{item.transaction_code || "-"}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{item.recorded_by_name || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!income.income || income.income.length === 0) && (
                    <div className="text-center py-16 text-gray-400 text-sm">No income records found</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
