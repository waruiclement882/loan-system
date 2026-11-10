const fs = require('fs');

const rw = (file, find, repl) => {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  const text = raw.replace(/\r\n/g, '\n');
  const n = text.split(find).length - 1;
  if (n !== 1) return n;
  const out = text.replace(find, () => repl);
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out, 'utf8');
  return 1;
};

const a = rw('src/middlewares/authMiddleware.js',
  'req.user = decoded;',
  "req.user = decoded;\n    // Super admin passes every admin permission check\n    if (decoded.role === 'super_admin') req.user = { ...decoded, role: 'admin', real_role: 'super_admin' };");
console.log(a === 1 ? '✅ Login check: super_admin now acts as admin' : `❌ Login check: found ${a} match(es), expected 1`);

// Optional: audit entries show the real role
try {
  const b = rw('src/utils/audit.js', 'u.role || null, u.branch_id || null,', 'u.real_role || u.role || null, u.branch_id || null,');
  console.log(b === 1 ? '✅ Audit log records the real role' : '⚠️ Audit helper not changed (found ' + b + '), not essential');
} catch (e) { console.log('⚠️ Audit helper file not found, skipped'); }