const fs = require('fs');
const f = 'loan-frontend/app/components/Sidebar.tsx';
let c = fs.readFileSync(f, 'utf8');
const line = '{ label: "Loan Arrears", path: "/arrears", show: isAdmin, group: "Operations" },';
if (c.includes('/expense-approvals')) console.log('Already added');
else if (!c.includes(line)) console.log('❌ Anchor line not found - tell me and I will adjust');
else {
  c = c.replace(line, line + '\n    { label: "Expense Approvals", path: "/expense-approvals", show: isAdmin, group: "Operations" },');
  fs.writeFileSync(f, c, 'utf8');
  console.log('✅ Sidebar link added');
}