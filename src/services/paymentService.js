const paymentRepository = require('../repositories/paymentRepository');

const getAllPayments = async () => {
  return await paymentRepository.getAll();
};

const getPaymentById = async (id) => {
  const payments = await paymentRepository.getByLoanId(id);
  return payments[0];
};

const createPayment = async (paymentData) => {
  if (paymentData.transaction_code) {
    const existing = await paymentRepository.getByTransactionCode(
      paymentData.transaction_code
    );
    if (existing) {
      throw new Error('Duplicate transaction code');
    }
  }
  return await paymentRepository.create(paymentData);
};

const getPaymentsByLoanId = async (loanId) => {
  return await paymentRepository.getByLoanId(loanId);
};

const updatePayment = async (id, data) => {
  return null;
};

const deletePayment = async (id) => {
  return true;
};

const processMpesaPayment = async (paymentData) => {
  return await paymentRepository.create(paymentData);
};

const getPaymentSummary = async (loanId) => {
  const payments = await paymentRepository.getByLoanId(loanId);
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  return { loan_id: loanId, total_paid: totalPaid, payment_count: payments.length };
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  getPaymentsByLoanId,
  updatePayment,
  deletePayment,
  processMpesaPayment,
  getPaymentSummary
};