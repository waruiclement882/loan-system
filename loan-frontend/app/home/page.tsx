"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

const ALL_MODULES = [
  { id:"dashboard",label:"Dashboard",icon:"D",path:"/dashboard",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#1565C0",bg:"#EAF2FB",desc:"Overview & key metrics",group:"Overview" },
  { id:"loans",label:"Loans",icon:"L",path:"/loans",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#1B8A5A",bg:"#E8F5EF",desc:"Loan portfolio & disbursements",group:"Overview" },
  { id:"customers",label:"Customers",icon:"C",path:"/customers",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#0D7377",bg:"#E0F4F4",desc:"Customer profiles & KYC",group:"Overview" },
  { id:"payments",label:"Payments",icon:"P",path:"/payments",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#7B4FD4",bg:"#F0EAF9",desc:"Payment collection & history",group:"Overview" },
  { id:"approvals",label:"Approvals",icon:"A",path:"/approvals",roles:["super_admin","admin","branch_admin"],color:"#E67E22",bg:"#FEF3E2",desc:"Pending loan approvals",group:"Operations" },
  { id:"matching",label:"Match Payments",icon:"M",path:"/matching",roles:["super_admin","admin","branch_admin","cashier"],color:"#C0392B",bg:"#FCEAE9",desc:"Match unallocated payments",group:"Operations" },
  { id:"suspense",label:"Suspense",icon:"S",path:"/suspense",roles:["super_admin","admin","branch_admin","cashier"],color:"#2C3E50",bg:"#EAECEE",desc:"Suspense account management",group:"Operations" },
  { id:"float",label:"Float",icon:"F",path:"/float",roles:["super_admin","admin","branch_admin","cashier"],color:"#16A085",bg:"#E0F5F1",desc:"Float & liquidity management",group:"Operations" },
  { id:"par",label:"PAR",icon:"R",path:"/par",roles:["super_admin","admin","branch_admin","cfo"],color:"#E74C3C",bg:"#FDECEA",desc:"Portfolio at Risk analysis",group:"Operations" },
  { id:"arrears",label:"Loan Arrears",icon:"X",path:"/arrears",roles:["super_admin","admin","branch_admin"],color:"#D35400",bg:"#FDF0E8",desc:"Overdue loans management",group:"Operations" },
  { id:"accounting",label:"Accounting",icon:"$",path:"/financial-statements",roles:["super_admin","admin","cfo"],color:"#0B2545",bg:"#E8EDF4",desc:"Financial statements & reports",group:"Accounting" },
  { id:"expenses",label:"Expenses",icon:"E",path:"/expenses",roles:["super_admin","admin","branch_admin","cfo"],color:"#8E44AD",bg:"#F4ECF7",desc:"Expenses & bad debt tracking",group:"Accounting" },
  { id:"expense-approvals",label:"Expense Approvals",icon:"V",path:"/expense-approvals",roles:["super_admin","admin","branch_admin"],color:"#6C3483",bg:"#F4ECF7",desc:"Approve expenses & issue vouchers",group:"Accounting" },
  { id:"cash-count",label:"Cash Count",icon:"H",path:"/cash-count",roles:["super_admin","admin","branch_admin","cashier"],color:"#117A65",bg:"#E8F6F3",desc:"Daily cash count & owner drawings",group:"Accounting" },
  { id:"reports",label:"Reports",icon:"G",path:"/reports",roles:["super_admin","admin","branch_admin","cfo"],color:"#1A5276",bg:"#EAF2F8",desc:"Portfolio & collection reports",group:"Accounting" },
  { id:"schedule",label:"Schedule",icon:"T",path:"/schedule",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#27AE60",bg:"#E9F7EF",desc:"Repayment schedules",group:"Records" },
  { id:"statement",label:"Statement",icon:"N",path:"/statement",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#2980B9",bg:"#EAF4FB",desc:"Loan statements",group:"Records" },
  { id:"collection",label:"Collection Sheet",icon:"K",path:"/collection",roles:["super_admin","admin","branch_admin","cashier","loan_officer"],color:"#148F77",bg:"#E8F8F5",desc:"Daily collection sheets",group:"Records" },
  { id:"export",label:"Export",icon:"Z",path:"/export",roles:["super_admin","admin","cfo"],color:"#2E4053",bg:"#EAECEE",desc:"Export data to Excel/PDF",group:"Records" },
  { id:"branches",label:"Branches",icon:"B",path:"/branches",roles:["super_admin","admin"],color:"#1A252F",bg:"#EAECEE",desc:"Branch management",group:"Admin" },
  { id:"users",label:"Users",icon:"U",path:"/users",roles:["super_admin","admin"],color:"#1A252F",bg:"#EAECEE",desc:"User & role management",group:"Admin" },
  { id:"audit",label:"Audit Log",icon:"Q",path:"/audit",roles:["super_admin","admin","cfo"],color:"#1A252F",bg:"#EAECEE",desc:"System audit trail",group:"Admin" },
  { id:"settings",label:"Settings",icon:"W",path:"/settings",roles:["super_admin","admin"],color:"#1A252F",bg:"#EAECEE",desc:"System configuration",group:"Admin" },
];

const GROUP_ORDER = ["Overview","Operations","Accounting","Records","Admin"];

export default function HomePage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [unmatched, setUnmatched] = useState(0);
  const [pendingLoans, setPendingLoans] = useState(0);
  const [search, setSearch] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    setUserName(user.name || user.full_name || "");
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    loadStats();
  }, []);

  const loadStats = async () => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [sRes, uRes, lRes] = await Promise.all([
        fetch(`${API}/api/reports/summary`, { headers }),
        fetch(`${API}/api/payments/unmatched`, { headers }),
        fetch(`${API}/api/loans?status=pending`, { headers }),
      ]);
      const [s, u, l] = await Promise.all([sRes.json(), uRes.json(), lRes.json()]);
      setStats(s);
      setUnmatched(Array.isArray(u) ? u.length : 0);
      setPendingLoans(Array.isArray(l) ? l.length : 0);
    } catch {}
  };

  const roleLabel: Record<string,string> = {
    super_admin:"Super Admin",admin:"Admin",branch_admin:"Branch Admin",
    cashier:"Cashier",loan_officer:"Loan Officer",cfo:"CFO"
  };

  const visibleModules = ALL_MODULES.filter(m => m.roles.includes(userRole));
  const filteredModules = search
    ? visibleModules.filter(m => m.label.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase()))
    : visibleModules;

  const groupedModules = GROUP_ORDER.reduce((acc: any, g) => {
    const mods = filteredModules.filter(m => m.group === g);
    if (mods.length) acc[g] = mods;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <div className="bg-[#0B2545] pt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[#F4A026] text-sm font-medium mb-1">{greeting}</p>
              <h1 className="text-white text-2xl font-bold">{userName}</h1>
              <p className="text-white/50 text-sm mt-1">{roleLabel[userRole] || userRole} · Lunar Lumina Solutions</p>
            </div>
            {stats && (
              <div className="flex gap-3 flex-wrap">
                {[
                  { label:"Active Loans", val:stats.active_loans || 0 },
                  { label:"Outstanding", val:"KSh " + Math.round(stats.total_outstanding || 0).toLocaleString() },
                  { label:"Collection Rate", val:(stats.collection_rate || 0) + "%" },
                ].map(s => (
                  <div key={s.label} className="bg-white/10 rounded-xl px-4 py-3 min-w-[110px]">
                    <p className="text-white/50 text-xs">{s.label}</p>
                    <p className="text-white font-bold text-lg mt-0.5">{s.val}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4 flex-wrap">
            {pendingLoans > 0 && (
              <button onClick={() => router.push("/approvals")}
                className="flex items-center gap-2 bg-[#F4A026]/20 border border-[#F4A026]/30 text-[#F4A026] px-4 py-2 rounded-lg text-sm hover:bg-[#F4A026]/30">
                {pendingLoans} loan{pendingLoans > 1 ? "s" : ""} pending approval
              </button>
            )}
            {unmatched > 0 && (
              <button onClick={() => router.push("/matching")}
                className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm hover:bg-red-500/30">
                {unmatched} unmatched payment{unmatched > 1 ? "s" : ""}
              </button>
            )}
          </div>
          <div className="mt-5 max-w-md">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules..."
              className="w-full bg-white/10 text-white placeholder-white/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F4A026]/50" />
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {Object.entries(groupedModules).map(([group, modules]: any) => (
          <div key={group} className="mb-8">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{group}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {modules.map((m: any) => (
                <button key={m.id} onClick={() => router.push(m.path)}
                  className="group bg-white rounded-2xl p-4 flex flex-col items-center gap-3 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-gray-100 relative">
                  {m.id === "approvals" && pendingLoans > 0 && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-[#F4A026] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{pendingLoans}</span>
                  )}
                  {m.id === "matching" && unmatched > 0 && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unmatched}</span>
                  )}
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-transform group-hover:scale-110"
                    style={{ backgroundColor: m.bg, color: m.color }}>
                    {m.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{m.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight hidden sm:block">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(groupedModules).length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No modules found for "{search}"</p>
          </div>
        )}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
          <p className="text-xs text-gray-400">Lunar Lumina Solutions · Microfinance Management System</p>
          <p className="text-xs text-gray-400">Rongai, Nairobi · 0732 378 663</p>
        </div>
      </div>
    </div>
  );
}