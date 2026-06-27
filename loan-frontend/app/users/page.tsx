"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "loan_officer" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/users`, { headers: getHeaders() });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setError("Failed to load users"); }
    setLoading(false);
  };

  const handleCreate = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST", headers: getHeaders(), body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setMessage("✅ User created successfully!");
        setShowForm(false);
        setForm({ name: "", email: "", password: "", role: "loan_officer" });
        loadUsers();
      }
    } catch { setError("Failed to create user"); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(`${API}/api/users/${editUser.id}`, {
        method: "PUT", headers: getHeaders(),
        body: JSON.stringify({ name: form.name, email: form.email, role: form.role, password: form.password || undefined })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setMessage("✅ User updated!");
        setEditUser(null);
        setShowForm(false);
        setForm({ name: "", email: "", password: "", role: "loan_officer" });
        loadUsers();
      }
    } catch { setError("Failed to update user"); }
    setSaving(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete user ${name}? This cannot be undone.`)) return;
    try {
      await fetch(`${API}/api/users/${id}`, { method: "DELETE", headers: getHeaders() });
      setMessage("✅ User deleted!");
      loadUsers();
    } catch { setError("Failed to delete user"); }
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setShowForm(true);
    setError("");
  };

  const roleColor = (role: string) => {
    if (role === "admin") return "bg-red-100 text-red-700";
    if (role === "cashier") return "bg-green-100 text-green-700";
    return "bg-blue-100 text-blue-700";
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#04342C]">👥 User Management</h2>
          <button onClick={() => { setShowForm(!showForm); setEditUser(null); setForm({ name: "", email: "", password: "", role: "loan_officer" }); setError(""); }}
            className="bg-[#0F6E56] text-white px-4 py-2 rounded-lg hover:bg-[#085041] text-sm">
            + Add User
          </button>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg flex justify-between">
            {message}
            <button onClick={() => setMessage("")}>✕</button>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">{editUser ? "Edit User" : "New User"}</h3>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="John Kamau" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editUser ? "New Password (leave blank to keep)" : "Password"}
                </label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="loan_officer">Loan Officer</option>
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={editUser ? handleUpdate : handleCreate}
                disabled={saving || !form.name || !form.email || (!editUser && !form.password)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                {saving ? "Saving..." : editUser ? "Update User" : "Create User"}
              </button>
              <button onClick={() => { setShowForm(false); setEditUser(null); setError(""); }}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full max-w-sm border rounded-lg px-4 py-2 text-sm bg-white" />
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-4">Name</th>
                  <th className="p-4 hidden md:table-cell">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 hidden md:table-cell">Date Created</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No users found</td></tr>
                ) : filtered.map((u: any) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{u.name || u.full_name}</td>
                    <td className="p-4 text-gray-500 hidden md:table-cell">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColor(u.role)}`}>{u.role}</span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs hidden md:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(u)}
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200">Edit</button>
                        <button onClick={() => handleDelete(u.id, u.name)}
                          className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
