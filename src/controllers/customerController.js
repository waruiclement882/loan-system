const customerService = require(
  '../services/customerService'
);


// Get all customers
const getAllCustomers = async (
  req,
  res
) => {

  try {

    const customers =
      await customerService.getAllCustomers();

    res.json(customers);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};


// Create customer
const createCustomer = async (
  req,
  res
) => {

  try {

    const customer =
      await customerService.createCustomer(
        req.body
      );

    res.status(201).json(customer);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};


module.exports = {
  getAllCustomers,
  createCustomer
};