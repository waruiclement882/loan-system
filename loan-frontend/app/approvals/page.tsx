"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function ApprovalsPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectForm, setRejectForm] = useState<{ id: number; reason: string } | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const getToken = () => localStorage.getItem("token");
  const headers = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + getToken() });

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    loadLoans();
  }, [activeTab]);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL + "/api/loans?status=" + activeTab, { headers: headers() });
      const data = await res.json();
      setLoans(Array.isArray(data) ? data : []);
    } catch (e) { setLoans([]); }
    setLoading(false);
  };

  const approveLoan = async (id: number) => {
    setActionLoading(id);
    await fetch(API_URL + "/api/loans/" + id + "/approve", { method: "PATCH", headers: headers() });
    loadLoans();
    setActionLoading(null);
  };

  const rejectLoan = async () => {
    if (!rejectForm) return;
    setActionLoading(rejectForm.id);
    await fetch(API_URL + "/api/loans/" + rejectForm.id + "/reject", {
      method: "PATCH", headers: headers(),
      body: JSON.stringify({ reason: rejectForm.reason })
    });
    setRejectForm(null);
    loadLoans();
    setActionLoading(null);
  };

  const disburseLoan = async (id: number) => {
    setActionLoading(id);
    await fetch(API_URL + "/api/loans/" + id + "/disburse", { method: "PATCH", headers: headers() });
    loadLoans();
    setActionLoading(null);
  };

  const tabs = ["pending", "approved", "active", "rejected", "paid"];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>
        </div>
      </nav>

      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Loan Approvals</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={"px-4 py-2 rounded-lg text-sm font-medium capitalize " + (activeTab === tab ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>
              {tab}
            </button>
          ))}
        </div>

        {/* Reject Modal */}
        {rejectForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="font-bold text-lg mb-4">Reject Loan</h3>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={rejectForm.reason}
                onChange={(e) => setRejectForm({ ...rejectForm, reason: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mb-4" rows={3}
                placeholder="Enter rejection reason..."
              />
              <div className="flex gap-2">
                <button onClick={rejectLoan} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                  Confirm Reject
                </button>
                <button onClick={() => setRejectForm(null)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <p className="p-6 text-center text-gray-400">Loading...</p>
          ) : loans.length === 0 ? (
            <p className="p-6 text-center text-gray-400">No {activeTab} loans found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-4">ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Term</th>
                  <th className="p-4">Interest</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan: any) => (
                  <tr key={loan.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">#{loan.id}</td>
                    <td className="p-4 font-medium">{loan.customer_name}</td>
                    <td className="p-4">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                    <td className="p-4">{loan.term_weeks} wks</td>
                    <td className="p-4">KSh {parseFloat(loan.interest_amount || 0).toLocaleString()}</td>
                    <td className="p-4">KSh {parseFloat(loan.total_amount || 0).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={"px-2 py-1 rounded-full text-xs font-medium " + (
                        loan.status === "paid" ? "bg-green-100 text-green-700" :
                        loan.status === "active" ? "bg-blue-100 text-blue-700" :
                        loan.status === "approved" ? "bg-teal-100 text-teal-700" :
                        loan.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700")}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {loan.status === "pending" && (
                          <>
                            <button onClick={() => approveLoan(loan.id)} disabled={actionLoading === loan.id}
                              className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50">
                              Approve
                            </button>
                            <button onClick={() => setRejectForm({ id: loan.id, reason: "" })} disabled={actionLoading === loan.id}
                              className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50">
                              Reject
                            </button>
                          </>
                        )}
                        {loan.status === "approved" && (
                          <button onClick={() => disburseLoan(loan.id)} disabled={actionLoading === loan.id}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                            Disburse
                          </button>
                        )}
                        {loan.status === "rejected" && loan.rejection_reason && (
                          <span className="text-xs text-red-500 italic">{loan.rejection_reason}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
