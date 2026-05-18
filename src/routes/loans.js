const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');

router.get('/', loanController.getAllLoans);
router.get('/:id', loanController.getLoanById);
router.post('/', loanController.createLoan);
router.patch('/:id/status', loanController.updateLoanStatus);
router.delete('/:id', loanController.deleteLoan);

module.exports = router;