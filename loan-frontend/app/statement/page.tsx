"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoans } from "@/lib/api";

const API = "https://loan-system-h794.onrender.com";

export default function StatementPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    getLoans().then(l => setLoans(Array.isArray(l) ? l : []));
  }, []);

  const loadStatement = async (loanId: string) => {
    setLoading(true);
    const res = await fetch(API + "/api/reports/statement/" + loanId, { headers });
    const data = await res.json();
    setStatement(data);
    setLoading(false);
  };

  const printStatement = () => window.print();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="print:hidden">
        <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
          <div className="flex gap-4">
            <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
            <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
            <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          </div>
        </nav>
        <div className="p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Loan Statement</h2>
          <div className="bg-white rounded-lg shadow p-5 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Loan</label>
            <div className="flex gap-3">
              <select onChange={e => e.target.value && loadStatement(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm">
                <option value="">-- Select a loan --</option>
                {loans.map((l: any) => (
                  <option key={l.id} value={l.id}>#{l.id} - {l.customer_name} - KSh {parseFloat(l.amount).toLocaleString()} ({l.status})</option>
                ))}
              </select>
              {statement && <button onClick={printStatement} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">Print Statement</button>}
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="p-12 text-center text-gray-400">Loading statement...</div>}

      {statement && !loading && (
        <div className="p-6 max-w-4xl mx-auto print:p-4 print:max-w-full">
          <div className="bg-white rounded-lg shadow p-8 print:shadow-none">
            {/* Header */}
            <div className="text-center mb-6 border-b pb-6">
              <h1 className="text-2xl font-bold">LOAN STATEMENT</h1>
              <p className="text-gray-500 text-sm mt-1">Generated on {new Date().toLocaleDateString()}</p>
            </div>

            {/* Customer & Loan Info */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-bold text-gray-700 mb-3">Customer Details</h3>
                <p className="text-sm"><span className="text-gray-500">Name:</span> <strong>{statement.loan.customer_name}</strong></p>
                <p className="text-sm"><span className="text-gray-500">Phone:</span> {statement.loan.phone || "-"}</p>
                <p className="text-sm"><span className="text-gray-500">Email:</span> {statement.loan.email || "-"}</p>
                <p className="text-sm"><span className="text-gray-500">National ID:</span> {statement.loan.national_id || "-"}</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-700 mb-3">Loan Details</h3>
                <p className="text-sm"><span className="text-gray-500">Loan ID:</span> <strong>#{statement.loan.id}</strong></p>
                <p className="text-sm"><span className="text-gray-500">Amount:</span> KSh {parseFloat(statement.loan.amount).toLocaleString()}</p>
                <p className="text-sm"><span className="text-gray-500">Total Repayment:</span> KSh {parseFloat(statement.loan.total_amount || 0).toLocaleString()}</p>
                <p className="text-sm"><span className="text-gray-500">Balance:</span> <span className="text-red-600 font-bold">KSh {parseFloat(statement.loan.balance || 0).toLocaleString()}</span></p>
                <p className="text-sm"><span className="text-gray-500">Term:</span> {statement.loan.term_weeks} weeks</p>
                <p className="text-sm"><span className="text-gray-500">Status:</span> <span className="capitalize font-medium">{statement.loan.status}</span></p>
              </div>
            </div>

            {/* Repayment Schedule */}
            <h3 className="font-bold text-gray-700 mb-3">Repayment Schedule</h3>
            <table className="w-full text-sm mb-6 border">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-2 border">Week</th>
                  <th className="px-4 py-2 border">Due Date</th>
                  <th className="px-4 py-2 border">Amount Due</th>
                  <th className="px-4 py-2 border">Amount Paid</th>
                  <th className="px-4 py-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {statement.schedule.map((inst: any) => (
                  <tr key={inst.id} className="border-b">
                    <td className="px-4 py-2 border">Week {inst.installment_no}</td>
                    <td className="px-4 py-2 border">{new Date(inst.due_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 border">KSh {parseFloat(inst.amount_due).toLocaleString()}</td>
                    <td className="px-4 py-2 border text-green-600">{parseFloat(inst.amount_paid) > 0 ? "KSh " + parseFloat(inst.amount_paid).toLocaleString() : "-"}</td>
                    <td className="px-4 py-2 border">
                      <span className={"px-2 py-0.5 rounded text-xs " + (inst.status === "paid" ? "bg-green-100 text-green-700" : inst.status === "overdue" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600")}>
                        {inst.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Payment History */}
            <h3 className="font-bold text-gray-700 mb-3">Payment History</h3>
            {statement.payments.length === 0 ? (
              <p className="text-gray-400 text-sm">No payments recorded yet</p>
            ) : (
              <table className="w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Amount</th>
                    <th className="px-4 py-2 border">Transaction Code</th>
                    <th className="px-4 py-2 border">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.payments.map((p: any) => (
                    <tr key={p.id} className="border-b">
                      <td className="px-4 py-2 border">{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 border text-green-600 font-medium">KSh {parseFloat(p.amount).toLocaleString()}</td>
                      <td className="px-4 py-2 border font-mono text-xs">{p.transaction_code || p.kcb_transaction_id || "-"}</td>
                      <td className="px-4 py-2 border">{p.source === "kcb_paybill" ? "KCB Paybill" : p.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-6 pt-4 border-t text-center text-xs text-gray-400">
              <p>This is a computer-generated statement. No signature required.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
