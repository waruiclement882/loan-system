const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const pool     = require('../db/pool');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// GET all users (admin only)
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update user (admin only)
router.put('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    let query, params;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query  = 'UPDATE users SET name=$1, email=$2, password=$3, role=$4 WHERE id=$5 RETURNING id, name, email, role';
      params = [name, email, hash, role, req.params.id];
    } else {
      query  = 'UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4 RETURNING id, name, email, role';
      params = [name, email, role, req.params.id];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH update role only (admin only)
router.patch('/users/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const result = await pool.query(
      'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role',
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE user (admin only)
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
