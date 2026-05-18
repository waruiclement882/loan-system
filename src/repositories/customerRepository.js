const pool = require('../db/connection');

const getAll = async () => {
  const result = await pool.query(
    `SELECT * FROM customers ORDER BY id DESC`
  );
  return result.rows;
};

const create = async (customerData) => {
  const { name, phone, national_id, email } = customerData;

  const result = await pool.query(
    `INSERT INTO customers (name, phone, national_id, email)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, phone, national_id, email]
  );

  return result.rows[0];
};

module.exports = { getAll, create };