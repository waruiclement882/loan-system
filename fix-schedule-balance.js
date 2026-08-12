const fs = require('fs');
let content = fs.readFileSync('src/repositories/loanRepository.js', 'utf8');

// Fix the VALUES array - remove runningBalance parameter
content = content.replace(
  `[loan.id, i, due.toISOString().split('T')[0], amt, runningBalance]`,
  `[loan.id, i, due.toISOString().split('T')[0], amt]`
);

fs.writeFileSync('src/repositories/loanRepository.js', content, 'utf8');
console.log('✅ Fixed VALUES array!');
console.log('Verified:', !content.includes(', runningBalance]'));