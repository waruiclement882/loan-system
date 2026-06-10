const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// ── Monthly Breakdown ─────────────────────────────────────────────────────────
router.get('/monthly', verifyToken, async (req, res) => {
  try {
    const monthly = await pool.query(`
      SELECT
        TO_CHAR((l.created_at AT TIME ZONE 'Africa/Nairobi'), 'Month YYYY') AS month,
        DATE_TRUNC('month', l.created_at AT TIME ZONE 'Africa/Nairobi') AS month_start,
        COUNT(l.id) AS loans_disbursed,
        SUM(l.amount) AS amount_disbursed,
        COALESCE(SUM(ci.amount), 0) AS processing_fees
      FROM loans l
      LEFT JOIN company_income ci
        ON ci.loan_id = l.id AND ci.type = 'processing_fee'
      WHERE l.status NOT IN ('pending', 'rejected')
      GROUP BY
        DATE_TRUNC('month', l.created_at AT TIME ZONE 'Africa/Nairobi'),
        TO_CHAR((l.created_at AT TIME ZONE 'Africa/Nairobi'), 'Month YYYY')
      ORDER BY month_start ASC
    `);

    // Payments per month (EAT)
    const payments = await pool.query(`
      SELECT
        DATE_TRUNC('month', payment_date AT TIME ZONE 'Africa/Nairobi') AS month_start,
        COUNT(*) AS payment_count,
        SUM(amount) AS amount_collected
      FROM payments
      GROUP BY DATE_TRUNC('month', payment_date AT TIME ZONE 'Africa/Nairobi')
      ORDER BY month_start ASC
    `);

    // Merge payments into monthly rows
    const paymentMap = {};
    payments.rows.forEach(p => {
      const key = new Date(p.month_start).toISOString();
      paymentMap[key] = p;
    });

    const rows = monthly.rows.map(r => {
      const key = new Date(r.month_start).toISOString();
      const pay = paymentMap[key] || {};
      return {
        month: r.month.trim(),
        loans_disbursed: parseInt(r.loans_disbursed),
        amount_disbursed: parseFloat(r.amount_disbursed),
        payment_count: parseInt(pay.payment_count || 0),
        amount_collected: parseFloat(pay.amount_collected || 0),
        processing_fees: parseFloat(r.processing_fees)
      };
    });

    // Totals
    const totals = {
      loans_disbursed: rows.reduce((s, r) => s + r.loans_disbursed, 0),
      amount_disbursed: rows.reduce((s, r) => s + r.amount_disbursed, 0),
      payment_count: rows.reduce((s, r) => s + r.payment_count, 0),
      amount_collected: rows.reduce((s, r) => s + r.amount_collected, 0),
      processing_fees: rows.reduce((s, r) => s + r.processing_fees, 0)
    };

    res.json({ rows, totals });
  } catch (err) {
    console.error('[Monthly]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Company Income ────────────────────────────────────────────────────────────
router.get('/income', verifyToken, requireRole('admin', 'cashier'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ci.id, ci.loan_id, ci.amount, ci.type, ci.transaction_code,
        ci.notes, ci.created_at,
        c.name AS customer_name,
        u.name AS recorded_by_name
      FROM company_income ci
      LEFT JOIN loans l ON ci.loan_id = l.id
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN users u ON ci.recorded_by = u.id
      ORDER BY ci.created_at DESC
    `);

    const total = result.rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const count = result.rows.length;
    const avg = count > 0 ? (total / count) : 0;

    res.json({
      income: result.rows,
      total,
      count,
      avg_per_loan: parseFloat(avg.toFixed(2))
    });
  } catch (err) {
    console.error('[Income]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PAR Report ────────────────────────────────────────────────────────────────
router.get('/par', verifyToken, async (req, res) => {
  try {
    const loans = await pool.query(`
      SELECT l.*, c.name AS customer_name
      FROM loans l
      LEFT JOIN customers c ON l.customer_id = c.id
      WHERE l.status = 'active'
    `);

    const overdue = await pool.query(`
      SELECT DISTINCT loan_id, MIN(due_date) AS earliest_overdue, COUNT(*) AS overdue_count
      FROM repayment_schedules
      WHERE status = 'overdue'
      GROUP BY loan_id
    `);

    const overdueMap = {};
    overdue.rows.forEach(r => { overdueMap[r.loan_id] = r; });

    const totalPortfolio = loans.rows.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
    const overdueLoans = loans.rows.filter(l => overdueMap[l.id]);
    const overdueBalance = overdueLoans.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
    const par = totalPortfolio > 0 ? ((overdueBalance / totalPortfolio) * 100).toFixed(2) : 0;

    const loanDetails = loans.rows.map(l => ({
      ...l,
      is_overdue: !!overdueMap[l.id],
      overdue_count: overdueMap[l.id]?.overdue_count || 0,
      earliest_overdue: overdueMap[l.id]?.earliest_overdue || null,
      days_overdue: overdueMap[l.id]
        ? Math.floor((new Date() - new Date(overdueMap[l.id].earliest_overdue)) / (1000 * 60 * 60 * 24))
        : 0
    }));

    res.json({ par, totalPortfolio, overdueBalance, totalLoans: loans.rows.length, overdueLoans: overdueLoans.length, loans: loanDetails });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Collection Sheet ──────────────────────────────────────────────────────────
router.get('/collection', verifyToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const due = await pool.query(`
      SELECT rs.*, l.customer_id, l.amount AS loan_amount, l.balance,
        c.name AS customer_name, c.phone
      FROM repayment_schedules rs
      JOIN loans l ON rs.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      WHERE rs.due_date::date = $1
      ORDER BY rs.status, c.name
    `, [targetDate]);

    const collected = due.rows.filter(r => r.status === 'paid').reduce((s, r) => s + parseFloat(r.amount_due), 0);
    const pending = due.rows.filter(r => r.status !== 'paid').reduce((s, r) => s + parseFloat(r.amount_due), 0);

    res.json({ date: targetDate, installments: due.rows, collected, pending, total: due.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Audit Logs ────────────────────────────────────────────────────────────────
router.get('/audit', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT al.*, u.name AS user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Summary Stats (dashboard footer) ─────────────────────────────────────────
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('pending','rejected')) AS total_loans,
        COUNT(*) FILTER (WHERE status = 'active') AS active_loans,
        COUNT(*) FILTER (WHERE status = 'paid') AS paid_loans,
        COALESCE(SUM(amount) FILTER (WHERE status NOT IN ('pending','rejected')), 0) AS total_disbursed,
        COALESCE(SUM(balance) FILTER (WHERE status = 'active'), 0) AS total_outstanding
      FROM loans
    `);

    const payments = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_repaid FROM payments
    `);

    const fees = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_fees, COUNT(*) AS fee_count
      FROM company_income WHERE type = 'processing_fee'
    `);

    const s = stats.rows[0];
    const totalDisbursed = parseFloat(s.total_disbursed);
    const totalRepaid = parseFloat(payments.rows[0].total_repaid);
    const totalOutstanding = parseFloat(s.total_outstanding);
    const collectionRate = totalDisbursed > 0 ? ((totalRepaid / totalDisbursed) * 100).toFixed(0) : 0;

    res.json({
      total_loans: parseInt(s.total_loans),
      active_loans: parseInt(s.active_loans),
      paid_loans: parseInt(s.paid_loans),
      total_disbursed: totalDisbursed,
      total_repaid: totalRepaid,
      total_outstanding: totalOutstanding,
      collection_rate: collectionRate,
      processing_fees: parseFloat(fees.rows[0].total_fees),
      fee_count: parseInt(fees.rows[0].fee_count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── Loan Statement ──────────────────────────────────────────────────────────
router.get('/statement/:loanId', verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;

    const loanRes = await pool.query(`
      SELECT l.*, c.name AS customer_name, c.phone, c.email, c.national_id
      FROM loans l
      LEFT JOIN customers c ON l.customer_id = c.id
      WHERE l.id = $1
    `, [loanId]);

    if (!loanRes.rows[0]) return res.status(404).json({ error: 'Loan not found' });

    const scheduleRes = await pool.query(
      'SELECT * FROM repayment_schedules WHERE loan_id = $1 ORDER BY installment_no ASC',
      [loanId]
    );

    const paymentsRes = await pool.query(
      'SELECT * FROM payments WHERE loan_id = $1 ORDER BY payment_date ASC',
      [loanId]
    );

    res.json({
      loan: loanRes.rows[0],
      schedule: scheduleRes.rows,
      payments: paymentsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── Due This Week ──────────────────────────────────────────────────────────
router.get('/due-this-week', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rs.*, l.customer_id, l.balance as loan_balance,
        c.name AS customer_name, c.phone,
        l.amount as loan_amount, l.total_amount,
        l.weekly_installment
      FROM repayment_schedules rs
      JOIN loans l ON rs.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      WHERE rs.due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND rs.status IN ('pending', 'partial', 'overdue')
        AND l.status = 'active'
      ORDER BY rs.due_date ASC, c.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
