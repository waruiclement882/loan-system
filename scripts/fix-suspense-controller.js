const fs = require('fs');

const file = 'src/controllers/suspenseController.js';
let content = fs.readFileSync(file, 'utf8');

const broken = `      if (!['processing_fee', 'installment', 'refund'].includes(use_case)) {
        return res.status(400).json({ error: 'use_case must be processing_fee, installment, or refund' });
      }
        customer_id, amount, use_case, loan_id, recorded_by, notes
      });`;

const fixed = `      if (!['processing_fee', 'installment', 'refund'].includes(use_case)) {
        return res.status(400).json({ error: 'use_case must be processing_fee, installment, or refund' });
      }

      const result = await suspenseService.applySuspense({
        customer_id, amount, use_case, loan_id, recorded_by, notes
      });`;

if (content.includes(broken)) {
  content = content.replace(broken, fixed);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Fixed suspenseController.js');
} else {
  console.log('⚠️  Pattern not found — showing apply method:');
  const lines = content.split('\n');
  const start = lines.findIndex(l => l.includes('async apply'));
  console.log(lines.slice(start, start + 20).join('\n'));
}
