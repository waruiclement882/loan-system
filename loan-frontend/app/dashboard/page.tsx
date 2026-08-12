"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, getLoans, getPayments } from "@/lib/api";
import Layout from "../components/Layout";

export default function DashboardPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [userName, setUserName] = useState("");
  const [unmatched, setUnmatched] = useState(0);
  const [dueToday, setDueToday] = useState<any[]>([]);
  const [userRole, setUserRole] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserName(user.name || user.full_name || "");
    setUserRole(user.role || "");
    loadData();
  }, []);

  const loadData = async () => {
    const [c, l, p] = await Promise.all([getCustomers(), getLoans(), getPayments()]);
    setCustomers(Array.isArray(c) ? c : []);
    setLoans(Array.isArray(l) ? l : []);
    setPayments(Array.isArray(p) ? p : []);
    try {
      const [unmatchedRes, dueRes] = await Promise.all([
        fetch(`${API}/api/payments/unmatched`, { headers: getHeaders() }),
        fetch(`${API}/api/reports/due-this-week`, { headers: getHeaders() })
      ]);
      const unmatchedData = await unmatchedRes.json();
      const dueData = await dueRes.json();
      setUnmatched(Array.isArray(unmatchedData) ? unmatchedData.length : 0);
      const todayStr = new Date().toISOString().split("T")[0];
      setDueToday(Array.isArray(dueData)
        ? dueData.filter((r: any) => new Date(r.due_date).toISOString().split("T")[0] === todayStr)
        : []);
    } catch {}
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = today.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const totalDisbursed = loans.filter(l => ["active","paid"].includes(l.status)).reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const totalOutstanding = loans.filter(l => l.status === "active").reduce((s, l) => s + parseFloat(l.balance || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidLoans = loans.filter(l => l.status === "paid").length;
  const activeLoans = loans.filter(l => l.status === "active").length;
  const pendingLoans = loans.filter(l => l.status === "pending").length;
  const collectionRate = totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 100) : 0;
  const isAdmin = ["admin", "cashier", "branch_admin"].includes(userRole);
  const isBranchAdmin = userRole === "branch_admin";
  const isFullAdmin = userRole === "admin";
  const dueTodayAmount = dueToday.reduce((s: number, r: any) => s + parseFloat(r.amount_due || 0), 0);
  const overdueLoans = loans.filter(l => l.status === "active" && l.due_date && new Date(l.due_date) < today);
  const overdueAmount = overdueLoans.reduce((s, l) => s + parseFloat(l.balance || 0), 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-6">

        <p className="text-[#0F6E56] text-sm font-medium">{dateStr}</p>
        <h1 className="text-2xl font-bold mt-1 text-[#04342C]">{greeting}, {userName?.split(" ")[0] || "there"}</h1>

        <div className="bg-[#04342C] rounded-2xl px-6 py-5 mt-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-emerald-300 text-xs font-medium uppercase tracking-wide">Total portfolio</p>
              <p className="text-3xl font-bold text-white mt-1">KES {totalDisbursed.toLocaleString()}</p>
              <p className="text-emerald-200/70 text-xs mt-1">{loans.length} loans total</p>
            </div>
            <div className="flex gap-2">
              {pendingLoans > 0 && isAdmin && (
                <button onClick={() => router.push("/approvals")}
                  className="bg-amber-500 hover:bg-amber-400 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                  {pendingLoans} pending
                </button>
              )}
              {unmatched > 0 && isAdmin && (
                <button onClick={() => router.push("/matching")}
                  className="bg-orange-500 hover:bg-orange-400 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                  {unmatched} unmatched
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-emerald-800 pt-4">
            <div>
              <p className="text-emerald-300 text-xs">Outstanding</p>
              <p className="text-base font-bold text-white mt-0.5">KES {totalOutstanding.toLocaleString()}</p>
              <p className="text-emerald-200/60 text-xs mt-0.5">{activeLoans} active loans</p>
            </div>
            <div>
              <p className="text-emerald-300 text-xs">Total collected</p>
              <p className="text-base font-bold text-white mt-0.5">KES {totalCollected.toLocaleString()}</p>
              <p className="text-emerald-200/60 text-xs mt-0.5">{collectionRate}% collection rate</p>
            </div>
            <div>
              <p className="text-emerald-300 text-xs">Customers</p>
              <p className="text-base font-bold text-white mt-0.5">{customers.length}</p>
              <p className="text-emerald-200/60 text-xs mt-0.5">{paidLoans} loans fully paid</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#D9E2DC] rounded-2xl p-4 mt-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "New loan", icon: "📋", path: "/loans" },
              { label: "New customer", icon: "👤", path: "/customers" },
              { label: "Match payments", icon: "💳", path: "/matching", show: isAdmin },
              { label: "Statement", icon: "📄", path: "/statement" },
            ].filter(a => a.show !== false).map(a => (
              <button key={a.label} onClick={() => router.push(a.path)} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-[#EAF3DE] flex items-center justify-center text-base">
                  {a.icon}
                </div>
                <span className="text-xs text-[#444441] leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div onClick={() => router.push("/par")}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-shadow">
            <p className="text-amber-700 text-xs font-medium">Due today</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{dueToday.length}</p>
            <p className="text-amber-600 text-xs mt-0.5">KES {dueTodayAmount.toLocaleString()}</p>
          </div>
          <div onClick={() => router.push("/par")}
            className={`rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-shadow ${overdueLoans.length > 0 ? "bg-red-50 border border-red-200" : "bg-[#EAF3DE] border border-[#C0DD97]"}`}>
            <p className={`text-xs font-medium ${overdueLoans.length > 0 ? "text-red-700" : "text-[#3B6D11]"}`}>Overdue</p>
            <p className={`text-2xl font-bold mt-1 ${overdueLoans.length > 0 ? "text-red-700" : "text-[#3B6D11]"}`}>{overdueLoans.length}</p>
            <p className={`text-xs mt-0.5 ${overdueLoans.length > 0 ? "text-red-600" : "text-[#3B6D11]"}`}>KES {overdueAmount.toLocaleString()}</p>
          </div>
        </div>

        {overdueLoans.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {overdueLoans.slice(0, 6).map((loan: any) => {
                const daysOverdue = Math.floor((today.getTime() - new Date(loan.due_date).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={loan.id} onClick={() => router.push("/loans/" + loan.id)}
                    className="bg-white border border-red-200 rounded-xl px-3 py-2 cursor-pointer hover:shadow-sm flex justify-between items-center transition-shadow">
                    <div>
                      <p className="font-medium text-red-800 text-sm">{loan.customer_name}</p>
                      <p className="text-red-500 text-xs">KES {parseFloat(loan.balance).toLocaleString()}</p>
                    </div>
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">{daysOverdue}d</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

          <div className="bg-white rounded-2xl border border-[#D9E2DC] overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-[#EDF1EE]">
              <h3 className="font-semibold text-[#04342C]">Recent loans</h3>
              <button onClick={() => router.push("/loans")}
                className="text-xs text-[#0F6E56] hover:text-[#085041] font-medium border border-[#9FE1CB] px-3 py-1 rounded-lg">
                View all
              </button>
            </div>
            <div className="divide-y divide-[#F4F7F5]">
              {loans.slice(0, 6).map((loan: any) => {
                const balance = parseFloat(loan.balance || 0);
                const total = parseFloat(loan.total_amount || 0);
                const progress = total > 0 ? Math.max(0, 100 - (balance / total) * 100) : 0;
                const isOverdue = loan.status === "active" && loan.due_date && new Date(loan.due_date) < today;
                return (
                  <div key={loan.id} onClick={() => router.push("/loans/" + loan.id)}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#F4F7F5] cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                        isOverdue ? "bg-red-100 text-red-600" :
                        loan.status === "paid" ? "bg-[#EAF3DE] text-[#3B6D11]" :
                        loan.status === "active" ? "bg-[#E1F5EE] text-[#0F6E56]" :
                        "bg-amber-100 text-amber-600"
                      }`}>
                        {loan.customer_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#04342C]">{loan.customer_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-20 bg-[#EDF1EE] rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${isOverdue ? "bg-red-500" : "bg-[#1D9E75]"}`}
                              style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-[#888780]">{Math.round(progress)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#444441]">KES {parseFloat(loan.amount).toLocaleString()}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        loan.status === "paid" ? "bg-[#EAF3DE] text-[#3B6D11]" :
                        loan.status === "active" ? "bg-[#E1F5EE] text-[#0F6E56]" :
                        loan.status === "approved" ? "bg-indigo-100 text-indigo-700" :
                        isOverdue ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>{isOverdue ? "overdue" : loan.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#D9E2DC] overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-[#EDF1EE]">
              <h3 className="font-semibold text-[#04342C]">Recent payments</h3>
              <button onClick={() => router.push("/payments")}
                className="text-xs text-[#0F6E56] hover:text-[#085041] font-medium border border-[#9FE1CB] px-3 py-1 rounded-lg">
                View all
              </button>
            </div>
            <div className="divide-y divide-[#F4F7F5]">
              {payments.slice(0, 6).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#F4F7F5] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                      p.source === "kcb_paybill" ? "bg-purple-100 text-purple-600" :
                      p.source === "suspense" ? "bg-[#E6F1FB] text-[#185FA5]" :
                      "bg-amber-100 text-amber-600"
                    }`}>
                      {p.source === "kcb_paybill" ? "🏦" : p.source === "suspense" ? "💼" : "💵"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#04342C]">Loan #{p.loan_id}</p>
                      <p className="text-xs text-[#888780] font-mono">{p.transaction_code?.slice(0, 12) || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#1D9E75]">KES {parseFloat(p.amount).toLocaleString()}</p>
                    <p className="text-xs text-[#888780]">{new Date(p.payment_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
