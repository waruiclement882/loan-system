// M-Pesa Controller
// Handles M-Pesa integration operations

const mpesaService = require('../services/mpesaService');

class MpesaController {
  // Initiate STK Push
  async initiateStkPush(req, res) {
    try {
      const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

      if (!phoneNumber || !amount) {
        return res.status(400).json({ error: 'Phone number and amount are required' });
      }

      const result = await mpesaService.initiateStkPush({
        phoneNumber,
        amount,
        accountReference,
        transactionDesc
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Handle M-Pesa callback
  async handleCallback(req, res) {
    try {
      const callbackData = req.body;
      const result = await mpesaService.handleCallback(callbackData);
      res.json({ message: 'Callback processed successfully', result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Query STK Push status
  async queryStkPushStatus(req, res) {
    try {
      const { checkoutRequestId } = req.params;

      if (!checkoutRequestId) {
        return res.status(400).json({ error: 'Checkout request ID is required' });
      }

      const result = await mpesaService.queryStkPushStatus(checkoutRequestId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get transaction status
  async getTransactionStatus(req, res) {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        return res.status(400).json({ error: 'Transaction ID is required' });
      }

      const result = await mpesaService.getTransactionStatus(transactionId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get access token
  async getAccessToken(req, res) {
    try {
      const token = await mpesaService.getAccessToken();
      res.json({ access_token: token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Register C2B URLs
  async registerC2bUrls(req, res) {
    try {
      const result = await mpesaService.registerC2bUrls();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Handle C2B payment
  async handleC2bPayment(req, res) {
    try {
      const paymentData = req.body;
      const result = await mpesaService.handleC2bPayment(paymentData);
      res.json({ message: 'C2B payment processed successfully', result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get M-Pesa configuration
  async getMpesaConfig(req, res) {
    try {
      const config = await mpesaService.getMpesaConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new MpesaController();