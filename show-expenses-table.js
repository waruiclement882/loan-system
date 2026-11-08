const fs = require('fs');
const c = fs.readFileSync('loan-frontend/app/expenses/page.tsx', 'utf8');

const i = c.indexOf('expenses.map(');
console.log('expenses.map found at:', i);

if (i > -1) {
  // the table header sits shortly before the .map(, the row markup after it
  console.log('--- BEFORE (header) ---');
  console.log(c.substring(Math.max(0, i - 1200), i));
  console.log('--- AFTER (rows) ---');
  console.log(c.substring(i, i + 2200));
} else {
  console.log('Not found. Other .map calls on this page:');
  const re = /(\w+)\.map\(/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(c)) !== null) seen.add(m[1]);
  console.log([...seen].join(', '));
}