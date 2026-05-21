require('dotenv').config();
const pool = require('./src/db/pool');
const fs = require('fs');

async function run() {
  // ── 1. Create repayment_schedules table ──────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS repayment_schedules (
      id               SERIAL PRIMARY KEY,
      loan_id          INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      installment_no   INTEGER NOT NULL,
      due_date         DATE NOT NULL,
      amount_due       NUMERIC(12,2) NOT NULL,
      amount_paid      NUMERIC(12,2) DEFAULT 0,
      balance          NUMERIC(12,2) NOT NULL,
      status           VARCHAR(20) DEFAULT 'pending',  -- pending, paid, partial, overdue
      paid_at          TIMESTAMP,
      created_at       TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ repayment_schedules table created');

  // ── 2. Fix loanRepository.js (disburse bug + generate schedule) ──────────
  fs.writeFileSync('src/repositories/loanRepository.js', `const pool = require('../db/connection');

const create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, created_by } = loan;
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

// Generate weekly repayment schedule starting from disbursement date
const generateSchedule = async (client, loanId, totalAmount, termWeeks, disbursedAt) => {
  // Delete any existing schedule for this loan
  await client.query('DELETE FROM repayment_schedules WHERE loan_id=$1', [loanId]);

  const weeklyAmount = Math.ceil(totalAmount / termWeeks); // round up
  let runningBalance = totalAmount;
  const startDate = new Date(disbursedAt);

  for (let i = 1; i <= termWeeks; i++) {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (i * 7)); // every 7 days

    // Last installment: pay whatever remains to avoid rounding issues
    const amountDue = i === termWeeks
      ? parseFloat(runningBalance.toFixed(2))
      : weeklyAmount;

    runningBalance = parseFloat((runningBalance - amountDue).toFixed(2));
    if (runningBalance < 0) runningBalance = 0;

    await client.query(
      \`INSERT INTO repayment_schedules (loan_id, installment_no, due_date, amount_due, balance, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')\`,
      [loanId, i, dueDate.toISOString().split('T')[0], amountDue, Math.max(0, runningBalance)]
    );
  }
};

const disburse = async (id, disbursed_by) => {
  const loanRes = await pool.query('SELECT * FROM loans WHERE id=$1', [id]);
  if (loanRes.rows.length === 0) return null;
  const loan = loanRes.rows[0];

  if (!loan.processing_fee_paid) {
    throw new Error('Processing fee of KSh ' + loan.processing_fee + ' must be paid before disbursement');
  }
  if (loan.status !== 'approved') return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const r = await client.query(
      'UPDATE loans SET status=$1, disbursed_by=$2, disbursed_at=NOW(), balance=amount WHERE id=$3 RETURNING *',
      ['active', disbursed_by, id]
    );
    const updatedLoan = r.rows[0];

    // Generate repayment schedule from today
    await generateSchedule(
      client,
      id,
      parseFloat(updatedLoan.total_amount),
      updatedLoan.term_weeks,
      new Date()
    );

    await client.query('COMMIT');
    return updatedLoan;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getSchedule = async (loanId) => {
  const r = await pool.query(
    'SELECT * FROM repayment_schedules WHERE loan_id=$1 ORDER BY installment_no',
    [loanId]
  );
  return r.rows;
};

// Called when a payment comes in — updates schedule installments
const applyPaymentToSchedule = async (loanId, amountPaid) => {
  const installments = await pool.query(
    "SELECT * FROM repayment_schedules WHERE loan_id=$1 AND status != 'paid' ORDER BY installment_no",
    [loanId]
  );

  let remaining = parseFloat(amountPaid);
  for (const inst of installments.rows) {
    if (remaining <= 0) break;
    const due     = parseFloat(inst.amount_due);
    const already = parseFloat(inst.amount_paid || 0);
    const owed    = due - already;

    if (remaining >= owed) {
      // Full payment of this installment
      await pool.query(
        "UPDATE repayment_schedules SET amount_paid=$1, status='paid', paid_at=NOW() WHERE id=$2",
        [due, inst.id]
      );
      remaining -= owed;
    } else {
      // Partial payment
      await pool.query(
        "UPDATE repayment_schedules SET amount_paid=$1, status='partial' WHERE id=$2",
        [already + remaining, inst.id]
      );
      remaining = 0;
    }
  }

  // Mark overdue installments
  await pool.query(
    "UPDATE repayment_schedules SET status='overdue' WHERE loan_id=$1 AND due_date < NOW() AND status='pending'",
    [loanId]
  );
};

const updateStatus = async (id, status) => {
  const r = await pool.query('UPDATE loans SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
  return r.rows[0];
};

module.exports = { create, getAll, getById, approve, reject, disburse, updateStatus, markProcessingFeePaid, getSchedule, applyPaymentToSchedule };
`);
  console.log('✅ loanRepository.js fixed and updated');

  // ── 3. Add schedule route to loans router ─────────────────────────────────
  const loansRoute = fs.readFileSync('src/routes/loans.js', 'utf8');
  if (!loansRoute.includes('schedule')) {
    const updated = loansRoute.replace(
      "module.exports = router;",
      `// GET repayment schedule for a loan
router.get('/:id/schedule', async (req, res) => {
  try {
    const loanService = require('../services/loanService');
    const schedule = await loanService.getSchedule(req.params.id);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;`
    );
    fs.writeFileSync('src/routes/loans.js', updated);
    console.log('✅ GET /api/loans/:id/schedule route added');
  }

  // ── 4. Update loanService.js ──────────────────────────────────────────────
  fs.writeFileSync('src/services/loanService.js', `const loanRepository = require('../repositories/loanRepository');
const createLoan            = async (loanData)              => await loanRepository.create(loanData);
const getAllLoans            = async (status)                => await loanRepository.getAll(status);
const getLoanById           = async (id)                    => await loanRepository.getById(id);
const approveLoan           = async (id, approved_by)       => await loanRepository.approve(id, approved_by);
const rejectLoan            = async (id, rejected_by, reason) => await loanRepository.reject(id, rejected_by, reason);
const disburseLoan          = async (id, disbursed_by)      => await loanRepository.disburse(id, disbursed_by);
const updateLoanStatus      = async (id, status)            => await loanRepository.updateStatus(id, status);
const markProcessingFeePaid = async (id, tx)                => await loanRepository.markProcessingFeePaid(id, tx);
const getSchedule           = async (id)                    => await loanRepository.getSchedule(id);
const applyPaymentToSchedule = async (loanId, amount)       => await loanRepository.applyPaymentToSchedule(loanId, amount);
module.exports = { createLoan, getAllLoans, getLoanById, approveLoan, rejectLoan, disburseLoan, updateLoanStatus, markProcessingFeePaid, getSchedule, applyPaymentToSchedule };
`);
  console.log('✅ loanService.js updated');

  // ── 5. Hook applyPaymentToSchedule into webhookService ───────────────────
  const webhookSvc = fs.readFileSync('src/services/webhookService.js', 'utf8');
  if (!webhookSvc.includes('applyPaymentToSchedule')) {
    const updated = webhookSvc
      .replace(
        "const { processKcbWebhook, logWebhook } = require",
        "const { applyPaymentToSchedule } = require('../loanService');\nconst { processKcbWebhook, logWebhook } = require"
      )
      .replace(
        "console.log(`[WebhookService] Loan ${loan.id}",
        "applyPaymentToSchedule(loan.id, normalized.amount).catch(e => console.error('[Schedule] Update error:', e.message));\n    console.log(`[WebhookService] Loan ${loan.id}"
      );
    fs.writeFileSync('src/services/webhookService.js', updated);
    console.log('✅ webhookService.js hooked to update schedule on payment');
  }

  console.log('\n🎉 Backend done! Now building the frontend schedule page...');

  // ── 6. Create schedule page ───────────────────────────────────────────────
  if (!fs.existsSync('loan-frontend/app/schedule')) {
    fs.mkdirSync('loan-frontend/app/schedule', { recursive: true });
  }

  fs.writeFileSync('loan-frontend/app/schedule/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLoans } from "@/lib/api";

const API = "https://loan-system-h794.onrender.com";

export default function SchedulePage() {
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
                          <span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusColor(inst.status)}\`}>
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
`);
  console.log('✅ loan-frontend/app/schedule/page.tsx created');
  console.log('\n🎉 All done!');
  console.log('\nNext steps:');
  console.log('1. Add Schedule to dashboard nav');
  console.log('2. git add . && git commit -m "Add repayment schedule" && git push');

  process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
