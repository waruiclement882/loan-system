"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  // Safely extract details text from JSON or string
  const getDetailsText = (details: any): string => {
    if (!details) return "—";
    if (typeof details === "string") {
      try {
        const parsed = JSON.parse(details);
        return parsed.message || parsed.details || JSON.stringify(parsed);
      } catch {
        return details;
      }
    }
    if (typeof details === "object") {
      return details.message || details.details || JSON.stringify(details);
    }
    return String(details);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    loadLogs();
  }, []);

  useEffect(() => {
    let result = logs;
    if (search) {
      result = result.filter(l =>
        l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        getDetailsText(l.details).toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filterAction) {
      result = result.filter(l => l.action === filterAction);
    }
    setFiltered(result);
  }, [search, filterAction, logs]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/audit`, { headers: getHeaders() });
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
      setFiltered(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    }
    setLoading(false);
  };

  const exportCSV = () => {
    const csv = [
      ["Time", "User", "Action", "Details", "Entity"].join(","),
      ...filtered.map(l => [
        new Date(l.created_at).toLocaleString(),
        l.user_name || "System",
        l.action,
        `"${getDetailsText(l.details)}"`,
        `${l.entity || ""} ${l.entity_id ? "#" + l.entity_id : ""}`
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit-logs.csv"; a.click();
  };

  const actionColor = (action: string) => {
    if (action?.includes("APPROVE") || action?.includes("DISBURSE")) return "bg-green-100 text-green-700";
    if (action?.includes("REJECT") || action?.includes("DELETE")) return "bg-red-100 text-red-700";
    if (action?.includes("CREATE")) return "bg-blue-100 text-blue-700";
    if (action?.includes("LOGIN")) return "bg-purple-100 text-purple-700";
    if (action?.includes("PAYMENT") || action?.includes("MATCH")) return "bg-orange-100 text-orange-700";
    return "bg-gray-100 text-gray-600";
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-4 md:px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-3 items-center">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600 text-sm">Dashboard</button>
          <button onClick={() => router.push("/settings")} className="text-gray-600 hover:text-blue-600 text-sm">Settings</button>
          <button onClick={() => router.push("/users")} className="text-gray-600 hover:text-blue-600 text-sm">Users</button>
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600 text-sm">?? PAR</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600 text-sm">Statement</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 text-sm">Logout</button>
        </div>
      </nav>

      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">📋 Audit Logs</h2>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700">⬇ Export</button>
            <button onClick={loadLogs} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">🔄 Refresh</button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by user, action, or details..."
              className="flex-1 border rounded-lg px-4 py-2 text-sm" />
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All Actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => { setSearch(""); setFilterAction(""); }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
              Clear
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">{filtered.length} of {logs.length} entries</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading audit logs...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-4">Time</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">Entity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No audit logs found</td></tr>
                ) : filtered.map((log: any) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-KE")}
                    </td>
                    <td className="p-4 font-medium">{log.user_name || "System"}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 max-w-xs truncate">
                      {getDetailsText(log.details)}
                    </td>
                    <td className="p-4 text-gray-400 text-xs">
                      {log.entity} {log.entity_id ? `#${log.entity_id}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

