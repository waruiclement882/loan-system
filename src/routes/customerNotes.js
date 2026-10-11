const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middlewares/authMiddleware');

// ── GET /api/customers/:id/notes ──────────────────────────────────────────────
router.get('/:id/notes', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM customer_notes WHERE customer_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/customers/:id/notes ─────────────────────────────────────────────
router.post('/:id/notes', verifyToken, async (req, res) => {
  try {
    const { category, note } = req.body;
    const officer_id = req.user?.id;
    const officer_name = req.user?.name || 'Officer';

    if (!category || !note) return res.status(400).json({ error: 'category and note are required' });

    const result = await pool.query(
      `INSERT INTO customer_notes (customer_id, officer_id, officer_name, category, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, officer_id, officer_name, category, note]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [officer_id, officer_name, 'ADD_NOTE', 'customers', req.params.id,
       JSON.stringify({ category, note: note.slice(0, 100) })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/customers/:id/notes/:noteId ───────────────────────────────────
router.delete('/:id/notes/:noteId', verifyToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM customer_notes WHERE id = $1 AND customer_id = $2`,
      [req.params.noteId, req.params.id]
    );
    res.json({ message: 'Note deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/customers/:id/location ────────────────────────────────────────
router.patch('/:id/location', verifyToken, async (req, res) => {
  try {
    const { location, latitude, longitude, nearest_landmark } = req.body;
    const result = await pool.query(
      `UPDATE customers SET
        location = COALESCE($1, location),
        latitude = COALESCE($2, latitude),
        longitude = COALESCE($3, longitude),
        nearest_landmark = COALESCE($4, nearest_landmark)
       WHERE id = $5 RETURNING *`,
      [location, latitude, longitude, nearest_landmark, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
