const fs = require('fs');

// ── 1. Updated loanRepository.js ─────────────────────────────────────────────
fs.writeFileSync('src/repositories/loanRepository.js', `const pool = require('../db/connection');

const create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, created_by } = loan;
  // Get processing fee from pricing rules
  const rule = await pool.query(
    'SELECT processing_fee FROM loan_pricing_rules WHERE loan_amount=$1 AND term_weeks=$2',
    [amount, term_weeks]
  );
  const processing_fee = rule.rows[0]?.processing_fee || 0;
  const r = await pool.query(
    'INSERT INTO loans (customer_id,amount,term_weeks,interest_amount,total_amount,balance,status,created_by,processing_fee) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [customer_id, amount, term_weeks, interest_amount, total_amount, total_amount, 'pending', created_by || null, processing_fee]
  );
  return r.rows[0];
};

const getAll = async (status) => {
  let q = 'SELECT loans.*,customers.name as customer_name FROM loans LEFT JOIN customers ON loans.customer_id=customers.id';
  const p = [];
  if (status) { q += ' WHERE loans.status=$1'; p.push(status); }
  q += ' ORDER BY loans.id DESC';
  return (await pool.query(q, p)).rows;
};

const getById = async (id) => {
  const r = await pool.query(
    'SELECT loans.*,customers.name as customer_name FROM loans LEFT JOIN customers ON loans.customer_id=customers.id WHERE loans.id=$1',
    [id]
  );
  return r.rows[0];
};

const approve = async (id, approved_by) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1,approved_by=$2,approved_at=NOW() WHERE id=$3 AND status=$4 RETURNING *',
    ['approved', approved_by, id, 'pending']
  );
  return r.rows[0];
};

const reject = async (id, rejected_by, reason) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1,approved_by=$2,approved_at=NOW(),rejection_reason=$3 WHERE id=$4 AND status=$5 RETURNING *',
    ['rejected', rejected_by, reason, id, 'pending']
  );
  return r.rows[0];
};

const markProcessingFeePaid = async (id, transaction_code) => {
  const loan = await pool.query('SELECT * FROM loans WHERE id=$1', [id]);
  if (loan.rows.length === 0) throw new Error('Loan not found');
  if (loan.rows[0].processing_fee_paid) throw new Error('Processing fee already paid');
  const r = await pool.query(
    'UPDATE loans SET processing_fee_paid=true, processing_fee_paid_at=NOW(), processing_fee_transaction=$1 WHERE id=$2 RETURNING *',
    [transaction_code || 'MANUAL', id]
  );
  return r.rows[0];
};

const disburse = async (id, disbursed_by) => {
  const loan = await pool.query('SELECT * FROM loans WHERE id=$1', [id]);
  if (loan.rows.length === 0) return null;
  if (!loan.rows[0].processing_fee_paid) {
    throw new Error('Processing fee of KSh ' + loan.rows[0].processing_fee + ' must be paid before disbursement');
  }
  if (loan.rows[0].status !== 'approved') return null;
  const r = await pool.query(
    'UPDATE loans SET status=$1,disbursed_by=$2,disbursed_at=NOW(),balance=amount WHERE id=$3 RETURNING *',
    ['active', disbursed_by, id]
  );
  return r.rows[0];
};

const updateStatus = async (id, status) => {
  const r = await pool.query('UPDATE loans SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
  return r.rows[0];
};

module.exports = { create, getAll, getById, approve, reject, disburse, updateStatus, markProcessingFeePaid };
`);
console.log('✅ loanRepository.js updated');

// ── 2. Update loanService.js to export approveLoan + markProcessingFeePaid ──
fs.writeFileSync('src/services/loanService.js', `const loanRepository = require('../repositories/loanRepository');
const createLoan             = async (loanData)        => await loanRepository.create(loanData);
const getAllLoans             = async (status)          => await loanRepository.getAll(status);
const getLoanById            = async (id)              => await loanRepository.getById(id);
const approveLoan            = async (id, approved_by) => await loanRepository.approve(id, approved_by);
const rejectLoan             = async (id, rejected_by, reason) => await loanRepository.reject(id, rejected_by, reason);
const disburseLoan           = async (id, disbursed_by) => await loanRepository.disburse(id, disbursed_by);
const updateLoanStatus       = async (id, status)      => await loanRepository.updateStatus(id, status);
const markProcessingFeePaid  = async (id, transaction_code) => await loanRepository.markProcessingFeePaid(id, transaction_code);
module.exports = { createLoan, getAllLoans, getLoanById, approveLoan, rejectLoan, disburseLoan, updateLoanStatus, markProcessingFeePaid };
`);
console.log('✅ loanService.js updated');

// ── 3. Add markProcessingFeePaid route to loans router ───────────────────────
const loansRoute = fs.readFileSync('src/routes/loans.js', 'utf8');
if (!loansRoute.includes('processing-fee-paid')) {
  const updated = loansRoute.replace(
    "module.exports = router;",
    `// Mark processing fee as paid
router.patch('/:id/processing-fee-paid', async (req, res) => {
  try {
    const loanService = require('../services/loanService');
    const loan = await loanService.markProcessingFeePaid(req.params.id, req.body.transaction_code);
    res.json(loan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;`
  );
  fs.writeFileSync('src/routes/loans.js', updated);
  console.log('✅ loans route: PATCH /:id/processing-fee-paid added');
} else {
  console.log('ℹ️  processing-fee-paid route already exists');
}

// ── 4. Updated loans page ────────────────────────────────────────────────────
fs.writeFileSync('loan-frontend/app/loans/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoans, createLoan, getCustomers, getPricingRules } from "@/lib/api";

const API = "https://loan-system-h794.onrender.com";

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans]               = useState<any[]>([]);
  const [customers, setCustomers]       = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState({ customer_id: "", amount: "", term_weeks: "", interest_amount: "", total_amount: "" });
  const [loading, setLoading]           = useState(false);
  const [feeModal, setFeeModal]         = useState<any>(null);
  const [feeCode, setFeeCode]           = useState("");
  const [feeLoading, setFeeLoading]     = useState(false);
  const [msg, setMsg]                   = useState({ type: "", text: "" });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    const [l, c, rules] = await Promise.all([getLoans(), getCustomers(), getPricingRules()]);
    setLoans(Array.isArray(l) ? l : []);
    setCustomers(Array.isArray(c) ? c : []);
    setPricingRules(Array.isArray(rules) ? rules : []);
  };

  const handleAmountOrTerm = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    const amount   = field === "amount"     ? value : form.amount;
    const term     = field === "term_weeks" ? value : form.term_weeks;
    if (amount && term) {
      const match = pricingRules.find((r: any) =>
        Number(r.loan_amount) === Number(amount) && Number(r.term_weeks) === Number(term)
      );
      if (match) {
        updated.interest_amount = match.interest_amount;
        updated.total_amount    = match.total_amount;
      } else {
        updated.interest_amount = "";
        updated.total_amount    = "";
      }
    }
    setForm(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const result = await createLoan(form);
    if (result.error) { setMsg({ type: "error", text: result.error }); }
    else {
      setMsg({ type: "success", text: "Loan created! Processing fee of KSh " + (result.processing_fee || 0).toLocaleString() + " required before disbursement." });
      setForm({ customer_id: "", amount: "", term_weeks: "", interest_amount: "", total_amount: "" });
      setShowForm(false);
      loadData();
    }
    setLoading(false);
  };

  const handleMarkFeePaid = async () => {
    setFeeLoading(true);
    try {
      const res = await fetch(API + "/api/loans/" + feeModal.id + "/processing-fee-paid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ transaction_code: feeCode || "MANUAL" }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: "error", text: data.error }); }
      else {
        setMsg({ type: "success", text: "Processing fee marked as paid for loan #" + feeModal.id });
        setFeeModal(null);
        setFeeCode("");
        loadData();
      }
    } catch { setMsg({ type: "error", text: "Request failed" }); }
    setFeeLoading(false);
  };

  const uniqueAmounts = [...new Set(pricingRules.map((r: any) => r.loan_amount))].sort((a: any, b: any) => a - b);
  const uniqueTerms   = [...new Set(
    pricingRules.filter((r: any) => !form.amount || Number(r.loan_amount) === Number(form.amount)).map((r: any) => r.term_weeks)
  )].sort((a: any, b: any) => a - b);

  const selectedRule  = pricingRules.find((r: any) =>
    Number(r.loan_amount) === Number(form.amount) && Number(r.term_weeks) === Number(form.term_weeks)
  );

  const totalDisbursed   = loans.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const totalOutstanding = loans.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
  const paidLoans        = loans.filter(l => l.status === "paid").length;
  const activeLoans      = loans.filter(l => l.status === "active").length;
  const pendingFee       = loans.filter(l => l.status === "approved" && !l.processing_fee_paid).length;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")}  className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/customers")}  className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/payments")}   className="text-gray-600 hover:text-blue-600">Payments</button>
          <button onClick={() => router.push("/approvals")}  className="text-gray-600 hover:text-blue-600">Approvals</button>
          <button onClick={() => router.push("/export")}     className="text-gray-600 hover:text-blue-600">Export</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Loans</p>
            <p className="text-2xl font-bold text-blue-600">{loans.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Disbursed</p>
            <p className="text-2xl font-bold text-purple-600">KSh {totalDisbursed.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Outstanding</p>
            <p className="text-2xl font-bold text-red-600">KSh {totalOutstanding.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Paid / Active</p>
            <p className="text-2xl font-bold text-green-600">{paidLoans} / {activeLoans}</p>
          </div>
          <div className={"bg-white rounded-lg shadow p-4 " + (pendingFee > 0 ? "border-2 border-orange-300" : "")}>
            <p className="text-sm text-gray-500">Awaiting Fee Payment</p>
            <p className={"text-2xl font-bold " + (pendingFee > 0 ? "text-orange-500" : "text-gray-400")}>{pendingFee}</p>
          </div>
        </div>

        {msg.text && (
          <div className={"px-4 py-3 rounded-lg mb-4 " + (msg.type === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700")}>
            {msg.text}
            <button onClick={() => setMsg({ type: "", text: "" })} className="float-right font-bold">✕</button>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Loans</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Loan</button>
        </div>

        {/* New Loan Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">New Loan</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select customer</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount (KSh)</label>
                <select value={form.amount} onChange={(e) => handleAmountOrTerm("amount", e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select amount</option>
                  {uniqueAmounts.map((a: any) => <option key={a} value={a}>KSh {Number(a).toLocaleString()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term (Weeks)</label>
                <select value={form.term_weeks} onChange={(e) => handleAmountOrTerm("term_weeks", e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select term</option>
                  {uniqueTerms.map((t: any) => <option key={t} value={t}>{t} weeks</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interest (KSh)</label>
                <input readOnly value={form.interest_amount ? "KSh " + Number(form.interest_amount).toLocaleString() : ""} className="w-full border rounded-lg px-3 py-2 bg-gray-50" placeholder="Auto-filled" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Repayment (KSh)</label>
                <input readOnly value={form.total_amount ? "KSh " + Number(form.total_amount).toLocaleString() : ""} className="w-full border rounded-lg px-3 py-2 bg-gray-50" placeholder="Auto-filled" />
              </div>
              {selectedRule && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-orange-600 font-bold text-lg">⚠</span>
                  <div>
                    <p className="text-sm font-semibold text-orange-700">Processing Fee Required</p>
                    <p className="text-orange-600 font-bold">KSh {Number(selectedRule.processing_fee).toLocaleString()}</p>
                    <p className="text-xs text-orange-500">Must be paid before loan disbursement</p>
                  </div>
                </div>
              )}
            </div>
            {form.amount && form.term_weeks && !form.interest_amount && (
              <p className="mt-3 text-sm text-red-500">No pricing rule found for this combination.</p>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={loading || !form.customer_id || !form.amount || !form.term_weeks || !form.interest_amount}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
                {loading ? "Saving..." : "Create Loan"}
              </button>
              <button onClick={() => setShowForm(false)} className="border px-6 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}

        {/* Loans Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="p-4">Customer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Term</th>
                <th className="p-4">Interest</th>
                <th className="p-4">Total</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Processing Fee</th>
                <th className="p-4">Progress</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400">No loans found</td></tr>
              ) : loans.map((loan: any) => {
                const balance  = parseFloat(loan.balance || 0);
                const total    = parseFloat(loan.total_amount || 0);
                const progress = total > 0 ? Math.max(0, 100 - (balance / total) * 100) : 0;
                const fee      = parseFloat(loan.processing_fee || 0);
                const feePaid  = loan.processing_fee_paid;
                const needsFee = loan.status === "approved" && !feePaid;

                return (
                  <tr key={loan.id} className={"border-b hover:bg-gray-50 " + (needsFee ? "bg-orange-50" : "")}>
                    <td className="p-4 font-medium">{loan.customer_name}</td>
                    <td className="p-4">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                    <td className="p-4">{loan.term_weeks} wks</td>
                    <td className="p-4">KSh {parseFloat(loan.interest_amount || 0).toLocaleString()}</td>
                    <td className="p-4">KSh {parseFloat(loan.total_amount || 0).toLocaleString()}</td>
                    <td className={"p-4 font-medium " + (balance === 0 ? "text-green-600" : balance / total > 0.5 ? "text-red-600" : "text-yellow-600")}>
                      KSh {balance.toLocaleString()}
                    </td>
                    <td className="p-4">
                      {fee > 0 ? (
                        feePaid ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ Paid</span>
                        ) : (
                          <button onClick={() => { setFeeModal(loan); setFeeCode(""); }}
                            className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium hover:bg-orange-200">
                            KSh {fee.toLocaleString()} — Mark Paid
                          </button>
                        )
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="p-4 w-28">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: progress + "%" }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{Math.round(progress)}% paid</p>
                    </td>
                    <td className="p-4">
                      <span className={"px-2 py-1 rounded-full text-xs font-medium " + (
                        loan.status === "paid"     ? "bg-green-100 text-green-700"  :
                        loan.status === "active"   ? "bg-blue-100 text-blue-700"   :
                        loan.status === "approved" ? "bg-teal-100 text-teal-700"   :
                        loan.status === "rejected" ? "bg-red-100 text-red-700"     :
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
      </div>

      {/* Processing Fee Modal */}
      {feeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold text-lg">Mark Processing Fee as Paid</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Customer: <strong>{feeModal.customer_name}</strong></p>
                <p className="text-sm text-gray-600">Loan Amount: <strong>KSh {parseFloat(feeModal.amount).toLocaleString()}</strong></p>
                <p className="text-sm text-gray-600">Processing Fee: <strong className="text-orange-600">KSh {parseFloat(feeModal.processing_fee).toLocaleString()}</strong></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Code (optional)</label>
                <input value={feeCode} onChange={e => setFeeCode(e.target.value)}
                  placeholder="e.g. QHX4K8J2OP or leave blank"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
                <p className="text-xs text-gray-400 mt-1">Enter M-Pesa code if customer paid via M-Pesa, or leave blank for cash</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={() => setFeeModal(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleMarkFeePaid} disabled={feeLoading}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {feeLoading ? "Saving..." : "Confirm Fee Paid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`);
console.log('✅ loans/page.tsx updated with processing fee UI');

console.log('\n🎉 All done! Push to deploy:');
console.log('   git add . && git commit -m "Add processing fee to loans" && git push');
