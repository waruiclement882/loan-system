"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPayments, createPayment, getLoans } from "@/lib/api";

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ loan_id: "", amount: "", transaction_code: "", source: "mpesa" });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "kcb">("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    loadData();
  }, []);

  const loadData = async () => {
    const p = await getPayments();
    const l = await getLoans();
    setPayments(Array.isArray(p) ? p : []);
    setLoans(Array.isArray(l) ? l : []);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await createPayment(form);
    setForm({ loan_id: "", amount: "", transaction_code: "", source: "mpesa" });
    setShowForm(false);
    loadData();
    setLoading(false);
  };

  const filteredPayments = activeTab === "kcb"
    ? payments.filter((p) => p.source === "kcb_paybill")
    : payments;

  const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const kcbCollected = payments.filter(p => p.source === "kcb_paybill").reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/approvals")} className="text-gray-600 hover:text-blue-600">Approvals</button>
          <button onClick={() => router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">📅 PAR</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600">Statement</button>
        </div>
      </nav>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Payments</p>
            <p className="text-2xl font-bold text-blue-600">{payments.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Collected</p>
            <p className="text-2xl font-bold text-green-600">KSh {totalCollected.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">KCB Paybill</p>
            <p className="text-2xl font-bold text-purple-600">KSh {kcbCollected.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Payments</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            + Record Payment
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Record Manual Payment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan</label>
                <select value={form.loan_id} onChange={(e) => setForm({...form, loan_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select loan</option>
                  {loans.map((l: any) => (
                    <option key={l.id} value={l.id}>#{l.id} - {l.customer_name} (KSh {parseFloat(l.amount).toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KSh)</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="5000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Code</label>
                <input value={form.transaction_code} onChange={(e) => setForm({...form, transaction_code: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="QWE123456" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select value={form.source} onChange={(e) => setForm({...form, source: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
              {loading ? "Saving..." : "Record Payment"}
            </button>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            All Payments ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab("kcb")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === "kcb" ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            KCB Paybill ({payments.filter(p => p.source === "kcb_paybill").length})
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-4">Loan ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Transaction Code</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Source</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400">No payments found</td>
                </tr>
              ) : (
                filteredPayments.map((p: any) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">#{p.loan_id}</td>
                    <td className="p-4 font-medium text-green-600">KSh {parseFloat(p.amount).toLocaleString()}</td>
                    <td className="p-4 font-mono text-xs">{p.transaction_code || p.kcb_transaction_id || '-'}</td>
                    <td className="p-4">{p.phone_number || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.source === "kcb_paybill" ? "bg-purple-100 text-purple-700" :
                        p.source === "mpesa" ? "bg-green-100 text-green-700" :
                        p.source === "bank" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {p.source === "kcb_paybill" ? "KCB Paybill" : p.source}
                      </span>
                    </td>
                    <td className="p-4">{new Date(p.payment_date).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}