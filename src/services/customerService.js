const customerRepository = require(
  '../repositories/customerRepository'
);


// Get all customers
const getAllCustomers = async () => {

  return await customerRepository.getAll();

};


// Create customer
const createCustomer = async (
  customerData
) => {

  return await customerRepository.create(
    customerData
  );

};


module.exports = {
  getAllCustomers,
  createCustomer
};