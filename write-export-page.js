const fs = require('fs');

if (!fs.existsSync('loan-frontend/app/export')) {
  fs.mkdirSync('loan-frontend/app/export', { recursive: true });
}

fs.writeFileSync('loan-frontend/app/export/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoans, getPayments, getCustomers } from "@/lib/api";
import * as XLSX from "xlsx";

export default function ExportPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    const l = await getLoans();
    const p = await getPayments();
    const c = await getCustomers();
    setLoans(Array.isArray(l) ? l : []);
    setPayments(Array.isArray(p) ? p : []);
    setCustomers(Array.isArray(c) ? c : []);
    setLoading(false);
  };

  const exportLoansExcel = () => {
    const data = loans.map(l => ({
      "Loan ID": l.id,
      "Customer": l.customer_name,
      "Amount (KSh)": parseFloat(l.amount),
      "Term (Weeks)": l.term_weeks,
      "Interest (KSh)": parseFloat(l.interest_amount || 0),
      "Total (KSh)": parseFloat(l.total_amount || 0),
      "Balance (KSh)": parseFloat(l.balance || 0),
      "Status": l.status,
      "Created At": new Date(l.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loans");
    XLSX.writeFile(wb, "loans-report-" + new Date().toISOString().split("T")[0] + ".xlsx");
  };

  const exportPaymentsExcel = () => {
    const data = payments.map(p => ({
      "Payment ID": p.id,
      "Loan ID": p.loan_id,
      "Amount (KSh)": parseFloat(p.amount),
      "Transaction Code": p.transaction_code || p.kcb_transaction_id || "-",
      "Phone": p.phone_number || "-",
      "Source": p.source,
      "Date": new Date(p.payment_date).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, "payments-report-" + new Date().toISOString().split("T")[0] + ".xlsx");
  };

  const exportCustomersExcel = () => {
    const data = customers.map(c => ({
      "Customer ID": c.id,
      "Name": c.name,
      "Email": c.email,
      "Phone": c.phone,
      "National ID": c.national_id,
      "Joined": new Date(c.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "customers-report-" + new Date().toISOString().split("T")[0] + ".xlsx");
  };

  const exportFullReport = () => {
    const wb = XLSX.utils.book_new();

    // Loans sheet
    const loansData = loans.map(l => ({
      "Loan ID": l.id, "Customer": l.customer_name,
      "Amount": parseFloat(l.amount), "Term Weeks": l.term_weeks,
      "Interest": parseFloat(l.interest_amount || 0),
      "Total": parseFloat(l.total_amount || 0),
      "Balance": parseFloat(l.balance || 0), "Status": l.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(loansData), "Loans");

    // Payments sheet
    const paymentsData = payments.map(p => ({
      "Payment ID": p.id, "Loan ID": p.loan_id,
      "Amount": parseFloat(p.amount),
      "Transaction Code": p.transaction_code || p.kcb_transaction_id || "-",
      "Source": p.source, "Date": new Date(p.payment_date).toLocaleDateString(),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsData), "Payments");

    // Summary sheet
    const totalDisbursed = loans.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
    const totalOutstanding = loans.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
    const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const kcbCollected = payments.filter(p => p.source === "kcb_paybill").reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const summaryData = [
      { "Metric": "Total Customers", "Value": customers.length },
      { "Metric": "Total Loans", "Value": loans.length },
      { "Metric": "Active Loans", "Value": loans.filter(l => l.status === "active").length },
      { "Metric": "Paid Loans", "Value": loans.filter(l => l.status === "paid").length },
      { "Metric": "Pending Loans", "Value": loans.filter(l => l.status === "pending").length },
      { "Metric": "Total Disbursed (KSh)", "Value": totalDisbursed },
      { "Metric": "Total Outstanding (KSh)", "Value": totalOutstanding },
      { "Metric": "Total Collected (KSh)", "Value": totalCollected },
      { "Metric": "KCB Paybill Collected (KSh)", "Value": kcbCollected },
      { "Metric": "Collection Rate (%)", "Value": totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 100) : 0 },
      { "Metric": "Report Date", "Value": new Date().toLocaleDateString() },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Summary");

    XLSX.writeFile(wb, "full-report-" + new Date().toISOString().split("T")[0] + ".xlsx");
  };

  const totalDisbursed = loans.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const kcbCollected = payments.filter(p => p.source === "kcb_paybill").reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>
          <button onClick={() => router.push("/approvals")} className="text-gray-600 hover:text-blue-600">Approvals</button>
        </div>
      </nav>

      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Export Reports</h2>

        {loading ? (
          <p className="text-center text-gray-400">Loading data...</p>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Customers</p>
                <p className="text-2xl font-bold text-blue-600">{customers.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Total Loans</p>
                <p className="text-2xl font-bold text-green-600">{loans.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Total Disbursed</p>
                <p className="text-2xl font-bold text-purple-600">KSh {totalDisbursed.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Total Collected</p>
                <p className="text-2xl font-bold text-orange-600">KSh {totalCollected.toLocaleString()}</p>
              </div>
            </div>

            {/* Export Cards */}
            <div className="grid grid-cols-2 gap-6">

              {/* Full Report */}
              <div className="bg-white rounded-lg shadow p-6 col-span-2 border-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-blue-600">Full Report</h3>
                    <p className="text-sm text-gray-500 mt-1">Complete report with Loans, Payments and Summary sheets</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>{loans.length} loans</span>
                      <span>{payments.length} payments</span>
                      <span>{customers.length} customers</span>
                      <span>KCB: KSh {kcbCollected.toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={exportFullReport} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
                    Download Full Report (.xlsx)
                  </button>
                </div>
              </div>

              {/* Loans Export */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-lg mb-2">Loans Report</h3>
                <p className="text-sm text-gray-500 mb-4">{loans.length} loans — amounts, balances, status</p>
                <div className="text-xs text-gray-400 mb-4">
                  <p>Active: {loans.filter(l => l.status === "active").length}</p>
                  <p>Paid: {loans.filter(l => l.status === "paid").length}</p>
                  <p>Pending: {loans.filter(l => l.status === "pending").length}</p>
                </div>
                <button onClick={exportLoansExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full">
                  Export Loans (.xlsx)
                </button>
              </div>

              {/* Payments Export */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-lg mb-2">Payments Report</h3>
                <p className="text-sm text-gray-500 mb-4">{payments.length} payments — transaction codes, sources</p>
                <div className="text-xs text-gray-400 mb-4">
                  <p>KCB Paybill: {payments.filter(p => p.source === "kcb_paybill").length} payments</p>
                  <p>KCB Total: KSh {kcbCollected.toLocaleString()}</p>
                  <p>All Sources: KSh {totalCollected.toLocaleString()}</p>
                </div>
                <button onClick={exportPaymentsExcel} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 w-full">
                  Export Payments (.xlsx)
                </button>
              </div>

              {/* Customers Export */}
              <div className="bg-white rounded-lg shadow p-6 col-span-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">Customers Report</h3>
                    <p className="text-sm text-gray-500 mt-1">{customers.length} customers — names, emails, phone numbers</p>
                  </div>
                  <button onClick={exportCustomersExcel} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
                    Export Customers (.xlsx)
                  </button>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
`);

console.log('Export page created!');
