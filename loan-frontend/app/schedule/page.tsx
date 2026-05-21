"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLoans } from "@/lib/api";

const API = "https://loan-system-h794.onrender.com";

function ScheduleContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [loans, setLoans]         = useState<any[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [schedule, setSchedule]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadLoans();
  }, []);

  const loadLoans = async () => {
    const l = await getLoans();
    const active = Array.isArray(l) ? l.filter((x: any) => ['active','paid'].includes(x.status)) : [];
    setLoans(active);
    // Auto-select if loan_id in URL
    const loanId = searchParams.get("loan_id");
    if (loanId) {
      const found = active.find((x: any) => String(x.id) === loanId);
      if (found) { setSelectedLoan(found); fetchSchedule(loanId); }
    }
  };

  const fetchSchedule = async (loanId: string) => {
    setLoading(true);
    try {
      const res  = await fetch(API + "/api/loans/" + loanId + "/schedule", {
        headers: { Authorization: "Bearer " + token }
      });
      const data = await res.json();
      setSchedule(Array.isArray(data) ? data : []);
    } catch { setSchedule([]); }
    setLoading(false);
  };

  const handleSelect = (e: any) => {
    const loan = loans.find((l: any) => l.id === parseInt(e.target.value));
    setSelectedLoan(loan || null);
    if (loan) fetchSchedule(loan.id);
    else setSchedule([]);
  };

  const totalPaid    = schedule.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
  const totalDue     = schedule.reduce((s, i) => s + parseFloat(i.amount_due), 0);
  const overdueCount = schedule.filter(i => i.status === 'overdue').length;
  const paidCount    = schedule.filter(i => i.status === 'paid').length;

  const statusColor = (s: string) => ({
    paid:    'bg-green-100 text-green-700',
    partial: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-500',
  }[s] || 'bg-gray-100 text-gray-500');

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")}  className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/loans")}      className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/payments")}   className="text-gray-600 hover:text-blue-600">Payments</button>
          <button onClick={() => router.push("/approvals")}  className="text-gray-600 hover:text-blue-600">Approvals</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Repayment Schedule</h2>

        {/* Loan selector */}
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Loan</label>
          <select onChange={handleSelect} className="w-full max-w-md border rounded-lg px-3 py-2 text-sm">
            <option value="">— Select an active loan —</option>
            {loans.map((l: any) => (
              <option key={l.id} value={l.id}>
                #{l.id} — {l.customer_name} — KSh {parseFloat(l.amount).toLocaleString()} ({l.term_weeks} wks)
              </option>
            ))}
          </select>
        </div>

        {selectedLoan && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Repayment</p>
                <p className="text-xl font-bold text-blue-600">KSh {totalDue.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Paid</p>
                <p className="text-xl font-bold text-green-600">KSh {totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Remaining</p>
                <p className="text-xl font-bold text-red-600">KSh {(totalDue - totalPaid).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Installments</p>
                <p className="text-xl font-bold text-purple-600">{paidCount} / {schedule.length} paid</p>
                {overdueCount > 0 && <p className="text-xs text-red-500 mt-1">{overdueCount} overdue</p>}
              </div>
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">{selectedLoan.customer_name}</span>
                <span className="text-gray-500">{totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0}% repaid</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: totalDue > 0 ? (totalPaid / totalDue) * 100 + "%" : "0%" }} />
              </div>
            </div>

            {/* Schedule table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">Weekly Installments</h3>
                <button onClick={() => window.print()} className="text-sm text-blue-600 hover:underline print:hidden">🖨 Print</button>
              </div>
              {loading ? (
                <p className="p-8 text-center text-gray-400">Loading schedule...</p>
              ) : schedule.length === 0 ? (
                <p className="p-8 text-center text-gray-400">No schedule found. Loan may not be disbursed yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-gray-500">
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Due Date</th>
                      <th className="px-6 py-3">Amount Due</th>
                      <th className="px-6 py-3">Amount Paid</th>
                      <th className="px-6 py-3">Balance After</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((inst: any) => (
                      <tr key={inst.id} className={"border-b hover:bg-gray-50 " + (inst.status === 'overdue' ? 'bg-red-50' : '')}>
                        <td className="px-6 py-3 text-gray-400">Week {inst.installment_no}</td>
                        <td className="px-6 py-3 font-medium">
                          {new Date(inst.due_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-3">KSh {parseFloat(inst.amount_due).toLocaleString()}</td>
                        <td className="px-6 py-3 text-green-600">
                          {parseFloat(inst.amount_paid) > 0 ? "KSh " + parseFloat(inst.amount_paid).toLocaleString() : "—"}
                        </td>
                        <td className="px-6 py-3 text-red-600">KSh {parseFloat(inst.balance).toLocaleString()}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(inst.status)}`}>
                            {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t font-medium">
                    <tr>
                      <td colSpan={2} className="px-6 py-3 text-gray-600">Total</td>
                      <td className="px-6 py-3">KSh {totalDue.toLocaleString()}</td>
                      <td className="px-6 py-3 text-green-600">KSh {totalPaid.toLocaleString()}</td>
                      <td className="px-6 py-3 text-red-600">KSh {(totalDue - totalPaid).toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>
      <ScheduleContent />
    </Suspense>
  );
}
