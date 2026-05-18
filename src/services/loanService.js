const loanRepository = require('../repositories/loanRepository');

const createLoan = async (loanData) => {
  return await loanRepository.create(loanData);
};

const getAllLoans = async () => {
  return await loanRepository.getAll();
};

const getLoanById = async (id) => {
  return await loanRepository.getById(id);
};

const updateLoanStatus = async (id, status) => {
  return await loanRepository.updateStatus(id, status);
};

module.exports = { createLoan, getAllLoans, getLoanById, updateLoanStatus };