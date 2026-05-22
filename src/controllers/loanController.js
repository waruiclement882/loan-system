const loanService = require('../services/loanService');
const pool = require('../db/pool');
const smsService = require('../services/smsService');

const getCustomerPhone = async (customerId) => {
  const r = await pool.query('SELECT phone FROM customers WHERE id = $1', [customerId]);
  return r.rows[0]?.phone || null;
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
    const loan = await loanService.createLoan({ ...req.body, created_by });
    res.status(201).json(loan);
  } catch (error) { res.status(400).json({ error: error.message }); }
};

const approveLoan = async (req, res) => {
  try {
    const approved_by = req.user?.id || req.user?.user_id;
    const loan = await loanService.approveLoan(req.params.id, approved_by);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);

    const phone = await getCustomerPhone(loan.customer_id);
    if (phone) {
      smsService.sendLoanApprovedSms(phone, loan.id, loan.amount, loan.processing_fee)
        .catch(e => console.error('[SMS] Approve error:', e.message));
    }
  } catch (error) { res.status(400).json({ error: error.message }); }
};

const rejectLoan = async (req, res) => {
  try {
    const { reason } = req.body;
    const rejected_by = req.user?.id || req.user?.user_id;
    const loan = await loanService.rejectLoan(req.params.id, rejected_by, reason);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);

    const phone = await getCustomerPhone(loan.customer_id);
    if (phone) {
      smsService.sendLoanRejectedSms(phone, loan.id, reason)
        .catch(e => console.error('[SMS] Reject error:', e.message));
    }
  } catch (error) { res.status(400).json({ error: error.message }); }
};

const disburseLoan = async (req, res) => {
  try {
    const disbursed_by = req.user?.id || req.user?.user_id;
    const loan = await loanService.disburseLoan(req.params.id, disbursed_by);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);

    const scheduleService = require('../services/scheduleService');
    scheduleService.generateSchedule(loan.id)
      .catch(e => console.error('[Schedule] Generate error:', e.message));

    const phone = await getCustomerPhone(loan.customer_id);
    if (phone) {
      smsService.sendLoanDisbursedSms(phone, loan.id, loan.amount, loan.total_amount)
        .catch(e => console.error('[SMS] Disburse error:', e.message));
    }
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
    const scheduleService = require('../services/scheduleService');
    const schedule = await scheduleService.getSchedule(req.params.id);
    res.json(schedule);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { getLoanSchedule, getAllLoans, getLoanById, createLoan, approveLoan, rejectLoan, disburseLoan, updateLoanStatus, deleteLoan, getPendingLoans };