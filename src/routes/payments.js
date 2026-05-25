const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, paymentController.getAllPayments);
router.post('/', verifyToken, paymentController.createPayment);
router.get('/unmatched', verifyToken, requireRole('admin', 'cashier'), paymentController.getUnmatched);
router.post('/match', verifyToken, requireRole('admin', 'cashier'), paymentController.matchTransaction);
router.post('/manual', verifyToken, requireRole('admin', 'cashier'), paymentController.manualPayment);

module.exports = router;