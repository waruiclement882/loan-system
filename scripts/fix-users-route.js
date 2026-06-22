const fs = require('fs');

// Fix users route - replace pool with connection
fs.writeFileSync('src/routes/users.js', `const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db/connection');
const { verifyToken } = require('../middlewares/authMiddleware');

// Get all users
router.get('/users', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create user
router.post('/users', verifyToken, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role',
      [name, email, hash, role || 'loan_officer']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message.includes('unique')) return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/users/:id', verifyToken, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    let query, params;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET name=$1, email=$2, password=$3, role=$4 WHERE id=$5 RETURNING id, name, email, role';
      params = [name, email, hash, role, req.params.id];
    } else {
      query = 'UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4 RETURNING id, name, email, role';
      params = [name, email, role, req.params.id];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Change role
router.patch('/users/:id/role', verifyToken, async (req, res) => {
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

// Delete user
router.delete('/users/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
`);

console.log('Users route fixed!');

// Also check authMiddleware for requireRole
const auth = fs.readFileSync('src/middlewares/authMiddleware.js', 'utf8');
console.log('Auth middleware preview:', auth.substring(0, 300));
