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
      const [loanRes, schedRes] = await Promise.all([
        fetch(`${API}/api/loans/${id}`, { headers: getHeaders() }),
        fetch(`${API}/api/loans/${id}/schedule`, { headers: getHeaders() })
      ]);
      const loanData = await loanRes.json();
      const schedData = await schedRes.json();
      setLoan(loanData);
      setSchedule(Array.isArray(schedData) ? schedData : []);
    } catch {}
    setLoading(false);
  };

  const generateSchedule = async () => {
    await fetch(`${API}/api/loans/${id}/disburse`, { method: 'PATCH', headers: getHeaders() });
    loadData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!loan) return <div className="min-h-screen flex items-center justify-center text-red-500">Loan not found</div>;

  const balance = parseFloat(loan.balance || 0);
  const total = parseFloat(loan.total_amount || 0);
  const progress = total > 0 ? Math.max(0, 100 - (balance / total) * 100) : 0;
  const paidWeeks = schedule.filter(s => s.status === 'paid').length;
  const overdueWeeks = schedule.filter(s => s.status === 'pending' && new Date(s.due_date) < new Date()).length;

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

      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => router.push("/loans")} className="text-blue-600 hover:underline text-sm mb-4 block">← Back to Loans</button>

        {/* Loan Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">Loan #{loan.id}</h2>
              <p className="text-gray-500">{loan.customer_name}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${loan.status === "paid" ? "bg-green-100 text-green-700" : loan.status === "active" ? "bg-blue-100 text-blue-700" : loan.status === "approved" ? "bg-indigo-100 text-indigo-700" : loan.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
              {loan.status}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Loan Amount</p>
              <p className="text-xl font-bold text-blue-600">KSh {parseFloat(loan.amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Repayment</p>
              <p className="text-xl font-bold text-purple-600">KSh {total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance</p>
              <p className="text-xl font-bold text-red-600">KSh {balance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Term</p>
              <p className="text-xl font-bold">{loan.term_weeks} weeks</p>
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

          {/* Payment Instructions */}
          {loan.status === "active" && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 font-medium text-sm">📱 Payment Instructions</p>
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                <div><span className="text-gray-500">Paybill:</span> <span className="font-bold">522522</span></div>
                <div><span className="text-gray-500">Account:</span> <span className="font-bold">8086860</span></div>
                <div><span className="text-gray-500">Weekly:</span> <span className="font-bold">KSh {schedule.length > 0 ? parseFloat(schedule[0].amount_due).toLocaleString() : "—"}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Repayment Schedule */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Repayment Schedule</h3>
              {schedule.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {paidWeeks}/{schedule.length} weeks paid
                  {overdueWeeks > 0 && <span className="text-red-500 ml-2">· {overdueWeeks} overdue</span>}
                </p>
              )}
            </div>
          </div>

          {schedule.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium">No schedule yet</p>
              <p className="text-sm mt-1">Schedule is generated when loan is disbursed</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-4">Week</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Amount Due</th>
                  <th className="p-4">Amount Paid</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Paid On</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((s: any) => {
                  const isOverdue = s.status === 'pending' && new Date(s.due_date) < new Date();
                  return (
                    <tr key={s.id} className={`border-b ${isOverdue ? "bg-red-50" : "hover:bg-gray-50"}`}>
                      <td className="p-4 font-medium">Week {s.week_number}</td>
                      <td className={`p-4 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                        {new Date(s.due_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {isOverdue && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1 rounded">OVERDUE</span>}
                      </td>
                      <td className="p-4 font-medium">KSh {parseFloat(s.amount_due).toLocaleString()}</td>
                      <td className="p-4 text-green-600">KSh {parseFloat(s.amount_paid || 0).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === "paid" ? "bg-green-100 text-green-700" : s.status === "partial" ? "bg-yellow-100 text-yellow-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                          {isOverdue && s.status === 'pending' ? 'overdue' : s.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 text-xs">
                        {s.paid_at ? new Date(s.paid_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}