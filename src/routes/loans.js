const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.get('/', loanController.getAllLoans);
router.get('/pending', loanController.getPendingLoans);
router.get('/:id/schedule', loanController.getLoanSchedule);
router.get('/:id', loanController.getLoanById);
router.post('/', loanController.createLoan);
router.patch('/:id/approve', requireRole('admin', 'cashier', 'branch_admin'), loanController.approveLoan);
router.patch('/:id/reject', requireRole('admin', 'cashier', 'branch_admin'), loanController.rejectLoan);
router.patch('/:id/disburse', requireRole('admin', 'cashier', 'branch_admin'), loanController.disburseLoan);
router.patch('/:id/status', loanController.updateLoanStatus);
router.delete('/:id', requireRole('admin', 'branch_admin'), loanController.deleteLoan);
router.patch('/:id/write-off', verifyToken, requireRole('admin', 'branch_admin'), loanController.writeLoanOff);
// Assign loan to branch
router.patch('/:id/branch', verifyToken, requireRole('admin', 'branch_admin'), (req, res) => loanController.assignBranch(req, res));
module.exports = router;