"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, getLoans, getPayments } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    const c = await getCustomers();
    const l = await getLoans();
    const p = await getPayments();
    setCustomers(Array.isArray(c) ? c : []);
    setLoans(Array.isArray(l) ? l : []);
    setPayments(Array.isArray(p) ? p : []);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const totalDisbursed = loans.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + parseFloat(l.balance || 0), 0);
  const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const kcbCollected = payments.filter(p => p.source === "kcb_paybill").reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const paidLoans = loans.filter(l => l.status === "paid").length;
  const activeLoans = loans.filter(l => l.status === "active").length;
  const pendingLoans = loans.filter(l => l.status === "pending").length;
  const approvedLoans = loans.filter(l => l.status === "approved").length;
  const collectionRate = totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>
          <button onClick={() => router.push("/approvals")} className="text-purple-600 hover:text-purple-800 font-medium">
            Approvals {pendingLoans > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">{pendingLoans}</span>}
          </button>
          <button onClick={() => router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>
          <button onClick={logout} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Customers</p>
            <p className="text-3xl font-bold text-blue-600">{customers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Loans</p>
            <p className="text-3xl font-bold text-green-600">{loans.length}</p>
            <p className="text-xs text-gray-400 mt-1">{activeLoans} active · {paidLoans} paid · {pendingLoans} pending · {approvedLoans} approved</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Amount Disbursed</p>
            <p className="text-3xl font-bold text-purple-600">KSh {totalDisbursed.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Collected</p>
            <p className="text-3xl font-bold text-orange-600">KSh {totalCollected.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{collectionRate}% collection rate</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Outstanding Balance</p>
            <p className="text-3xl font-bold text-red-600">KSh {totalOutstanding.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">KCB Paybill Collections</p>
            <p className="text-3xl font-bold text-indigo-600">KSh {kcbCollected.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{payments.filter(p => p.source === "kcb_paybill").length} transactions</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 cursor-pointer hover:bg-purple-50 border-2 border-purple-200" onClick={() => router.push("/approvals")}>
            <p className="text-gray-500 text-sm">Pending Approvals</p>
            <p className="text-3xl font-bold text-purple-600">{pendingLoans + approvedLoans}</p>
            <p className="text-xs text-purple-400 mt-1">Click to review</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Recent Loans</h3>
            <button onClick={() => router.push("/loans")} className="text-blue-600 text-sm hover:underline">View all</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Customer</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Balance</th>
                <th className="pb-2">Progress</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.slice(0, 5).map((loan: any) => {
                const balance = parseFloat(loan.balance || 0);
                const total = parseFloat(loan.total_amount || 0);
                const progress = total > 0 ? Math.max(0, 100 - (balance / total) * 100) : 0;
                return (
                  <tr key={loan.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{loan.customer_name}</td>
                    <td className="py-2">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                    <td className="py-2 text-red-600">KSh {balance.toLocaleString()}</td>
                    <td className="py-2 w-32">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: progress + "%" }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{Math.round(progress)}% paid</p>
                    </td>
                    <td className="py-2">
                      <span className={"px-2 py-1 rounded-full text-xs " + (
                        loan.status === "paid" ? "bg-green-100 text-green-700" :
                        loan.status === "active" ? "bg-blue-100 text-blue-700" :
                        loan.status === "approved" ? "bg-teal-100 text-teal-700" :
                        loan.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700")}>
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Recent Payments</h3>
            <button onClick={() => router.push("/payments")} className="text-blue-600 text-sm hover:underline">View all</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Loan ID</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Transaction Code</th>
                <th className="pb-2">Source</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 5).map((p: any) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">#{p.loan_id}</td>
                  <td className="py-2 text-green-600 font-medium">KSh {parseFloat(p.amount).toLocaleString()}</td>
                  <td className="py-2 font-mono text-xs">{p.transaction_code || p.kcb_transaction_id || "-"}</td>
                  <td className="py-2">
                    <span className={"px-2 py-1 rounded-full text-xs " + (p.source === "kcb_paybill" ? "bg-purple-100 text-purple-700" : p.source === "mpesa" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700")}>
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
