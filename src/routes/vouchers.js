const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPG, PNG or PDF files allowed'), ok);
  }
});

const isManager = (u) => ['admin', 'branch_admin'].includes(u.role);
const canActOn = (u, e) => u.role === 'admin' || (u.role === 'branch_admin' && e.branch_id === u.branch_id);

const audit = async (u, action, id, details) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [u.id || u.user_id, u.name || 'User', action, 'expenses', id, details]
    );
  } catch (e) { console.error('[Audit]', e.message); }
};

// Expenses waiting for approval
router.get('/pending', verifyToken, requireRole('admin', 'branch_admin'), async (req, res) => {
  try {
    const params = [];
    let where = "e.status = 'pending'";
    if (req.user.role === 'branch_admin') {
      params.push(req.user.branch_id);
      where += ` AND e.branch_id = $${params.length}`;
    }
    const r = await pool.query(
      `SELECT e.*, u.name AS recorded_by_name FROM expenses e
       LEFT JOIN users u ON e.recorded_by = u.id
       WHERE ${where} ORDER BY e.created_at DESC`, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Optional details: who was paid, and why there is no receipt
router.patch('/:id/details', verifyToken, async (req, res) => {
  try {
    const { paid_to, no_receipt_reason } = req.body;
    const found = await pool.query('SELECT * FROM expenses WHERE id = $1', [req.params.id]);
    const e = found.rows[0];
    if (!e) return res.status(404).json({ error: 'Expense not found' });
    if (e.status !== 'pending') return res.status(400).json({ error: 'Approved expenses cannot be edited' });
    const uid = req.user.id || req.user.user_id;
    if (!canActOn(req.user, e) && e.recorded_by !== uid) return res.status(403).json({ error: 'Not allowed' });
    const r = await pool.query(
      `UPDATE expenses SET paid_to = COALESCE($1, paid_to),
         no_receipt_reason = COALESCE($2, no_receipt_reason)
       WHERE id = $3 RETURNING *`,
      [paid_to || null, no_receipt_reason || null, e.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Optional receipt upload
router.post('/:id/receipt', verifyToken, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const found = await pool.query('SELECT * FROM expenses WHERE id = $1', [req.params.id]);
    const e = found.rows[0];
    if (!e) return res.status(404).json({ error: 'Expense not found' });
    const uid = req.user.id || req.user.user_id;
    if (!canActOn(req.user, e) && e.recorded_by !== uid) return res.status(403).json({ error: 'Not allowed' });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'loan-system-expenses', resource_type: 'auto' },
        (err, r) => (err ? reject(err) : resolve(r))
      );
      stream.end(req.file.buffer);
    });
    await pool.query('UPDATE expenses SET receipt_url = $1, receipt_public_id = $2 WHERE id = $3',
      [result.secure_url, result.public_id, e.id]);
    await audit(req.user, 'ATTACH_RECEIPT', e.id, `Receipt attached to expense #${e.id}`);
    res.json({ message: 'Receipt attached', url: result.secure_url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve - this is what issues the voucher number
router.patch('/:id/approve', verifyToken, requireRole('admin', 'branch_admin'), async (req, res) => {
  try {
    const found = await pool.query('SELECT * FROM expenses WHERE id = $1', [req.params.id]);
    const e = found.rows[0];
    if (!e) return res.status(404).json({ error: 'Expense not found' });
    if (e.status !== 'pending') return res.status(400).json({ error: `Expense is already ${e.status}` });
    if (!canActOn(req.user, e)) return res.status(403).json({ error: 'This expense belongs to another branch' });
    const uid = req.user.id || req.user.user_id;
    if (e.recorded_by === uid && req.user.real_role !== 'super_admin') {
      return res.status(403).json({ error: 'You cannot approve an expense you recorded yourself' });
    }
    const r = await pool.query(
      `UPDATE expenses SET status = 'approved', approved_by = $1, approved_at = NOW(),
         voucher_no = COALESCE(voucher_no,
           'PV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('voucher_seq')::text, 4, '0'))
       WHERE id = $2 RETURNING *`, [uid, e.id]);
    await audit(req.user, 'APPROVE_EXPENSE', e.id,
      `Approved expense #${e.id} (KSh ${e.amount}) - voucher ${r.rows[0].voucher_no}`);
    res.json({ message: 'Expense approved', voucher_no: r.rows[0].voucher_no, expense: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reject
router.patch('/:id/reject', verifyToken, requireRole('admin', 'branch_admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'A reason is required' });
    const found = await pool.query('SELECT * FROM expenses WHERE id = $1', [req.params.id]);
    const e = found.rows[0];
    if (!e) return res.status(404).json({ error: 'Expense not found' });
    if (e.status !== 'pending') return res.status(400).json({ error: `Expense is already ${e.status}` });
    if (!canActOn(req.user, e)) return res.status(403).json({ error: 'This expense belongs to another branch' });
    await pool.query(`UPDATE expenses SET status = 'rejected', rejection_reason = $1 WHERE id = $2`, [reason, e.id]);
    await audit(req.user, 'REJECT_EXPENSE', e.id, `Rejected expense #${e.id}: ${reason}`);
    res.json({ message: 'Expense rejected' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Voucher data (keep this route last so /pending is not read as an id)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT e.*, ru.name AS recorded_by_name, au.name AS approved_by_name
       FROM expenses e
       LEFT JOIN users ru ON e.recorded_by = ru.id
       LEFT JOIN users au ON e.approved_by = au.id
       WHERE e.id = $1`, [req.params.id]);
    const e = r.rows[0];
    if (!e) return res.status(404).json({ error: 'Expense not found' });
    if (!req.user.all_branches && e.branch_id !== req.user.branch_id) return res.status(403).json({ error: 'This voucher belongs to another branch' });
    if (e.status !== 'approved') return res.status(400).json({ error: 'A voucher is only issued once the expense is approved' });

    if (!e.voucher_no) {
      await pool.query(
        `UPDATE expenses SET voucher_no = 'PV-' || TO_CHAR(COALESCE(expense_date, NOW()), 'YYYY') || '-' ||
           LPAD(nextval('voucher_seq')::text, 4, '0')
         WHERE id = $1 AND voucher_no IS NULL`, [e.id]);
      const v = await pool.query('SELECT voucher_no FROM expenses WHERE id = $1', [e.id]);
      e.voucher_no = v.rows[0].voucher_no;
    }

    const co = await pool.query('SELECT company_name, tagline, phone, email, address FROM company_settings LIMIT 1');
    res.json({ voucher: e, company: co.rows[0] || {} });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;