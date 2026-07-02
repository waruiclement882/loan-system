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

// GET P&L report
router.get('/pnl', verifyToken, async (req, res) => {
  try {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();

    // Income: payments on loans disbursed this month, capped at total_amount per loan
const paymentsIncome = await pool.query(`
  SELECT 
    COALESCE(SUM(loan_paid), 0) as total,
    COALESCE(SUM(payment_count), 0) as count,
    COALESCE(SUM(interest_portion), 0) as interest_portion,
    COALESCE(SUM(principal_portion), 0) as principal_portion
  FROM (
    SELECT 
      l.id,
      COUNT(p.id) as payment_count,
      LEAST(COALESCE(SUM(p.amount), 0), l.total_amount) as loan_paid,
      LEAST(COALESCE(SUM(p.amount), 0), l.total_amount) * (l.total_amount - l.amount) / NULLIF(l.total_amount, 0) as interest_portion,
      LEAST(COALESCE(SUM(p.amount), 0), l.total_amount) * l.amount / NULLIF(l.total_amount, 0) as principal_portion
    FROM loans l
    LEFT JOIN payments p ON p.loan_id = l.id AND p.source != 'suspense'
    WHERE EXTRACT(MONTH FROM l.created_at) = $1
    AND EXTRACT(YEAR FROM l.created_at) = $2
    AND l.status NOT IN ('pending', 'rejected')
    GROUP BY l.id, l.amount, l.total_amount
  ) sub
`, [month, year]);

    // Processing fees for loans disbursed this month
const processingFees = await pool.query(`
  SELECT COALESCE(SUM(ci.amount), 0) as total, COUNT(*) as count
  FROM company_income ci
  JOIN loans l ON ci.loan_id = l.id
  WHERE ci.type = 'processing_fee'
  AND EXTRACT(MONTH FROM l.created_at) = $1
  AND EXTRACT(YEAR FROM l.created_at) = $2
`, [month, year]);

    // Float income
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

    // Expenses by category
    const expenses = await pool.query(`
      SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE EXTRACT(MONTH FROM expense_date) = $1
      AND EXTRACT(YEAR FROM expense_date) = $2
      GROUP BY category
      ORDER BY total DESC
    `, [month, year]);

    // BREAKDOWN 2: All loans disbursed this month with ALL their payments
const paymentsByLoan = await pool.query(`
  SELECT 
    l.id as loan_id,
    c.name as customer_name,
    l.amount,
    l.total_amount,
    l.status,
    l.balance,
    l.created_at::date as loan_date,
    COUNT(p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_paid,
    COALESCE(SUM(p.amount * (l.total_amount - l.amount) / NULLIF(l.total_amount, 0)), 0) as interest_paid,
    COALESCE(SUM(p.amount * l.amount / NULLIF(l.total_amount, 0)), 0) as principal_paid
  FROM loans l
  JOIN customers c ON l.customer_id = c.id
  LEFT JOIN payments p ON p.loan_id = l.id AND p.source != 'suspense'
  WHERE EXTRACT(MONTH FROM l.created_at) = $1
  AND EXTRACT(YEAR FROM l.created_at) = $2
  AND l.status NOT IN ('pending', 'rejected')
  GROUP BY l.id, c.name, l.amount, l.total_amount, l.status, l.balance, l.created_at
  ORDER BY total_paid DESC
`, [month, year]);

    // BREAKDOWN 3: Same loans with actual current balance
const disbursedThisMonthPayments = await pool.query(`
  SELECT 
    l.id as loan_id,
    c.name as customer_name,
    l.amount,
    l.total_amount,
    l.status,
    l.balance as current_balance,
    l.created_at::date as loan_date,
    COUNT(p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_paid,
    COALESCE(SUM(p.amount * (l.total_amount - l.amount) / NULLIF(l.total_amount, 0)), 0) as interest_paid,
    COALESCE(SUM(p.amount * l.amount / NULLIF(l.total_amount, 0)), 0) as principal_paid
  FROM loans l
  JOIN customers c ON l.customer_id = c.id
  LEFT JOIN payments p ON p.loan_id = l.id AND p.source != 'suspense'
  WHERE EXTRACT(MONTH FROM l.created_at) = $1
  AND EXTRACT(YEAR FROM l.created_at) = $2
  AND l.status NOT IN ('pending', 'rejected')
  GROUP BY l.id, c.name, l.amount, l.total_amount, l.status, l.balance, l.created_at
  ORDER BY total_paid DESC
`, [month, year]);

    // Bad debt write-offs this month
const badDebt = await pool.query(`
  SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
  FROM expenses
  WHERE category = 'Bad Debt'
  AND EXTRACT(MONTH FROM expense_date) = $1
  AND EXTRACT(YEAR FROM expense_date) = $2
`, [month, year]);

// Bad debt recoveries this month
const badDebtRecovery = await pool.query(`
  SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
  FROM company_income
  WHERE type = 'bad_debt_recovery'
  AND EXTRACT(MONTH FROM created_at) = $1
  AND EXTRACT(YEAR FROM created_at) = $2
`, [month, year]);

const totalBadDebt = parseFloat(badDebt.rows[0].total);
const totalBadDebtRecovery = parseFloat(badDebtRecovery.rows[0].total);
const totalExpenses = expenses.rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);
    const totalPayments = parseFloat(paymentsIncome.rows[0].total);
    const interestIncome = parseFloat(paymentsIncome.rows[0].interest_portion);
    const principalRecovered = parseFloat(paymentsIncome.rows[0].principal_portion);
    const totalProcessingFees = parseFloat(processingFees.rows[0].total);
    const totalFloatIncome = parseFloat(floatIncome.rows[0].total);
    const totalIncome = interestIncome + totalProcessingFees + totalFloatIncome;
    const netProfit = totalIncome - totalExpenses;

    // Summary for breakdown 3
    const b3TotalDisbursed = disbursedThisMonthPayments.rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const b3TotalPaid = disbursedThisMonthPayments.rows.reduce((s, r) => s + parseFloat(r.total_paid || 0), 0);
    const b3TotalInterest = disbursedThisMonthPayments.rows.reduce((s, r) => s + parseFloat(r.interest_paid || 0), 0);

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
      bad_debt: { total: totalBadDebt, count: parseInt(badDebt.rows[0].count) },
bad_debt_recovery: { total: totalBadDebtRecovery, count: parseInt(badDebtRecovery.rows[0].count) },
net_profit: netProfit,
      profit_margin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0,
      breakdown2_all_loans: paymentsByLoan.rows,
      breakdown3_new_loans: {
        loans: disbursedThisMonthPayments.rows,
        summary: {
          total_disbursed: b3TotalDisbursed,
          total_paid_back: b3TotalPaid,
          total_interest_earned: b3TotalInterest,
          loan_count: disbursedThisMonthPayments.rows.length,
          loans_with_payments: disbursedThisMonthPayments.rows.filter(r => parseFloat(r.total_paid) > 0).length
        }
      }
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
// POST bad debt recovery
router.post('/bad-debt-recovery', verifyToken, requireRole('admin', 'cashier'), async (req, res) => {
  try {
    const { loan_id, amount, transaction_code, notes } = req.body;
    const recorded_by = req.user?.id || req.user?.user_id;

    if (!loan_id || !amount) return res.status(400).json({ error: 'loan_id and amount required' });

    // Verify loan is written off
    const loanRes = await pool.query(
      'SELECT l.*, c.name as customer_name FROM loans l JOIN customers c ON l.customer_id=c.id WHERE l.id=$1',
      [loan_id]
    );
    if (!loanRes.rows[0]) return res.status(404).json({ error: 'Loan not found' });
    if (loanRes.rows[0].status !== 'written_off') {
      return res.status(400).json({ error: 'Loan is not written off' });
    }

    const loan = loanRes.rows[0];

    // Record as company income - bad debt recovery
    await pool.query(
      `INSERT INTO company_income (loan_id, amount, type, transaction_code, recorded_by, notes)
       VALUES ($1, $2, 'bad_debt_recovery', $3, $4, $5)`,
      [loan_id, amount, transaction_code || null, recorded_by,
       notes || `Bad debt recovery from ${loan.customer_name} - Loan #${loan_id}`]
    );

    // Record payment
    await pool.query(
      `INSERT INTO payments (loan_id, amount, source, transaction_code, payment_date)
       VALUES ($1, $2, 'recovery', $3, NOW())`,
      [loan_id, amount, transaction_code || `RECOVERY-${Date.now()}`]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [recorded_by, 'Admin', 'BAD_DEBT_RECOVERY', 'loans', loan_id,
       `Recovered KSh ${amount} from written-off loan #${loan_id} - ${loan.customer_name}`]
    );

    res.json({ message: `Bad debt recovery of KSh ${amount} recorded successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET written off loans
router.get('/written-off', verifyToken, async (req, res) => {
  try {
    const loans = await pool.query(`
      SELECT l.*, c.name as customer_name, c.phone,
        COALESCE(SUM(p.amount) FILTER (WHERE p.source='recovery'), 0) as recovered_amount,
        e.amount as written_off_amount, e.created_at as written_off_at,
        e.description as write_off_reason
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN payments p ON p.loan_id = l.id
      LEFT JOIN expenses e ON e.description LIKE '%Loan #' || l.id || '%' AND e.category = 'Bad Debt'
      WHERE l.status = 'written_off'
      GROUP BY l.id, c.name, c.phone, e.amount, e.created_at, e.description
      ORDER BY l.updated_at DESC
    `);
    const totalWrittenOff = loans.rows.reduce((s, l) => s + parseFloat(l.written_off_amount || 0), 0);
    const totalRecovered = loans.rows.reduce((s, l) => s + parseFloat(l.recovered_amount || 0), 0);
    res.json({ loans: loans.rows, totalWrittenOff, totalRecovered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
