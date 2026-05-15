const pool = require('../db/connection');

// Get all loans
const getAllLoans = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM loans');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get loan by ID
const getLoanById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM loans WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new loan
const createLoan = async (req, res) => {
  try {
    const { user_id, principal, rate, time } = req.body;

    const amount = Number(principal);
    const interestRate = Number(rate);
    const durationWeeks = Number(time);

    const interest = amount * interestRate * durationWeeks;
    const total = amount + interest;

    const result = await pool.query(
      'INSERT INTO loans (user_id, principal, rate, time, interest, total) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, amount, interestRate, durationWeeks, interest, total]
    );

    res.status(201).json({ message: 'Loan created', loan: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update loan
const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const { principal, rate, time } = req.body;

    const amount = Number(principal);
    const interestRate = Number(rate);
    const durationWeeks = Number(time);

    const interest = amount * interestRate * durationWeeks;
    const total = amount + interest;

    const result = await pool.query(
      'UPDATE loans SET principal=$1, rate=$2, time=$3, interest=$4, total=$5 WHERE id=$6 RETURNING *',
      [amount, interestRate, durationWeeks, interest, total, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json({ message: 'Loan updated', loan: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete loan
const deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM loans WHERE id=$1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllLoans, getLoanById, createLoan, updateLoan, deleteLoan };