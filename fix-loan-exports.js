const fs = require('fs');

const file = 'src/controllers/loanController.js';
let content = fs.readFileSync(file, 'utf8');

const oldExport = `module.exports = { getAllLoans, getLoanById, createLoan, approveLoan, rejectLoan, disburseLoan, updateLoanStatus, deleteLoan, getPendingLoans, getLoanSchedule, getOverdueLoans, writeLoanOff };`;

const newExport = `module.exports = { getAllLoans, getLoanById, createLoan, approveLoan, rejectLoan, disburseLoan, updateLoanStatus, deleteLoan, getPendingLoans, getLoanSchedule, getOverdueLoans, writeLoanOff, assignBranch };`;

if (content.includes(oldExport)) {
  content = content.replace(oldExport, newExport);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ assignBranch added to exports');
} else {
  console.log('⚠️  Pattern not found. Current exports line:');
  const line = content.split('\n').find(l => l.includes('module.exports'));
  console.log(line);
}
