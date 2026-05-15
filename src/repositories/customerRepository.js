const pool = require(
  '../db/connection'
);


// Get all customers
const getAll = async () => {

  const result =
    await pool.query(
      `
      SELECT *
      FROM customers
      ORDER BY customer_id DESC
      `
    );

  return result.rows;

};


// Create customer
const create = async (
  customerData
) => {

  const {
    full_name,
    phone,
    national_id
  } = customerData;


  const result =
    await pool.query(
      `
      INSERT INTO customers
      (
        full_name,
        phone,
        national_id
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [
        full_name,
        phone,
        national_id
      ]
    );

  return result.rows[0];

};


module.exports = {
  getAll,
  create
};