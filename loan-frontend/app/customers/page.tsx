"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("table");
  const [userRole, setUserRole] = useState("");

  const getHeaders = () => ({ "Content-Type":"application/json", Authorization:"Bearer " + localStorage.getItem("token") });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, lRes] = await Promise.all([
        fetch(API + "/api/customers", { headers: getHeaders() }),
        fetch(API + "/api/loans", { headers: getHeaders() }),
      ]);
      const [c, l] = await Promise.all([cRes.json(), lRes.json()]);
      setCustomers(Array.isArray(c) ? c : []);
      setLoans(Array.isArray(l) ? l : []);
    } catch {}
    setLoading(false);
  };

  const isAdmin = ["super_admin","admin","branch_admin","cashier","loan_officer"].includes(userRole);

  const getLoanInfo = (customerId: number) => {
    const customerLoans = loans.filter(l => l.customer_id === customerId);
    const activeLoans = customerLoans.filter(l => l.status === "active");
    const totalBorrowed = customerLoans.filter(l => ["active","paid"].includes(l.status)).reduce((s,l) => s + parseFloat(l.amount||0), 0);
    const outstanding = activeLoans.reduce((s,l) => s + parseFloat(l.balance||0), 0);
    return { total: customerLoans.length, active: activeLoans.length, totalBorrowed, outstanding };
  };

  const filtered = customers.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.national_id?.includes(search) ||
    String(c.id).includes(search)
  );

  const thisMonth = new Date();
  thisMonth.setDate(1);
  const newThisMonth = customers.filter(c => new Date(c.created_at) >= thisMonth).length;
  const withActiveLoans = customers.filter(c => getLoanInfo(c.id).active > 0).length;

  const avatarColor = (name: string) => {
    const colors = ["#1565C0","#0D7377","#7C3AED","#D97706","#DC2626","#059669","#0891B2","#9333EA"];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0B2545]">Customers</h1>
            <p className="text-xs text-gray-400 mt-0.5">{customers.length} total customers</p>
          </div>
          {isAdmin && (
            <button onClick={() => router.push("/customers/new")}
              className="bg-[#1565C0] hover:bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              + New Customer
            </button>
          )}
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label:"Total Customers", val:customers.length, color:"#1565C0", bg:"#EAF2FB", border:"#BFDBFE",
              icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
            { label:"Active Borrowers", val:withActiveLoans, color:"#059669", bg:"#D1FAE5", border:"#A7F3D0",
              icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>' },
            { label:"New This Month", val:newThisMonth, color:"#7C3AED", bg:"#EDE9FE", border:"#C4B5FD",
              icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl p-4 border flex items-center gap-3 shadow-sm" style={{ borderColor: k.border }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: k.bg }}
                dangerouslySetInnerHTML={{ __html: k.icon }} />
              <div>
                <p className="text-xs text-gray-400">{k.label}</p>
                <p className="text-xl font-bold" style={{ color: k.color }}>{k.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex gap-3 flex-wrap items-center">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, national ID..."
            className="flex-1 min-w-48 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30" />
          <div className="flex gap-1 ml-auto">
            {["table","cards"].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize " +
                  (view === v ? "bg-[#0B2545] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === "table" ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["#","Customer","Phone","National ID","Loans","Active","Total Borrowed","Outstanding","Joined"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((c: any) => {
                    const info = getLoanInfo(c.id);
                    const color = avatarColor(c.name);
                    return (
                      <tr key={c.id} onClick={() => router.push("/customers/" + c.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">#{c.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                              style={{ backgroundColor: color }}>
                              {c.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{c.name}</p>
                              {c.email && <p className="text-xs text-gray-400 truncate max-w-[160px]">{c.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{c.phone || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{c.national_id || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full">{info.total}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {info.active > 0 ? (
                            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">{info.active}</span>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">
                          {info.totalBorrowed > 0 ? "KSh " + info.totalBorrowed.toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {info.outstanding > 0 ? (
                            <span className="text-sm font-semibold text-amber-600">KSh {info.outstanding.toLocaleString()}</span>
                          ) : (
                            <span className="text-sm text-green-600 font-medium">Cleared</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" }) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">No customers found</div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              Showing {filtered.length} of {customers.length} customers
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c: any) => {
              const info = getLoanInfo(c.id);
              const color = avatarColor(c.name);
              return (
                <div key={c.id} onClick={() => router.push("/customers/" + c.id)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md cursor-pointer transition-all">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0"
                      style={{ backgroundColor: color }}>
                      {c.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.phone || "No phone"}</p>
                      {c.national_id && <p className="text-xs text-gray-400">ID: {c.national_id}</p>}
                    </div>
                    {info.active > 0 && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
                        {info.active} active
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-xs text-gray-400">Loans</p>
                      <p className="text-sm font-bold text-gray-800">{info.total}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-xs text-gray-400">Borrowed</p>
                      <p className="text-sm font-bold text-gray-800">{info.totalBorrowed > 0 ? (info.totalBorrowed/1000).toFixed(0)+"k" : "-"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-xs text-gray-400">Balance</p>
                      <p className={"text-sm font-bold " + (info.outstanding > 0 ? "text-amber-600" : "text-green-600")}>
                        {info.outstanding > 0 ? (info.outstanding/1000).toFixed(0)+"k" : "0"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Joined {c.created_at ? new Date(c.created_at).toLocaleDateString("en-KE", { month:"short", year:"numeric" }) : "-"}
                    </p>
                    <button onClick={e => { e.stopPropagation(); router.push("/loans?customer=" + c.id); }}
                      className="text-xs text-[#1565C0] font-semibold hover:underline">
                      View loans
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400 text-sm">No customers found</div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
