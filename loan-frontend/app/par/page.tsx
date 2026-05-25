"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "https://loan-system-h794.onrender.com";

export default function PARPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    fetch(API + "/api/reports/par", { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-400">Loading PAR report...</p></div>;

  const parColor = parseFloat(data.par) === 0 ? "text-green-600" : parseFloat(data.par) < 5 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/collection")} className="text-gray-600 hover:text-blue-600">Collection</button>
          <button onClick={() => router.push("/audit")} className="text-gray-600 hover:text-blue-600">Audit</button>
        </div>
      </nav>
      <div className="p-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Portfolio at Risk (PAR) Report</h2>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 col-span-1 text-center">
            <p className="text-sm text-gray-500 mb-2">PAR Rate</p>
            <p className={"text-5xl font-bold " + parColor}>{data.par}%</p>
            <p className="text-xs text-gray-400 mt-2">{parseFloat(data.par) === 0 ? "Excellent" : parseFloat(data.par) < 5 ? "Acceptable" : "High Risk"}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Portfolio</p>
            <p className="text-2xl font-bold text-blue-600">KSh {parseFloat(data.totalPortfolio).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Overdue Balance</p>
            <p className="text-2xl font-bold text-red-600">KSh {parseFloat(data.overdueBalance).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Overdue Loans</p>
            <p className="text-2xl font-bold text-orange-600">{data.overdueLoans} / {data.totalLoans}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b"><h3 className="font-bold text-lg">Active Loans Detail</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Loan ID</th>
                <th className="px-6 py-3">Balance</th>
                <th className="px-6 py-3">Overdue Installments</th>
                <th className="px-6 py-3">Days Overdue</th>
                <th className="px-6 py-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {data.loans.map((loan: any) => (
                <tr key={loan.id} className={"border-b hover:bg-gray-50 " + (loan.is_overdue ? "bg-red-50" : "")}>
                  <td className="px-6 py-3 font-medium">{loan.customer_name}</td>
                  <td className="px-6 py-3">#{loan.id}</td>
                  <td className="px-6 py-3">KSh {parseFloat(loan.balance).toLocaleString()}</td>
                  <td className="px-6 py-3">{loan.overdue_count || 0}</td>
                  <td className="px-6 py-3">{loan.days_overdue > 0 ? loan.days_overdue + " days" : "-"}</td>
                  <td className="px-6 py-3">
                    <span className={"px-2 py-1 rounded-full text-xs font-medium " + (loan.is_overdue ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                      {loan.is_overdue ? "Overdue" : "Current"}
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
