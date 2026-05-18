const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, loanController.getAllLoans);
router.get('/:id', verifyToken, loanController.getLoanById);
router.post('/', verifyToken, loanController.createLoan);
router.patch('/:id/status', verifyToken, loanController.updateLoanStatus);
router.delete('/:id', verifyToken, loanController.deleteLoan);

module.exports = router;