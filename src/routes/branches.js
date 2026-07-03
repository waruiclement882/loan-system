const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Get all branches
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.*,
        u.name as manager_name,
        COALESCE((SELECT COUNT(*) FROM loans l WHERE l.branch_id = b.id AND l.status = 'active'), 0) as active_loans,
        COALESCE((SELECT COUNT(*) FROM loans l WHERE l.branch_id = b.id AND l.status = 'paid'), 0) as paid_loans,
        COALESCE((SELECT SUM(l.amount) FROM loans l WHERE l.branch_id = b.id AND l.status NOT IN ('pending','rejected')), 0) as total_disbursed,
        COALESCE((SELECT SUM(l.balance) FROM loans l WHERE l.branch_id = b.id AND l.status = 'active'), 0) as outstanding,
        COALESCE((SELECT SUM(p.amount) FROM payments p JOIN loans l ON p.loan_id = l.id WHERE l.branch_id = b.id), 0) as total_collected,
        COALESCE((SELECT COUNT(*) FROM customers c WHERE c.branch_id = b.id), 0) as total_customers
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
      WHERE b.is_active = TRUE
      ORDER BY b.id
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single branch
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.*,
        u.name as manager_name,
        COALESCE((SELECT COUNT(*) FROM loans l WHERE l.branch_id = b.id AND l.status = 'active'), 0) as active_loans,
        COALESCE((SELECT COUNT(*) FROM loans l WHERE l.branch_id = b.id AND l.status = 'paid'), 0) as paid_loans,
        COALESCE((SELECT SUM(l.amount) FROM loans l WHERE l.branch_id = b.id AND l.status NOT IN ('pending','rejected')), 0) as total_disbursed,
        COALESCE((SELECT SUM(l.balance) FROM loans l WHERE l.branch_id = b.id AND l.status = 'active'), 0) as outstanding,
        COALESCE((SELECT SUM(p.amount) FROM payments p JOIN loans l ON p.loan_id = l.id WHERE l.branch_id = b.id), 0) as total_collected,
        COALESCE((SELECT COUNT(*) FROM customers c WHERE c.branch_id = b.id), 0) as total_customers,
        COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.branch_id = b.id), 0) as total_expenses,
        COALESCE((SELECT SUM(ci.amount) FROM company_income ci WHERE ci.branch_id = b.id), 0) as total_income
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
      WHERE b.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Branch not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create branch (admin only)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, code, location, manager_id, capital } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'name and code are required' });
    const result = await pool.query(
      `INSERT INTO branches (name, code, location, manager_id, capital)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, code.toUpperCase(), location, manager_id || null, capital || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message.includes('unique')) return res.status(400).json({ error: 'Branch code already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Update branch
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, location, manager_id, capital, is_active } = req.body;
    const result = await pool.query(
      `UPDATE branches SET
        name = COALESCE($1, name),
        location = COALESCE($2, location),
        manager_id = COALESCE($3, manager_id),
        capital = COALESCE($4, capital),
        is_active = COALESCE($5, is_active)
       WHERE id = $6 RETURNING *`,
      [name, location, manager_id, capital, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Branch not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get branch summary (combined admin view)
router.get('/summary/all', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE((SELECT SUM(capital) FROM branches WHERE is_active = TRUE), 0) as total_capital,
        COALESCE((SELECT SUM(amount) FROM loans WHERE status NOT IN ('pending','rejected')), 0) as total_disbursed,
        COALESCE((SELECT SUM(balance) FROM loans WHERE status = 'active'), 0) as total_outstanding,
        COALESCE((SELECT SUM(amount) FROM payments), 0) as total_collected,
        COALESCE((SELECT COUNT(*) FROM loans WHERE status = 'active'), 0) as active_loans,
        COALESCE((SELECT COUNT(*) FROM loans WHERE status = 'paid'), 0) as paid_loans,
        COALESCE((SELECT COUNT(*) FROM customers), 0) as total_customers
    `);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;