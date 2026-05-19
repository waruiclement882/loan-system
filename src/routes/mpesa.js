const express = require('express');
const router = express.Router();
const kcbController = require('../controllers/kcbController');

// KCB Paybill webhook - receives payment notifications from KCB
router.post('/kcb/callback', kcbController.handlePayment);

// Get loan balance
router.get('/kcb/balance/:loan_id', kcbController.getLoanBalance);

module.exports = router;