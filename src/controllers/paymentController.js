// Payment Controller
// Handles payment-related operations

const paymentService = require('../services/paymentService');

class PaymentController {
  // Get all payments
  async getAllPayments(req, res) {
    try {
      const payments = await paymentService.getAllPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get payment by ID
  async getPaymentById(req, res) {
    try {
      const { id } = req.params;
      const payment = await paymentService.getPaymentById(id);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Create new payment
  async createPayment(req, res) {
    try {
      const paymentData = req.body;
      const newPayment = await paymentService.createPayment(paymentData);
      res.status(201).json(newPayment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Update payment
  async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedPayment = await paymentService.updatePayment(id, updateData);
      if (!updatedPayment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      res.json(updatedPayment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Delete payment
  async deletePayment(req, res) {
    try {
      const { id } = req.params;
      const deleted = await paymentService.deletePayment(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get payments by loan ID
  async getPaymentsByLoanId(req, res) {
    try {
      const { loanId } = req.params;
      const payments = await paymentService.getPaymentsByLoanId(loanId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Process M-Pesa payment
  async processMpesaPayment(req, res) {
    try {
      const paymentData = req.body;
      const result = await paymentService.processMpesaPayment(paymentData);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Get payment summary for loan
  async getPaymentSummary(req, res) {
    try {
      const { loanId } = req.params;
      const summary = await paymentService.getPaymentSummary(loanId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PaymentController();