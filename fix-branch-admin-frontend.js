const fs = require('fs');

// Fix dashboard to treat branch_admin like admin but filtered to branch
let dashboard = fs.readFileSync('loan-frontend/app/dashboard/page.tsx', 'utf8');

// branch_admin should see admin features
dashboard = dashboard.replace(
  `const isAdmin = ["admin", "cashier"].includes(userRole);`,
  `const isAdmin = ["admin", "cashier", "branch_admin"].includes(userRole);
  const isBranchAdmin = userRole === "branch_admin";
  const isFullAdmin = userRole === "admin";`
);

fs.writeFileSync('loan-frontend/app/dashboard/page.tsx', dashboard, 'utf8');
console.log('✅ Dashboard updated!');

// Fix approvals page
let approvals = fs.readFileSync('loan-frontend/app/approvals/page.tsx', 'utf8');
approvals = approvals.replace(
  /\["admin", "cashier"\]\.includes\(user\.role\)/g,
  '["admin", "cashier", "branch_admin"].includes(user.role)'
);
fs.writeFileSync('loan-frontend/app/approvals/page.tsx', approvals, 'utf8');
console.log('✅ Approvals updated!');

// Fix reports page
let reports = fs.readFileSync('loan-frontend/app/reports/page.tsx', 'utf8');
reports = reports.replace(
  /\["admin", "cashier"\]\.includes\(userRole\)/g,
  '["admin", "cashier", "branch_admin"].includes(userRole)'
);
fs.writeFileSync('loan-frontend/app/reports/page.tsx', reports, 'utf8');
console.log('✅ Reports updated!');