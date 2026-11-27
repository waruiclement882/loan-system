const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { logAudit } = require('../utils/audit');

const guard = [verifyToken, requireRole('admin', 'super_admin', 'branch_admin', 'cashier', 'cfo')];
const managers = [verifyToken, requireRole('admin', 'super_admin', 'branch_admin')];
const ALL = ['admin', 'super_admin', 'cfo'];
const seesAll = (u) => ALL.includes(u.role) || u.real_role === 'super_admin';
const sees = (u, branchId) => seesAll(u) || (parseInt(branchId) || 1) === (parseInt(u.branch_id) || 1);

const httpErr = (status, message) => Object.assign(new Error(message), { status });
const one = async (sql, params = []) => (await pool.query(sql, params)).rows[0];
const num = (v) => parseFloat(v) || 0;
const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const money = (n) => 'KSh ' + num(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const longDate = (d) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'long', year: 'numeric' });
const nairobiYear = () => parseInt(new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }).slice(0, 4));

const TYPES = {
  disbursement_voucher: { prefix: 'DV', title: 'Loan Disbursement Voucher', per: 'loan' },
  loan_agreement:       { prefix: 'LA', title: 'Loan Agreement',            per: 'loan' },
  payment_receipt:      { prefix: 'RC', title: 'Payment Receipt',           per: 'payment' },
  fee_receipt:          { prefix: 'FR', title: 'Processing Fee Receipt',    per: 'fee' }
};

// ---- Amount in words ----
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const below1000 = (n) => {
  let s = '';
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' Hundred'; n %= 100; if (n) s += ' and '; }
  if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += '-' + ONES[n % 10]; }
  else if (n > 0) s += ONES[n];
  return s;
};
const words = (n) => {
  if (n === 0) return 'Zero';
  if (n >= 1e9) return String(n);
  const parts = [];
  const m = Math.floor(n / 1e6), t = Math.floor((n % 1e6) / 1000), r = n % 1000;
  if (m) parts.push(below1000(m) + ' Million');
  if (t) parts.push(below1000(t) + ' Thousand');
  if (r) parts.push(below1000(r));
  return parts.join(' ');
};
const inWords = (amt) => {
  const total = Math.round(num(amt) * 100);
  const shillings = Math.floor(total / 100), cents = total % 100;
  return 'Kenya Shillings ' + words(shillings) + (cents ? ' and ' + words(cents) + ' Cents' : '') + ' Only';
};

// ---- Agreement clauses that still need your lawyer. Replace the [[...]] text, then redeploy. ----
const CLAUSES = [
  { heading: 'Late payment and default', text: '[[TO BE COMPLETED BY THE LENDER: what happens when an instalment is missed, any penalty, and recovery steps]]' },
  { heading: 'Early repayment', text: '[[TO BE COMPLETED BY THE LENDER: whether the loan may be repaid early and how the balance is worked out]]' },
  { heading: 'Personal data', text: '[[TO BE COMPLETED: consent and notice wording for storing and using the Borrower\'s ID, photo and phone number]]' },
  { heading: 'Governing law', text: '[[TO BE COMPLETED: governing law and how disputes are handled]]' }
];

const buildTerms = (l, sched, fee, co) => {
  const first = sched[0], last = sched[sched.length - 1];
  const weekly = num(first.amount_due), lastAmt = num(last.amount_due);
  const lender = co.company_name || 'The Lender';
  const terms = [
    { heading: 'The loan', text: `${lender} (the Lender) advances ${money(l.amount)} to ${l.customer_name} (the Borrower) on ${longDate(l.disbursed_at)}.` },
    { heading: 'Repayment', text: `The Borrower shall repay ${money(l.total_amount)}, being the loan plus interest of ${money(l.interest_amount)}, in ${sched.length} weekly instalments of ${money(weekly)}${lastAmt !== weekly ? ` (the final instalment is ${money(lastAmt)})` : ''}, the first due on ${longDate(first.due_date)} and the last on ${longDate(last.due_date)}, as set out in the schedule.` },
    { heading: 'How to pay', text: `Payments are made to ${lender} through Paybill ${co.paybill || '[[paybill]]'}, account ${co.account_number || '[[account]]'}. The Borrower should keep each payment confirmation message as proof of payment.` }
  ];
  if (fee > 0) terms.push({ heading: 'Processing fee', text: `A processing fee of ${money(fee)} is charged separately from the loan. It is not deducted from the loan amount and does not reduce the balance owed.` });
  return terms.concat(CLAUSES).map((t, i) => ({ n: i + 1, heading: t.heading, text: t.text, placeholder: /\[\[/.test(t.text) }));
};

// ---- Build and issue ----
const issue = async (req, type, ids) => {
  const T = TYPES[type];
  if (!T) throw httpErr(400, 'Unknown document type');
  const co = (await one('SELECT company_name, tagline, phone, email, address, logo_url, paybill, account_number FROM company_settings LIMIT 1')) || {};
  const me = await one('SELECT name FROM users WHERE id = $1', [req.user.id || req.user.user_id]);
  const issuedByName = (me && me.name) || req.user.name || 'System';

  let loanId = null, customerId, sourceId, branchId, amount, data;

  if (T.per === 'loan') {
    loanId = parseInt(ids.loan_id);
    if (!loanId) throw httpErr(400, 'loan_id is required');
    const l = await one(
      `SELECT l.*, c.name AS customer_name, c.phone AS customer_phone, c.national_id,
              cu.name AS created_by_name, au.name AS approved_by_name, du.name AS disbursed_by_name
       FROM loans l JOIN customers c ON c.id = l.customer_id
       LEFT JOIN users cu ON cu.id = l.created_by
       LEFT JOIN users au ON au.id = l.approved_by
       LEFT JOIN users du ON du.id = l.disbursed_by
       WHERE l.id = $1`, [loanId]);
    if (!l) throw httpErr(404, 'Loan not found');
    if (!l.disbursed_at || ['pending', 'rejected', 'approved'].includes(l.status)) throw httpErr(400, 'This loan has not been disbursed yet');
    const sched = (await pool.query('SELECT week_number, due_date, amount_due FROM repayment_schedule WHERE loan_id = $1 ORDER BY week_number', [loanId])).rows
      .map((s) => ({ week_number: s.week_number, due_date: isoDate(s.due_date), amount_due: num(s.amount_due) }));
    if (!sched.length) throw httpErr(400, 'This loan has no repayment schedule yet');
    const fee = num((await one(`SELECT COALESCE(SUM(amount),0) AS v FROM company_income WHERE loan_id = $1 AND type = 'processing_fee'`, [loanId])).v);

    customerId = l.customer_id; sourceId = loanId; branchId = l.branch_id; amount = num(l.amount);
    data = {
      customer: { id: l.customer_id, name: l.customer_name, phone: l.customer_phone, national_id: l.national_id },
      loan: { id: l.id, amount: num(l.amount), term_weeks: l.term_weeks, interest_amount: num(l.interest_amount),
              total_amount: num(l.total_amount), disbursed_at: isoDate(l.disbursed_at), processing_fee: fee },
      schedule: sched,
      prepared_by: l.created_by_name || null, approved_by: l.approved_by_name || null, disbursed_by: l.disbursed_by_name || null,
      amount_words: inWords(l.amount),
      pay: { paybill: co.paybill, account_number: co.account_number }
    };
    if (type === 'loan_agreement') data.terms = buildTerms(l, sched, fee, co);

  } else if (T.per === 'payment') {
    const paymentId = parseInt(ids.payment_id);
    if (!paymentId) throw httpErr(400, 'payment_id is required');
    const p = await one(
      `SELECT p.id, p.loan_id, p.amount, p.payment_date, p.source, p.transaction_code, l.branch_id, l.customer_id, l.total_amount
       FROM payments p JOIN loans l ON l.id = p.loan_id WHERE p.id = $1`, [paymentId]);
    if (!p) throw httpErr(404, 'Payment not found');
    const cust = await one('SELECT id, name, phone, national_id FROM customers WHERE id = $1', [p.customer_id]);
    const paid = num((await one(
      `SELECT COALESCE(SUM(p2.amount),0) AS v FROM payments p2, payments p
       WHERE p.id = $1 AND p2.loan_id = p.loan_id AND (p2.payment_date, p2.id) <= (p.payment_date, p.id)`, [paymentId])).v);
    const next = await one(
      `SELECT week_number, due_date, (amount_due - COALESCE(amount_paid,0)) AS due FROM repayment_schedule
       WHERE loan_id = $1 AND status <> 'paid' ORDER BY week_number LIMIT 1`, [p.loan_id]);
    loanId = p.loan_id; customerId = p.customer_id; sourceId = paymentId; branchId = p.branch_id; amount = num(p.amount);
    data = {
      customer: cust,
      payment: { id: p.id, amount: num(p.amount), date: p.payment_date, source: p.source, reference: p.transaction_code },
      loan: { id: p.loan_id, total_amount: num(p.total_amount), paid_to_date: paid, balance_after: Math.max(0, num(p.total_amount) - paid) },
      next_due: next ? { week_number: next.week_number, due_date: isoDate(next.due_date), amount: num(next.due) } : null,
      amount_words: inWords(p.amount)
    };

  } else {
    const incomeId = parseInt(ids.income_id);
    if (!incomeId) throw httpErr(400, 'income_id is required');
    const f = await one(
      `SELECT ci.id, ci.loan_id, ci.amount, ci.created_at, ci.transaction_code, l.branch_id, l.customer_id, l.amount AS loan_amount
       FROM company_income ci JOIN loans l ON l.id = ci.loan_id
       WHERE ci.id = $1 AND ci.type = 'processing_fee'`, [incomeId]);
    if (!f) throw httpErr(404, 'Processing fee record not found');
    const cust = await one('SELECT id, name, phone, national_id FROM customers WHERE id = $1', [f.customer_id]);
    loanId = f.loan_id; customerId = f.customer_id; sourceId = incomeId; branchId = f.branch_id; amount = num(f.amount);
    data = {
      customer: cust,
      loan: { id: f.loan_id, amount: num(f.loan_amount) },
      fee: { amount: num(f.amount), date: f.created_at, reference: f.transaction_code, from_credit: /^SUSPENSE-/.test(f.transaction_code || '') },
      amount_words: inWords(f.amount)
    };
  }

  branchId = parseInt(branchId) || 1;
  if (!sees(req.user, branchId)) throw httpErr(403, 'This record belongs to another branch');
  const br = await one('SELECT id, name, code FROM branches WHERE id = $1', [branchId]);
  if (!br) throw httpErr(400, 'Branch not found');
  data.company = co;
  data.branch = { name: br.name, code: br.code };
  data.issued_by_name = issuedByName;

  const live = () => one(`SELECT * FROM documents WHERE doc_type = $1 AND source_id = $2 AND status = 'issued'`, [type, sourceId]);
  const already = await live();
  if (already) return { doc: already, existing: true };

  const client = await pool.connect();
  let doc;
  try {
    await client.query('BEGIN');
    const year = nairobiYear();
    const c = await client.query(
      `INSERT INTO document_counters (doc_type, branch_id, year, last_no) VALUES ($1,$2,$3,1)
       ON CONFLICT (doc_type, branch_id, year) DO UPDATE SET last_no = document_counters.last_no + 1 RETURNING last_no`,
      [type, br.id, year]);
    const docNo = `${T.prefix}-${br.code}-${year}-${String(c.rows[0].last_no).padStart(4, '0')}`;
    const ins = await client.query(
      `INSERT INTO documents (doc_no, doc_type, branch_id, loan_id, customer_id, source_id, amount, data, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [docNo, type, br.id, loanId, customerId, sourceId, amount, JSON.stringify(data), req.user.id || req.user.user_id]);
    await client.query('COMMIT');
    doc = ins.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') { const ex = await live(); if (ex) return { doc: ex, existing: true }; }
    throw e;
  } finally { client.release(); }

  await logAudit(req, { action: 'DOC_ISSUE', entity: 'documents', entityId: doc.id,
    details: { message: `Issued ${T.title} ${doc.doc_no} (loan #${loanId}, KSh ${amount})`, doc_no: doc.doc_no, loan_id: loanId } });
  return { doc, existing: false };
};

router.post('/issue', ...guard, async (req, res) => {
  try {
    const r = await issue(req, req.body.type, req.body);
    res.status(r.existing ? 200 : 201).json(r);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// Register
router.get('/', ...guard, async (req, res) => {
  try {
    const q = req.query;
    const params = []; const where = ['1=1'];
    if (!seesAll(req.user)) { params.push(parseInt(req.user.branch_id) || 1); where.push(`d.branch_id = $${params.length}`); }
    else if (q.branch_id) { params.push(q.branch_id); where.push(`d.branch_id = $${params.length}`); }
    if (q.type && TYPES[q.type]) { params.push(q.type); where.push(`d.doc_type = $${params.length}`); }
    if (q.status) { params.push(q.status); where.push(`d.status = $${params.length}`); }
    const day = "((d.issued_at AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Nairobi')::date";
    if (q.from) { params.push(q.from); where.push(`${day} >= $${params.length}::date`); }
    if (q.to) { params.push(q.to); where.push(`${day} <= $${params.length}::date`); }
    if (q.q) {
      params.push('%' + q.q + '%'); const like = `$${params.length}`;
      params.push(String(q.q).replace(/^#/, '')); const ex = `$${params.length}`;
      where.push(`(d.doc_no ILIKE ${like} OR d.data->'customer'->>'name' ILIKE ${like} OR d.loan_id::text = ${ex})`);
    }
    const limit = 50, page = Math.max(parseInt(q.page) || 1, 1);
    const total = parseInt((await pool.query(`SELECT COUNT(*) FROM documents d WHERE ${where.join(' AND ')}`, params)).rows[0].count);
    const r = await pool.query(
      `SELECT d.id, d.doc_no, d.doc_type, d.loan_id, d.branch_id, d.amount, d.status, d.issued_at, d.print_count,
              d.data->'customer'->>'name' AS customer_name
       FROM documents d WHERE ${where.join(' AND ')} ORDER BY d.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]);
    res.json({ rows: r.rows, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Everything documentable for one loan (keep above /:id)
router.get('/loan/:loanId', ...guard, async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);
    const l = await one(
      `SELECT l.id, l.amount, l.total_amount, l.balance, l.status, l.disbursed_at, l.branch_id, c.name AS customer_name
       FROM loans l JOIN customers c ON c.id = l.customer_id WHERE l.id = $1`, [loanId]);
    if (!l) return res.status(404).json({ error: 'Loan not found' });
    if (!sees(req.user, l.branch_id)) return res.status(403).json({ error: 'This loan belongs to another branch' });
    const documents = (await pool.query(
      'SELECT id, doc_no, doc_type, source_id, status, issued_at, print_count FROM documents WHERE loan_id = $1 ORDER BY id DESC', [loanId])).rows;
    const payments = (await pool.query(
      'SELECT id, amount, payment_date, source, transaction_code FROM payments WHERE loan_id = $1 ORDER BY payment_date, id', [loanId])).rows;
    const fees = (await pool.query(
      `SELECT id, amount, created_at, transaction_code FROM company_income WHERE loan_id = $1 AND type = 'processing_fee' ORDER BY id`, [loanId])).rows;
    res.json({ loan: l, documents, payments, fees });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id(\\d+)', ...guard, async (req, res) => {
  try {
    const d = await one(
      `SELECT d.*, u.name AS issued_by_name, cu.name AS cancelled_by_name FROM documents d
       LEFT JOIN users u ON u.id = d.issued_by LEFT JOIN users cu ON cu.id = d.cancelled_by WHERE d.id = $1`, [req.params.id]);
    if (!d) return res.status(404).json({ error: 'Document not found' });
    if (!sees(req.user, d.branch_id)) return res.status(403).json({ error: 'This document belongs to another branch' });
    res.json({ ...d, title: (TYPES[d.doc_type] || {}).title || d.doc_type });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id(\\d+)/print', ...guard, async (req, res) => {
  try {
    const d = await one('SELECT id, doc_no, branch_id, status FROM documents WHERE id = $1', [req.params.id]);
    if (!d) return res.status(404).json({ error: 'Document not found' });
    if (!sees(req.user, d.branch_id)) return res.status(403).json({ error: 'This document belongs to another branch' });
    if (d.status !== 'issued') return res.status(400).json({ error: 'A cancelled document cannot be printed' });
    const r = await one('UPDATE documents SET print_count = print_count + 1, last_printed_at = NOW() WHERE id = $1 RETURNING print_count', [d.id]);
    await logAudit(req, { action: 'DOC_PRINT', entity: 'documents', entityId: d.id,
      details: { message: `Printed ${d.doc_no} (print ${r.print_count})` } });
    res.json({ print_count: r.print_count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id(\\d+)/cancel', ...managers, async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 5) return res.status(400).json({ error: 'Give a reason for cancelling' });
    const d = await one('SELECT id, doc_no, branch_id, status FROM documents WHERE id = $1', [req.params.id]);
    if (!d) return res.status(404).json({ error: 'Document not found' });
    if (!sees(req.user, d.branch_id)) return res.status(403).json({ error: 'This document belongs to another branch' });
    if (d.status !== 'issued') return res.status(400).json({ error: 'This document is already cancelled' });
    await pool.query(`UPDATE documents SET status = 'cancelled', cancelled_by = $1, cancelled_at = NOW(), cancel_reason = $2 WHERE id = $3`,
      [req.user.id || req.user.user_id, reason, d.id]);
    await logAudit(req, { action: 'DOC_CANCEL', entity: 'documents', entityId: d.id,
      details: { message: `Cancelled ${d.doc_no}: ${reason}` } });
    res.json({ message: 'Document cancelled. You can now issue a replacement.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;