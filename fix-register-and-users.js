const fs = require('fs');
const read = (f) => { const raw = fs.readFileSync(f, 'utf8'); return { crlf: raw.includes('\r\n'), text: raw.replace(/\r\n/g, '\n') }; };
const write = (f, o) => fs.writeFileSync(f, o.crlf ? o.text.replace(/\n/g, '\r\n') : o.text, 'utf8');

// 1. /register: logged-in admins only
const auth = read('src/routes/auth.js');
const reg = "router.post('/register', register);";
if (auth.text.split(reg).length - 1 === 1) {
  auth.text = auth.text.replace(reg,
    "const { verifyToken: _vt, requireRole: _rr } = require('../middlewares/authMiddleware');\nrouter.post('/register', _vt, _rr('admin'), register);");
  write('src/routes/auth.js', auth);
  console.log('✅ /register now needs a logged-in admin');
} else {
  console.log('❌ /register line not found as expected. Paste: Select-String register src/routes/auth.js');
}

// 2. /users routes: admin only, and only the super admin can touch admin accounts
const u = read('src/routes/users.js');
let n = 0;
u.text = u.text.split('\n').map((ln) => {
  if (/^router\.(get|post|put|patch|delete)\('\/users/.test(ln) && ln.includes('verifyToken,') && !ln.includes('_rr(') && !ln.includes('requireRole(')) {
    n++;
    return ln.replace('verifyToken,', "verifyToken, _rr('admin'), _guardRole,");
  }
  return ln;
}).join('\n');

if (n > 0) {
  const block = `
const { requireRole: _rr } = require('../middlewares/authMiddleware');
const _pool = require('../db/pool');
// Only the super admin may create, change or remove admin-level accounts
const _guardRole = async (req, res, next) => {
  try {
    const isSuper = req.user && req.user.real_role === 'super_admin';
    if (!isSuper) {
      const wanted = req.body && req.body.role;
      if (wanted && ['super_admin', 'admin'].includes(wanted)) {
        return res.status(403).json({ error: 'Only the super admin can assign admin roles' });
      }
      if (req.params.id) {
        const t = await _pool.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
        if (t.rows[0] && ['super_admin', 'admin'].includes(t.rows[0].role)) {
          return res.status(403).json({ error: 'Only the super admin can change admin accounts' });
        }
      }
    }
    next();
  } catch (e) { res.status(500).json({ error: e.message }); }
};`;
  const anchor = 'const router = express.Router();';
  if (u.text.split(anchor).length - 1 === 1) {
    u.text = u.text.replace(anchor, anchor + '\n' + block);
    write('src/routes/users.js', u);
    console.log(`✅ ${n} user route(s) now admin-only`);
  } else {
    console.log('❌ users.js: router line not found, nothing written for users');
  }
} else {
  console.log('ℹ️  users.js: no unprotected /users routes found (already locked or written differently)');
}