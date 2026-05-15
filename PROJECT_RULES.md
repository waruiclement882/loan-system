# MICROFINANCE SYSTEM RULES

## PAYMENT RULES

1. Every M-Pesa payment must first be saved as RAW.

2. Duplicate transaction codes are forbidden.

3. Matching order:

- Loan reference
- Borrower phone number
- Active borrower account

4. If no match:

Status = UNMATCHED

Do not update any loan.

5. Matched payments must:

- Create payment record
- Update loan balance
- Create ledger entry

6. Transactions can never be deleted.

7. Reversals:

- Require reason
- Preserve original transaction
- Create opposite ledger entry

8. Every action must be audited.

9. Reconciliation must run daily.

10. Loan balances must never be edited manually.