const fs = require('fs');
const filePath = 'loan-frontend/app/reports/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove duplicate state declarations - keep only first occurrence
const lines = content.split('\n');
const seen = new Set();
const fixed = lines.filter(line => {
  const match = line.match(/const \[(\w+),/);
  if (match) {
    if (seen.has(match[1])) {
      console.log('Removing duplicate:', match[1]);
      return false;
    }
    seen.add(match[1]);
  }
  return true;
});

fs.writeFileSync(filePath, fixed.join('\n'), 'utf8');
console.log('✅ Duplicates removed!');