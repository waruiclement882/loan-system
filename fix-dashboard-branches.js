const fs = require('fs');
const filePath = 'loan-frontend/app/dashboard/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add Branches link to nav for admin
content = content.replace(
  `{userRole === "admin" && <button onClick={() => router.push("/audit")} className="text-gray-600 hover:text-blue-600">Audit</button>}`,
  `{userRole === "admin" && <button onClick={() => router.push("/audit")} className="text-gray-600 hover:text-blue-600">Audit</button>}
          {userRole === "admin" && <button onClick={() => router.push("/branches")} className="text-gray-600 hover:text-blue-600">🏢 Branches</button>}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Branches link added to dashboard!');