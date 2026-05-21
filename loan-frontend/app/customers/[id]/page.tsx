"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API = "https://loan-system-h794.onrender.com";

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("loans");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(API + "/api/customers/" + id + "/profile", { headers });
      const data = await res.json();
      setProfile(data);
      setEditForm(data.customer);
    } catch { }
    setLoading(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(API + "/api/customers/" + id, {
        method: "PUT", headers,
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { setEditing(false); loadProfile(); }
    } catch { alert("Failed to update customer"); }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-400">Loading profile...</p></div>;
  if (!profile) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-red-400">Customer not found</p></div>;

  const { customer, loans, payments, stats } = profile;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/customers")} className="text-gray-400 hover:text-gray-600">← Back</button>
          <h2 className="text-2xl font-bold">Customer Profile</h2>
        </div>

        {/* Customer Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                {customer.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                {editing ? (
                  <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="text-xl font-bold border rounded px-2 py-1 mb-1 w-full" />
                ) : (
                  <h3 className="text-xl font-bold">{customer.name}</h3>
                )}
                <p className="text-gray-500 text-sm">Customer ID: #{customer.id}</p>
                <p className="text-gray-500 text-sm">Joined: {new Date(customer.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button onClick={handleUpdate} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setEditing(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300">Cancel</button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Edit</button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              {editing ? (
                <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full border rounded px-2 py-1 text-sm" />
              ) : (
                <p className="font-medium">{customer.phone || "-"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              {editing ? (
                <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                  className="w-full border rounded px-2 py-1 text-sm" />
              ) : (
                <p className="font-medium">{customer.email || "-"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">National ID</label>
              {editing ? (
                <input value={editForm.national_id} onChange={e => setEditForm({...editForm, national_id: e.target.value})}
                  className="w-full border rounded px-2 py-1 text-sm" />
              ) : (
                <p className="font-medium">{customer.national_id || "-"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Total Loans</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalLoans}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Total Borrowed</p>
            <p className="text-xl font-bold text-purple-600">KSh {stats.totalBorrowed.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Total Paid</p>
            <p className="text-xl font-bold text-green-600">KSh {stats.totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="text-xl font-bold text-red-600">KSh {stats.totalOutstanding.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Active / Paid</p>
            <p className="text-xl font-bold text-teal-600">{stats.activeLoans} / {stats.paidLoans}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab("loans")}
            className={"px-4 py-2 rounded-lg text-sm font-medium " + (activeTab === "loans" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>
            Loans ({loans.length})
          </button>
          <button onClick={() => setActiveTab("payments")}
            className={"px-4 py-2 rounded-lg text-sm font-medium " + (activeTab === "payments" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>
            Payments ({payments.length})
          </button>
        </div>

        {/* Loans Tab */}
        {activeTab === "loans" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loans.length === 0 ? (
              <p className="p-8 text-center text-gray-400">No loans found for this customer</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-500">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Term</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3">Balance</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan: any) => (
                    <tr key={loan.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3">#{loan.id}</td>
                      <td className="px-6 py-3">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                      <td className="px-6 py-3">{loan.term_weeks} wks</td>
                      <td className="px-6 py-3">KSh {parseFloat(loan.total_amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-3 text-red-600">KSh {parseFloat(loan.balance || 0).toLocaleString()}</td>
                      <td className="px-6 py-3">
                        <span className={"px-2 py-1 rounded-full text-xs font-medium " + (
                          loan.status === "paid" ? "bg-green-100 text-green-700" :
                          loan.status === "active" ? "bg-blue-100 text-blue-700" :
                          loan.status === "approved" ? "bg-teal-100 text-teal-700" :
                          loan.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700")}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-400 text-xs">{new Date(loan.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        {(loan.status === "active" || loan.status === "paid") && (
                          <button onClick={() => router.push("/schedule?loan_id=" + loan.id)}
                            className="text-blue-600 hover:underline text-xs">View</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {payments.length === 0 ? (
              <p className="p-8 text-center text-gray-400">No payments found for this customer</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-500">
                    <th className="px-6 py-3">Loan ID</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Transaction Code</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3">#{p.loan_id}</td>
                      <td className="px-6 py-3 font-medium text-green-600">KSh {parseFloat(p.amount).toLocaleString()}</td>
                      <td className="px-6 py-3 font-mono text-xs">{p.transaction_code || p.kcb_transaction_id || "-"}</td>
                      <td className="px-6 py-3">
                        <span className={"px-2 py-1 rounded-full text-xs " + (p.source === "kcb_paybill" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700")}>
                          {p.source === "kcb_paybill" ? "KCB Paybill" : p.source}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-400 text-xs">{new Date(p.payment_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
