const fs = require('fs');

fs.writeFileSync('src/routes/loans.js', `const express = require('express');
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

module.exports = router;
`);

fs.writeFileSync('src/controllers/loanController.js', `const loanService = require('../services/loanService');

const getAllLoans = async (req, res) => {
  try {
    const { status } = req.query;
    const loans = await loanService.getAllLoans(status);
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLoanById = async (req, res) => {
  try {
    const loan = await loanService.getLoanById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createLoan = async (req, res) => {
  try {
    const loan = await loanService.createLoan({ ...req.body, created_by: req.user?.user_id || req.user?.id });
    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const approveLoan = async (req, res) => {
  try {
    const loan = await loanService.approveLoan(req.params.id, req.user?.user_id || req.user?.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found or not pending' });
    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const rejectLoan = async (req, res) => {
  try {
    const { reason } = req.body;
    const loan = await loanService.rejectLoan(req.params.id, req.user?.user_id || req.user?.id, reason);
    if (!loan) return res.status(404).json({ error: 'Loan not found or not pending' });
    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const disburseLoan = async (req, res) => {
  try {
    const loan = await loanService.disburseLoan(req.params.id, req.user?.user_id || req.user?.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found or not approved' });
    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateLoanStatus = async (req, res) => {
  try {
    const loan = await loanService.updateLoanStatus(req.params.id, req.body.status);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteLoan = async (req, res) => {
  try {
    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllLoans, getLoanById, createLoan, approveLoan, rejectLoan, disburseLoan, updateLoanStatus, deleteLoan };
`);

fs.writeFileSync('src/services/loanService.js', `const loanRepository = require('../repositories/loanRepository');

const createLoan = async (loanData) => await loanRepository.create(loanData);
const getAllLoans = async (status) => await loanRepository.getAll(status);
const getLoanById = async (id) => await loanRepository.getById(id);
const approveLoan = async (id, approved_by) => await loanRepository.approve(id, approved_by);
const rejectLoan = async (id, rejected_by, reason) => await loanRepository.reject(id, rejected_by, reason);
const disburseLoan = async (id, disbursed_by) => await loanRepository.disburse(id, disbursed_by);
const updateLoanStatus = async (id, status) => await loanRepository.updateStatus(id, status);

module.exports = { createLoan, getAllLoans, getLoanById, approveLoan, rejectLoan, disburseLoan, updateLoanStatus };
`);

fs.writeFileSync('src/repositories/loanRepository.js', `const pool = require('../db/connection');

const create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, created_by } = loan;
  const r = await pool.query(
    'INSERT INTO loans (customer_id,amount,term_weeks,interest_amount,total_amount,balance,status,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [customer_id, amount, term_weeks, interest_amount, total_amount, total_amount, 'pending', created_by || null]
  );
  return r.rows[0];
};

const getAll = async (status) => {
  let q = 'SELECT loans.*,customers.name as customer_name FROM loans LEFT JOIN customers ON loans.customer_id=customers.id';
  const p = [];
  if (status) { q += ' WHERE loans.status=$1'; p.push(status); }
  q += ' ORDER BY loans.id DESC';
  return (await pool.query(q, p)).rows;
};

const getById = async (id) => {
  const r = await pool.query(
    'SELECT loans.*,customers.name as customer_name FROM loans LEFT JOIN customers ON loans.customer_id=customers.id WHERE loans.id=$1',
    [id]
  );
  return r.rows[0];
};

const approve = async (id, approved_by) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1,approved_by=$2,approved_at=NOW() WHERE id=$3 AND status=$4 RETURNING *',
    ['approved', approved_by, id, 'pending']
  );
  return r.rows[0];
};

const reject = async (id, rejected_by, reason) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1,approved_by=$2,approved_at=NOW(),rejection_reason=$3 WHERE id=$4 AND status=$5 RETURNING *',
    ['rejected', rejected_by, reason, id, 'pending']
  );
  return r.rows[0];
};

const disburse = async (id, disbursed_by) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1,disbursed_by=$2,disbursed_at=NOW() WHERE id=$3 AND status=$4 RETURNING *',
    ['active', disbursed_by, id, 'approved']
  );
  return r.rows[0];
};

const updateStatus = async (id, status) => {
  const r = await pool.query('UPDATE loans SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
  return r.rows[0];
};

module.exports = { create, getAll, getById, approve, reject, disburse, updateStatus };
`);

console.log('All backend files written!');
