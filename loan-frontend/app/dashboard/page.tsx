"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, getLoans, getPayments } from "@/lib/api";

// ── Role-based nav config ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Customers",  path: "/customers",  roles: ["admin", "loan_officer"] },
  { label: "Loans",      path: "/loans",       roles: ["admin", "loan_officer"] },
  { label: "Payments",   path: "/payments",    roles: ["admin", "cashier"] },
  { label: "Approvals",  path: "/approvals",   roles: ["admin", "loan_officer"], badge: true },
  { label: "Slip",       path: "/slip",        roles: ["admin", "loan_officer", "cashier"] },
  { label: "Export",     path: "/export",      roles: ["admin"] },
  { label: "Users",      path: "/users",       roles: ["admin"] },
  { label: "Schedule",   path: "/schedule",    roles: ["admin","loan_officer"] },
];

const ROLE_COLORS: Record<string, string> = {
  admin:        "bg-purple-100 text-purple-700",
  loan_officer: "bg-blue-100 text-blue-700",
  cashier:      "bg-green-100 text-green-700",
};

const ROLE_LABELS: Record<string, string> = {
  admin:        "Admin",
  loan_officer: "Loan Officer",
  cashier:      "Cashier",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans]       = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    loadData();
  }, []);

  const loadData = async () => {
    const [c, l, p] = await Promise.all([getCustomers(), getLoans(), getPayments()]);
    setCustomers(Array.isArray(c) ? c : []);
    setLoans(Array.isArray(l) ? l : []);
    setPayments(Array.isArray(p) ? p : []);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const role = user?.role || "cashier";
  const canAccess = (roles: string[]) => roles.includes(role);

  const totalDisbursed   = loans.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const totalOutstanding = loans.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
  const totalCollected   = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const kcbCollected     = payments.filter(p => p.source === "kcb_paybill").reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidLoans        = loans.filter(l => l.status === "paid").length;
  const activeLoans      = loans.filter(l => l.status === "active").length;
  const pendingLoans     = loans.filter(l => l.status === "pending").length;
  const approvedLoans    = loans.filter(l => l.status === "approved").length;
  const collectionRate   = totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Nav */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
          {user && (
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ROLE_COLORS[role] || "bg-gray-100 text-gray-600"}`}>
              {ROLE_LABELS[role] || role}
            </span>
          )}
        </div>

        <div className="flex gap-4 items-center">
          {NAV_ITEMS.filter(n => canAccess(n.roles)).map(n => (
            <button key={n.path} onClick={() => router.push(n.path)}
              className={`text-gray-600 hover:text-blue-600 ${n.path === "/approvals" ? "text-purple-600 hover:text-purple-800 font-medium" : ""}`}>
              {n.label}
              {n.badge && pendingLoans > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">{pendingLoans}</span>
              )}
            </button>
          ))}

          {user && (
            <span className="text-sm text-gray-500 border-l pl-4">
              {user.name || user.email}
            </span>
          )}
          <button onClick={logout} className="text-red-500 hover:text-red-700 text-sm">Logout</button>
        </div>
      </nav>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          {user && <span className="text-gray-500 text-sm">Welcome back, {user.name || user.email}</span>}
        </div>

        {/* Stats — admin & loan officer */}
        {canAccess(["admin", "loan_officer"]) && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">Total Customers</p>
              <p className="text-3xl font-bold text-blue-600">{customers.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">Total Loans</p>
              <p className="text-3xl font-bold text-green-600">{loans.length}</p>
              <p className="text-xs text-gray-400 mt-1">{activeLoans} active · {paidLoans} paid · {pendingLoans} pending</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">Amount Disbursed</p>
              <p className="text-3xl font-bold text-purple-600">KSh {totalDisbursed.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 cursor-pointer hover:bg-purple-50 border-2 border-purple-200" onClick={() => router.push("/approvals")}>
              <p className="text-gray-500 text-sm">Pending Approvals</p>
              <p className="text-3xl font-bold text-purple-600">{pendingLoans + approvedLoans}</p>
              <p className="text-xs text-purple-400 mt-1">Click to review</p>
            </div>
          </div>
        )}

        {/* Stats — admin & cashier */}
        {canAccess(["admin", "cashier"]) && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">Total Collected</p>
              <p className="text-3xl font-bold text-orange-600">KSh {totalCollected.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{collectionRate}% collection rate</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">Outstanding Balance</p>
              <p className="text-3xl font-bold text-red-600">KSh {totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">KCB Paybill Collections</p>
              <p className="text-3xl font-bold text-indigo-600">KSh {kcbCollected.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{payments.filter(p => p.source === "kcb_paybill").length} transactions</p>
            </div>
          </div>
        )}

        {/* Recent Loans — admin & loan officer */}
        {canAccess(["admin", "loan_officer"]) && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Recent Loans</h3>
              <button onClick={() => router.push("/loans")} className="text-blue-600 text-sm hover:underline">View all</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Balance</th>
                  <th className="pb-2">Progress</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.slice(0, 5).map((loan: any) => {
                  const balance  = parseFloat(loan.balance || 0);
                  const total    = parseFloat(loan.total_amount || 0);
                  const progress = total > 0 ? Math.max(0, 100 - (balance / total) * 100) : 0;
                  return (
                    <tr key={loan.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{loan.customer_name}</td>
                      <td className="py-2">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                      <td className="py-2 text-red-600">KSh {balance.toLocaleString()}</td>
                      <td className="py-2 w-32">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: progress + "%" }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{Math.round(progress)}% paid</p>
                      </td>
                      <td className="py-2">
                        <span className={"px-2 py-1 rounded-full text-xs " + (
                          loan.status === "paid"     ? "bg-green-100 text-green-700"  :
                          loan.status === "active"   ? "bg-blue-100 text-blue-700"   :
                          loan.status === "approved" ? "bg-teal-100 text-teal-700"   :
                          loan.status === "rejected" ? "bg-red-100 text-red-700"     :
                          "bg-yellow-100 text-yellow-700")}>
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Payments — admin & cashier */}
        {canAccess(["admin", "cashier"]) && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Recent Payments</h3>
              <button onClick={() => router.push("/payments")} className="text-blue-600 text-sm hover:underline">View all</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Loan ID</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Transaction Code</th>
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 5).map((p: any) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">#{p.loan_id}</td>
                    <td className="py-2 text-green-600 font-medium">KSh {parseFloat(p.amount).toLocaleString()}</td>
                    <td className="py-2 font-mono text-xs">{p.transaction_code || p.kcb_transaction_id || "-"}</td>
                    <td className="py-2">
                      <span className={"px-2 py-1 rounded-full text-xs " + (
                        p.source === "kcb_paybill" ? "bg-purple-100 text-purple-700" :
                        p.source === "mpesa"       ? "bg-green-100 text-green-700"  :
                        "bg-gray-100 text-gray-700")}>
                        {p.source === "kcb_paybill" ? "KCB Paybill" : p.source}
                      </span>
                    </td>
                    <td className="py-2">{new Date(p.payment_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cashier-only quick actions */}
        {role === "cashier" && (
          <div className="bg-white rounded-lg shadow p-4 mt-6">
            <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
            <div className="flex gap-4">
              <button onClick={() => router.push("/payments")} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium">
                + Record Payment
              </button>
              <button onClick={() => router.push("/slip")} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
                Print Payment Slip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
