const fs = require('fs');
let content = fs.readFileSync('src/routes/customers.js', 'utf8');

// Fix import to include requireRole
content = content.replace(
  `const { verifyToken } = require('../middlewares/authMiddleware');`,
  `const { verifyToken, requireRole } = require('../middlewares/authMiddleware');`
);

fs.writeFileSync('src/routes/customers.js', content, 'utf8');
console.log('✅ Fixed!');
console.log('Has requireRole:', content.includes('requireRole'));