const express = require('express');
const router = express.Router();
const suspenseController = require('../controllers/suspenseController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/pending', verifyToken, requireRole('admin', 'cashier'), suspenseController.getPending);
router.post('/pending/:id/approve', verifyToken, requireRole('admin', 'cashier'), suspenseController.approve);
router.get('/balances', verifyToken, requireRole('admin', 'cashier'), suspenseController.getBalances);
router.get('/history/:customerId', verifyToken, requireRole('admin', 'cashier'), suspenseController.getHistory);
router.post('/apply', verifyToken, requireRole('admin', 'cashier'), suspenseController.apply);

module.exports = router;
