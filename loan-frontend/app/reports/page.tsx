"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, getLoans, getPayments } from "@/lib/api";

export default function ReportsPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [unmatched, setUnmatched] = useState(0);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    setUserName(user.name || user.full_name || "");
    loadData();
  }, []);

  const loadData = async () => {
    const [c, l, p] = await Promise.all([getCustomers(), getLoans(), getPayments()]);
    setCustomers(Array.isArray(c) ? c : []);
    setLoans(Array.isArray(l) ? l : []);
    setPayments(Array.isArray(p) ? p : []);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com"}/api/payments/unmatched`, { headers: getHeaders() });
      const data = await res.json();
      setUnmatched(Array.isArray(data) ? data.length : 0);
    } catch {}
  };

  const logout = () => { localStorage.clear(); router.push("/login"); };
  const isAdmin = ["admin", "cashier"].includes(userRole);
  const pendingLoans = loans.filter(l => l.status === "pending").length;

  // Loan Summary
  const totalDisbursed = loans.filter(l => ["active","paid"].includes(l.status)).reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const totalRepaid = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalOutstanding = loans.filter(l => l.status === "active").reduce((s, l) => s + parseFloat(l.balance || 0), 0);
  const activeLoans = loans.filter(l => l.status === "active").length;
  const paidLoans = loans.filter(l => l.status === "paid").length;
  const collectionRate = totalDisbursed > 0 ? Math.round((totalRepaid / totalDisbursed) * 100) : 0;

  // Overdue loans — due date passed and still active
  const today = new Date();
  const overdueLoans = loans.filter(l => l.status === "active" && l.due_date && new Date(l.due_date) < today);
  const overdueAmount = overdueLoans.reduce((s, l) => s + parseFloat(l.balance || 0), 0);

  // Customer stats
  const activeCustomers = customers.filter(c => loans.some(l => l.customer_id === c.id && l.status === "active")).length;
  const newThisMonth = customers.filter(c => {
    const created = new Date(c.created_at);
    return created.getMonth() === today.getMonth() && created.getFullYear() === today.getFullYear();
  }).length;

  // Recent payments
  // Quick access tools
  const quickTools = [
    { label: 'PAR Report', desc: 'Portfolio at Risk analysis', path: '/par', color: 'bg-red-500' },
    { label: 'Collection Sheet', desc: 'Daily collection by date', path: '/collection', color: 'bg-green-600' },
    { label: 'Loan Statement', desc: 'Printable per-loan statement', path: '/statement', color: 'bg-blue-600' },
    { label: 'Audit Logs', desc: 'Activity & audit trail', path: '/audit', color: 'bg-purple-600' },
    { label: 'Export Data', desc: 'Export to Excel', path: '/export', color: 'bg-orange-500' },
  ];

  const recentPayments = [...payments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Nav */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4 items-center">
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>
          {isAdmin && (
            <button onClick={() => router.push("/approvals")} className="text-gray-600 hover:text-blue-600 relative">
              Approvals
              {pendingLoans > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingLoans}</span>}
            </button>
          )}
          {isAdmin && (
            <button onClick={() => router.push("/matching")} className="text-gray-600 hover:text-blue-600 relative">
              💳 Match Payments
              {unmatched > 0 && <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{unmatched}</span>}
            </button>
          )}
          {isAdmin && <button onClick={() => router.push("/reports")} className="text-blue-600 font-semibold">Reports</button>}
          {userRole === "admin" && <button onClick={() => router.push("/users")} className="text-gray-600 hover:text-blue-600">Users</button>}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l">
            <span className="text-sm text-gray-500">{userName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${userRole === "admin" ? "bg-red-100 text-red-700" : userRole === "cashier" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{userRole}</span>
            <button onClick={logout} className="text-red-500 hover:text-red-700 text-sm ml-1">Logout</button>
          </div>
        </div>
      </nav>

      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Reports</h2>

        {/* Loan Summary */}
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Loan Summary</h3>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Disbursed</p>
            <p className="text-3xl font-bold text-purple-600">KSh {totalDisbursed.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{activeLoans} active · {paidLoans} paid</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Repaid</p>
            <p className="text-3xl font-bold text-green-600">KSh {totalRepaid.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{collectionRate}% collection rate</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Outstanding Balance</p>
            <p className="text-3xl font-bold text-red-600">KSh {totalOutstanding.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Across active loans</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Loans</p>
            <p className="text-3xl font-bold text-blue-600">{loans.length}</p>
            <p className="text-xs text-gray-400 mt-1">{pendingLoans} pending approval</p>
          </div>
        </div>

        {/* Customer Stats */}
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Customer Stats</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Customers</p>
            <p className="text-3xl font-bold text-blue-600">{customers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Active Borrowers</p>
            <p className="text-3xl font-bold text-green-600">{activeCustomers}</p>
            <p className="text-xs text-gray-400 mt-1">Currently have active loans</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">New This Month</p>
            <p className="text-3xl font-bold text-teal-600">{newThisMonth}</p>
            <p className="text-xs text-gray-400 mt-1">{today.toLocaleString("default", { month: "long", year: "numeric" })}</p>
          </div>
        </div>

        {/* Overdue Loans */}
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Overdue Loans</h3>
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          {overdueLoans.length === 0 ? (
            <p className="text-gray-400 text-sm">No overdue loans 🎉</p>
          ) : (
            <>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-red-600 font-medium">{overdueLoans.length} overdue loan{overdueLoans.length > 1 ? "s" : ""} · KSh {overdueAmount.toLocaleString()} outstanding</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Loan ID</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Balance</th>
                    <th className="pb-2">Due Date</th>
                    <th className="pb-2">Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueLoans.map((loan: any) => {
                    const daysOverdue = Math.floor((today.getTime() - new Date(loan.due_date).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={loan.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 font-medium">{loan.customer_name}</td>
                        <td className="py-2">#{loan.id}</td>
                        <td className="py-2">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                        <td className="py-2 text-red-600">KSh {parseFloat(loan.balance).toLocaleString()}</td>
                        <td className="py-2">{new Date(loan.due_date).toLocaleDateString()}</td>
                        <td className="py-2">
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">{daysOverdue} days</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Payment History */}
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Payment History</h3>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Last {recentPayments.length} payments</p>
            <button onClick={() => router.push("/payments")} className="text-blue-600 text-sm hover:underline">View all</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Loan ID</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Transaction Code</th>
                <th className="pb-2">Source</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p: any) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">#{p.loan_id}</td>
                  <td className="py-2">{p.customer_name || "-"}</td>
                  <td className="py-2 text-green-600 font-medium">KSh {parseFloat(p.amount).toLocaleString()}</td>
                  <td className="py-2 font-mono text-xs">{p.transaction_code || p.kcb_transaction_id || "-"}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.source === "kcb_paybill" ? "bg-purple-100 text-purple-700" : p.source === "mpesa" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {p.source === "kcb_paybill" ? "KCB Paybill" : p.source}
                    </span>
                  </td>
                  <td className="py-2">{new Date(p.payment_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}