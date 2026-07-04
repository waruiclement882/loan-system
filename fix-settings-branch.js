const fs = require('fs');
const filePath = 'loan-frontend/app/settings/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add branch assignment states
content = content.replace(
  `  const [message, setMessage] = useState("");`,
  `  const [message, setMessage] = useState("");
  const [branches, setBranches] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [assignType, setAssignType] = useState("customer");
  const [selectedId, setSelectedId] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");`
);

// Add loadBranches and loadData functions
content = content.replace(
  `  const loadSettings = async () => {`,
  `  const loadBranches = async () => {
    try {
      const [branchRes, customerRes, loanRes] = await Promise.all([
        fetch(\`\${API}/api/branches\`, { headers: getHeaders() }),
        fetch(\`\${API}/api/customers\`, { headers: getHeaders() }),
        fetch(\`\${API}/api/loans\`, { headers: getHeaders() })
      ]);
      const branchData = await branchRes.json();
      const customerData = await customerRes.json();
      const loanData = await loanRes.json();
      setBranches(Array.isArray(branchData) ? branchData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
      setLoans(Array.isArray(loanData) ? loanData : []);
    } catch {}
  };

  const handleAssign = async () => {
    if (!selectedId || !selectedBranch) { setAssignMsg("❌ Please select both item and branch"); return; }
    setAssigning(true);
    try {
      const endpoint = assignType === "customer" 
        ? \`\${API}/api/customers/\${selectedId}/branch\`
        : \`\${API}/api/loans/\${selectedId}/branch\`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ branch_id: parseInt(selectedBranch) })
      });
      const data = await res.json();
      if (data.error) setAssignMsg("❌ " + data.error);
      else { setAssignMsg("✅ Assigned successfully!"); setSelectedId(""); loadBranches(); }
    } catch { setAssignMsg("❌ Failed to assign"); }
    setAssigning(false);
  };

  const loadSettings = async () => {`
);

// Add loadBranches to useEffect
content = content.replace(
  `    loadSettings();`,
  `    loadSettings();
    loadBranches();`
);

// Add branch assignment section before Save button
content = content.replace(
  `        <button onClick={handleSave} disabled={saving}`,
  `        {/* Branch Assignment */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 text-gray-700">🏢 Branch Assignment</h3>
          <p className="text-sm text-gray-500 mb-4">Manually reassign customers or loans to a different branch</p>
          
          {assignMsg && (
            <div className={\`mb-4 p-3 rounded-lg text-sm \${assignMsg.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}\`}>
              {assignMsg} <button onClick={() => setAssignMsg("")} className="ml-2 underline text-xs">dismiss</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={assignType} onChange={e => { setAssignType(e.target.value); setSelectedId(""); }}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="customer">Customer</option>
                <option value="loan">Loan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {assignType === "customer" ? "Select Customer" : "Select Loan"}
              </label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">-- Select --</option>
                {assignType === "customer" 
                  ? customers.map((c: any) => (
                      <option key={c.id} value={c.id}>#{c.id} — {c.name} (Branch {c.branch_id || "?"})</option>
                    ))
                  : loans.filter((l: any) => l.status !== "paid").map((l: any) => (
                      <option key={l.id} value={l.id}>#{l.id} — {l.customer_name} KSh {parseFloat(l.amount).toLocaleString()} (Branch {l.branch_id || "?"})</option>
                    ))
                }
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Branch</label>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">-- Select Branch --</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleAssign} disabled={assigning || !selectedId || !selectedBranch}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            {assigning ? "Assigning..." : "✅ Assign to Branch"}
          </button>
        </div>

        <button onClick={handleSave} disabled={saving}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Branch assignment added to settings!');