const paymentRepository = require(
  '../repositories/paymentRepository'
);


// Get all payments
const getAllPayments = async () => {

  return await paymentRepository.getAll();

};


// Create payment
const createPayment = async (
  paymentData
) => {

  return await paymentRepository.create(
    paymentData
  );

};


module.exports = {
  getAllPayments,
  createPayment
};