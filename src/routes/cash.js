const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { logAudit } = require('../utils/audit');

const branchOf = (req) =>
  req.user.all_branches
    ? (parseInt(req.query.branch_id || (req.body && req.body.branch_id)) || 1)
    : (req.user.branch_id || 1);

const r2 = (n) => Math.round(n * 100) / 100;
const requireSuper = (req, res, next) => (req.user && req.user.real_role === 'super_admin')
  ? next() : res.status(403).json({ error: 'Only the super admin can record or view owner drawings' });

// What the system believes the branch should hold (cash + bank + M-Pesa together)
const expectedFunds = async (b) => {
  const one = async (sql) => parseFloat(((await pool.query(sql, [b])).rows[0] || {}).v || 0);
  const capRow = await pool.query('SELECT capital FROM branches WHERE id = $1', [b]);
  if (!capRow.rows[0]) throw new Error('Branch not found');
  const capital = parseFloat(capRow.rows[0].capital || 0);
  // Suspense and recovery payments are bookkeeping entries, not new money
  const collections = await one(`SELECT COALESCE(SUM(p.amount),0) AS v FROM payments p JOIN loans l ON p.loan_id = l.id
    WHERE COALESCE(l.branch_id,1) = $1 AND COALESCE(p.source,'') NOT IN ('suspense','recovery')`);
  const income = await one(`SELECT COALESCE(SUM(amount),0) AS v FROM company_income
    WHERE COALESCE(branch_id,1) = $1 AND COALESCE(transaction_code,'') NOT LIKE 'SUSPENSE-%'`);
  const disbursed = await one(`SELECT COALESCE(SUM(amount),0) AS v FROM loans
    WHERE COALESCE(branch_id,1) = $1 AND disbursed_at IS NOT NULL AND status <> 'rejected'`);
  // Write-offs are not cash leaving the business
  const expenses = await one(`SELECT COALESCE(SUM(amount),0) AS v FROM expenses
    WHERE COALESCE(branch_id,1) = $1 AND status = 'approved' AND COALESCE(payment_method,'') <> 'write_off'`);
  const drawings = await one(`SELECT COALESCE(SUM(amount),0) AS v FROM owner_drawings WHERE COALESCE(branch_id,1) = $1`);
  return { capital, collections, income, disbursed, expenses, drawings,
           expected: r2(capital + collections + income - disbursed - expenses - drawings) };
};

const counters = [verifyToken, requireRole('admin', 'branch_admin', 'cashier')];

router.get('/expected', ...counters, async (req, res) => {
  try {
    const b = branchOf(req);
    const e = await expectedFunds(b);
    const last = await pool.query('SELECT * FROM cash_reconciliations WHERE COALESCE(branch_id,1) = $1 ORDER BY id DESC LIMIT 1', [b]);
    res.json({ branch_id: b, ...e, last: last.rows[0] || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/counts', ...counters, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*, u.name AS recorded_by_name FROM cash_reconciliations c
       LEFT JOIN users u ON c.recorded_by = u.id
       WHERE COALESCE(c.branch_id,1) = $1 ORDER BY c.id DESC LIMIT 60`, [branchOf(req)]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Counts are append-only: there is no edit or delete route
router.post('/count', ...counters, async (req, res) => {
  try {
    const b = branchOf(req);
    const n = (v) => Math.max(0, parseFloat(v) || 0);
    const cash = n(req.body.cash_on_hand), bank = n(req.body.bank_balance), mpesa = n(req.body.mpesa_balance);
    const counted = r2(cash + bank + mpesa);
    const notes = String(req.body.notes || '').trim();
    if (counted <= 0) return res.status(400).json({ error: 'Enter the amounts you counted' });

    const e = await expectedFunds(b);   // always recomputed here, never trusted from the browser
    const prev = (await pool.query(
      'SELECT variance FROM cash_reconciliations WHERE COALESCE(branch_id,1) = $1 ORDER BY id DESC LIMIT 1', [b])).rows[0];
    const variance = r2(counted - e.expected);
    const change = prev ? r2(variance - parseFloat(prev.variance)) : null;
    if (change !== null && Math.abs(change) >= 1 && notes.length < 5) {
      return res.status(400).json({ error: 'The gap has changed since the last count. Explain it in the notes.' });
    }

    const ins = await pool.query(
      `INSERT INTO cash_reconciliations
         (branch_id, recon_date, expected_cash, counted_cash, variance, variance_change,
          cash_on_hand, bank_balance, mpesa_balance, notes, recorded_by)
       VALUES ($1, (NOW() AT TIME ZONE 'Africa/Nairobi')::date, $2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [b, e.expected, counted, variance, change, cash, bank, mpesa, notes || null, req.user.id || req.user.user_id]);

    await logAudit(req, { action: 'CASH_COUNT', entity: 'cash_reconciliations', entityId: ins.rows[0].id,
      details: { message: `Cash count, branch ${b}: expected KSh ${e.expected}, counted KSh ${counted}, variance KSh ${variance}`, branch_id: b },
      newValues: { expected: e.expected, counted, variance, variance_change: change, cash, bank, mpesa } });

    res.status(201).json({
      message: change === null ? 'Baseline count saved. Future counts are measured against it.'
        : Math.abs(change) < 1 ? 'Count saved: balanced.'
        : `Count saved. The gap moved by KSh ${change}.`,
      count: ins.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Owner drawings: admin only, dated today, never edited or deleted here
router.post('/drawings', verifyToken, requireSuper, async (req, res) => {
  try {
    const b = branchOf(req);
    const amount = parseFloat(req.body.amount);
    const purpose = String(req.body.purpose || '').trim();
    if (!(amount > 0)) return res.status(400).json({ error: 'Enter a valid amount' });
    if (purpose.length < 3) return res.status(400).json({ error: 'State the purpose of the drawing' });
    const ins = await pool.query(
      `INSERT INTO owner_drawings (branch_id, amount, purpose, payment_method, reference, drawing_date, recorded_by)
       VALUES ($1,$2,$3,$4,$5,(NOW() AT TIME ZONE 'Africa/Nairobi')::date,$6) RETURNING *`,
      [b, amount, purpose, req.body.payment_method || 'cash', req.body.reference || null, req.user.id || req.user.user_id]);
    await logAudit(req, { action: 'OWNER_DRAWING', entity: 'owner_drawings', entityId: ins.rows[0].id,
      details: { message: `Owner drawing KSh ${amount}: ${purpose}`, branch_id: b }, newValues: ins.rows[0] });
    res.status(201).json({ message: 'Drawing recorded', drawing: ins.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/drawings', verifyToken, requireSuper, async (req, res) => {
  try {
    const params = [branchOf(req)];
    let where = 'COALESCE(d.branch_id,1) = $1';
    if (req.query.month && req.query.year) {
      params.push(req.query.month, req.query.year);
      where += ' AND EXTRACT(MONTH FROM d.drawing_date) = $2 AND EXTRACT(YEAR FROM d.drawing_date) = $3';
    }
    const r = await pool.query(
      `SELECT d.*, u.name AS recorded_by_name FROM owner_drawings d LEFT JOIN users u ON d.recorded_by = u.id
       WHERE ${where} ORDER BY d.id DESC LIMIT 200`, params);
    res.json({ drawings: r.rows, total: r.rows.reduce((s, x) => s + parseFloat(x.amount || 0), 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;