const express = require('express');

const paymentController =
  require('../controllers/paymentController');

const router = express.Router();


// Get all payments
router.get(
  '/',
  paymentController.getAllPayments
);


// Create payment
router.post(
  '/',
  paymentController.createPayment
);


module.exports = router;