const fs = require('fs');
const files = {};
const load = (f) => {
  if (!files[f]) {
    const raw = fs.readFileSync(f, 'utf8');
    files[f] = { crlf: raw.includes('\r\n'), text: raw.replace(/\r\n/g, '\n') };
  }
  return files[f];
};
let ok = true;
const edit = (f, label, find, repl, want = 1) => {
  const o = load(f);
  if (find instanceof RegExp) {
    const re = new RegExp(find.source, 'g');
    const n = (o.text.match(re) || []).length;
    if (n !== want) { console.log(`❌ ${label}: found ${n}, expected ${want}`); ok = false; return; }
    o.text = o.text.replace(re, repl);
  } else {
    const n = o.text.split(find).length - 1;
    if (n !== want) { console.log(`❌ ${label}: found ${n}, expected ${want}`); ok = false; return; }
    o.text = o.text.split(find).join(repl);
  }
  console.log(`✅ ${label}`);
};

// ---- Who can see all branches ----
edit('src/middlewares/authMiddleware.js', 'All-branch flag (admin, CFO)',
  "\n    next();\n  } catch (error) {",
  "\n    req.user.all_branches = ['admin', 'cfo'].includes(req.user.role);\n    next();\n  } catch (error) {");

// ---- Browser sees a super admin as 'admin' ----
edit('src/controllers/authController.js', 'Login response: super admin shown as admin',
  'role: user.role, branch_id: user.branch_id },',
  "role: user.role === 'super_admin' ? 'admin' : user.role, real_role: user.role, branch_id: user.branch_id },");

// ---- Loans: cashier and CFO disburse, nobody but admins approves ----
edit('src/routes/loans.js', 'Loans: approve (no cashier)',
  "router.patch('/:id/approve', requireRole('admin', 'cashier', 'branch_admin'), loanController.approveLoan);",
  "router.patch('/:id/approve', requireRole('admin', 'branch_admin'), loanController.approveLoan);");
edit('src/routes/loans.js', 'Loans: reject (no cashier)',
  "router.patch('/:id/reject', requireRole('admin', 'cashier', 'branch_admin'), loanController.rejectLoan);",
  "router.patch('/:id/reject', requireRole('admin', 'branch_admin'), loanController.rejectLoan);");
edit('src/routes/loans.js', 'Loans: disburse (cashier + CFO)',
  "router.patch('/:id/disburse', requireRole('admin', 'cashier', 'branch_admin'), loanController.disburseLoan);",
  "router.patch('/:id/disburse', requireRole('admin', 'cashier', 'branch_admin', 'cfo'), loanController.disburseLoan);");

// ---- CFO reads finance ----
edit('src/routes/payments.js', 'Income report: CFO',
  "router.get('/income', verifyToken, requireRole('admin', 'cashier', 'branch_admin'), async (req, res) => {",
  "router.get('/income', verifyToken, requireRole('admin', 'cashier', 'branch_admin', 'cfo'), async (req, res) => {");
edit('src/routes/expenses.js', 'P&L: admin and CFO',
  "router.get('/pnl', verifyToken, requireRole('admin'), async (req, res) => {",
  "router.get('/pnl', verifyToken, requireRole('admin', 'cfo'), async (req, res) => {");
edit('src/routes/expenses.js', 'Expense list: all-branch roles',
  "req.user.role === 'admin' ? (req.query.branch_id || null)",
  "req.user.all_branches ? (req.query.branch_id || null)");

// ---- Audit trail: CFO, all branches ----
edit('src/routes/audit.js', 'Audit: CFO allowed',
  "const guard = [verifyToken, requireRole('admin', 'branch_admin')];",
  "const guard = [verifyToken, requireRole('admin', 'branch_admin', 'cfo')];");
edit('src/routes/audit.js', 'Audit: all-branch roles',
  "if (req.user.role !== 'admin') {",
  "if (!req.user.all_branches) {");

// ---- Cash count and drawings ----
edit('src/routes/cash.js', 'Cash: all-branch roles',
  "req.user.role === 'admin'",
  "req.user.all_branches");
edit('src/routes/cash.js', 'Cash: super admin check',
  "const r2 = (n) => Math.round(n * 100) / 100;",
  "const r2 = (n) => Math.round(n * 100) / 100;\nconst requireSuper = (req, res, next) => (req.user && req.user.real_role === 'super_admin')\n  ? next() : res.status(403).json({ error: 'Only the super admin can record or view owner drawings' });");
edit('src/routes/cash.js', 'Drawings: record (super admin only)',
  "router.post('/drawings', verifyToken, requireRole('admin'), async",
  "router.post('/drawings', verifyToken, requireSuper, async");
edit('src/routes/cash.js', 'Drawings: list (super admin only)',
  "router.get('/drawings', verifyToken, requireRole('admin'), async",
  "router.get('/drawings', verifyToken, requireSuper, async");

// ---- Expense vouchers ----
edit('src/routes/vouchers.js', 'Approve own expense: super admin only',
  "if (e.recorded_by === uid && req.user.role !== 'admin') {",
  "if (e.recorded_by === uid && req.user.real_role !== 'super_admin') {");
edit('src/routes/vouchers.js', 'Voucher view: all-branch roles',
  "req.user.role !== 'admin' && e.branch_id !== req.user.branch_id",
  "!req.user.all_branches && e.branch_id !== req.user.branch_id");

// ---- Menus (TopNav and Home) ----
edit('loan-frontend/app/components/TopNav.tsx', 'TopNav: Expense Approvals and Cash Count',
  /\{ id:"expenses",[^\n]*\},/,
  (m) => m + '\n  { id:"expense-approvals",label:"Expense Approvals",icon:"\u{1F9FE}",path:"/expense-approvals",roles:["super_admin","admin","branch_admin"],color:"#6C3483" },\n  { id:"cash-count",label:"Cash Count",icon:"\u{1F4B5}",path:"/cash-count",roles:["super_admin","admin","branch_admin","cashier"],color:"#117A65" },');
edit('loan-frontend/app/components/TopNav.tsx', 'TopNav: CFO sees Audit Log',
  /(\{ id:"audit",[^\n]*roles:\[)"super_admin","admin"(\])/,
  (m, a, b) => a + '"super_admin","admin","cfo"' + b);
edit('loan-frontend/app/home/page.tsx', 'Home: Expense Approvals and Cash Count',
  /\{ id:"expenses",[^\n]*\},/,
  (m) => m + '\n  { id:"expense-approvals",label:"Expense Approvals",icon:"V",path:"/expense-approvals",roles:["super_admin","admin","branch_admin"],color:"#6C3483",bg:"#F4ECF7",desc:"Approve expenses & issue vouchers",group:"Accounting" },\n  { id:"cash-count",label:"Cash Count",icon:"H",path:"/cash-count",roles:["super_admin","admin","branch_admin","cashier"],color:"#117A65",bg:"#E8F6F3",desc:"Daily cash count & owner drawings",group:"Accounting" },');
edit('loan-frontend/app/home/page.tsx', 'Home: CFO sees Audit Log',
  /(\{ id:"audit",[^\n]*roles:\[)"super_admin","admin"(\])/,
  (m, a, b) => a + '"super_admin","admin","cfo"' + b);
edit('loan-frontend/app/audit/page.tsx', 'Audit page: CFO allowed in',
  '["admin", "branch_admin"].includes(user.role)',
  '["admin", "branch_admin", "cfo"].includes(user.role)');

if (ok) {
  Object.entries(files).forEach(([f, o]) =>
    fs.writeFileSync(f, o.crlf ? o.text.replace(/\n/g, '\r\n') : o.text, 'utf8'));
  console.log('\n✅ All edits applied. Safe to push.');
} else {
  console.log('\n❌ Nothing was written. Paste this output.');
}