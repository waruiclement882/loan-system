const fs = require('fs');
const files = [
  'src/repositories/loanRepository.js',
  'src/routes/reports.js'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const count = (content.match(/installment_no/g) || []).length;
  content = content.split('installment_no').join('week_number');
  fs.writeFileSync(f, content, 'utf8');
  console.log(`✅ Fixed ${f} — ${count} occurrence(s)`);
});