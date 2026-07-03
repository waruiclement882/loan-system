const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Get all branches
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, u.name as manager_name,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_loans,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'paid') as paid_loans,
        COALESCE(SUM(l.amount) FILTER (WHERE l.status NOT IN ('pending','rejected')), 0) as total_disbursed,
        COALESCE(SUM(l.balance) FILTER (WHERE l.status = 'active'), 0) as outstanding,
        COALESCE(SUM(p.amount), 0) as total_collected,
        COUNT(DISTINCT c.id) as total_customers
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
      LEFT JOIN loans l ON l.branch_id = b.id
      LEFT JOIN payments p ON p.loan_id = l.id
      LEFT JOIN customers c ON c.branch_id = b.id
      WHERE b.is_active = TRUE
      GROUP BY b.id, u.name
      ORDER BY b.id
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single branch
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, u.name as manager_name,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_loans,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'paid') as paid_loans,
        COALESCE(SUM(l.amount) FILTER (WHERE l.status NOT IN ('pending','rejected')), 0) as total_disbursed,
        COALESCE(SUM(l.balance) FILTER (WHERE l.status = 'active'), 0) as outstanding,
        COALESCE(SUM(p.amount), 0) as total_collected,
        COUNT(DISTINCT c.id) as total_customers,
        COALESCE(SUM(e.amount), 0) as total_expenses,
        COALESCE(SUM(ci.amount), 0) as total_income
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
      LEFT JOIN loans l ON l.branch_id = b.id
      LEFT JOIN payments p ON p.loan_id = l.id
      LEFT JOIN customers c ON c.branch_id = b.id
      LEFT JOIN expenses e ON e.branch_id = b.id
      LEFT JOIN company_income ci ON ci.branch_id = b.id
      WHERE b.id = $1
      GROUP BY b.id, u.name
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

// Get branch summary (for combined admin view)
router.get('/summary/all', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(b.capital), 0) as total_capital,
        COALESCE(SUM(l.amount) FILTER (WHERE l.status NOT IN ('pending','rejected')), 0) as total_disbursed,
        COALESCE(SUM(l.balance) FILTER (WHERE l.status = 'active'), 0) as total_outstanding,
        COALESCE(SUM(p.amount), 0) as total_collected,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_loans,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'paid') as paid_loans,
        COUNT(DISTINCT c.id) as total_customers
      FROM branches b
      LEFT JOIN loans l ON l.branch_id = b.id
      LEFT JOIN payments p ON p.loan_id = l.id
      LEFT JOIN customers c ON c.branch_id = b.id
      WHERE b.is_active = TRUE
    `);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;