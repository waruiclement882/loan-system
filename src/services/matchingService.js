// Matching Service
// Handles matching payments to loans and reconciling transactions

class MatchingService {
  constructor() {
    this.matchedTransactions = [];
    this.unmatchedPayments = [];
  }

  // Match payment to loan
  async matchPaymentToLoan(payment, loans) {
    try {
      // Find the loan that matches the payment
      const matchedLoan = loans.find(loan =>
        loan.customerId === payment.customerId &&
        loan.amount === payment.amount &&
        !loan.isFullyPaid
      );

      if (matchedLoan) {
        // Update loan status
        matchedLoan.paidAmount = (matchedLoan.paidAmount || 0) + payment.amount;
        matchedLoan.isFullyPaid = matchedLoan.paidAmount >= matchedLoan.totalAmount;

        // Record the match
        const match = {
          paymentId: payment.id,
          loanId: matchedLoan.id,
          amount: payment.amount,
          matchedAt: new Date(),
          status: 'matched'
        };

        this.matchedTransactions.push(match);
        return match;
      }

      // If no match found, add to unmatched payments
      this.unmatchedPayments.push(payment);
      return null;
    } catch (error) {
      throw new Error(`Matching failed: ${error.message}`);
    }
  }

  // Auto-match payments to loans
  async autoMatchPayments(payments, loans) {
    try {
      const results = [];

      for (const payment of payments) {
        const match = await this.matchPaymentToLoan(payment, loans);
        if (match) {
          results.push(match);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Auto-matching failed: ${error.message}`);
    }
  }

  // Manual match payment to specific loan
  async manualMatch(paymentId, loanId, loans, payments) {
    try {
      const payment = payments.find(p => p.id === paymentId);
      const loan = loans.find(l => l.id === loanId);

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (!loan) {
        throw new Error('Loan not found');
      }

      // Update loan
      loan.paidAmount = (loan.paidAmount || 0) + payment.amount;
      loan.isFullyPaid = loan.paidAmount >= loan.totalAmount;

      // Record the match
      const match = {
        paymentId: payment.id,
        loanId: loan.id,
        amount: payment.amount,
        matchedAt: new Date(),
        status: 'manually_matched'
      };

      this.matchedTransactions.push(match);
      return match;
    } catch (error) {
      throw new Error(`Manual matching failed: ${error.message}`);
    }
  }

  // Get matching statistics
  getMatchingStats() {
    const totalPayments = this.matchedTransactions.length + this.unmatchedPayments.length;
    const matchedCount = this.matchedTransactions.length;
    const unmatchedCount = this.unmatchedPayments.length;
    const matchRate = totalPayments > 0 ? (matchedCount / totalPayments) * 100 : 0;

    return {
      totalPayments,
      matchedCount,
      unmatchedCount,
      matchRate: Math.round(matchRate * 100) / 100
    };
  }

  // Get unmatched payments
  getUnmatchedPayments() {
    return this.unmatchedPayments;
  }

  // Get matched transactions
  getMatchedTransactions() {
    return this.matchedTransactions;
  }

  // Clear unmatched payments (after manual processing)
  clearUnmatchedPayments() {
    this.unmatchedPayments = [];
  }
}

module.exports = new MatchingService();