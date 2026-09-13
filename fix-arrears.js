const fs = require('fs');

// Add Arrears to sidebar
let sidebar = fs.readFileSync('loan-frontend/app/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  `{ label: "PAR", path: "/par", show: isAdmin, group: "Operations" },`,
  `{ label: "PAR", path: "/par", show: isAdmin, group: "Operations" },
    { label: "Loan Arrears", path: "/arrears", show: isAdmin, group: "Operations" },`
);
fs.writeFileSync('loan-frontend/app/components/Sidebar.tsx', sidebar, 'utf8');
console.log('✅ Arrears added to sidebar!');