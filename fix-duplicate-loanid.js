const fs = require('fs');
const filePath = 'loan-frontend/app/expenses/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'body: JSON.stringify({ loan_id: loanId, ...recoveryForm })',
  'body: JSON.stringify({ loan_id: loanId, amount: recoveryForm.amount, transaction_code: recoveryForm.transaction_code, notes: recoveryForm.notes })'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed duplicate loan_id!');