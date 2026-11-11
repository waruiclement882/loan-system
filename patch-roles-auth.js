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
const edit = (f, label, find, repl, opts = {}) => {
  const o = load(f);
  const n = o.text.split(find).length - 1;
  if (n === 0 && opts.optional) { console.log(`ℹ️  ${label}: not found, skipped`); return; }
  if (n !== 1) { console.log(`❌ ${label}: found ${n}, expected 1`); ok = false; return; }
  o.text = o.text.split(find).join(repl);
  console.log(`✅ ${label}`);
};

edit('src/controllers/authController.js', 'Token carries branch_id',
  'role: user.role, name: user.name },',
  'role: user.role, name: user.name, branch_id: user.branch_id },');

edit('src/controllers/authController.js', 'OTP login returns branch_id',
  'email: user.email, role: user.role },',
  'email: user.email, role: user.role, branch_id: user.branch_id },');

edit('src/controllers/authController.js', 'Register: roles by who is creating',
  "const allowedRoles = ['loan_officer', 'cashier'];",
  "const isSuper = req.user && req.user.real_role === 'super_admin';\n    const isAdmin = req.user && req.user.role === 'admin';\n    const allowedRoles = isSuper\n      ? ['super_admin', 'admin', 'branch_admin', 'cashier', 'cfo', 'loan_officer']\n      : isAdmin\n        ? ['branch_admin', 'cashier', 'cfo', 'loan_officer']\n        : ['loan_officer', 'cashier'];");

const mw = load('src/middlewares/authMiddleware.js');
if (mw.text.includes("real_role: 'super_admin'")) {
  console.log('✅ Super admin alias already in place');
} else {
  edit('src/middlewares/authMiddleware.js', 'Super admin acts as admin',
    'req.user = decoded;\n    next();',
    "req.user = decoded;\n    if (decoded.role === 'super_admin') req.user = { ...decoded, role: 'admin', real_role: 'super_admin' };\n    next();");
}

edit('src/routes/auth.js', 'Register route: logged-in admins only',
  "router.post('/register', authController.register);",
  "router.post('/register', verifyToken, requireRole('admin'), authController.register);",
  { optional: true });

edit('src/utils/audit.js', 'Audit log records the real role',
  'u.role || null, u.branch_id || null,',
  'u.real_role || u.role || null, u.branch_id || null,',
  { optional: true });

if (ok) {
  Object.entries(files).forEach(([f, o]) =>
    fs.writeFileSync(f, o.crlf ? o.text.replace(/\n/g, '\r\n') : o.text, 'utf8'));
  console.log('\n✅ Applied. Safe to push.');
} else {
  console.log('\n❌ Nothing was written. Paste this output.');
}