const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const pool = require('../db/connection');

// PAR Report
router.get('/par', verifyToken, async (req, res) => {
  try {
    const loans = await pool.query(
      "SELECT loans.*, customers.name as customer_name FROM loans LEFT JOIN customers ON loans.customer_id=customers.id WHERE loans.status='active'"
    );
    const overdue = await pool.query(
      "SELECT DISTINCT loan_id, MIN(due_date) as earliest_overdue, COUNT(*) as overdue_count FROM repayment_schedules WHERE status='overdue' GROUP BY loan_id"
    );
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
      days_overdue: overdueMap[l.id] ? Math.floor((new Date() - new Date(overdueMap[l.id].earliest_overdue)) / (1000*60*60*24)) : 0
    }));

    res.json({ par, totalPortfolio, overdueBalance, totalLoans: loans.rows.length, overdueLoans: overdueLoans.length, loans: loanDetails });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Loan Statement
router.get('/statement/:loan_id', verifyToken, async (req, res) => {
  try {
    const { loan_id } = req.params;
    const loanRes = await pool.query(
      'SELECT loans.*, customers.name as customer_name, customers.phone, customers.email, customers.national_id FROM loans LEFT JOIN customers ON loans.customer_id=customers.id WHERE loans.id=$1',
      [loan_id]
    );
    if (!loanRes.rows[0]) return res.status(404).json({ error: 'Loan not found' });
    const loan = loanRes.rows[0];

    const schedule = await pool.query('SELECT * FROM repayment_schedules WHERE loan_id=$1 ORDER BY installment_no', [loan_id]);
    const payments = await pool.query('SELECT * FROM payments WHERE loan_id=$1 ORDER BY payment_date', [loan_id]);

    res.json({ loan, schedule: schedule.rows, payments: payments.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Daily Collection Sheet
router.get('/collection', verifyToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const due = await pool.query(
      `SELECT rs.*, loans.customer_id, loans.amount as loan_amount, loans.balance,
        customers.name as customer_name, customers.phone
       FROM repayment_schedules rs
       JOIN loans ON rs.loan_id = loans.id
       JOIN customers ON loans.customer_id = customers.id
       WHERE rs.due_date::date = $1
       ORDER BY rs.status, customers.name`,
      [targetDate]
    );

    const collected = due.rows.filter(r => r.status === 'paid').reduce((s, r) => s + parseFloat(r.amount_due), 0);
    const pending = due.rows.filter(r => r.status !== 'paid').reduce((s, r) => s + parseFloat(r.amount_due), 0);

    res.json({ date: targetDate, installments: due.rows, collected, pending, total: due.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Audit Logs
router.get('/audit', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT audit_logs.*, users.name as user_name FROM audit_logs LEFT JOIN users ON audit_logs.user_id=users.id ORDER BY audit_logs.created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
