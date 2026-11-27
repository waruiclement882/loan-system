const fs = require("fs");
const path = require("path");

// ------------------------------------------------------
// DASHBOARD PAGE
// ------------------------------------------------------
const dashboard = `"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, getLoans, getPayments } from "@/lib/api";
import Layout from "../components/Layout";

export default function DashboardPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [userName, setUserName] = useState("");
  const [unmatched, setUnmatched] = useState(0);
  const [dueToday, setDueToday] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [greeting, setGreeting] = useState("");
  const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: "Bearer " + token };
  };

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
      setDueToday(Array.isArray(dueData) ? dueData.filter(r => new Date(r.due_date).toISOString().split("T")[0] === todayStr) : []);
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
  const dueTodayAmount = dueToday.reduce((s, r) => s + parseFloat(r.amount_due || 0), 0);
  const overdueLoans = loans.filter(l => l.status === "active" && l.due_date && new Date(l.due_date) < today);
  const overdueAmount = overdueLoans.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
  const fmt = (n) => "KSh " + Math.round(n || 0).toLocaleString();

  const kpis = [
    { label: "Total Portfolio", value: fmt(totalDisbursed), sub: loans.length + " loans total", color: "#1565C0", bg: "#EAF2FB", icon: "??" },
    { label: "Outstanding", value: fmt(totalOutstanding), sub: activeLoans + " active loans", color: "#E67E22", bg: "#FEF3E2", icon: "?" },
    { label: "Total Collected", value: fmt(totalCollected), sub: collectionRate + "% collection rate", color: "#1B8A5A", bg: "#E8F5EF", icon: "?" },
    { label: "Customers", value: customers.length, sub: paidLoans + " loans fully paid", color: "#7B4FD4", bg: "#F0EAF9", icon: "??" },
  ];

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-500 font-medium">{new Date().toLocaleDateString("en-KE", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
            <h1 className="text-xl font-bold text-[#0B2545] mt-0.5">{greeting}, {userName.split(" ")[0] || "there"}</h1>
          </div>
          <div className="flex gap-2">
            {pendingLoans > 0 && isAdmin && (
              <button onClick={() => router.push("/approvals")}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                <span>?</span>{pendingLoans} pending
              </button>
            )}
            {unmatched > 0 && isAdmin && (
              <button onClick={() => router.push("/matching")}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                <span>??</span>{unmatched} unmatched
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map(k => (
            <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">{k.label}</p>
                  <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: k.bg }}>
                  {k.icon}
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ backgroundColor: k.color, width: k.label === "Total Collected" ? collectionRate + "%" : "100%" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
          <div className="flex gap-3 flex-wrap">
            {[
              { label:"New Loan", icon:"??", path:"/loans", color:"#1565C0", bg:"#EAF2FB" },
              { label:"New Customer", icon:"??", path:"/customers", color:"#0D7377", bg:"#E0F4F4" },
              { label:"Record Payment", icon:"??", path:"/payments", color:"#1B8A5A", bg:"#E8F5EF" },
              { label:"Match Payments", icon:"??", path:"/matching", color:"#E67E22", bg:"#FEF3E2", show:isAdmin },
              { label:"Collection Sheet", icon:"??", path:"/collection", color:"#7B4FD4", bg:"#F0EAF9" },
              { label:"Reports", icon:"??", path:"/reports", color:"#C0392B", bg:"#FCEAE9", show:isAdmin },
            ].filter(a => a.show !== false).map(a => (
              <button key={a.label} onClick={() => router.push(a.path)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-sm"
                style={{ backgroundColor: a.bg, color: a.color }}>
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Due today */}
          <div className="bg-white rounded-2xl border border-amber-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/par")}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-amber-800">Due Today</p>
              <span className="text-2xl">??</span>
            </div>
            <p className="text-3xl font-bold text-amber-700">{dueToday.length}</p>
            <p className="text-sm text-amber-600 mt-1">{fmt(dueTodayAmount)}</p>
            <div className="mt-2 h-1 bg-amber-100 rounded-full"><div className="h-full bg-amber-400 rounded-full" style={{ width: "100%" }} /></div>
          </div>

          {/* Overdue */}
          <div className={"bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-shadow " + (overdueLoans.length > 0 ? "border-red-100" : "border-green-100")}
            onClick={() => router.push("/par")}>
            <div className="flex items-center justify-between mb-3">
              <p className={"text-sm font-semibold " + (overdueLoans.length > 0 ? "text-red-800" : "text-green-800")}>Overdue Loans</p>
              <span className="text-2xl">{overdueLoans.length > 0 ? "??" : "?"}</span>
            </div>
            <p className={"text-3xl font-bold " + (overdueLoans.length > 0 ? "text-red-700" : "text-green-700")}>{overdueLoans.length}</p>
            <p className={"text-sm mt-1 " + (overdueLoans.length > 0 ? "text-red-600" : "text-green-600")}>{fmt(overdueAmount)}</p>
            <div className="mt-2 h-1 bg-gray-100 rounded-full"><div className={"h-full rounded-full " + (overdueLoans.length > 0 ? "bg-red-400" : "bg-green-400")} style={{ width: overdueLoans.length > 0 ? "100%" : "0%" }} /></div>
          </div>

          {/* Collection progress */}
          <div className="bg-white rounded-2xl border border-green-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-green-800">Collection Rate</p>
              <span className="text-2xl">??</span>
            </div>
            <p className="text-3xl font-bold text-green-700">{collectionRate}%</p>
            <p className="text-sm text-green-600 mt-1">{fmt(totalCollected)} collected</p>
            <div className="mt-2 h-2 bg-green-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: collectionRate + "%" }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent loans */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-[#0B2545] text-sm">Recent Loans</p>
              <button onClick={() => router.push("/loans")} className="text-xs text-[#1565C0] hover:underline font-medium">View all ?</button>
            </div>
            <div className="divide-y divide-gray-50">
              {loans.slice(0, 6).map(loan => {
                const balance = parseFloat(loan.balance || 0);
                const total = parseFloat(loan.total_amount || 0);
                const progress = total > 0 ? Math.max(0, 100 - (balance / total) * 100) : 0;
                const statusColors = { active:"bg-blue-100 text-blue-700", paid:"bg-green-100 text-green-700", pending:"bg-amber-100 text-amber-700", overdue:"bg-red-100 text-red-700" };
                return (
                  <div key={loan.id} onClick={() => router.push("/loans/" + loan.id)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-[#EAF2FB] text-[#1565C0] flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {loan.customer_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{loan.customer_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1B8A5A] rounded-full" style={{ width: progress + "%" }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{Math.round(progress)}%</span>
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

          {/* Recent payments */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-[#0B2545] text-sm">Recent Payments</p>
              <button onClick={() => router.push("/payments")} className="text-xs text-[#1565C0] hover:underline font-medium">View all ?</button>
            </div>
            <div className="divide-y divide-gray-50">
              {payments.slice(0, 6).map(p => (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#E8F5EF] text-[#1B8A5A] flex items-center justify-center text-lg flex-shrink-0">
                    {p.source === "kcb_paybill" ? "??" : p.source === "suspense" ? "??" : "??"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">Loan #{p.loan_id}</p>
                    <p className="text-xs text-gray-400 truncate">{p.transaction_code?.slice(0, 16) || "—"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-[#1B8A5A]">KSh {parseFloat(p.amount).toLocaleString()}</p>
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
console.log("Dashboard written:", dashboard.length, "chars");
process.exit(0);
