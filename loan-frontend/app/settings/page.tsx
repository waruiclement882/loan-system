"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [branches, setBranches] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [assignType, setAssignType] = useState("customer");
  const [selectedId, setSelectedId] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");

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
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const [branchRes, customerRes, loanRes] = await Promise.all([
        fetch(`${API}/api/branches`, { headers: getHeaders() }),
        fetch(`${API}/api/customers`, { headers: getHeaders() }),
        fetch(`${API}/api/loans`, { headers: getHeaders() })
      ]);
      const branchData = await branchRes.json();
      const customerData = await customerRes.json();
      const loanData = await loanRes.json();
      setBranches(Array.isArray(branchData) ? branchData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
      setLoans(Array.isArray(loanData) ? loanData : []);
    } catch {}
  };

  const handleAssign = async () => {
    if (!selectedId || !selectedBranch) { setAssignMsg("❌ Please select both item and branch"); return; }
    setAssigning(true);
    try {
      const endpoint = assignType === "customer" 
        ? `${API}/api/customers/${selectedId}/branch`
        : `${API}/api/loans/${selectedId}/branch`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ branch_id: parseInt(selectedBranch) })
      });
      const data = await res.json();
      if (data.error) setAssignMsg("❌ " + data.error);
      else { setAssignMsg("✅ Assigned successfully!"); setSelectedId(""); loadBranches(); }
    } catch { setAssignMsg("❌ Failed to assign"); }
    setAssigning(false);
  };

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

  if (loading) return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400">Loading...</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-[#04342C]">⚙️ Company Settings</h2>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 text-gray-700">🏢 Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input value={form.address || ""} onChange={e => setForm({...form, address: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="123 Main St, Nairobi" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input value={form.logo_url || ""} onChange={e => setForm({...form, logo_url: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://yoursite.com/logo.png" />
              {form.logo_url && <img src={form.logo_url} alt="Logo" className="mt-2 h-12 object-contain" />}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 text-gray-700">💳 Payment Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 text-gray-700">🔒 Loan Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Branch Assignment */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 text-gray-700">🏢 Branch Assignment</h3>
          <p className="text-sm text-gray-500 mb-4">Manually reassign customers or loans to a different branch</p>
          
          {assignMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${assignMsg.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {assignMsg} <button onClick={() => setAssignMsg("")} className="ml-2 underline text-xs">dismiss</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={assignType} onChange={e => { setAssignType(e.target.value); setSelectedId(""); }}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="customer">Customer</option>
                <option value="loan">Loan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {assignType === "customer" ? "Select Customer" : "Select Loan"}
              </label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">-- Select --</option>
                {assignType === "customer" 
                  ? customers.map((c: any) => (
                      <option key={c.id} value={c.id}>#{c.id} — {c.name} (Branch {c.branch_id || "?"})</option>
                    ))
                  : loans.filter((l: any) => l.status !== "paid").map((l: any) => (
                      <option key={l.id} value={l.id}>#{l.id} — {l.customer_name} KSh {parseFloat(l.amount).toLocaleString()} (Branch {l.branch_id || "?"})</option>
                    ))
                }
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Branch</label>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">-- Select Branch --</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleAssign} disabled={assigning || !selectedId || !selectedBranch}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            {assigning ? "Assigning..." : "✅ Assign to Branch"}
          </button>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-[#0F6E56] text-white py-3 rounded-lg hover:bg-[#085041] disabled:opacity-50 font-medium text-lg">
          {saving ? "Saving..." : "💾 Save Settings"}
        </button>
      </div>
    </Layout>
  );
}
