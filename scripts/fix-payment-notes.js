const fs = require('fs');

let c = fs.readFileSync('src/controllers/paymentController.js', 'utf8');

// Fix the INSERT query to include notes
c = c.replace(
  `'INSERT INTO payments (loan_id, amount, transaction_code, source, payment_date) VALUES ($1, $2, $3, $4, NOW())',
        [loan_id, amount, txCode, source || 'cash']`,
  `'INSERT INTO payments (loan_id, amount, transaction_code, source, notes, payment_date) VALUES ($1, $2, $3, $4, $5, NOW())',
        [loan_id, amount, txCode, source || 'cash', notes || null]`
);

fs.writeFileSync('src/controllers/paymentController.js', c, 'utf8');
console.log('Fixed!');

// Verify
const updated = fs.readFileSync('src/controllers/paymentController.js', 'utf8');
const hasNotes = updated.includes('notes, payment_date');
console.log('Notes column in query:', hasNotes);
