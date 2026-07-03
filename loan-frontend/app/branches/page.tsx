"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function BranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<any[]>([]);
  const [activeBranch, setActiveBranch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBranch, setEditBranch] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", code: "", location: "", capital: "", manager_id: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userRole, setUserRole] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    loadBranches();
    loadUsers();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/branches`, { headers: getHeaders() });
      const data = await res.json();
      setBranches(Array.isArray(data) ? data : []);
      if (data.length > 0 && !activeBranch) setActiveBranch(data[0]);
    } catch {}
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API}/api/auth/users`, { headers: getHeaders() });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editBranch ? `${API}/api/branches/${editBranch.id}` : `${API}/api/branches`;
      const method = editBranch ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: getHeaders(),
        body: JSON.stringify({ ...form, capital: parseFloat(form.capital) || 0 })
      });
      const data = await res.json();
      if (data.error) setMessage("❌ " + data.error);
      else { setMessage("✅ Branch saved!"); setShowForm(false); setEditBranch(null); loadBranches(); }
    } catch { setMessage("❌ Failed to save"); }
    setSaving(false);
  };

  const fmt = (n: number) => `KSh ${(n || 0).toLocaleString()}`;

  const cashInHand = (b: any) => {
    const capital = parseFloat(b.capital || 0);
    const collected = parseFloat(b.total_collected || 0);
    const disbursed = parseFloat(b.total_disbursed || 0);
    return capital + collected - disbursed;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-4 md:px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Blessed Ventures LTD</h1>
        <div className="flex gap-3 items-center">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600 text-sm">Dashboard</button>
          <button onClick={() => router.push("/settings")} className="text-gray-600 hover:text-blue-600 text-sm">Settings</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 text-sm">Logout</button>
        </div>
      </nav>

      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">🏢 Branch Management</h2>
            <p className="text-gray-500 text-sm mt-1">Manage all Blessed Ventures LTD branches</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditBranch(null); setForm({ name: "", code: "", location: "", capital: "", manager_id: "" }); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Add Branch
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${message.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message} <button onClick={() => setMessage("")} className="ml-2 text-xs underline">dismiss</button>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">{editBranch ? "Edit Branch" : "New Branch"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Wanguru Branch" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code *</label>
                <input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. WGR" maxLength={10} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Nairobi CBD" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Capital (KSh)</label>
                <input type="number" value={form.capital} onChange={e => setForm({...form, capital: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Manager</label>
                <select value={form.manager_id} onChange={e => setForm({...form, manager_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">-- Select Manager --</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving || !form.name || !form.code}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                {saving ? "Saving..." : "Save Branch"}
              </button>
              <button onClick={() => { setShowForm(false); setEditBranch(null); }}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* Branch Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setActiveBranch(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${!activeBranch ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
            🏢 All Branches
          </button>
          {branches.map((b: any) => (
            <button key={b.id} onClick={() => setActiveBranch(b)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeBranch?.id === b.id ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              {b.name}
            </button>
          ))}
        </div>

        {/* All Branches Combined View */}
        {!activeBranch && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-500 text-sm">Total Capital</p>
                <p className="text-2xl font-bold text-blue-600">{fmt(branches.reduce((s,b) => s + parseFloat(b.capital||0), 0))}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-500 text-sm">Total Disbursed</p>
                <p className="text-2xl font-bold text-purple-600">{fmt(branches.reduce((s,b) => s + parseFloat(b.total_disbursed||0), 0))}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-500 text-sm">Total Collected</p>
                <p className="text-2xl font-bold text-green-600">{fmt(branches.reduce((s,b) => s + parseFloat(b.total_collected||0), 0))}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-500 text-sm">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{fmt(branches.reduce((s,b) => s + parseFloat(b.outstanding||0), 0))}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500 border-b">
                    <th className="p-4">Branch</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Capital</th>
                    <th className="p-4">Disbursed</th>
                    <th className="p-4">Collected</th>
                    <th className="p-4">Outstanding</th>
                    <th className="p-4">Cash in Hand</th>
                    <th className="p-4">Customers</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b: any) => (
                    <tr key={b.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-gray-400">{b.code}</p>
                      </td>
                      <td className="p-4 text-gray-500">{b.location || "—"}</td>
                      <td className="p-4 text-blue-600 font-medium">{fmt(b.capital)}</td>
                      <td className="p-4 text-purple-600">{fmt(b.total_disbursed)}</td>
                      <td className="p-4 text-green-600">{fmt(b.total_collected)}</td>
                      <td className="p-4 text-red-600">{fmt(b.outstanding)}</td>
                      <td className="p-4">
                        <span className={`font-bold ${cashInHand(b) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                          {fmt(cashInHand(b))}
                        </span>
                      </td>
                      <td className="p-4">{b.total_customers}</td>
                      <td className="p-4">
                        <button onClick={() => { setEditBranch(b); setForm({ name: b.name, code: b.code, location: b.location||"", capital: b.capital, manager_id: b.manager_id||"" }); setShowForm(true); }}
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Single Branch View */}
        {activeBranch && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{activeBranch.name}</h3>
                  <p className="text-gray-500 text-sm">{activeBranch.location} · Code: {activeBranch.code}</p>
                  {activeBranch.manager_name && <p className="text-blue-600 text-sm mt-1">Manager: {activeBranch.manager_name}</p>}
                </div>
                <button onClick={() => { setEditBranch(activeBranch); setForm({ name: activeBranch.name, code: activeBranch.code, location: activeBranch.location||"", capital: activeBranch.capital, manager_id: activeBranch.manager_id||"" }); setShowForm(true); }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                  Edit Branch
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Capital</p>
                  <p className="text-xl font-bold text-blue-600">{fmt(activeBranch.capital)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Disbursed</p>
                  <p className="text-xl font-bold text-purple-600">{fmt(activeBranch.total_disbursed)}</p>
                  <p className="text-xs text-gray-400">{activeBranch.active_loans} active · {activeBranch.paid_loans} paid</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Collected</p>
                  <p className="text-xl font-bold text-green-600">{fmt(activeBranch.total_collected)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="text-xl font-bold text-red-600">{fmt(activeBranch.outstanding)}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Cash in Hand</span>
                  <span className={`text-xl font-bold ${cashInHand(activeBranch) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {fmt(cashInHand(activeBranch))}
                    {cashInHand(activeBranch) < 0 && " ⚠️ Deficit"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Capital + Collected - Disbursed</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => router.push(`/customers?branch=${activeBranch.id}`)}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md text-left">
                <p className="text-2xl mb-1">👥</p>
                <p className="font-medium text-sm">Customers</p>
                <p className="text-gray-400 text-xs">{activeBranch.total_customers} registered</p>
              </button>
              <button onClick={() => router.push(`/loans?branch=${activeBranch.id}`)}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md text-left">
                <p className="text-2xl mb-1">📋</p>
                <p className="font-medium text-sm">Loans</p>
                <p className="text-gray-400 text-xs">{activeBranch.active_loans} active</p>
              </button>
              <button onClick={() => router.push(`/reports?branch=${activeBranch.id}`)}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md text-left">
                <p className="text-2xl mb-1">📊</p>
                <p className="font-medium text-sm">Reports</p>
                <p className="text-gray-400 text-xs">Branch analytics</p>
              </button>
              <button onClick={() => router.push(`/expenses?branch=${activeBranch.id}`)}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md text-left">
                <p className="text-2xl mb-1">💰</p>
                <p className="font-medium text-sm">Expenses</p>
                <p className="text-gray-400 text-xs">P&L for this branch</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}