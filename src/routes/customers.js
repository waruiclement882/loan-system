const express = require('express');

const router = express.Router();

const customerController = require(
  '../controllers/customerController'
);


// GET all customers
router.get(
  '/',
  customerController.getAllCustomers
);


// CREATE customer
router.post(
  '/',
  customerController.createCustomer
);


module.exports = router;