"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Layout from "../../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", national_id: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    if (customerId) loadData();
  }, [customerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, loansRes] = await Promise.all([
        fetch(`${API}/api/customers/${customerId}`, { headers: getHeaders() }),
        fetch(`${API}/api/loans`, { headers: getHeaders() }),
      ]);
      const custData = await custRes.json();
      const loansData = await loansRes.json();
      if (custData.error) { setError(custData.error); }
      else {
        setCustomer(custData);
        setForm({
          name: custData.name || "",
          email: custData.email || "",
          phone: custData.phone || "",
          national_id: custData.national_id || "",
        });
      }
      setLoans(Array.isArray(loansData) ? loansData.filter((l: any) => String(l.customer_id) === String(customerId)) : []);
    } catch {
      setError("Failed to load customer details");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true); setMessage("");
    try {
      const res = await fetch(`${API}/api/customers/${customerId}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setMessage("❌ " + data.error); }
      else {
        setMessage("✅ Customer updated successfully!");
        setCustomer(data);
        setEditing(false);
      }
    } catch { setMessage("❌ Failed to update customer"); }
    setSaving(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#0F6E56] border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading customer details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !customer) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto text-center py-16">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-gray-600 font-medium mb-4">{error || "Customer not found"}</p>
          <button onClick={() => router.push("/customers")}
            className="bg-[#0F6E56] text-white px-5 py-2 rounded-lg hover:bg-[#085041] text-sm">
            Back to Customers
          </button>
        </div>
      </Layout>
    );
  }

  const activeLoans = loans.filter(l => l.status === "active");
  const paidLoans = loans.filter(l => l.status === "paid");
  const totalBorrowed = loans.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const totalOutstanding = activeLoans.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
  const suspenseBalance = parseFloat(customer.suspense_balance || 0);

  const statusBadge = (s: string) => ({
    paid: "bg-emerald-100 text-emerald-700",
    active: "bg-blue-100 text-blue-700",
    approved: "bg-indigo-100 text-indigo-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  }[s] || "bg-gray-100 text-gray-600");

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">

        <button onClick={() => router.push("/customers")} className="text-sm text-[#0F6E56] hover:text-[#085041] mb-4 flex items-center gap-1">
          ← Back to Customers
        </button>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#D9E2DC] p-5 mb-5">
          <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#E1F5EE] flex items-center justify-center text-xl font-bold text-[#0F6E56]">
                {customer.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#04342C]">{customer.name}</h2>
                <p className="text-sm text-gray-500">Customer #{customer.id} · Joined {customer.created_at ? new Date(customer.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
              </div>
            </div>
            <button onClick={() => setEditing(!editing)}
              className="bg-[#0F6E56] text-white px-4 py-2 rounded-lg hover:bg-[#085041] text-sm">
              {editing ? "Cancel" : "Edit Details"}
            </button>
          </div>

          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#EDF1EE] pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                <input value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <button onClick={handleSave} disabled={saving}
                  className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-[#EDF1EE] pt-4">
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="font-medium text-[#04342C]">{customer.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="font-medium text-[#04342C]">{customer.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">National ID</p>
                <p className="font-medium text-[#04342C]">{customer.national_id || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">KYC Status</p>
                <p className="font-medium text-[#04342C]">{customer.kyc_verified ? "✅ Verified" : "Not verified"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-[#D9E2DC] p-4">
            <p className="text-xs text-gray-400">Total Loans</p>
            <p className="text-xl font-bold text-[#04342C]">{loans.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#D9E2DC] p-4">
            <p className="text-xs text-gray-400">Total Borrowed</p>
            <p className="text-xl font-bold text-[#04342C]">KSh {totalBorrowed.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#D9E2DC] p-4">
            <p className="text-xs text-gray-400">Outstanding</p>
            <p className="text-xl font-bold text-red-600">KSh {totalOutstanding.toLocaleString()}</p>
          </div>
          <div className={`rounded-xl border p-4 ${suspenseBalance > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-[#D9E2DC]"}`}>
            <p className={`text-xs ${suspenseBalance > 0 ? "text-orange-500" : "text-gray-400"}`}>Suspense Balance</p>
            <p className={`text-xl font-bold ${suspenseBalance > 0 ? "text-orange-600" : "text-[#04342C]"}`}>KSh {suspenseBalance.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D9E2DC] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EDF1EE] flex justify-between items-center">
            <h3 className="font-semibold text-[#04342C]">Loan History</h3>
            <span className="text-xs text-gray-400">{activeLoans.length} active · {paidLoans.length} paid</span>
          </div>
          {loans.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-gray-400 text-sm">No loans yet for this customer</p>
              <button onClick={() => router.push("/loans")}
                className="mt-3 bg-[#0F6E56] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#085041]">
                Create a Loan
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-500">
                    <th className="px-5 py-2.5">Loan ID</th>
                    <th className="px-5 py-2.5">Amount</th>
                    <th className="px-5 py-2.5">Total</th>
                    <th className="px-5 py-2.5">Balance</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {[...loans].sort((a, b) => b.id - a.id).map((loan: any) => (
                    <tr key={loan.id} className="border-b hover:bg-emerald-50 cursor-pointer"
                      onClick={() => router.push("/loans/" + loan.id)}>
                      <td className="px-5 py-2.5 text-[#0F6E56] font-medium">#{loan.id}</td>
                      <td className="px-5 py-2.5">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                      <td className="px-5 py-2.5">KSh {parseFloat(loan.total_amount || 0).toLocaleString()}</td>
                      <td className="px-5 py-2.5">{parseFloat(loan.balance || 0) === 0 ? "—" : `KSh ${parseFloat(loan.balance).toLocaleString()}`}</td>
                      <td className="px-5 py-2.5">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(loan.status)}`}>{loan.status}</span>
                      </td>
                      <td className="px-5 py-2.5 text-gray-400 text-xs">{new Date(loan.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
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
