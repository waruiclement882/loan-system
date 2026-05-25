"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "https://loan-system-h794.onrender.com";

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    fetch(API + "/api/reports/audit", { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json()).then(d => { setLogs(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">PAR</button>
          <button onClick={() => router.push("/collection")} className="text-gray-600 hover:text-blue-600">Collection</button>
        </div>
      </nav>
      <div className="p-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Activity / Audit Logs</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? <p className="p-8 text-center text-gray-400">Loading logs...</p> :
          logs.length === 0 ? <p className="p-8 text-center text-gray-400">No activity logs yet</p> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-500">
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-6 py-3 font-medium">{log.user_name || "System"}</td>
                    <td className="px-6 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{log.action}</span></td>
                    <td className="px-6 py-3">{log.entity || "-"}</td>
                    <td className="px-6 py-3">{log.entity_id ? "#" + log.entity_id : "-"}</td>
                    <td className="px-6 py-3 text-xs text-gray-400">{log.ip_address || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
