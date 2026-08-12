const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, paymentController.getAllPayments);
router.post('/', verifyToken, paymentController.createPayment);
router.get('/unmatched', verifyToken, requireRole('admin', 'cashier', 'branch_admin'), paymentController.getUnmatched);
router.get('/income', verifyToken, requireRole('admin', 'cashier', 'branch_admin'), async (req, res) => {
  try {
    const result = await require('../db/pool').query(`
      SELECT ci.id, ci.loan_id, ci.amount, ci.type,
             ci.transaction_code, ci.notes, ci.created_at,
             c.name AS customer_name
      FROM company_income ci
      LEFT JOIN loans l ON ci.loan_id = l.id
      LEFT JOIN customers c ON l.customer_id = c.id
      ORDER BY ci.created_at DESC
    `);
    const total = result.rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    res.json({ income: result.rows, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/match', verifyToken, requireRole('admin', 'cashier', 'branch_admin'), (req, res) => paymentController.matchTransaction(req, res));
router.post('/manual', verifyToken, requireRole('admin', 'cashier', 'branch_admin'), (req, res) => paymentController.manualPayment(req, res));

module.exports = router;