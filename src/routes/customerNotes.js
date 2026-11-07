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

// ── PATCH /api/customers/:id/location ─────────────────────────────────────────
// Saves area text, landmark and the GPS pin. When a pin is sent we also store
// how accurate it was (metres; null = pin placed manually on the map) and who
// set it and when.
router.patch('/:id/location', verifyToken, async (req, res) => {
  try {
    const { location, nearest_landmark, latitude, longitude, location_accuracy } = req.body;
    const officer_name = req.user?.name || 'Officer';

    const hasPin = latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null;

    if (hasPin) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }
    }

    const result = await pool.query(
      `UPDATE customers SET
        location = COALESCE($1, location),
        nearest_landmark = COALESCE($2, nearest_landmark),
        latitude = COALESCE($3::numeric, latitude),
        longitude = COALESCE($4::numeric, longitude),
        location_accuracy = CASE WHEN $5::boolean THEN $6::numeric ELSE location_accuracy END,
        location_updated_at = CASE WHEN $5::boolean THEN NOW() ELSE location_updated_at END,
        location_updated_by = CASE WHEN $5::boolean THEN $7::varchar ELSE location_updated_by END
       WHERE id = $8 RETURNING *`,
      [
        location ?? null,
        nearest_landmark ?? null,
        hasPin ? latitude : null,
        hasPin ? longitude : null,
        hasPin,
        location_accuracy ?? null,
        officer_name,
        req.params.id
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });

    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user?.id, officer_name, 'UPDATE_LOCATION', 'customers', req.params.id,
       JSON.stringify({
         message: `Location updated for customer #${req.params.id}`,
         pinned: hasPin,
         accuracy_m: location_accuracy ?? null
       })]
    );

    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
