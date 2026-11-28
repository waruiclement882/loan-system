"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function ApprovalsPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [search, setSearch] = useState("");
  const [userRole, setUserRole] = useState("");
  const [msg, setMsg] = useState<{type:string,text:string} | null>(null);

  const getHeaders = () => ({ "Content-Type":"application/json", Authorization:"Bearer " + localStorage.getItem("token") });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    if (!["super_admin","admin","branch_admin"].includes(user.role)) { router.push("/dashboard"); return; }
    loadLoans();
  }, []);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await fetch(API + "/api/loans?status=pending", { headers: getHeaders() });
      const data = await res.json();
      setLoans(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  const handleApprove = async (id: number) => {
    setProcessing(id);
    try {
      const res = await fetch(API + "/api/loans/" + id + "/approve", { method:"PATCH", headers: getHeaders() });
      const data = await res.json();
      if (data.error) { setMsg({ type:"error", text:data.error }); }
      else { setMsg({ type:"success", text:"Loan #" + id + " approved successfully" }); loadLoans(); }
    } catch { setMsg({ type:"error", text:"Failed to approve loan" }); }
    setProcessing(null);
    setTimeout(() => setMsg(null), 4000);
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) { setMsg({ type:"error", text:"Please enter a rejection reason" }); return; }
    setProcessing(id);
    try {
      const res = await fetch(API + "/api/loans/" + id + "/reject", {
        method:"PATCH", headers: getHeaders(), body: JSON.stringify({ reason: rejectReason })
      });
      const data = await res.json();
      if (data.error) { setMsg({ type:"error", text:data.error }); }
      else { setMsg({ type:"success", text:"Loan #" + id + " rejected" }); setRejectId(null); setRejectReason(""); loadLoans(); }
    } catch { setMsg({ type:"error", text:"Failed to reject loan" }); }
    setProcessing(null);
    setTimeout(() => setMsg(null), 4000);
  };

  const filtered = loans.filter(l =>
    !search ||
    l.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(l.id).includes(search) ||
    String(l.amount).includes(search)
  );

  const totalPending = loans.reduce((s,l) => s + parseFloat(l.amount||0), 0);
  const fmt = (n: number) => "KSh " + Math.round(n||0).toLocaleString();

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0B2545]">Loan Approvals</h1>
            <p className="text-xs text-gray-400 mt-0.5">{loans.length} pending approval</p>
          </div>
          <button onClick={loadLoans}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            Refresh
          </button>
        </div>

        {/* Alert message */}
        {msg && (
          <div className={"rounded-xl p-4 mb-5 text-sm font-medium " + (msg.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800")}>
            {msg.text}
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label:"Pending Approvals", val:loans.length, color:"#D97706", bg:"#FEF3C7", border:"#FDE68A",
              icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
            { label:"Total Amount Pending", val:fmt(totalPending), color:"#1565C0", bg:"#EAF2FB", border:"#BFDBFE",
              icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
            { label:"Avg Loan Amount", val:loans.length > 0 ? fmt(totalPending/loans.length) : "KSh 0", color:"#7C3AED", bg:"#EDE9FE", border:"#C4B5FD",
              icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl p-4 border flex items-center gap-3 shadow-sm" style={{ borderColor: k.border }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: k.bg }}
                dangerouslySetInnerHTML={{ __html: k.icon }} />
              <div>
                <p className="text-xs text-gray-400">{k.label}</p>
                <p className="text-lg font-bold" style={{ color: k.color }}>{k.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name, loan ID, amount..."
            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#D97706] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-gray-800 font-semibold">All caught up!</p>
            <p className="text-gray-400 text-sm mt-1">No loans pending approval</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((loan: any) => (
              <div key={loan.id} className="bg-white rounded-2xl border border-amber-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-sm">
                      {loan.customer_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 truncate max-w-[140px]">{loan.customer_name}</p>
                      <p className="text-xs text-gray-400">Loan #{loan.id}</p>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">Pending</span>
                </div>

                {/* Card body */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-0.5">Loan Amount</p>
                      <p className="text-sm font-bold text-[#0B2545]">{fmt(parseFloat(loan.amount||0))}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-0.5">Total Repayment</p>
                      <p className="text-sm font-bold text-[#0B2545]">{fmt(parseFloat(loan.total_amount||0))}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-0.5">Term</p>
                      <p className="text-sm font-bold text-[#0B2545]">{loan.term_weeks} weeks</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-0.5">Weekly</p>
                      <p className="text-sm font-bold text-[#0B2545]">{fmt(parseFloat(loan.weekly_installment||0))}</p>
                    </div>
                  </div>

                  {loan.phone && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5a2 2 0 0 1 1.95-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17.92z"/></svg>
                      {loan.phone}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mb-4">
                    Applied: {loan.created_at ? new Date(loan.created_at).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" }) : "-"}
                  </p>

                  {/* Reject form */}
                  {rejectId === loan.id && (
                    <div className="mb-4">
                      <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        className="w-full px-3 py-2 text-sm border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                        rows={3} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => router.push("/loans/" + loan.id)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-semibold transition-colors">
                      View Details
                    </button>
                    {rejectId === loan.id ? (
                      <>
                        <button onClick={() => handleReject(loan.id)} disabled={processing === loan.id}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
                          {processing === loan.id ? "..." : "Confirm Reject"}
                        </button>
                        <button onClick={() => { setRejectId(null); setRejectReason(""); }}
                          className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-xl text-xs font-semibold">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleApprove(loan.id)} disabled={processing === loan.id}
                          className="flex-1 bg-[#059669] hover:bg-[#047857] text-white py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
                          {processing === loan.id ? "..." : "Approve"}
                        </button>
                        <button onClick={() => setRejectId(loan.id)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-semibold transition-colors">
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
