const loanService = require('../services/loanService');
const pool = require('../db/pool');
const smsService = require('../services/smsService');
const scheduleService = require('../services/scheduleService');

const audit = async (userId, userName, action, entity, entityId, details) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId, userName, action, entity, entityId, JSON.stringify({ message: details })]
    );
  } catch (e) { console.error('[Audit]', e.message); }
};

const getCustomerPhone = async (customerId) => {
  const r = await pool.query('SELECT phone FROM customers WHERE id = $1', [customerId]);
  return r.rows[0]?.phone || null;
};

const getUserName = async (userId) => {
  const r = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
  return r.rows[0]?.name || 'Unknown';
};

const getAllLoans = async (req, res) => {
  try {
    const { status } = req.query;
    const loans = await loanService.getAllLoans(status);
    res.json(loans);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getLoanById = async (req, res) => {
  try {
    const loan = await loanService.getLoanById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const createLoan = async (req, res) => {
  try {
    const created_by = req.user?.id || req.user?.user_id;
    const { customer_id, amount } = req.body;

    const settingsResult = await pool.query('SELECT * FROM company_settings LIMIT 1');
    const settings = settingsResult.rows[0];

    if (settings) {
      const activeLoanCount = await pool.query(
        `SELECT COUNT(*) FROM loans WHERE customer_id = $1 AND status IN ('pending','approved','active')`,
        [customer_id]
      );
      const activeCount = parseInt(activeLoanCount.rows[0].count);
      if (activeCount >= settings.max_loans_per_customer) {
        return res.status(400).json({
          error: `Customer already has ${activeCount} active loan(s). Maximum allowed is ${settings.max_loans_per_customer}.`
        });
      }
      if (parseFloat(amount) > parseFloat(settings.max_loan_amount)) {
        return res.status(400).json({
          error: `Loan amount KSh ${parseFloat(amount).toLocaleString()} exceeds maximum allowed KSh ${parseFloat(settings.max_loan_amount).toLocaleString()}.`
        });
      }
    }

    const loan = await loanService.createLoan({ ...req.body, created_by });
    res.status(201).json(loan);
    const userName = await getUserName(created_by);
    audit(created_by, userName, 'CREATE_LOAN', 'loans', loan.id, `Loan of KSh ${loan.amount} for customer ${loan.customer_id}`);
  } catch (error) { res.status(400).json({ error: error.message }); }
};

const approveLoan = async (req, res) => {
  try {
    const approved_by = req.user?.id || req.user?.user_id;
    const loan = await loanService.approveLoan(req.params.id, approved_by);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
    const userName = await getUserName(approved_by);
    audit(approved_by, userName, 'APPROVE_LOAN', 'loans', loan.id, `Loan #${loan.id} approved`);
    const phone = await getCustomerPhone(loan.customer_id);
    if (phone) smsService.sendLoanApprovedSms(phone, loan.id, loan.amount, loan.processing_fee).catch(e => console.error('[SMS]', e.message));
  } catch (error) { res.status(400).json({ error: error.message }); }
};

const rejectLoan = async (req, res) => {
  try {
    const { reason } = req.body;
    const rejected_by = req.user?.id || req.user?.user_id;
    const loan = await loanService.rejectLoan(req.params.id, rejected_by, reason);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
    const userName = await getUserName(rejected_by);
    audit(rejected_by, userName, 'REJECT_LOAN', 'loans', loan.id, `Loan #${loan.id} rejected. Reason: ${reason}`);
    const phone = await getCustomerPhone(loan.customer_id);
    if (phone) smsService.sendLoanRejectedSms(phone, loan.id, reason).catch(e => console.error('[SMS]', e.message));
  } catch (error) { res.status(400).json({ error: error.message }); }
};

const disburseLoan = async (req, res) => {
  try {
    const disbursed_by = req.user?.id || req.user?.user_id;
    const loan = await loanService.disburseLoan(req.params.id, disbursed_by);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
    // Generate schedule immediately
    try {
      await scheduleService.generateSchedule(loan.id);
      console.log(`[Schedule] Generated for loan ${loan.id}`);
    } catch (e) {
      console.error('[Schedule] Generate error:', e.message);
    }
    const userName = await getUserName(disbursed_by);
    audit(disbursed_by, userName, 'DISBURSE_LOAN', 'loans', loan.id, `Loan #${loan.id} KSh ${loan.amount} disbursed`);
    const phone = await getCustomerPhone(loan.customer_id);
    if (phone) smsService.sendLoanDisbursedSms(phone, loan.id, loan.amount, loan.total_amount).catch(e => console.error('[SMS]', e.message));
  } catch (error) { res.status(400).json({ error: error.message }); }
};

const updateLoanStatus = async (req, res) => {
  try {
    const loan = await loanService.updateLoanStatus(req.params.id, req.body.status);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) { res.status(400).json({ error: error.message }); }
};

const deleteLoan = async (req, res) => {
  try {
    await pool.query('DELETE FROM loans WHERE id = $1', [req.params.id]);
    res.json({ message: 'Loan deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getPendingLoans = async (req, res) => {
  try {
    const loans = await loanService.getAllLoans('pending');
    res.json(loans);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getLoanSchedule = async (req, res) => {
  try {
    const schedule = await scheduleService.getSchedule(req.params.id);
    res.json(schedule);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getOverdueLoans = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT loans.*, customers.name as customer_name, customers.phone as customer_phone,
        u1.name as created_by_name
      FROM loans
      JOIN repayment_schedules ON repayment_schedules.loan_id = loans.id
      LEFT JOIN customers ON loans.customer_id = customers.id
      LEFT JOIN users u1 ON loans.created_by = u1.id
      WHERE repayment_schedules.status = 'overdue'
      AND loans.status = 'active'
      ORDER BY loans.id
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllLoans, getLoanById, createLoan, approveLoan, rejectLoan, disburseLoan, updateLoanStatus, deleteLoan, getPendingLoans, getLoanSchedule, getOverdueLoans };