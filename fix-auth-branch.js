const fs = require('fs');
let auth = fs.readFileSync('src/controllers/authController.js', 'utf8');

auth = auth.replace(
  `res.json({
      user: {
        id: user.id,
        name: user.name,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      },
      token
    });`,
  `res.json({
      user: {
        id: user.id,
        name: user.name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id
      },
      token
    });`
);

fs.writeFileSync('src/controllers/authController.js', auth, 'utf8');
console.log('✅ Login response includes branch_id!');
console.log('Verified:', auth.includes('branch_id: user.branch_id'));