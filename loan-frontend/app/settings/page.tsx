"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API}/api/settings`, { headers: getHeaders() });
      const data = await res.json();
      setForm(data);
    } catch {}
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/settings`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.error) { setMessage("❌ " + data.error); }
      else { setMessage("✅ Settings saved successfully!"); setForm(data); }
    } catch { setMessage("❌ Failed to save settings"); }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">{form.company_name || "Microfinance System"}</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/users")} className="text-gray-600 hover:text-blue-600">Users</button>
          <button onClick={() => router.push("/audit")} className="text-gray-600 hover:text-blue-600">Audit Logs</button>
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">?? PAR</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600">Statement</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">⚙️ Company Settings</h2>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message}
          </div>
        )}

        {/* Company Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 text-gray-700">🏢 Company Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input value={form.company_name || ""} onChange={e => setForm({...form, company_name: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="My Microfinance Ltd" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input value={form.tagline || ""} onChange={e => setForm({...form, tagline: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Empowering communities" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone || ""} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0712345678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={form.email || ""} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="info@company.com" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input value={form.address || ""} onChange={e => setForm({...form, address: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="123 Main St, Nairobi" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input value={form.logo_url || ""} onChange={e => setForm({...form, logo_url: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://yoursite.com/logo.png" />
              {form.logo_url && <img src={form.logo_url} alt="Logo" className="mt-2 h-12 object-contain" />}
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 text-gray-700">💳 Payment Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KCB Paybill</label>
              <input value={form.paybill || ""} onChange={e => setForm({...form, paybill: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="522522" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input value={form.account_number || ""} onChange={e => setForm({...form, account_number: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="8086860" />
            </div>
          </div>
        </div>

        {/* Loan Limits */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 text-gray-700">🔒 Loan Limits</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Active Loans per Customer</label>
              <input type="number" value={form.max_loans_per_customer || 1}
                onChange={e => setForm({...form, max_loans_per_customer: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-3 py-2 text-sm" min="1" max="10" />
              <p className="text-xs text-gray-400 mt-1">How many active loans a customer can have at once</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Loan Amount (KSh)</label>
              <input type="number" value={form.max_loan_amount || 50000}
                onChange={e => setForm({...form, max_loan_amount: parseFloat(e.target.value)})}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Maximum loan amount per application</p>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-lg">
          {saving ? "Saving..." : "💾 Save Settings"}
        </button>
      </div>
    </div>
  );
}
