const fs = require('fs');

// Update authMiddleware to add branch filtering
let content = fs.readFileSync('src/middlewares/authMiddleware.js', 'utf8');

content = content.replace(
  `module.exports = { verifyToken, requireRole };`,
  `// Branch admin can do everything admin/cashier can within their branch
const requireBranchAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const allowedRoles = ['admin', 'cashier', 'branch_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  }
  next();
};

// Filter by branch for non-admin roles
const branchFilter = (req) => {
  if (req.user.role === 'admin') return null; // admin sees all
  return req.user.branch_id || null;
};

module.exports = { verifyToken, requireRole, requireBranchAccess, branchFilter };`
);

fs.writeFileSync('src/middlewares/authMiddleware.js', content, 'utf8');
console.log('✅ Auth middleware updated with branch_admin support!');