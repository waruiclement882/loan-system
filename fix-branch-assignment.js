const fs = require('fs');

// Fix 1: authController - add branch_id to login response and token
let auth = fs.readFileSync('src/controllers/authController.js', 'utf8');
auth = auth.replace(
  `res.json({ user: { id: user.id, name: user.name, full_name: user.full_name, email: user.email, role: user.role }, token });`,
  `res.json({ user: { id: user.id, name: user.name, full_name: user.full_name, email: user.email, role: user.role, branch_id: user.branch_id }, token });`
);
// Fix JWT token to include branch_id
auth = auth.replace(
  `jwt.sign({ id: user.id, user_id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });`,
  `jwt.sign({ id: user.id, user_id: user.id, role: user.role, branch_id: user.branch_id }, process.env.JWT_SECRET, { expiresIn: '7d' });`
);
fs.writeFileSync('src/controllers/authController.js', auth, 'utf8');
console.log('✅ Auth controller fixed!');

// Fix 2: customerController - auto-assign branch
let customer = fs.readFileSync('src/controllers/customerController.js', 'utf8');
customer = customer.replace(
  `const { name, email, phone, national_id } = req.body;
    const result = await pool.query(
      'INSERT INTO customers (name, email, phone, national_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, email, phone, national_id]
    );`,
  `const { name, email, phone, national_id } = req.body;
    const branch_id = req.user?.branch_id || 1;
    const result = await pool.query(
      'INSERT INTO customers (name, email, phone, national_id, branch_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, email, phone, national_id, branch_id]
    );`
);
fs.writeFileSync('src/controllers/customerController.js', customer, 'utf8');
console.log('✅ Customer controller fixed!');

// Fix 3: loanController - auto-assign branch
let loan = fs.readFileSync('src/controllers/loanController.js', 'utf8');
loan = loan.replace(
  `const loan = await loanService.createLoan({ ...req.body, created_by });`,
  `const branch_id = req.user?.branch_id || 1;
    const loan = await loanService.createLoan({ ...req.body, created_by, branch_id });`
);
fs.writeFileSync('src/controllers/loanController.js', loan, 'utf8');
console.log('✅ Loan controller fixed!');

// Verify
const authFixed = fs.readFileSync('src/controllers/authController.js', 'utf8');
const customerFixed = fs.readFileSync('src/controllers/customerController.js', 'utf8');
const loanFixed = fs.readFileSync('src/controllers/loanController.js', 'utf8');
console.log('Auth has branch_id:', authFixed.includes('branch_id: user.branch_id'));
console.log('Customer has branch_id:', customerFixed.includes('branch_id]'));
console.log('Loan has branch_id:', loanFixed.includes('branch_id'));