const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;