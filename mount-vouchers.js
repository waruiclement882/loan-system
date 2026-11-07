const fs = require('fs');
let c = fs.readFileSync('src/app.js', 'utf8');
if (!c.includes("require('./routes/vouchers')")) {
  c = c.replace("const expensesRoutes = require('./routes/expenses');",
    "const expensesRoutes = require('./routes/expenses');\nconst vouchersRoutes = require('./routes/vouchers');");
  c = c.replace("app.use('/api/expenses', expensesRoutes);",
    "app.use('/api/expenses', expensesRoutes);\napp.use('/api/vouchers', vouchersRoutes);");
  fs.writeFileSync('src/app.js', c, 'utf8');
}
console.log('Required:', c.includes("require('./routes/vouchers')"));
console.log('Mounted:', c.includes("app.use('/api/vouchers'"));