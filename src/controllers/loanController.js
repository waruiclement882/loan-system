const loanService = require('../services/loanService');

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
