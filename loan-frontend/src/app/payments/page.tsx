"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPayments, createPayment, getLoans } from "@/lib/api";

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ loan_id: "", amount: "", transaction_code: "", source: "mpesa" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    loadData();
  }, []);

  const loadData = async () => {
    const p = await getPayments();
    const l = await getLoans();
    setPayments(p);
    setLoans(l);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await createPayment(form);
    setForm({ loan_id: "", amount: "", transaction_code: "", source: "mpesa" });
    setShowForm(false);
    loadData();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
        </div>
      </nav>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Payments</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            + Record Payment
          </button>
        </div>
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Record Payment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan</label>
                <select value={form.loan_id} onChange={(e) => setForm({...form, loan_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select loan</option>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>#{l.id} - {l.customer_name} (KSh {parseFloat(l.amount).toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KSh)</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="4667" />
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
        <div className="bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-4">Loan ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Transaction Code</th>
                <th className="p-4">Source</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">#{p.loan_id}</td>
                  <td className="p-4">KSh {parseFloat(p.amount).toLocaleString()}</td>
                  <td className="p-4">{p.transaction_code}</td>
                  <td className="p-4">{p.source}</td>
                  <td className="p-4">{new Date(p.payment_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
