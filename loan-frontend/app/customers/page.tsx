"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, createCustomer } from "@/lib/api";

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  national_id?: string;
  created_at?: string;
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [form, setForm]           = useState({ name: "", email: "", phone: "", national_id: "" });
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch { setError("Failed to load customers"); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.phone) { setError("Name and phone are required"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await createCustomer(form);
      if (result.error) { setError(result.error); }
      else {
        setSuccess("Customer created successfully!");
        setForm({ name: "", email: "", phone: "", national_id: "" });
        setShowForm(false);
        fetchCustomers();
      }
    } catch { setError("Failed to create customer"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com"}/api/customers/${deleteId}`,
        { method: "DELETE", headers: getHeaders() }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete customer");
      } else {
        setSuccess("Customer deleted successfully!");
        setDeleteId(null);
        fetchCustomers();
      }
    } catch { setError("Failed to delete customer"); }
    setDeleting(false);
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Nav */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/loans")}     className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/payments")}  className="text-gray-600 hover:text-blue-600">Payments</button>
          <button onClick={() => router.push("/approvals")} className="text-gray-600 hover:text-blue-600">Approvals</button>
          <button onClick={() => { router.push("/par"); }
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600">Statement</button>
          localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Customers</h2>
            <p className="text-gray-500 text-sm mt-1">{customers.length} total customers</p>
          </div>
          <button onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium">
            + Add Customer
          </button>
        </div>

        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">{success}</div>}

        {/* Search */}
        <div className="mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="w-full max-w-md border rounded-lg px-4 py-2 text-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading customers...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              {search ? "No customers match your search" : "No customers yet. Add your first customer!"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">#</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Phone</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">National ID</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Joined</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: Customer) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-400">{c.id}</td>
                    <td className="px-6 py-4 font-medium cursor-pointer hover:text-blue-600" onClick={() => router.push("/customers/" + c.id)}>{c.name}</td>
                    <td className="px-6 py-4">{c.phone}</td>
                    <td className="px-6 py-4 text-gray-600">{c.email || "—"}</td>
                    <td className="px-6 py-4 text-gray-600">{c.national_id || "—"}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push("/customers/" + c.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs px-3 py-1 border border-blue-200 rounded-lg hover:bg-blue-50">
                          Edit
                        </button>
                        <button
                          onClick={() => { setDeleteId(c.id); setError(""); setSuccess(""); }}
                          className="text-red-600 hover:text-red-800 text-xs px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Add New Customer</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Alice Mwangi" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="0712345678" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="alice@example.com" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                <input value={form.national_id} onChange={e => setForm({...form, national_id: e.target.value})}
                  placeholder="12345678" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {saving ? "Saving..." : "Create Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold text-lg text-red-600">Delete Customer</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-sm">Are you sure you want to delete this customer? This action cannot be undone.</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mt-3">{error}</div>}
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50">
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}