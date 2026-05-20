const fs = require('fs');
const path = require('path');

function write(relPath, content) {
  const full = path.join(__dirname, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Written:', relPath);
}

write('src/middlewares/authMiddleware.js', const jwt = require('jsonwebtoken');
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token required' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};
module.exports = { verifyToken, requireRole };);

write('src/controllers/authController.js', const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const register = async (req, res) => {
  try {
    const { name, full_name, email, password, role } = req.body;
    const displayName = full_name || name;
    const userRole = role || 'loan_officer';
    const userExists = await pool.query('SELECT * FROM users WHERE email = \', [email]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, full_name, email, password, role) VALUES (\, \, \, \, \) RETURNING id, name, full_name, email, role, created_at',
      [displayName, displayName, email, hashedPassword, userRole]
    );
    const token = jwt.sign({ id: result.rows[0].id, user_id: result.rows[0].id, role: result.rows[0].role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: result.rows[0], token });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = \', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });
    const validPassword = await bcrypt.compare(password, result.rows[0].password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, user_id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, full_name: user.full_name, email: user.email, role: user.role }, token });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
const getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, full_name, email, role, created_at FROM users ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
};
module.exports = { register, login, getUsers };);

write('src/routes/auth.js', const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const router = express.Router();
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/users', verifyToken, requireRole('admin'), authController.getUsers);
module.exports = router;);

write('src/routes/loans.js', const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
router.use(verifyToken);
router.get('/', loanController.getAllLoans);
router.get('/pending', loanController.getPendingLoans);
router.get('/:id', loanController.getLoanById);
router.post('/', loanController.createLoan);
router.patch('/:id/approve', requireRole('admin', 'cashier'), loanController.approveLoan);
router.patch('/:id/reject', requireRole('admin', 'cashier'), loanController.rejectLoan);
router.patch('/:id/disburse', requireRole('admin', 'cashier'), loanController.disburseLoan);
router.patch('/:id/status', loanController.updateLoanStatus);
router.delete('/:id', requireRole('admin'), loanController.deleteLoan);
module.exports = router;);

write('src/controllers/loanController.js', const loanService = require('../services/loanService');
const pool = require('../db/pool');
const getAllLoans = async (req, res) => {
  try {
    const { status } = req.query;
    const loans = await loanService.getAllLoans(status);
    res.json(loans);
  } catch (error) { res.status(500).json({ error: error.message }); }
};
const getLoanById = async (req, res) => {
  try {
    const loan = await loanService.getLoanById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) { res.status(500).json({ error: error.message }); }
};
const createLoan = async (req, res) => {
  try {
    const created_by = req.user?.id || req.user?.user_id;
    const loan = await loanService.createLoan({ ...req.body, created_by });
    res.status(201).json(loan);
  } catch (error) { res.status(400).json({ error: error.message }); }
};
const approveLoan = async (req, res) => {
  try {
    const approved_by = req.user?.id || req.user?.user_id;
    const loan = await loanService.approveLoan(req.params.id, approved_by);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) { res.status(400).json({ error: error.message }); }
};
const rejectLoan = async (req, res) => {
  try {
    const { reason } = req.body;
    const rejected_by = req.user?.id || req.user?.user_id;
    const loan = await loanService.rejectLoan(req.params.id, rejected_by, reason);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) { res.status(400).json({ error: error.message }); }
};
const disburseLoan = async (req, res) => {
  try {
    const disbursed_by = req.user?.id || req.user?.user_id;
    const loan = await loanService.disburseLoan(req.params.id, disbursed_by);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) { res.status(400).json({ error: error.message }); }
};
const updateLoanStatus = async (req, res) => {
  try {
    const loan = await loanService.updateLoanStatus(req.params.id, req.body.status);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) { res.status(400).json({ error: error.message }); }
};
const deleteLoan = async (req, res) => {
  try {
    await pool.query('DELETE FROM loans WHERE id = \', [req.params.id]);
    res.json({ message: 'Loan deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
const getPendingLoans = async (req, res) => {
  try {
    const loans = await loanService.getAllLoans('pending');
    res.json(loans);
  } catch (error) { res.status(500).json({ error: error.message }); }
};
module.exports = { getAllLoans, getLoanById, createLoan, approveLoan, rejectLoan, disburseLoan, updateLoanStatus, deleteLoan, getPendingLoans };);

write('src/services/loanService.js', const loanRepository = require('../repositories/loanRepository');
const createLoan = async (loanData) => await loanRepository.create(loanData);
const getAllLoans = async (status) => await loanRepository.getAll(status);
const getLoanById = async (id) => await loanRepository.getById(id);
const approveLoan = async (id, approved_by) => await loanRepository.approve(id, approved_by);
const rejectLoan = async (id, rejected_by, reason) => await loanRepository.reject(id, rejected_by, reason);
const disburseLoan = async (id, disbursed_by) => await loanRepository.disburse(id, disbursed_by);
const updateLoanStatus = async (id, status) => await loanRepository.updateStatus(id, status);
module.exports = { createLoan, getAllLoans, getLoanById, approveLoan, rejectLoan, disburseLoan, updateLoanStatus };);
write('src/repositories/loanRepository.js', `const pool = require('../db/connection');
const create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, created_by } = loan;
  const r = await pool.query('INSERT INTO loans (customer_id,amount,term_weeks,interest_amount,total_amount,balance,status,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[customer_id,amount,term_weeks,interest_amount,total_amount,total_amount,'pending',created_by||null]);
  return r.rows[0];
};
const getAll = async (status) => {
  let q = 'SELECT loans.*,customers.name as customer_name,u1.name as created_by_name,u2.name as approved_by_name FROM loans LEFT JOIN customers ON loans.customer_id=customers.id LEFT JOIN users u1 ON loans.created_by=u1.id LEFT JOIN users u2 ON loans.approved_by=u2.id';
  const p=[];
  if(status){q+=' WHERE loans.status=$1';p.push(status);}
  q+=' ORDER BY loans.id DESC';
  return (await pool.query(q,p)).rows;
};
const getById = async (id) => (await pool.query('SELECT loans.*,customers.name as customer_name FROM loans LEFT JOIN customers ON loans.customer_id=customers.id WHERE loans.id=$1',[id])).rows[0];
const approve = async (id,ab) => (await pool.query('UPDATE loans SET status=$1,approved_by=$2,approved_at=NOW() WHERE id=$3 AND status=$4 RETURNING *',['approved',ab,id,'pending'])).rows[0];
const reject = async (id,rb,reason) => (await pool.query('UPDATE loans SET status=$1,approved_by=$2,approved_at=NOW(),rejection_reason=$3 WHERE id=$4 AND status=$5 RETURNING *',['rejected',rb,reason,id,'pending'])).rows[0];
const disburse = async (id,db) => (await pool.query('UPDATE loans SET status=$1,disbursed_by=$2,disbursed_at=NOW() WHERE id=$3 AND status=$4 RETURNING *',['active',db,id,'approved'])).rows[0];
const updateStatus = async (id,status) => (await pool.query('UPDATE loans SET status=$1 WHERE id=$2 RETURNING *',[status,id])).rows[0];
module.exports={create,getAll,getById,approve,reject,disburse,updateStatus};`);

console.log('All backend files ready!');