const fs = require('fs');
const files = {};
const load = (f) => {
  if (!files[f]) {
    const raw = fs.readFileSync(f, 'utf8');
    files[f] = { crlf: raw.includes('\r\n'), text: raw.replace(/\r\n/g, '\n') };
  }
  return files[f];
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let ok = true;
const edit = (f, label, find, repl, want = 1) => {
  const o = load(f);
  const re = find instanceof RegExp ? new RegExp(find.source, 'g') : new RegExp(esc(find), 'g');
  const n = (o.text.match(re) || []).length;
  if (n !== want) { console.log(`❌ ${label}: found ${n}, expected ${want}`); ok = false; return; }
  o.text = o.text.replace(re, () => repl);
  console.log(`✅ ${label}`);
};

edit('src/routes/reports.js', 'Reports audit route: admin only',
  "router.get('/audit', verifyToken, async (req, res) => {",
  "router.get('/audit', verifyToken, requireRole('admin'), async (req, res) => {");

edit('src/routes/expenses.js', 'P&L: admin only',
  "router.get('/pnl', verifyToken, async (req, res) => {",
  "router.get('/pnl', verifyToken, requireRole('admin'), async (req, res) => {");

edit('src/routes/expenses.js', 'Expense list: branch scoping',
  /let where = 'WHERE 1=1';\s*const params = \[\];/,
  "let where = 'WHERE 1=1';\n    const params = [];\n    const scopeBranch = req.user.role === 'admin' ? (req.query.branch_id || null) : (req.user.branch_id || 1);\n    if (scopeBranch) { params.push(scopeBranch); where += ` AND COALESCE(e.branch_id, 1) = $${params.length}`; }");

edit('src/routes/expenses.js', 'New expense: admin may choose branch',
  "recorded_by, req.user?.branch_id || 1]",
  "recorded_by, (req.user?.role === 'admin' && req.body.branch_id ? parseInt(req.body.branch_id) : (req.user?.branch_id || 1))]");

edit('src/routes/vouchers.js', 'Details/receipt: branch-aware permission',
  "!isManager(req.user) && e.recorded_by !== uid",
  "!canActOn(req.user, e) && e.recorded_by !== uid", 2);

edit('src/routes/vouchers.js', 'Voucher view: branch check',
  "if (e.status !== 'approved') return res.status(400).json({ error: 'A voucher is only issued once the expense is approved' });",
  "if (req.user.role !== 'admin' && e.branch_id !== req.user.branch_id) return res.status(403).json({ error: 'This voucher belongs to another branch' });\n    if (e.status !== 'approved') return res.status(400).json({ error: 'A voucher is only issued once the expense is approved' });");

edit('src/app.js', 'Cash routes: require',
  "const vouchersRoutes = require('./routes/vouchers');",
  "const vouchersRoutes = require('./routes/vouchers');\nconst cashRoutes = require('./routes/cash');");

edit('src/app.js', 'Cash routes: mount',
  "app.use('/api/vouchers', vouchersRoutes);",
  "app.use('/api/vouchers', vouchersRoutes);\napp.use('/api/cash', cashRoutes);");

edit('loan-frontend/app/components/Sidebar.tsx', 'Sidebar: Cash Count link',
  '{ label: "Expense Approvals", path: "/expense-approvals", show: isAdmin, group: "Operations" },',
  '{ label: "Expense Approvals", path: "/expense-approvals", show: isAdmin, group: "Operations" },\n    { label: "Cash Count", path: "/cash-count", show: isAdmin, group: "Operations" },');

if (ok) {
  Object.entries(files).forEach(([f, o]) =>
    fs.writeFileSync(f, o.crlf ? o.text.replace(/\n/g, '\r\n') : o.text, 'utf8'));
  console.log('\n✅ All edits applied. Safe to push.');
} else {
  console.log('\n❌ Nothing was written. Paste this output.');
}