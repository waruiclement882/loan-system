"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

const MODULES = [
  { id:"dashboard",label:"Dashboard",icon:"📊",path:"/dashboard",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#1565C0" },
  { id:"loans",label:"Loans",icon:"💰",path:"/loans",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#1B8A5A" },
  { id:"customers",label:"Customers",icon:"👥",path:"/customers",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#0D7377" },
  { id:"payments",label:"Payments",icon:"💳",path:"/payments",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#7B4FD4" },
  { id:"approvals",label:"Approvals",icon:"✅",path:"/approvals",roles:["super_admin","admin","branch_admin"],color:"#E67E22" },
  { id:"matching",label:"Match Payments",icon:"🔗",path:"/matching",roles:["super_admin","admin","branch_admin","cashier"],color:"#C0392B" },
  { id:"suspense",label:"Suspense",icon:"⏸️",path:"/suspense",roles:["super_admin","admin","branch_admin","cashier"],color:"#2C3E50" },
  { id:"float",label:"Float",icon:"🏦",path:"/float",roles:["super_admin","admin","branch_admin","cashier"],color:"#16A085" },
  { id:"accounting",label:"Accounting",icon:"📊",path:"/financial-statements",roles:["super_admin","admin","cfo"],color:"#0B2545" },
  { id:"expenses",label:"Expenses",icon:"📋",path:"/expenses",roles:["super_admin","admin","branch_admin","cfo"],color:"#8E44AD" },
  { id:"reports",label:"Reports",icon:"📈",path:"/reports",roles:["super_admin","admin","branch_admin","cfo"],color:"#1A5276" },
  { id:"par",label:"PAR",icon:"⚠️",path:"/par",roles:["super_admin","admin","branch_admin","cfo"],color:"#E74C3C" },
  { id:"schedule",label:"Schedule",icon:"📅",path:"/schedule",roles:["super_admin","admin","branch_admin","cashier","loan_officer","cfo"],color:"#27AE60" },
  { id:"collection",label:"Collection Sheet",icon:"📝",path:"/collection",roles:["super_admin","admin","branch_admin","cashier","loan_officer"],color:"#2980B9" },
  { id:"branches",label:"Branches",icon:"🏢",path:"/branches",roles:["super_admin","admin"],color:"#1A252F" },
  { id:"users",label:"Users",icon:"👤",path:"/users",roles:["super_admin","admin"],color:"#1A252F" },
  { id:"audit",label:"Audit Log",icon:"🔍",path:"/audit",roles:["super_admin","admin"],color:"#1A252F" },
  { id:"settings",label:"Settings",icon:"⚙️",path:"/settings",roles:["super_admin","admin"],color:"#1A252F" },
];

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [unmatched, setUnmatched] = useState(0);
  const [pendingLoans, setPendingLoans] = useState(0);
  const [showApps, setShowApps] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [search, setSearch] = useState("");
  const appsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    setUserName(user.name || user.full_name || "");
    loadBadges();
    const handler = (e: MouseEvent) => {
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) setShowApps(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadBadges = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [u, l] = await Promise.all([
        fetch(`${API}/api/payments/unmatched`, { headers }),
        fetch(`${API}/api/loans?status=pending`, { headers }),
      ]);
      const ud = await u.json(); const ld = await l.json();
      setUnmatched(Array.isArray(ud) ? ud.length : 0);
      setPendingLoans(Array.isArray(ld) ? ld.length : 0);
    } catch {}
  };

  const logout = () => { localStorage.clear(); router.push("/login"); };
  const visibleModules = MODULES.filter(m => m.roles.includes(userRole));
  const filteredModules = search ? visibleModules.filter(m => m.label.toLowerCase().includes(search.toLowerCase())) : visibleModules;
  const currentModule = MODULES.find(m => pathname.startsWith(m.path));
  const roleLabel: Record<string,string> = {
    super_admin:"Super Admin",admin:"Admin",branch_admin:"Branch Admin",
    cashier:"Cashier",loan_officer:"Loan Officer",cfo:"CFO"
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-12 bg-[#0B2545] flex items-center px-3 gap-2 shadow-lg">
      <div ref={appsRef} className="relative">
        <button onClick={() => { setShowApps(!showApps); setShowUser(false); }}
          className="w-9 h-9 flex items-center justify-center rounded hover:bg-white/10 transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
            <rect x="0" y="0" width="7" height="7" rx="1.5"/><rect x="11" y="0" width="7" height="7" rx="1.5"/>
            <rect x="0" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/>
          </svg>
        </button>
        {showApps && (
          <div className="absolute top-11 left-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1565C0]" />
            </div>
            <div className="p-3 grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {filteredModules.map(m => (
                <button key={m.id} onClick={() => { router.push(m.path); setShowApps(false); setSearch(""); }}
                  className="flex flex-col items-center p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-1.5"
                    style={{ backgroundColor: m.color + "15" }}>
                    {m.icon}
                  </div>
                  <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{m.label}</span>
                </button>
              ))}
            </div>
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
              <button onClick={() => { router.push("/home"); setShowApps(false); }}
                className="w-full text-xs text-center text-[#1565C0] font-medium hover:underline">
                View all modules →
              </button>
            </div>
          </div>
        )}
      </div>

      <button onClick={() => router.push("/home")} className="flex items-center gap-2 px-2">
        <div className="w-7 h-7 bg-[#F4A026] rounded-lg flex items-center justify-center">
          <span className="text-xs font-black text-[#0B2545]">LL</span>
        </div>
        <span className="text-white font-semibold text-sm hidden sm:block">Lunar Lumina</span>
      </button>

      {currentModule && (
        <div className="flex items-center gap-1 text-white/50 text-sm">
          <span>/</span>
          <span className="text-white/80 text-xs">{currentModule.label}</span>
        </div>
      )}

      <div className="hidden md:flex items-center gap-1 ml-2">
        {[{label:"Dashboard",path:"/dashboard"},{label:"Loans",path:"/loans"},{label:"Customers",path:"/customers"},{label:"Payments",path:"/payments"}].map(link => (
          <button key={link.path} onClick={() => router.push(link.path)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${pathname.startsWith(link.path) ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
            {link.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {pendingLoans > 0 && (
        <button onClick={() => router.push("/approvals")}
          className="relative flex items-center justify-center w-8 h-8 rounded hover:bg-white/10">
          <span className="text-lg">✅</span>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F4A026] text-[#0B2545] text-[9px] font-bold rounded-full flex items-center justify-center">{pendingLoans}</span>
        </button>
      )}
      {unmatched > 0 && (
        <button onClick={() => router.push("/matching")}
          className="relative flex items-center justify-center w-8 h-8 rounded hover:bg-white/10">
          <span className="text-lg">🔗</span>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unmatched}</span>
        </button>
      )}

      <div ref={userRef} className="relative">
        <button onClick={() => { setShowUser(!showUser); setShowApps(false); }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <div className="w-7 h-7 bg-[#1D9E75] rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="hidden md:block text-left">
            <p className="text-white text-xs font-medium leading-tight">{userName.split(" ")[0]}</p>
            <p className="text-white/50 text-[10px] leading-tight">{roleLabel[userRole] || userRole}</p>
          </div>
        </button>
        {showUser && (
          <div className="absolute top-11 right-0 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{userName}</p>
              <p className="text-xs text-gray-500">{roleLabel[userRole] || userRole}</p>
            </div>
            <div className="py-1">
              {[{label:"Home",path:"/home",icon:"🏠"},{label:"Dashboard",path:"/dashboard",icon:"📊"},{label:"Settings",path:"/settings",icon:"⚙️"}].map(item => (
                <button key={item.path} onClick={() => { router.push(item.path); setShowUser(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 py-1">
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <span>🚪</span>Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}