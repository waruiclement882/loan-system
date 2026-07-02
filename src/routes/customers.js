const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken } = require('../middlewares/authMiddleware');
const multer = require('multer');
const pool = require('../db/pool');
const path = require('path');
const fs = require('fs');

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/kyc');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `kyc_${req.params.id}_${file.fieldname}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG, PNG and PDF files allowed'));
  }
});

// Ensure KYC table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS customer_kyc (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255),
    original_name VARCHAR(255),
    file_path TEXT,
    status VARCHAR(20) DEFAULT 'uploaded',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(e => console.error('[KYC] Table error:', e.message));

router.get('/', verifyToken, customerController.getAllCustomers);
router.post('/', verifyToken, customerController.createCustomer);
router.get('/:id', verifyToken, customerController.getCustomerById);
router.put('/:id', verifyToken, customerController.updateCustomer);
router.delete('/:id', verifyToken, customerController.deleteCustomer);
router.get('/:id/profile', verifyToken, customerController.getCustomerProfile);

// Upload KYC document
router.post('/:id/kyc', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { doc_type } = req.body;
    const customer_id = req.params.id;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!doc_type) return res.status(400).json({ error: 'doc_type required' });

    // Delete old doc of same type
    await pool.query(
      'DELETE FROM customer_kyc WHERE customer_id=$1 AND doc_type=$2',
      [customer_id, doc_type]
    );

    const result = await pool.query(
      `INSERT INTO customer_kyc (customer_id, doc_type, filename, original_name, file_path)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [customer_id, doc_type, req.file.filename, req.file.originalname, req.file.path]
    );
    res.json({ message: 'Document uploaded successfully', doc: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get KYC documents for customer
router.get('/:id/kyc', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customer_kyc WHERE customer_id=$1 ORDER BY uploaded_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve KYC file
router.get('/:id/kyc/:filename', verifyToken, (req, res) => {
  const filePath = path.join(__dirname, '../../uploads/kyc', req.params.filename);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).json({ error: 'File not found' });
});

// Delete KYC document
router.delete('/:id/kyc/:docId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM customer_kyc WHERE id=$1 AND customer_id=$2 RETURNING *',
      [req.params.docId, req.params.id]
    );
    if (result.rows.length > 0 && result.rows[0].file_path) {
      if (fs.existsSync(result.rows[0].file_path)) {
        fs.unlinkSync(result.rows[0].file_path);
      }
    }
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;