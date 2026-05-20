require('dotenv').config();
const pool = require('./src/db/pool');
const fs = require('fs');

async function run() {
  // ── 1. Update credentials ──────────────────────────────────────────────
  const r = await pool.query(`
    UPDATE users
    SET name     = 'Clement',
        email    = 'waruiclement882@gmail.com',
        password = '$2b$10$EpDB1RlWKprI9A8tJTbrXOBw14EdilVbOcW8UrwyKh46ew5opslwq',
        role     = 'admin'
    WHERE id = 1
    RETURNING id, name, email, role
  `);
  console.log('✅ User updated:', r.rows[0]);

  // ── 2. User management page ────────────────────────────────────────────
  if (!fs.existsSync('loan-frontend/app/users')) {
    fs.mkdirSync('loan-frontend/app/users', { recursive: true });
  }

  fs.writeFileSync('loan-frontend/app/users/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "https://loan-system-h794.onrender.com/api";

const ROLES = ["admin", "loan_officer", "cashier"];
const ROLE_COLORS: Record<string, string> = {
  admin:        "bg-purple-100 text-purple-700",
  loan_officer: "bg-blue-100 text-blue-700",
  cashier:      "bg-green-100 text-green-700",
};
const ROLE_LABELS: Record<string, string> = {
  admin:        "Admin",
  loan_officer: "Loan Officer",
  cashier:      "Cashier",
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editUser, setEditUser]   = useState<any>(null);
  const [deleting, setDeleting]   = useState<number | null>(null);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "loan_officer" });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const currentUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    if (currentUser?.role !== "admin") { router.push("/dashboard"); return; }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(API + "/auth/users", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch { setError("Failed to load users"); }
    setLoading(false);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: "loan_officer" });
    setShowForm(true);
    setError(""); setSuccess("");
  };

  const openEdit = (u: any) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role || "loan_officer" });
    setShowForm(true);
    setError(""); setSuccess("");
  };

  const closeForm = () => { setShowForm(false); setEditUser(null); };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError("Name and email are required"); return; }
    if (!editUser && !form.password) { setError("Password is required for new users"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const url    = editUser ? API + "/auth/users/" + editUser.id : API + "/auth/register";
      const method = editUser ? "PUT" : "POST";
      const body: any = { name: form.name, email: form.email, role: form.role };
      if (form.password) body.password = form.password;

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save user"); }
      else {
        setSuccess(editUser ? "User updated!" : "User created!");
        closeForm();
        fetchUsers();
      }
    } catch { setError("Request failed"); }
    setSaving(false);
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(API + "/auth/users/" + userId + "/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) { setSuccess("Role updated!"); fetchUsers(); }
      else { setError("Failed to update role"); }
    } catch { setError("Request failed"); }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    setDeleting(userId);
    try {
      const res = await fetch(API + "/auth/users/" + userId, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) { setSuccess("User deleted"); fetchUsers(); }
      else { setError("Failed to delete user"); }
    } catch { setError("Request failed"); }
    setDeleting(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Nav */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
          <span className="text-xs px-2 py-1 rounded-full font-semibold bg-purple-100 text-purple-700">Admin</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/loans")}     className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/payments")}  className="text-gray-600 hover:text-blue-600">Payments</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">User Management</h2>
            <p className="text-gray-500 text-sm mt-1">Create and manage system users and their roles</p>
          </div>
          <button onClick={openCreate} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium">
            + Add User
          </button>
        </div>

        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">{success}</div>}

        {/* Users table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading users...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Role</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Change Role</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">
                      {u.name}
                      {u.id === currentUser?.id && <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">You</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={\`text-xs px-2.5 py-1 rounded-full font-semibold \${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"}\`}>
                        {ROLE_LABELS[u.role] || u.role || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role || ""}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.id === currentUser?.id}
                        className="border rounded-lg px-2 py-1 text-sm disabled:opacity-40"
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                        {u.id !== currentUser?.id && (
                          <button onClick={() => handleDelete(u.id)} disabled={deleting === u.id} className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-40">
                            {deleting === u.id ? "..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">{editUser ? "Edit User" : "Add New User"}</h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Jane Wanjiku" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="jane@example.com" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editUser && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="••••••••" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={closeForm} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {saving ? "Saving..." : editUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`);
  console.log('✅ loan-frontend/app/users/page.tsx created');

  // ── 3. Backend routes needed ───────────────────────────────────────────
  const usersRoute = `const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const pool     = require('../db/pool');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// GET all users (admin only)
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update user (admin only)
router.put('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    let query, params;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query  = 'UPDATE users SET name=$1, email=$2, password=$3, role=$4 WHERE id=$5 RETURNING id, name, email, role';
      params = [name, email, hash, role, req.params.id];
    } else {
      query  = 'UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4 RETURNING id, name, email, role';
      params = [name, email, role, req.params.id];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH update role only (admin only)
router.patch('/users/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const result = await pool.query(
      'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role',
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE user (admin only)
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
`;

  fs.writeFileSync('src/routes/users.js', usersRoute);
  console.log('✅ src/routes/users.js created');

  // ── 4. Add adminOnly middleware ────────────────────────────────────────
  const middleware = fs.readFileSync('src/middlewares/authMiddleware.js', 'utf8');
  if (!middleware.includes('adminOnly')) {
    const updated = middleware.trimEnd() + `

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { ...module.exports, adminOnly };
`;
    fs.writeFileSync('src/middlewares/authMiddleware.js', updated);
    console.log('✅ adminOnly middleware added');
  } else {
    console.log('ℹ️  adminOnly already exists in middleware');
  }

  console.log('\n📌 One last step — wire the users route in src/app.js:');
  console.log("   const usersRoute = require('./routes/users');");
  console.log("   app.use('/api/auth', usersRoute);");
  console.log('\nThen push to GitHub!');

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
