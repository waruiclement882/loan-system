const suspenseService = require('../services/suspenseService');

class SuspenseController {
  async getPending(req, res) {
    try {
      const rows = await suspenseService.getPendingOverpayments();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async approve(req, res) {
    try {
      const { id } = req.params;
      const reviewed_by = req.user?.id || req.user?.user_id;
      const result = await suspenseService.approveToSuspense(id, reviewed_by);
      res.json({ message: 'Overpayment approved and moved to suspense', data: result });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getBalances(req, res) {
    try {
      const rows = await suspenseService.getCustomerSuspenseBalances();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getHistory(req, res) {
    try {
      const { customerId } = req.params;
      const rows = await suspenseService.getSuspenseHistory(customerId);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async apply(req, res) {
    try {
      const { customer_id, amount, use_case, loan_id, notes } = req.body;
      const recorded_by = req.user?.id || req.user?.user_id;

      if (!customer_id || !amount || !use_case) {
        return res.status(400).json({ error: 'customer_id, amount and use_case are required' });
      }
      if (!['processing_fee', 'installment', 'refund'].includes(use_case)) {
        return res.status(400).json({ error: 'use_case must be processing_fee, installment, or refund' });
      }

      const result = await suspenseService.applySuspense({
        customer_id, amount, use_case, loan_id, recorded_by, notes
      });
      

     
      res.json({ message: 'Suspense applied successfully', data: result });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }


module.exports = new SuspenseController();
