const fs = require('fs');

// Create directories
['loan-frontend/app/par', 'loan-frontend/app/statement', 'loan-frontend/app/collection', 'loan-frontend/app/audit', 'loan-frontend/app/forgot-password', 'loan-frontend/app/reset-password'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const API = 'https://loan-system-h794.onrender.com';

// ─────────────────────────────────────────────
// 1. PAR REPORT PAGE
// ─────────────────────────────────────────────
fs.writeFileSync('loan-frontend/app/par/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "${API}";

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
`);

// ─────────────────────────────────────────────
// 2. LOAN STATEMENT PAGE
// ─────────────────────────────────────────────
fs.writeFileSync('loan-frontend/app/statement/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoans } from "@/lib/api";

const API = "${API}";

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
`);

// ─────────────────────────────────────────────
// 3. DAILY COLLECTION SHEET
// ─────────────────────────────────────────────
fs.writeFileSync('loan-frontend/app/collection/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "${API}";

export default function CollectionPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadSheet(date);
  }, []);

  const loadSheet = async (d: string) => {
    setLoading(true);
    const res = await fetch(API + "/api/reports/collection?date=" + d, { headers: { Authorization: "Bearer " + token } });
    const result = await res.json();
    setData(result);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="print:hidden">
        <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
          <div className="flex gap-4">
            <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
            <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">PAR Report</button>
            <button onClick={() => router.push("/audit")} className="text-gray-600 hover:text-blue-600">Audit Logs</button>
          </div>
        </nav>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h2 className="text-2xl font-bold">Daily Collection Sheet</h2>
          <div className="flex gap-3">
            <input type="date" value={date} onChange={e => { setDate(e.target.value); loadSheet(e.target.value); }}
              className="border rounded-lg px-3 py-2 text-sm" />
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Print</button>
          </div>
        </div>

        {loading ? <p className="text-center text-gray-400 py-12">Loading...</p> : data && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6 print:hidden">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Due Today</p>
                <p className="text-2xl font-bold text-blue-600">{data.total} installments</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Collected</p>
                <p className="text-2xl font-bold text-green-600">KSh {parseFloat(data.collected).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-red-600">KSh {parseFloat(data.pending).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between">
                <h3 className="font-bold">Collection Sheet — {new Date(data.date).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              </div>
              {data.installments.length === 0 ? (
                <p className="p-8 text-center text-gray-400">No installments due on this date</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-gray-500">
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Phone</th>
                      <th className="px-6 py-3">Loan ID</th>
                      <th className="px-6 py-3">Amount Due</th>
                      <th className="px-6 py-3">Amount Paid</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 print:block">Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.installments.map((inst: any, i: number) => (
                      <tr key={inst.id} className={"border-b " + (inst.status === "paid" ? "bg-green-50" : inst.status === "overdue" ? "bg-red-50" : "")}>
                        <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-6 py-3 font-medium">{inst.customer_name}</td>
                        <td className="px-6 py-3">{inst.phone}</td>
                        <td className="px-6 py-3">#{inst.loan_id}</td>
                        <td className="px-6 py-3 font-medium">KSh {parseFloat(inst.amount_due).toLocaleString()}</td>
                        <td className="px-6 py-3 text-green-600">{parseFloat(inst.amount_paid) > 0 ? "KSh " + parseFloat(inst.amount_paid).toLocaleString() : "-"}</td>
                        <td className="px-6 py-3">
                          <span className={"px-2 py-1 rounded-full text-xs " + (inst.status === "paid" ? "bg-green-100 text-green-700" : inst.status === "overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700")}>
                            {inst.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-200">___________</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t font-medium">
                    <tr>
                      <td colSpan={4} className="px-6 py-3">Total</td>
                      <td className="px-6 py-3">KSh {(parseFloat(data.collected) + parseFloat(data.pending)).toLocaleString()}</td>
                      <td className="px-6 py-3 text-green-600">KSh {parseFloat(data.collected).toLocaleString()}</td>
                      <td colSpan={2}></td>
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
`);

// ─────────────────────────────────────────────
// 4. AUDIT LOGS PAGE
// ─────────────────────────────────────────────
fs.writeFileSync('loan-frontend/app/audit/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "${API}";

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    fetch(API + "/api/reports/audit", { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json()).then(d => { setLogs(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">PAR</button>
          <button onClick={() => router.push("/collection")} className="text-gray-600 hover:text-blue-600">Collection</button>
        </div>
      </nav>
      <div className="p-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Activity / Audit Logs</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? <p className="p-8 text-center text-gray-400">Loading logs...</p> :
          logs.length === 0 ? <p className="p-8 text-center text-gray-400">No activity logs yet</p> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-500">
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-6 py-3 font-medium">{log.user_name || "System"}</td>
                    <td className="px-6 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{log.action}</span></td>
                    <td className="px-6 py-3">{log.entity || "-"}</td>
                    <td className="px-6 py-3">{log.entity_id ? "#" + log.entity_id : "-"}</td>
                    <td className="px-6 py-3 text-xs text-gray-400">{log.ip_address || "-"}</td>
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
`);

// ─────────────────────────────────────────────
// 5. FORGOT PASSWORD PAGE
// ─────────────────────────────────────────────
fs.writeFileSync('loan-frontend/app/forgot-password/page.tsx', `"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = "${API}";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email) { setError("Email is required"); return; }
    setLoading(true); setError(""); setMessage("");
    const res = await fetch(API + "/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setMessage(data.message || "Reset link sent!");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">Forgot Password</h2>
        <p className="text-gray-500 text-sm text-center mb-6">Enter your email to receive a reset link</p>
        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">{message}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2" placeholder="your@email.com" />
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        <button onClick={() => router.push("/login")} className="w-full mt-3 text-gray-500 text-sm hover:text-blue-600">Back to Login</button>
      </div>
    </div>
  );
}
`);

// ─────────────────────────────────────────────
// 6. RESET PASSWORD PAGE
// ─────────────────────────────────────────────
fs.writeFileSync('loan-frontend/app/reset-password/page.tsx', `"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API = "${API}";

function ResetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!password || password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    const res = await fetch(API + "/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else { setMessage("Password reset! Redirecting..."); setTimeout(() => router.push("/login"), 2000); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>
        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">{message}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
        </div>
        <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}><ResetContent /></Suspense>;
}
`);

// Update login page to add forgot password link
let login = fs.readFileSync('loan-frontend/app/login/page.tsx', 'utf8');
if (!login.includes('forgot-password')) {
  login = login.replace(
    '</div>\n  );\n}',
    `  <button onClick={() => router.push("/forgot-password")} className="w-full mt-2 text-sm text-gray-500 hover:text-blue-600">Forgot password?</button>
  </div>
  );
}`
  );
  fs.writeFileSync('loan-frontend/app/login/page.tsx', login, 'utf8');
}

// Update dashboard nav with new pages
let dashboard = fs.readFileSync('loan-frontend/app/dashboard/page.tsx', 'utf8');
if (!dashboard.includes('/par')) {
  dashboard = dashboard.replace(
    '<button onClick={() => router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>',
    `<button onClick={() => router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">PAR</button>
          <button onClick={() => router.push("/collection")} className="text-gray-600 hover:text-blue-600">Collection</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600">Statement</button>
          <button onClick={() => router.push("/audit")} className="text-gray-600 hover:text-blue-600">Audit</button>`
  );
  fs.writeFileSync('loan-frontend/app/dashboard/page.tsx', dashboard, 'utf8');
}

console.log('All 5 frontend pages created!');
