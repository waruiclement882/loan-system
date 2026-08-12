const jwt = require('jsonwebtoken');

// ── Verify JWT token ──────────────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token required' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token malformed' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired — please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}; // ← this closing brace was missing before — caused silent bugs

// ── Role-based access control ─────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  }
  next();
};

// Branch admin can do everything admin/cashier can within their branch
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

module.exports = { verifyToken, requireRole, requireBranchAccess, branchFilter };
