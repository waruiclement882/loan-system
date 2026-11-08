const fs = require('fs');

const patch = (file, label, regex, replacer) => {
  let c = fs.readFileSync(file, 'utf8');
  let n = 0;
  c = c.replace(regex, (...args) => { n++; return replacer(...args); });
  fs.writeFileSync(file, c, 'utf8');
  console.log(`${n > 0 ? '✅' : '❌'} ${label}: ${n} change(s)`);
};

patch('src/routes/expenses.js', 'List total counts approved only',
  /const total = result\.rows\.reduce\(\(s, r\) => s \+ parseFloat\(r\.amount \|\| 0\), 0\);/,
  () => "const total = result.rows.filter(r => r.status === 'approved').reduce((s, r) => s + parseFloat(r.amount || 0), 0);");

patch('src/routes/expenses.js', 'P&L categories approved only',
  /FROM expenses\s+WHERE EXTRACT\(MONTH FROM expense_date\) = \$1\s+AND EXTRACT\(YEAR FROM expense_date\) = \$2/,
  (m) => m + " AND status = 'approved'");

patch('src/routes/expenses.js', 'P&L bad debt approved only',
  /FROM expenses\s+WHERE category = 'Bad Debt'\s+AND EXTRACT\(MONTH FROM expense_date\) = \$1\s+AND EXTRACT\(YEAR FROM expense_date\) = \$2/,
  (m) => m + " AND status = 'approved'");

patch('src/routes/branches.js', 'Branch expenses approved only',
  /WHERE e\.branch_id = b\.id\)/,
  () => "WHERE e.branch_id = b.id AND e.status = 'approved')");

patch('src/repositories/loanRepository.js', 'Write-offs recorded as approved',
  /\(category, description, amount, payment_method, expense_date, recorded_by\)(\s+)VALUES \('Bad Debt', \$1, \$2, 'write_off', CURRENT_DATE, \$3\)/,
  (m, ws) => `(category, description, amount, payment_method, expense_date, recorded_by, status)${ws}VALUES ('Bad Debt', $1, $2, 'write_off', CURRENT_DATE, $3, 'approved')`);

patch('src/routes/expenses.js', 'New expenses record branch (columns)',
  /\(category, description, amount, payment_method, reference, expense_date, recorded_by\)(\s+)VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)/,
  (m, ws) => `(category, description, amount, payment_method, reference, expense_date, recorded_by, branch_id)${ws}VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`);

patch('src/routes/expenses.js', 'New expenses record branch (value)',
  /expense_date \|\| new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\], recorded_by\]/,
  () => "expense_date || new Date().toISOString().split('T')[0], recorded_by, req.user?.branch_id || 1]");