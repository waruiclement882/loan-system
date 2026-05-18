const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, customerController.getAllCustomers);
router.post('/', verifyToken, customerController.createCustomer);

module.exports = router;