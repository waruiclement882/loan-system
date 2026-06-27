"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Layout from "../../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function LoanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const loanId = params?.id as string;

  const [loan, setLoan] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    if (loanId) loadData();
  }, [loanId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loanRes, scheduleRes, paymentsRes] = await Promise.all([
        fetch(`${API}/api/loans/${loanId}`, { headers }),
        fetch(`${API}/api/loans/${loanId}/schedule`, { headers }),
        fetch(`${API}/api/payments`, { headers }),
      ]);
      const loanData = await loanRes.json();
      const scheduleData = await scheduleRes.json();
      const paymentsData = await paymentsRes.json();
      if (loanData.error) { setError(loanData.error); }
      else { setLoan(loanData); }
      setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData.filter((p: any) => String(p.loan_id) === String(loanId)) : []);
    } catch {
      setError("Failed to load loan details");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#0F6E56] border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading loan details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !loan) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto text-center py-16">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-gray-600 font-medium mb-4">{error || "Loan not found"}</p>
          <button onClick={() => router.push("/loans")}
            className="bg-[#0F6E56] text-white px-5 py-2 rounded-lg hover:bg-[#085041] text-sm">
            Back to Loans
          </button>
        </div>
      </Layout>
    );
  }

  const balance = parseFloat(loan.balance || 0);
  const total = parseFloat(loan.total_amount || 0);
  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const progress = total > 0 ? Math.max(0, Math.min(100, 100 - (balance / total) * 100)) : 0;
  const isClosed = loan.status === "paid";
  const overpaid = totalPaid > total;
  const excess = overpaid ? totalPaid - total : 0;

  const statusBadge = (s: string) => ({
    paid: "bg-emerald-100 text-emerald-700",
    active: "bg-blue-100 text-blue-700",
    approved: "bg-indigo-100 text-indigo-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  }[s] || "bg-gray-100 text-gray-600");

  const scheduleStatusColor = (s: string) => ({
    paid: "bg-green-100 text-green-700",
    partial: "bg-yellow-100 text-yellow-700",
    overdue: "bg-red-100 text-red-700",
    pending: "bg-gray-100 text-gray-500",
  }[s] || "bg-gray-100 text-gray-500");

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">

        <button onClick={() => router.push("/loans")} className="text-sm text-[#0F6E56] hover:text-[#085041] mb-4 flex items-center gap-1">
          ← Back to Loans
        </button>

        {isClosed ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-5">
            <p className="font-semibold text-emerald-800">Loan Fully Repaid & Closed</p>
            <p className="text-emerald-600 text-sm mt-0.5">This loan has been fully settled. All instalments have been paid and the account is closed.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-emerald-500">Closed On</p>
                <p className="font-bold text-emerald-800">{loan.closed_at ? new Date(loan.closed_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-500">Total Repaid</p>
                <p className="font-bold text-emerald-800">KSh {totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-500">Instalments</p>
                <p className="font-bold text-emerald-800">{payments.length} payments</p>
              </div>
            </div>
          </div>
        ) : null}

        {overpaid && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-5 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-orange-800">Overpayment detected</p>
              <p className="text-orange-600 text-sm">KSh {excess.toLocaleString()} was paid above the total owed. Review in Suspense.</p>
            </div>
            <button onClick={() => router.push("/suspense")} className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-orange-600">
              Go to Suspense
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#D9E2DC] p-5 mb-5">
          <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-400">Loan #{loan.id}</p>
              <h2 className="text-xl font-bold text-[#04342C]">{loan.customer_name}</h2>
              <p className="text-sm text-gray-500">{loan.customer_phone}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadge(loan.status)}`}>
              {isClosed ? "✅ FULLY PAID" : loan.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-[#EDF1EE] pt-4">
            <div>
              <p className="text-xs text-gray-400">Loan Amount</p>
              <p className="font-bold text-[#04342C]">KSh {parseFloat(loan.amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Repayment</p>
              <p className="font-bold text-[#04342C]">KSh {total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Collected</p>
              <p className="font-bold text-emerald-600">KSh {totalPaid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Balance Remaining</p>
              <p className={`font-bold ${balance === 0 ? "text-emerald-600" : "text-red-600"}`}>
                {balance === 0 ? "KSh 0 — Cleared ✅" : `KSh ${balance.toLocaleString()}`}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-500">Repayment Progress</span>
              <span className="font-medium text-[#04342C]">{Math.round(progress)}% {progress === 100 ? "— Fully Paid 🎉" : "paid"}</span>
            </div>
            <div className="w-full bg-[#EDF1EE] rounded-full h-2.5">
              <div className="bg-[#1D9E75] h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Term: {loan.term_weeks} weeks · {schedule.filter(s => s.status === "paid").length}/{schedule.length} weeks paid
              {loan.closed_at ? ` · Closed: ${new Date(loan.closed_at).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}` : ""}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D9E2DC] overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#EDF1EE] flex justify-between items-center">
            <h3 className="font-semibold text-[#04342C]">Weekly Repayment Schedule</h3>
            <span className="text-xs text-gray-400">{schedule.every(s => s.status === "paid") && schedule.length > 0 ? "All weeks settled ✅" : `${schedule.filter(s => s.status === "paid").length}/${schedule.length} settled`}</span>
          </div>
          {schedule.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">No schedule found. Loan may not be disbursed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-500">
                    <th className="px-5 py-2.5">Week</th>
                    <th className="px-5 py-2.5">Due Date</th>
                    <th className="px-5 py-2.5">Amount Due</th>
                    <th className="px-5 py-2.5">Amount Paid</th>
                    <th className="px-5 py-2.5">Balance After</th>
                    <th className="px-5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((inst: any) => (
                    <tr key={inst.id} className={`border-b ${inst.status === "overdue" ? "bg-red-50" : ""}`}>
                      <td className="px-5 py-2.5 text-gray-500">Week {inst.installment_no}</td>
                      <td className="px-5 py-2.5">{new Date(inst.due_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-2.5">KSh {parseFloat(inst.amount_due).toLocaleString()}</td>
                      <td className="px-5 py-2.5 text-emerald-600">{parseFloat(inst.amount_paid) > 0 ? "KSh " + parseFloat(inst.amount_paid).toLocaleString() : "—"}</td>
                      <td className="px-5 py-2.5">KSh {(parseFloat(inst.balance) || 0).toLocaleString()}</td>
                      <td className="px-5 py-2.5">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${scheduleStatusColor(inst.status)}`}>
                          {inst.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t font-medium">
                  <tr>
                    <td colSpan={2} className="px-5 py-2.5">Total</td>
                    <td className="px-5 py-2.5">KSh {total.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-emerald-600">KSh {totalPaid.toLocaleString()}</td>
                    <td className="px-5 py-2.5">{balance === 0 ? "KSh 0 — Cleared ✅" : `KSh ${balance.toLocaleString()}`}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#D9E2DC] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EDF1EE]">
            <h3 className="font-semibold text-[#04342C]">Payment History ({payments.length})</h3>
          </div>
          {payments.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">No payments recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-500">
                    <th className="px-5 py-2.5">Date</th>
                    <th className="px-5 py-2.5">Amount</th>
                    <th className="px-5 py-2.5">Transaction Code</th>
                    <th className="px-5 py-2.5">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {[...payments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).map((p: any) => (
                    <tr key={p.id} className="border-b">
                      <td className="px-5 py-2.5">{new Date(p.payment_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-2.5 text-emerald-600 font-medium">KSh {parseFloat(p.amount).toLocaleString()}</td>
                      <td className="px-5 py-2.5 font-mono text-xs">{p.transaction_code || p.kcb_transaction_id || "-"}</td>
                      <td className="px-5 py-2.5">{p.source === "kcb_paybill" ? "KCB Paybill" : p.source}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t font-bold">
                  <tr>
                    <td className="px-5 py-2.5">Total Paid</td>
                    <td className="px-5 py-2.5 text-emerald-600">KSh {totalPaid.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
