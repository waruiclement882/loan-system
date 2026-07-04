const fs = require('fs');
const filePath = 'loan-frontend/app/branches/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add auto-refresh every 30 seconds
content = content.replace(
  `  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    loadBranches();
    loadUsers();
  }, []);`,
  `  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    loadBranches();
    loadUsers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadBranches, 30000);
    return () => clearInterval(interval);
  }, []);`
);

// Add manual refresh button
content = content.replace(
  `          <button onClick={() => { setShowForm(true); setEditBranch(null); setForm({ name: "", code: "", location: "", capital: "", manager_id: "" }); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Add Branch
          </button>`,
  `<div className="flex gap-2">
            <button onClick={loadBranches}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
              🔄 Refresh
            </button>
            <button onClick={() => { setShowForm(true); setEditBranch(null); setForm({ name: "", code: "", location: "", capital: "", manager_id: "" }); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
              + Add Branch
            </button>
          </div>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Branch auto-refresh added!');