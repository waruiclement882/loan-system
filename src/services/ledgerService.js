// Ledger Service
// Handles financial ledger operations and accounting

class LedgerService {
  constructor() {
    this.transactions = [];
    this.accounts = {
      loansReceivable: { balance: 0, type: 'asset' },
      cash: { balance: 0, type: 'asset' },
      interestIncome: { balance: 0, type: 'income' },
      loanLossProvision: { balance: 0, type: 'expense' }
    };
  }

  // Record loan disbursement
  recordLoanDisbursement(loan) {
    try {
      const transaction = {
        id: this.generateTransactionId(),
        type: 'loan_disbursement',
        date: new Date(),
        amount: loan.principal,
        description: `Loan disbursement to ${loan.customerName}`,
        loanId: loan.id,
        customerId: loan.customerId,
        entries: [
          {
            account: 'loansReceivable',
            amount: loan.principal,
            type: 'debit'
          },
          {
            account: 'cash',
            amount: loan.principal,
            type: 'credit'
          }
        ]
      };

      this.transactions.push(transaction);
      this.updateAccountBalances(transaction.entries);

      return transaction;
    } catch (error) {
      throw new Error(`Failed to record loan disbursement: ${error.message}`);
    }
  }

  // Record payment received
  recordPayment(payment) {
    try {
      const transaction = {
        id: this.generateTransactionId(),
        type: 'payment_received',
        date: new Date(),
        amount: payment.amount,
        description: `Payment received from ${payment.customerName}`,
        paymentId: payment.id,
        loanId: payment.loanId,
        customerId: payment.customerId,
        entries: [
          {
            account: 'cash',
            amount: payment.amount,
            type: 'debit'
          },
          {
            account: 'loansReceivable',
            amount: payment.amount,
            type: 'credit'
          }
        ]
      };

      this.transactions.push(transaction);
      this.updateAccountBalances(transaction.entries);

      return transaction;
    } catch (error) {
      throw new Error(`Failed to record payment: ${error.message}`);
    }
  }

  // Record interest accrual
  recordInterestAccrual(loanId, interestAmount, customerId) {
    try {
      const transaction = {
        id: this.generateTransactionId(),
        type: 'interest_accrual',
        date: new Date(),
        amount: interestAmount,
        description: 'Interest accrued on loan',
        loanId,
        customerId,
        entries: [
          {
            account: 'loansReceivable',
            amount: interestAmount,
            type: 'debit'
          },
          {
            account: 'interestIncome',
            amount: interestAmount,
            type: 'credit'
          }
        ]
      };

      this.transactions.push(transaction);
      this.updateAccountBalances(transaction.entries);

      return transaction;
    } catch (error) {
      throw new Error(`Failed to record interest accrual: ${error.message}`);
    }
  }

  // Record loan write-off
  recordLoanWriteOff(loan) {
    try {
      const transaction = {
        id: this.generateTransactionId(),
        type: 'loan_write_off',
        date: new Date(),
        amount: loan.outstandingAmount,
        description: `Loan write-off for ${loan.customerName}`,
        loanId: loan.id,
        customerId: loan.customerId,
        entries: [
          {
            account: 'loanLossProvision',
            amount: loan.outstandingAmount,
            type: 'debit'
          },
          {
            account: 'loansReceivable',
            amount: loan.outstandingAmount,
            type: 'credit'
          }
        ]
      };

      this.transactions.push(transaction);
      this.updateAccountBalances(transaction.entries);

      return transaction;
    } catch (error) {
      throw new Error(`Failed to record loan write-off: ${error.message}`);
    }
  }

  // Update account balances
  updateAccountBalances(entries) {
    entries.forEach(entry => {
      if (this.accounts[entry.account]) {
        if (entry.type === 'debit') {
          this.accounts[entry.account].balance += entry.amount;
        } else if (entry.type === 'credit') {
          this.accounts[entry.account].balance -= entry.amount;
        }
      }
    });
  }

  // Get account balance
  getAccountBalance(accountName) {
    return this.accounts[accountName]?.balance || 0;
  }

  // Get all account balances
  getAllAccountBalances() {
    return { ...this.accounts };
  }

  // Get transactions by date range
  getTransactionsByDateRange(startDate, endDate) {
    return this.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }

  // Get transactions by loan ID
  getTransactionsByLoanId(loanId) {
    return this.transactions.filter(transaction => transaction.loanId === loanId);
  }

  // Generate unique transaction ID
  generateTransactionId() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get ledger summary
  getLedgerSummary() {
    const totalAssets = this.accounts.loansReceivable.balance + this.accounts.cash.balance;
    const totalIncome = this.accounts.interestIncome.balance;
    const totalExpenses = this.accounts.loanLossProvision.balance;
    const netIncome = totalIncome - totalExpenses;

    return {
      totalAssets,
      totalIncome,
      totalExpenses,
      netIncome,
      accounts: this.getAllAccountBalances()
    };
  }
}

module.exports = new LedgerService();