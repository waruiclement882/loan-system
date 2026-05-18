const loanService = require('../services/loanService');

const getAllLoans = async (req, res) => {
  try {
    const loans = await loanService.getAllLoans();
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLoanById = async (req, res) => {
  try {
    const loan = await loanService.getLoanById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createLoan = async (req, res) => {
  try {
    const loan = await loanService.createLoan(req.body);
    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateLoanStatus = async (req, res) => {
  try {
    const loan = await loanService.updateLoanStatus(req.params.id, req.body.status);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
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

module.exports = { getAllLoans, getLoanById, createLoan, updateLoanStatus, deleteLoan };