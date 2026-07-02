const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const pool = require('../db/connection');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage — upload buffer directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, or PDF files allowed'));
    }
  }
});

// Helper — upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder, publicId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// ── GET /api/kyc/:customerId — get KYC status for a customer ─────────────────
router.get('/:customerId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customer_documents WHERE customer_id = $1',
      [req.params.customerId]
    );
    res.json(result.rows[0] || { customer_id: req.params.customerId, kyc_verified: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/kyc/:customerId/upload — upload National ID or passport photo ──
router.post('/:customerId/upload', verifyToken, upload.single('document'), async (req, res) => {
  try {
    const { customerId } = req.params;
    const { doc_type } = req.body; // 'national_id' or 'passport_photo'

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!['national_id', 'passport_photo'].includes(doc_type)) {
      return res.status(400).json({ error: 'doc_type must be national_id or passport_photo' });
    }

    // Upload to Cloudinary
    const publicId = `kyc/${customerId}/${doc_type}_${Date.now()}`;
    const result = await uploadToCloudinary(req.file.buffer, 'loan-system-kyc', publicId);

    // Check if record exists
    const existing = await pool.query(
      'SELECT id FROM customer_documents WHERE customer_id = $1',
      [customerId]
    );

    if (existing.rows.length > 0) {
      // Update existing record
      await pool.query(
        `UPDATE customer_documents
         SET ${doc_type}_url = $1, ${doc_type}_public_id = $2,
             kyc_verified = FALSE, verified_by = NULL, verified_at = NULL,
             updated_at = NOW()
         WHERE customer_id = $3`,
        [result.secure_url, result.public_id, customerId]
      );
    } else {
      // Insert new record
      await pool.query(
        `INSERT INTO customer_documents
           (customer_id, ${doc_type}_url, ${doc_type}_public_id, kyc_verified)
         VALUES ($1, $2, $3, FALSE)`,
        [customerId, result.secure_url, result.public_id]
      );
    }

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        req.user?.id, req.user?.name || 'Officer',
        'UPLOAD_DOCUMENT', 'customers', customerId,
        JSON.stringify({ message: `Uploaded ${doc_type} for customer #${customerId}`, doc_type, url: result.secure_url })
      ]
    );

    res.json({
      message: `${doc_type} uploaded successfully`,
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (err) {
    console.error('[KYC Upload]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/kyc/:customerId/verify — admin verifies KYC ───────────────────
router.patch('/:customerId/verify', verifyToken, requireRole('admin', 'cashier'), async (req, res) => {
  try {
    const { customerId } = req.params;
    const verified_by = req.user?.id;

    // Check national ID is uploaded (required)
    const docs = await pool.query(
      'SELECT * FROM customer_documents WHERE customer_id = $1',
      [customerId]
    );

    if (!docs.rows[0] || !docs.rows[0].national_id_url) {
      return res.status(400).json({ error: 'National ID must be uploaded before verification' });
    }

    await pool.query(
      `UPDATE customer_documents
       SET kyc_verified = TRUE, verified_by = $1, verified_at = NOW()
       WHERE customer_id = $2`,
      [verified_by, customerId]
    );

    // Update customer KYC status
    await pool.query(
      'UPDATE customers SET kyc_verified = TRUE WHERE id = $1',
      [customerId]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        verified_by, req.user?.name || 'Admin',
        'VERIFY_KYC', 'customers', customerId,
        JSON.stringify({ message: `KYC verified for customer #${customerId}` })
      ]
    );

    res.json({ message: 'KYC verified successfully', customer_id: customerId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/kyc/:customerId/reject — admin rejects KYC ────────────────────
router.patch('/:customerId/reject', verifyToken, requireRole('admin', 'cashier'), async (req, res) => {
  try {
    const { customerId } = req.params;
    const { reason } = req.body;

    await pool.query(
      `UPDATE customer_documents
       SET kyc_verified = FALSE, verified_by = NULL, verified_at = NULL,
           rejection_reason = $1
       WHERE customer_id = $2`,
      [reason || 'Documents rejected', customerId]
    );

    await pool.query(
      'UPDATE customers SET kyc_verified = FALSE WHERE id = $1',
      [customerId]
    );

    res.json({ message: 'KYC rejected', customer_id: customerId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
