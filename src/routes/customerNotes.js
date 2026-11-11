const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const pool = require('../db/pool');
const { verifyToken } = require('../middlewares/authMiddleware');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG or WEBP photos are allowed'));
  }
});

const uploadBuffer = (buffer, folder, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'image', transformation: [{ width: 1280, crop: 'limit', quality: 'auto' }] },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

// ── NOTES ─────────────────────────────────────────────────────────────────────
router.get('/:id/notes', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM customer_notes WHERE customer_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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

router.delete('/:id/notes/:noteId', verifyToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM customer_notes WHERE id = $1 AND customer_id = $2`,
      [req.params.noteId, req.params.id]
    );
    res.json({ message: 'Note deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── LOCATION: read ────────────────────────────────────────────────────────────
router.get('/:id/location', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, location, nearest_landmark, latitude, longitude,
              location_accuracy, location_updated_at, location_updated_by,
              premises_photo_url, premises_photo_updated_at, premises_photo_updated_by
       FROM customers WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── LOCATION: save (text + GPS pin + accuracy) ────────────────────────────────
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
       WHERE id = $8 RETURNING id, name, location, nearest_landmark, latitude, longitude,
                location_accuracy, location_updated_at, location_updated_by`,
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

// ── PREMISES PHOTO ────────────────────────────────────────────────────────────
router.post('/:id/premises-photo', verifyToken, (req, res) => {
  upload.single('photo')(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });
    try {
      if (!req.file) return res.status(400).json({ error: 'No photo received' });
      const officer_name = req.user?.name || 'Officer';

      const existing = await pool.query('SELECT premises_photo_public_id FROM customers WHERE id = $1', [req.params.id]);
      if (!existing.rows[0]) return res.status(404).json({ error: 'Customer not found' });

      const uploaded = await uploadBuffer(
        req.file.buffer,
        'loan-system-premises',
        `customer_${req.params.id}_${Date.now()}`
      );

      await pool.query(
        `UPDATE customers SET
           premises_photo_url = $1,
           premises_photo_public_id = $2,
           premises_photo_updated_at = NOW(),
           premises_photo_updated_by = $3
         WHERE id = $4`,
        [uploaded.secure_url, uploaded.public_id, officer_name, req.params.id]
      );

      // Best-effort cleanup of the previous photo
      const oldId = existing.rows[0].premises_photo_public_id;
      if (oldId) cloudinary.uploader.destroy(oldId).catch(() => {});

      await pool.query(
        `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user?.id, officer_name, 'UPLOAD_PREMISES_PHOTO', 'customers', req.params.id,
         JSON.stringify({ message: `Premises photo uploaded for customer #${req.params.id}` })]
      );

      res.json({ url: uploaded.secure_url, updated_by: officer_name, updated_at: new Date().toISOString() });
    } catch (err) {
      console.error('[PremisesPhoto]', err.message);
      res.status(500).json({ error: 'Photo upload failed: ' + err.message });
    }
  });
});

module.exports = router;
