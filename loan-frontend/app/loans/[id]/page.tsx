"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function LoanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const [loan, setLoan] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loanRes, scheduleRes, paymentsRes] = await Promise.all([
        fetch(`${API}/api/loans/${id}`, { headers: getHeaders() }),
        fetch(`${API}/api/loans/${id}/schedule`, { headers: getHeaders() }),
        fetch(`${API}/api/payments`, { headers: getHeaders() })
      ]);
      const loanData = await loanRes.json();
      const scheduleData = await scheduleRes.json();
      const paymentsData = await paymentsRes.json();
      setLoan(loanData);
      setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
      const loanPayments = Array.isArray(paymentsData) ? paymentsData.filter((p: any) => p.loan_id === parseInt(id as string)) : [];
      setPayments(loanPayments);
    } catch {}
    setLoading(false);
  };

  const statusColor = (s: string) => {
    if (s === "paid") return "bg-green-100 text-green-700";
    if (s === "partial") return "bg-yellow-100 text-yellow-700";
    if (s === "overdue") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status === "pending" && new Date(dueDate) < new Date();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!loan || loan.error) return <div className="min-h-screen flex items-center justify-center text-red-500">Loan not found</div>;

  const balance = parseFloat(loan.balance || 0);
  const total = parseFloat(loan.total_amount || 0);
  const progress = total > 0 ? Math.max(0, 100 - (balance / total) * 100) : 0;
  const paidWeeks = schedule.filter(s => s.status === "paid").length;
  const overdueWeeks = schedule.filter(s => isOverdue(s.due_date, s.status)).length;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/approvals")} className="text-gray-600 hover:text-blue-600">Approvals</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        <button onClick={() => router.push("/loans")} className="text-blue-600 hover:underline text-sm mb-4 flex items-center gap-1">
          ← Back to Loans
        </button>

        {/* Loan Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">Loan #{loan.id}</h2>
              <p className="text-gray-500">{loan.customer_name}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${loan.status === "paid" ? "bg-green-100 text-green-700" : loan.status === "active" ? "bg-blue-100 text-blue-700" : loan.status === "approved" ? "bg-indigo-100 text-indigo-700" : loan.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
              {loan.status?.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Loan Amount</p>
              <p className="text-lg font-bold text-blue-600">KSh {parseFloat(loan.amount).toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Repayment</p>
              <p className="text-lg font-bold text-purple-600">KSh {total.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Balance Remaining</p>
              <p className="text-lg font-bold text-red-600">KSh {balance.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Term</p>
              <p className="text-lg font-bold text-gray-700">{loan.term_weeks} weeks</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Repayment Progress</span>
              <span>{Math.round(progress)}% paid</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: progress + "%" }} />
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-4 mt-4 text-sm">
            <span className="text-gray-500">📅 {paidWeeks}/{schedule.length} weeks paid</span>
            {overdueWeeks > 0 && <span className="text-red-500">⚠ {overdueWeeks} overdue week{overdueWeeks > 1 ? "s" : ""}</span>}
            <span className="text-gray-500">📱 Pay via KCB Paybill <strong>522522</strong>, Account <strong>8086860</strong></span>
          </div>
        </div>

        {/* Repayment Schedule */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-lg mb-4">📅 Weekly Repayment Schedule</h3>
          {schedule.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No schedule generated yet.</p>
              <p className="text-sm mt-1">Schedule is created when loan is disbursed.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-3">Week</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Amount Due</th>
                  <th className="p-3">Amount Paid</th>
                  <th className="p-3">Remaining</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((s: any) => {
                  const overdue = isOverdue(s.due_date, s.status);
                  const remaining = parseFloat(s.amount_due) - parseFloat(s.amount_paid || 0);
                  return (
                    <tr key={s.id} className={`border-b ${overdue ? "bg-red-50" : "hover:bg-gray-50"}`}>
                      <td className="p-3 font-medium">Week {s.week_number}</td>
                      <td className="p-3">
                        {new Date(s.due_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                        {overdue && <span className="ml-2 text-xs text-red-500 font-medium">OVERDUE</span>}
                      </td>
                      <td className="p-3">KSh {parseFloat(s.amount_due).toLocaleString()}</td>
                      <td className="p-3 text-green-600">KSh {parseFloat(s.amount_paid || 0).toLocaleString()}</td>
                      <td className="p-3 text-red-600">KSh {Math.max(0, remaining).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${overdue ? "bg-red-100 text-red-700" : statusColor(s.status)}`}>
                          {overdue ? "overdue" : s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-lg mb-4">💳 Payment History</h3>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No payments recorded yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-3">Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Transaction Code</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{new Date(p.payment_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="p-3 text-green-600 font-bold">KSh {parseFloat(p.amount).toLocaleString()}</td>
                    <td className="p-3 font-mono text-xs">{p.transaction_code || p.kcb_transaction_id || "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${p.source === "kcb_paybill" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                        {p.source === "kcb_paybill" ? "KCB Paybill" : p.source}
                      </span>
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