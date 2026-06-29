const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// GET all expenses with filters
router.get('/', verifyToken, async (req, res) => {
  try {
    const { month, year, category } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (month && year) {
      params.push(month, year);
      where += ` AND EXTRACT(MONTH FROM e.expense_date) = $${params.length - 1} AND EXTRACT(YEAR FROM e.expense_date) = $${params.length}`;
    }
    if (category) {
      params.push(category);
      where += ` AND e.category = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT e.*, u.name AS recorded_by_name
      FROM expenses e
      LEFT JOIN users u ON e.recorded_by = u.id
      ${where}
      ORDER BY e.expense_date DESC, e.created_at DESC
    `, params);

    const total = result.rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    res.json({ expenses: result.rows, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET expense categories
router.get('/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expense_categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET P&L report for a month
router.get('/pnl', verifyToken, async (req, res) => {
  try {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();

    // Income: payments collected this month with interest/principal split
const paymentsIncome = await pool.query(`
  SELECT 
    COALESCE(SUM(p.amount), 0) as total,
    COUNT(*) as count,
    COALESCE(SUM(
      p.amount * (l.total_amount - l.amount) / NULLIF(l.total_amount, 0)
    ), 0) as interest_portion,
    COALESCE(SUM(
      p.amount * l.amount / NULLIF(l.total_amount, 0)
    ), 0) as principal_portion
  FROM payments p
  JOIN loans l ON p.loan_id = l.id
  WHERE EXTRACT(MONTH FROM p.payment_date) = $1
  AND EXTRACT(YEAR FROM p.payment_date) = $2
  AND p.source != 'suspense'
`, [month, year]);

    // Processing fees this month
    const processingFees = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM company_income
      WHERE type = 'processing_fee'
      AND EXTRACT(MONTH FROM created_at) = $1
      AND EXTRACT(YEAR FROM created_at) = $2
    `, [month, year]);

    // Float income this month
    const floatIncome = await pool.query(`
      SELECT COALESCE(SUM(profit), 0) as total, COUNT(*) as count
      FROM float_income
      WHERE EXTRACT(MONTH FROM transaction_date) = $1
      AND EXTRACT(YEAR FROM transaction_date) = $2
    `, [month, year]);

    // Loans disbursed this month
    const disbursed = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM loans
      WHERE status NOT IN ('pending', 'rejected')
      AND EXTRACT(MONTH FROM created_at) = $1
      AND EXTRACT(YEAR FROM created_at) = $2
    `, [month, year]);

    // Expenses by category this month
    const expenses = await pool.query(`
      SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE EXTRACT(MONTH FROM expense_date) = $1
      AND EXTRACT(YEAR FROM expense_date) = $2
      GROUP BY category
      ORDER BY total DESC
    `, [month, year]);

    const totalExpenses = expenses.rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);

    // Interest income = payments - principal portion
    // Simple calculation: total payments - processing fees = repayments
    const totalPayments = parseFloat(paymentsIncome.rows[0].total);
    const interestIncome = parseFloat(paymentsIncome.rows[0].interest_portion);
    const principalRecovered = parseFloat(paymentsIncome.rows[0].principal_portion);
    const totalProcessingFees = parseFloat(processingFees.rows[0].total);
    const totalFloatIncome = parseFloat(floatIncome.rows[0].total);

   const totalIncome = interestIncome + totalProcessingFees + totalFloatIncome;
   const netProfit = totalIncome - totalExpenses;

    res.json({
  month: parseInt(month),
  year: parseInt(year),
  income: {
    repayments: { 
      total: totalPayments, 
      count: parseInt(paymentsIncome.rows[0].count),
      interest: interestIncome,
      principal: principalRecovered
    },
    processing_fees: { total: totalProcessingFees, count: parseInt(processingFees.rows[0].count) },
    float_income: { total: totalFloatIncome, count: parseInt(floatIncome.rows[0].count) },
    total: totalIncome
  },
  expenses: {
    breakdown: expenses.rows,
    total: totalExpenses
  },
  disbursed: {
    total: parseFloat(disbursed.rows[0].total),
    count: parseInt(disbursed.rows[0].count)
  },
  net_profit: netProfit,
  profit_margin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0
});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST record an expense
router.post('/', verifyToken, async (req, res) => {
  try {
    const { category, description, amount, payment_method, reference, expense_date } = req.body;
    const recorded_by = req.user?.id || req.user?.user_id;

    if (!category || !description || !amount) {
      return res.status(400).json({ error: 'category, description and amount are required' });
    }

    const result = await pool.query(`
      INSERT INTO expenses (category, description, amount, payment_method, reference, expense_date, recorded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [category, description, amount, payment_method || 'cash', reference || null,
        expense_date || new Date().toISOString().split('T')[0], recorded_by]);

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [recorded_by, 'Officer', 'RECORD_EXPENSE', 'expenses', result.rows[0].id,
       JSON.stringify({ category, description, amount })]
    );

    res.status(201).json({ message: 'Expense recorded', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an expense
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
