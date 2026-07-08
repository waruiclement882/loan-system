const fs = require('fs');
let content = fs.readFileSync('src/controllers/paymentController.js', 'utf8');

// Remove the payment record insert for processing fees
content = content.replace(
  `        );
        // Insert payment record
        await client.query(
          \`INSERT INTO payments (loan_id, amount, transaction_code, source, notes, payment_date)
           VALUES ($1, $2, $3, $4, $5, NOW())\`,
          [loan_id, amount, txCode, source || 'cash', notes || null]
        );
      } else {`,
  `        );
        // Processing fee goes to company_income ONLY — no payment record
      } else {`
);

fs.writeFileSync('src/controllers/paymentController.js', content, 'utf8');
console.log('✅ Processing fee bug fixed!');
console.log('Verified - no double insert:', !content.includes("// Insert payment record\n        await client.query(\n          `INSERT INTO payments (loan_id, amount, transaction_code, source, notes, payment_date)\n           VALUES ($1, $2, $3, $4, $5, NOW())`,\n          [loan_id, amount, txCode, source || 'cash', notes || null]\n        );\n      } else {"));