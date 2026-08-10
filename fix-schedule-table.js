const fs = require('fs');
const files = [
  'src/repositories/loanRepository.js',
  'src/routes/reports.js'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const count = (content.match(/repayment_schedules/g) || []).length;
  content = content.split('repayment_schedules').join('repayment_schedule');
  fs.writeFileSync(f, content, 'utf8');
  console.log(`✅ Fixed ${f} — ${count} occurrence(s)`);
});