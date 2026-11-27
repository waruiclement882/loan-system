const fs = require("fs");

const dashboard = `"use client";
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
  const [greeting, setGreeting] = useState("");
  const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

  const getHeaders = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserName(user.name || user.full_name || "");
    setUserRole(user.role || "");
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    loadData();
  }, []);

  const loadData = async () => {
    const [c, l, p] = await Promise.all([getCustomers(), getLoans(), getPayments()]);
    setCustomers(Array.isArray(c) ? c : []);
    setLoans(Array.isArray(l) ? l : []);
    setPayments(Array.isArray(p) ? p : []);
    try {
      const [unmatchedRes, dueRes] = await Promise.all([
        fetch(API + "/api/payments/unmatched", { headers: getHeaders() }),
        fetch(API + "/api/reports/due-this-week", { headers: getHeaders() })
      ]);
      const unmatchedData = await unmatchedRes.json();
      const dueData = await dueRes.json();
      setUnmatched(Array.isArray(unmatchedData) ? unmatchedData.length : 0);
      const todayStr = new Date().toISOString().split("T")[0];
      setDueToday(Array.isArray(dueData) ? dueData.filter((r: any) => new Date(r.due_date).toISOString().split("T")[0] === todayStr) : []);
    } catch {}
  };

  const today = new Date();
  const isAdmin = ["super_admin","admin","branch_admin","cashier","loan_officer"].includes(userRole);
  const totalDisbursed = loans.filter(l => ["active","paid"].includes(l.status)).reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const totalOutstanding = loans.filter(l => l.status === "active").reduce((s, l) => s + parseFloat(l.balance || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidLoans = loans.filter(l => l.status === "paid").length;
  const activeLoans = loans.filter(l => l.status === "active").length;
  const pendingLoans = loans.filter(l => l.status === "pending").length;
  const collectionRate = totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 100) : 0;
  const dueTodayAmount = dueToday.reduce((s: number, r: any) => s + parseFloat(r.amount_due || 0), 0);
  const overdueLoans = loans.filter(l => l.status === "active" && l.due_date && new Date(l.due_date) < today);
  const overdueAmount = overdueLoans.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
  const fmt = (n: number) => "KSh " + Math.round(n || 0).toLocaleString();

  const statusColors: Record<string,string> = {
    active: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700"
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-KE", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
            <h1 className="text-xl font-bold text-[#0B2545] mt-0.5">{greeting}, {userName.split(" ")[0] || "there"}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {pendingLoans > 0 && isAdmin && (
              <button onClick={() => router.push("/approvals")}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                {pendingLoans} pending approval
              </button>
            )}
            {unmatched > 0 && isAdmin && (
              <button onClick={() => router.push("/matching")}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                {unmatched} unmatched
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label:"Total Portfolio", value:fmt(totalDisbursed), sub:loans.length+" loans total", color:"#1565C0", bg:"#EAF2FB", border:"#BFDBFE",
              icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>' },
            { label:"Outstanding", value:fmt(totalOutstanding), sub:activeLoans+" active loans", color:"#D97706", bg:"#FEF3C7", border:"#FDE68A",
              icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
            { label:"Total Collected", value:fmt(totalCollected), sub:collectionRate+"% collection rate", color:"#059669", bg:"#D1FAE5", border:"#A7F3D0",
              icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>' },
            { label:"Customers", value:customers.length, sub:paidLoans+" loans fully paid", color:"#7C3AED", bg:"#EDE9FE", border:"#C4B5FD",
              icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl p-4 border shadow-sm hover:shadow-md transition-shadow" style={{ borderColor: k.border }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: k.bg }}
                  dangerouslySetInnerHTML={{ __html: k.icon }} />
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium">{k.label}</p>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
              {k.label === "Total Collected" && (
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ backgroundColor: k.color, width: Math.min(collectionRate, 100) + "%" }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { label:"New Loan", path:"/loans", color:"#1565C0", bg:"#EAF2FB" },
              { label:"New Customer", path:"/customers", color:"#0D7377", bg:"#E0F4F4" },
              { label:"Record Payment", path:"/payments", color:"#059669", bg:"#D1FAE5" },
              { label:"Match Payments", path:"/matching", color:"#D97706", bg:"#FEF3C7", show:isAdmin },
              { label:"Collection Sheet", path:"/collection", color:"#7C3AED", bg:"#EDE9FE" },
              { label:"Reports", path:"/reports", color:"#DC2626", bg:"#FEE2E2", show:isAdmin },
            ].filter(a => a.show !== false).map(a => (
              <button key={a.label} onClick={() => router.push(a.path)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 hover:shadow-sm"
                style={{ backgroundColor: a.bg, color: a.color }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div onClick={() => router.push("/par")}
            className="bg-white rounded-2xl border border-amber-200 p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-amber-700">Due Today</p>
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{dueToday.length}</p>
            <p className="text-sm text-amber-500 mt-1">{fmt(dueTodayAmount)}</p>
          </div>

          <div onClick={() => router.push("/par")}
            className={"bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-shadow " + (overdueLoans.length > 0 ? "border-red-200" : "border-green-200")}>
            <div className="flex items-center justify-between mb-2">
              <p className={"text-sm font-semibold " + (overdueLoans.length > 0 ? "text-red-700" : "text-green-700")}>Overdue Loans</p>
              <span className={"w-8 h-8 rounded-lg flex items-center justify-center " + (overdueLoans.length > 0 ? "bg-red-100" : "bg-green-100")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={overdueLoans.length > 0 ? "#DC2626" : "#059669"} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </span>
            </div>
            <p className={"text-3xl font-bold " + (overdueLoans.length > 0 ? "text-red-600" : "text-green-600")}>{overdueLoans.length}</p>
            <p className={"text-sm mt-1 " + (overdueLoans.length > 0 ? "text-red-500" : "text-green-500")}>{fmt(overdueAmount)}</p>
          </div>

          <div className="bg-white rounded-2xl border border-green-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-green-700">Collection Rate</p>
              <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </span>
            </div>
            <p className="text-3xl font-bold text-green-600">{collectionRate}%</p>
            <div className="mt-2 h-2 bg-green-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: Math.min(collectionRate,100) + "%" }} />
            </div>
          </div>
        </div>

        {/* Recent Loans + Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-[#0B2545] text-sm">Recent Loans</p>
              <button onClick={() => router.push("/loans")} className="text-xs text-[#1565C0] hover:underline font-medium">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {loans.slice(0, 6).map((loan: any) => {
                const balance = parseFloat(loan.balance || 0);
                const total = parseFloat(loan.total_amount || 0);
                const progress = total > 0 ? Math.max(0, 100 - (balance / total) * 100) : 0;
                return (
                  <div key={loan.id} onClick={() => router.push("/loans/" + loan.id)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-[#EAF2FB] text-[#1565C0] flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {loan.customer_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{loan.customer_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#059669] rounded-full" style={{ width: progress + "%" }} />
                        </div>
                        <span className="text-[10px] text-gray-400 w-7">{Math.round(progress)}%</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-800">KSh {parseFloat(loan.amount).toLocaleString()}</p>
                      <span className={"text-[10px] font-medium px-1.5 py-0.5 rounded-full " + (statusColors[loan.status] || "bg-gray-100 text-gray-600")}>{loan.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-[#0B2545] text-sm">Recent Payments</p>
              <button onClick={() => router.push("/payments")} className="text-xs text-[#1565C0] hover:underline font-medium">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {payments.slice(0, 6).map((p: any) => (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">Loan #{p.loan_id}</p>
                    <p className="text-xs text-gray-400 truncate">{p.transaction_code?.slice(0, 16) || "Manual"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-[#059669]">KSh {parseFloat(p.amount).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">{new Date(p.payment_date).toLocaleDateString("en-KE", { day:"numeric", month:"short" })}</p>
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
`;

fs.writeFileSync("loan-frontend/app/dashboard/page.tsx", dashboard, "utf8");
console.log("Dashboard written:", dashboard.length);
process.exit(0);
