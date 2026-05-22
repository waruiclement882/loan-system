const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, loanController.getAllLoans);
router.get('/:id', verifyToken, loanController.getLoanById);
router.post('/', verifyToken, loanController.createLoan);
router.patch('/:id/approve', verifyToken, loanController.approveLoan);
router.patch('/:id/reject', verifyToken, loanController.rejectLoan);
router.patch('/:id/disburse', verifyToken, loanController.disburseLoan);
router.patch('/:id/status', verifyToken, loanController.updateLoanStatus);
router.delete('/:id', verifyToken, loanController.deleteLoan);

// Mark processing fee as paid
router.patch('/:id/processing-fee-paid', verifyToken, async (req, res) => {
  try {
    const loanService = require('../services/loanService');
    const loan = await loanService.markProcessingFeePaid(req.params.id, req.body.transaction_code);
    res.json(loan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET repayment schedule for a loan
router.get('/:id/schedule', verifyToken, loanController.getLoanSchedule);

module.exports = router;