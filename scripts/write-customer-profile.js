const fs = require('fs');

// 1. Update customers route
fs.writeFileSync('src/routes/customers.js', `const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, customerController.getAllCustomers);
router.post('/', verifyToken, customerController.createCustomer);
router.get('/:id', verifyToken, customerController.getCustomerById);
router.put('/:id', verifyToken, customerController.updateCustomer);
router.get('/:id/profile', verifyToken, customerController.getCustomerProfile);

module.exports = router;
`);

// 2. Update customer controller
fs.writeFileSync('src/controllers/customerController.js', `const pool = require('../db/connection');

const getAllCustomers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, national_id } = req.body;
    const result = await pool.query(
      'INSERT INTO customers (name, email, phone, national_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, email, phone, national_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { name, email, phone, national_id } = req.body;
    const result = await pool.query(
      'UPDATE customers SET name=$1, email=$2, phone=$3, national_id=$4 WHERE id=$5 RETURNING *',
      [name, email, phone, national_id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getCustomerProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Get customer
    const customerRes = await pool.query('SELECT * FROM customers WHERE id=$1', [id]);
    if (!customerRes.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    const customer = customerRes.rows[0];

    // Get all loans
    const loansRes = await pool.query(
      'SELECT * FROM loans WHERE customer_id=$1 ORDER BY id DESC', [id]
    );

    // Get all payments
    const paymentsRes = await pool.query(
      'SELECT payments.* FROM payments JOIN loans ON payments.loan_id = loans.id WHERE loans.customer_id=$1 ORDER BY payments.payment_date DESC',
      [id]
    );

    // Stats
    const totalBorrowed = loansRes.rows.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
    const totalPaid = paymentsRes.rows.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const totalOutstanding = loansRes.rows.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
    const activeLoans = loansRes.rows.filter(l => l.status === 'active').length;
    const paidLoans = loansRes.rows.filter(l => l.status === 'paid').length;

    res.json({
      customer,
      loans: loansRes.rows,
      payments: paymentsRes.rows,
      stats: { totalBorrowed, totalPaid, totalOutstanding, activeLoans, paidLoans, totalLoans: loansRes.rows.length }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllCustomers, getCustomerById, createCustomer, updateCustomer, getCustomerProfile };
`);

// 3. Create customer profile page directory
if (!fs.existsSync('loan-frontend/app/customers/[id]')) {
  fs.mkdirSync('loan-frontend/app/customers/[id]', { recursive: true });
}

// 4. Create customer profile frontend page
fs.writeFileSync('loan-frontend/app/customers/[id]/page.tsx', `"use client";
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
`);

// 5. Update customers list page to make rows clickable
let customersPage = fs.readFileSync('loan-frontend/app/customers/page.tsx', 'utf8');
customersPage = customersPage.replace(
  '<tr key={c.id} className="border-b hover:bg-gray-50">',
  '<tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push("/customers/" + c.id)}>'
);
fs.writeFileSync('loan-frontend/app/customers/page.tsx', customersPage, 'utf8');

console.log('Customer profile backend and frontend created!');
