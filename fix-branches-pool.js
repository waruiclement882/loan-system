const fs = require('fs');

// Fix branches.js pool import
let branches = fs.readFileSync('src/routes/branches.js', 'utf8');
branches = branches.replace("require('../db/pool')", "require('../db/connection')");
fs.writeFileSync('src/routes/branches.js', branches, 'utf8');
console.log('Branches pool fixed!');

// Also fix kyc.js if needed
let kyc = fs.readFileSync('src/routes/kyc.js', 'utf8');
if (kyc.includes("require('../db/pool')")) {
  kyc = kyc.replace("require('../db/pool')", "require('../db/connection')");
  fs.writeFileSync('src/routes/kyc.js', kyc, 'utf8');
  console.log('KYC pool fixed!');
}

// Find the loan missing branch_id and check which one
console.log('Done! Now check which loan is missing branch_id...');
