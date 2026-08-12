const fs = require('fs');

// Fix loans routes to allow branch_admin
let loans = fs.readFileSync('src/routes/loans.js', 'utf8');
loans = loans.replace(
  /requireRole\('admin'\)/g,
  "requireRole('admin', 'branch_admin')"
);
loans = loans.replace(
  /requireRole\('admin', 'cashier'\)/g,
  "requireRole('admin', 'cashier', 'branch_admin')"
);
fs.writeFileSync('src/routes/loans.js', loans, 'utf8');
console.log('✅ Loans routes updated!');

// Fix payments routes
let payments = fs.readFileSync('src/routes/payments.js', 'utf8');
payments = payments.replace(
  /requireRole\('admin', 'cashier'\)/g,
  "requireRole('admin', 'cashier', 'branch_admin')"
);
fs.writeFileSync('src/routes/payments.js', payments, 'utf8');
console.log('✅ Payments routes updated!');

// Fix settings routes
let settings = fs.readFileSync('src/routes/settings.js', 'utf8');
settings = settings.replace(
  /requireRole\('admin'\)/g,
  "requireRole('admin', 'branch_admin')"
);
fs.writeFileSync('src/routes/settings.js', settings, 'utf8');
console.log('✅ Settings routes updated!');

// Fix audit routes  
let audit = fs.readFileSync('src/routes/audit.js', 'utf8');
audit = audit.replace(
  /requireRole\('admin'\)/g,
  "requireRole('admin', 'branch_admin')"
);
fs.writeFileSync('src/routes/audit.js', audit, 'utf8');
console.log('✅ Audit routes updated!');