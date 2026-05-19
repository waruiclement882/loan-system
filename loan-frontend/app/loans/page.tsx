"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoans, createLoan, getCustomers } from "@/lib/api";

export default function LoansPage() {
  const router = useRouter();

  const [loans, setLoans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    customer_id: "",
    amount: "",
    interest_rate: "",
    term_months: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const l = await getLoans();
      const c = await getCustomers();

      setLoans(Array.isArray(l) ? l : []);
      setCustomers(Array.isArray(c) ? c : []);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      await createLoan(form);

      setForm({
        customer_id: "",
        amount: "",
        interest_rate: "",
        term_months: "",
      });

      setShowForm(false);

      await loadData();
    } catch (error) {
      console.error("Failed to create loan:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">
          Microfinance System
        </h1>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-600 hover:text-blue-600"
          >
            Dashboard
          </button>

          <button
            onClick={() => router.push("/customers")}
            className="text-gray-600 hover:text-blue-600"
          >
            Customers
          </button>

          <button
            onClick={() => router.push("/payments")}
            className="text-gray-600 hover:text-blue-600"
          >
            Payments
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Loans</h2>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + New Loan
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">New Loan</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer
                </label>

                <select
                  value={form.customer_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customer_id: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select customer</option>

                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (KSh)
                </label>

                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="50000"
                />
              </div>

              {/* Interest */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Rate (%)
                </label>

                <input
                  type="number"
                  value={form.interest_rate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      interest_rate: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="12"
                />
              </div>

              {/* Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Term (Months)
                </label>

                <input
                  type="number"
                  value={form.term_months}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      term_months: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="12"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              {loading ? "Saving..." : "Create Loan"}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-4">Customer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Interest Rate</th>
                <th className="p-4">Term</th>
                <th className="p-4">Monthly Payment</th>
                <th className="p-4">Total Repayment</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {loans.map((loan: any) => (
                <tr
                  key={loan.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-4 font-medium">
                    {loan.customer_name}
                  </td>

                  <td className="p-4">
                    KSh{" "}
                    {parseFloat(loan.amount || 0).toLocaleString()}
                  </td>

                  <td className="p-4">
                    {loan.interest_rate}%
                  </td>

                  <td className="p-4">
                    {loan.term_months} months
                  </td>

                  <td className="p-4">
                    KSh{" "}
                    {parseFloat(
                      loan.monthly_payment || 0
                    ).toLocaleString()}
                  </td>

                  <td className="p-4">
                    KSh{" "}
                    {parseFloat(
                      loan.total_repayment || 0
                    ).toLocaleString()}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        loan.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : loan.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {loan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}