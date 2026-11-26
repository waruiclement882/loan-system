"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("table");
  const [userRole, setUserRole] = useState("");
  const [stats, setStats] = useState<{total:number,active:number,paid:number,pending:number,totalDisbursed:number,outstanding:number}>({ total:0, active:0, paid:0, pending:0, totalDisbursed:0, outstanding:0 });

  const getHeaders = () => ({ "Content-Type":"application/json", Authorization:"Bearer " + localStorage.getItem("token") });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    loadLoans();
  }, []);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await fetch(API + "/api/loans", { headers: getHeaders() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setLoans(list);
      setStats({
        total: list.length,
        active: list.filter(l => l.status === "active").length,
        paid: list.filter(l => l.status === "paid").length,
        pending: list.filter(l => l.status === "pending").length,
        totalDisbursed: list.filter(l => ["active","paid"].includes(l.status)).reduce((s,l) => s + parseFloat(l.amount||0), 0),
        outstanding: list.filter(l => l.status === "active").reduce((s,l) => s + parseFloat(l.balance||0), 0),
      });
    } catch {}
    setLoading(false);
  };

  const isAdmin = ["super_admin","admin","branch_admin","cashier"].includes(userRole);
  const fmt = (n: number) => "KSh " + Math.round(n||0).toLocaleString();

  const filtered = loans.filter(l => {
    const matchSearch = !search || l.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(l.id).includes(search) || String(l.amount).includes(search);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusConfig: Record<string,{label:string,color:string,bg:string}> = {
    active: { label:"Active", color:"text-blue-700", bg:"bg-blue-100" },
    paid: { label:"Paid", color:"text-green-700", bg:"bg-green-100" },
    pending: { label:"Pending", color:"text-amber-700", bg:"bg-amber-100" },
    approved: { label:"Approved", color:"text-indigo-700", bg:"bg-indigo-100" },
    rejected: { label:"Rejected", color:"text-red-700", bg:"bg-red-100" },
    written_off: { label:"Written Off", color:"text-gray-700", bg:"bg-gray-100" },
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0B2545]">Loans</h1>
            <p className="text-xs text-gray-500 mt-0.5">{stats.total} total loans � {stats.active} active</p>
          </div>
          {isAdmin && (
            <button onClick={() => router.push("/loans/new")}
              className="flex items-center gap-2 bg-[#1565C0] hover:bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              + New Loan
            </button>
          )}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label:"Total Disbursed", val:fmt(stats.totalDisbursed), icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>', color:"#1565C0", bg:"#EAF2FB" },
            { label:"Outstanding", val:fmt(stats.outstanding), icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E67E22" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', color:"#E67E22", bg:"#FEF3E2" },
            { label:"Active Loans", val:stats.active, icon:"??", color:"#0D7377", bg:"#E0F4F4" },
            { label:"Fully Paid", val:stats.paid, icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>', color:"#1B8A5A", bg:"#E8F5EF" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: k.bg }}><span dangerouslySetInnerHTML={{ __html: k.icon }} /></div>
              <div>
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className="text-lg font-bold" style={{ color: k.color }}>{k.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer, amount, loan ID..."
              className="flex-1 min-w-48 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30" />
            <div className="flex gap-1 flex-wrap">
              {["all","active","paid","pending","approved","rejected"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize " +
                    (statusFilter === s ? "bg-[#1565C0] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1 ml-auto">
              {["table","kanban"].map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-colors " +
                    (view === v ? "bg-[#0B2545] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                  {v === "table" ? "Table" : "Cards"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === "table" ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["#","Customer","Amount","Term","Weekly","Interest","Total","Balance","Progress","Status","Officer"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(loan => {
                    const balance = parseFloat(loan.balance || 0);
                    const total = parseFloat(loan.total_amount || 0);
                    const progress = total > 0 ? Math.max(0, 100 - (balance / total) * 100) : 0;
                    const sc = statusConfig[loan.status] || { label:loan.status, color:"text-gray-700", bg:"bg-gray-100" };
                    return (
                      <tr key={loan.id} onClick={() => router.push("/loans/" + loan.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">#{loan.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#EAF2FB] text-[#1565C0] flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {loan.customer_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{loan.customer_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{loan.term_weeks} wks</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">KSh {parseFloat(loan.weekly_installment||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">KSh {parseFloat(loan.interest_amount||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">KSh {parseFloat(loan.total_amount||0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">KSh {balance.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#1B8A5A] rounded-full" style={{ width: progress + "%" }} />
                            </div>
                            <span className="text-xs text-gray-400 w-7">{Math.round(progress)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={"text-xs font-medium px-2 py-1 rounded-full " + sc.bg + " " + sc.color}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{loan.officer_name || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">No loans found</div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              Showing {filtered.length} of {loans.length} loans
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(loan => {
              const balance = parseFloat(loan.balance || 0);
              const total = parseFloat(loan.total_amount || 0);
              const progress = total > 0 ? Math.max(0, 100 - (balance / total) * 100) : 0;
              const sc = statusConfig[loan.status] || { label:loan.status, color:"text-gray-700", bg:"bg-gray-100" };
              return (
                <div key={loan.id} onClick={() => router.push("/loans/" + loan.id)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md cursor-pointer transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-[#EAF2FB] text-[#1565C0] flex items-center justify-center font-bold">
                        {loan.customer_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[140px]">{loan.customer_name}</p>
                        <p className="text-xs text-gray-400">Loan #{loan.id}</p>
                      </div>
                    </div>
                    <span className={"text-xs font-medium px-2 py-1 rounded-full " + sc.bg + " " + sc.color}>{sc.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-xs text-gray-400">Principal</p>
                      <p className="text-sm font-bold text-gray-800">KSh {parseFloat(loan.amount).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-xs text-gray-400">Balance</p>
                      <p className="text-sm font-bold text-gray-800">KSh {balance.toLocaleString()}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Repayment progress</span><span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1B8A5A] rounded-full transition-all" style={{ width: progress + "%" }} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>{loan.term_weeks} weeks � KSh {parseFloat(loan.weekly_installment||0).toLocaleString()}/wk</span>
                    <span>{loan.officer_name || "No officer"}</span>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400 text-sm">No loans found</div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
