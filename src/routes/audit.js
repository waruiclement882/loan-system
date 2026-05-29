const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT audit_logs.*, COALESCE(audit_logs.user_name, users.name, 'System') as user_name
      FROM audit_logs
      LEFT JOIN users ON audit_logs.user_id = users.id
      ORDER BY audit_logs.created_at DESC
      LIMIT 500
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;