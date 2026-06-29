"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavLink = {
  label: string;
  path: string;
  show: boolean;
  badge?: number;
  group: string;
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("Blessed Ventures");
  const [unmatched, setUnmatched] = useState(0);
  const [pendingLoans, setPendingLoans] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    setUserName(user.name || user.full_name || "");
    loadBadges();
  }, []);

  const loadBadges = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [unmatchedRes, settingsRes, loansRes] = await Promise.all([
        fetch(`${API}/api/payments/unmatched`, { headers }),
        fetch(`${API}/api/settings`),
        fetch(`${API}/api/loans?status=pending`, { headers }),
      ]);
      const unmatchedData = await unmatchedRes.json();
      const settingsData = await settingsRes.json();
      const loansData = await loansRes.json();
      setUnmatched(Array.isArray(unmatchedData) ? unmatchedData.length : 0);
      if (settingsData.company_name) setCompanyName(settingsData.company_name);
      setPendingLoans(Array.isArray(loansData) ? loansData.length : 0);
    } catch {}
  };

  const logout = () => { localStorage.clear(); router.push("/login"); };
  const isAdmin = ["admin", "cashier"].includes(userRole);

  const navLinks: NavLink[] = [
    { label: "Dashboard", path: "/dashboard", show: true, group: "Overview" },
    { label: "Customers", path: "/customers", show: true, group: "Overview" },
    { label: "Loans", path: "/loans", show: true, group: "Overview" },
    { label: "Payments", path: "/payments", show: true, group: "Overview" },

    { label: "Approvals", path: "/approvals", show: isAdmin, badge: pendingLoans, group: "Operations" },
    { label: "Match Payments", path: "/matching", show: isAdmin, badge: unmatched, group: "Operations" },
    { label: "Suspense", path: "/suspense", show: isAdmin, group: "Operations" },
    { label: "Float", path: "/float", show: isAdmin, group: "Operations" },
    { label: "PAR", path: "/par", show: isAdmin, group: "Operations" },

    { label: "Schedule", path: "/schedule", show: true, group: "Records" },
    { label: "Statement", path: "/statement", show: true, group: "Records" },
    { label: "Payment Slip", path: "/slip", show: true, group: "Records" },
    { label: "Collection Sheet", path: "/collection", show: isAdmin, group: "Records" },
    { label: "Reports", path: "/reports", show: isAdmin, group: "Records" },
    { label: "P&L / Expenses", path: "/expenses", show: isAdmin, group: "Records" },
    { label: "Export", path: "/export", show: isAdmin, group: "Records" },

    { label: "Users", path: "/users", show: userRole === "admin", group: "Admin" },
    { label: "Audit Log", path: "/audit", show: userRole === "admin", group: "Admin" },
    { label: "Settings", path: "/settings", show: userRole === "admin", group: "Admin" },
  ];

  const groups = ["Overview", "Operations", "Records", "Admin"];
  const visibleLinks = navLinks.filter(l => l.show);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#04342C] text-white w-9 h-9 rounded-lg flex items-center justify-center"
      >
        {collapsed ? "☰" : "✕"}
      </button>

      <aside className={`fixed lg:static top-0 left-0 h-screen w-64 bg-[#04342C] text-white flex flex-col z-40 transition-transform duration-200 ${
        collapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0"
      }`}>
        {/* Brand */}
        <div className="px-5 py-5 border-b border-emerald-900/60">
          <p className="text-base font-bold tracking-tight leading-tight">{companyName}</p>
          <p className="text-[11px] text-emerald-400 font-medium uppercase tracking-widest mt-0.5">Microfinance</p>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {groups.map(group => {
            const links = visibleLinks.filter(l => l.group === group);
            if (links.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-semibold px-3 mb-1.5">{group}</p>
                {links.map(link => {
                  const active = pathname === link.path;
                  return (
                    <button
                      key={link.path}
                      onClick={() => { router.push(link.path); setCollapsed(true); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                        active ? "bg-[#0F6E56] text-white font-medium" : "text-emerald-100/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{link.label}</span>
                      {link.badge ? (
                        <span className="bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold">
                          {link.badge > 9 ? "9+" : link.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-emerald-900/60">
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {userName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-white truncate">{userName}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                userRole === "admin" ? "bg-red-500/20 text-red-200" :
                userRole === "cashier" ? "bg-purple-500/20 text-purple-200" :
                "bg-emerald-500/20 text-emerald-200"
              }`}>{userRole}</span>
            </div>
          </div>
          <button onClick={logout}
            className="w-full text-xs text-emerald-200/70 hover:text-red-300 transition-colors border border-emerald-800 px-3 py-2 rounded-lg">
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {!collapsed && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setCollapsed(true)} />
      )}
    </>
  );
}

