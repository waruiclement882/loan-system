const pool = require('../db/connection');


// Find staff by email
const getByEmail = async (email) => {

  const result = await pool.query(`
    SELECT *
    FROM staff_users
    WHERE email = $1
  `, [email]);

  return result.rows[0];
};


// Create staff user
const create = async (user) => {

  const {
    full_name,
    email,
    password_hash,
    role
  } = user;


  const result = await pool.query(`
    INSERT INTO staff_users (
      full_name,
      email,
      password_hash,
      role
    )
    VALUES ($1,$2,$3,$4)
    RETURNING *
  `, [
    full_name,
    email,
    password_hash,
    role
  ]);

  return result.rows[0];
};


module.exports = {
  getByEmail,
  create
};