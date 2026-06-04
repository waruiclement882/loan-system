const fs = require('fs');

let c = fs.readFileSync('src/controllers/paymentController.js', 'utf8');

c = c.replace(
  '`INSERT INTO payments (loan_id, amount, transaction_code, source, payment_date)',
  '`INSERT INTO payments (loan_id, amount, transaction_code, source, notes, payment_date)'
);

c = c.replace(
  'VALUES ($1, $2, $3, $4, NOW())`',
  'VALUES ($1, $2, $3, $4, $5, NOW())`'
);

// Find the params array for manual payment and add notes
c = c.replace(
  '[loan_id, amount, txCode, source || \'cash\']',
  '[loan_id, amount, txCode, source || \'cash\', notes || null]'
);

fs.writeFileSync('src/controllers/paymentController.js', c, 'utf8');

// Verify
const updated = fs.readFileSync('src/controllers/paymentController.js', 'utf8');
console.log('Notes in INSERT:', updated.includes('notes, payment_date'));
console.log('$5 in VALUES:', updated.includes('$5, NOW()'));
console.log('Done!');
