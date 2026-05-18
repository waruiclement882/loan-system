"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, getLoans, getPayments } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    loadData();
  }, []);

  const loadData = async () => {
    const c = await getCustomers();
    const l = await getLoans();
    const p = await getPayments();
    setCustomers(c);
    setLoans(l);
    setPayments(p);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const totalDisbursed = loans.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
  const totalRepayment = loans.reduce((sum, l) => sum + parseFloat(l.total_repayment || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>
          <button onClick={logout} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Customers</p>
            <p className="text-3xl font-bold text-blue-600">{customers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Loans</p>
            <p className="text-3xl font-bold text-green-600">{loans.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Amount Disbursed</p>
            <p className="text-3xl font-bold text-purple-600">KSh {totalDisbursed.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Collected</p>
            <p className="text-3xl font-bold text-orange-600">KSh {totalPaid.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-lg mb-4">Recent Loans</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Customer</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Monthly Payment</th>
                <th className="pb-2">Total Repayment</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{loan.customer_name}</td>
                  <td className="py-2">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                  <td className="py-2">KSh {parseFloat(loan.monthly_payment).toLocaleString()}</td>
                  <td className="py-2">KSh {parseFloat(loan.total_repayment).toLocaleString()}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${loan.status === "approved" ? "bg-green-100 text-green-700" : loan.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {loan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
