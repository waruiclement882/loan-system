const fs = require("fs");
const path = "loan-frontend/app/approvals/page.tsx";
let c = fs.readFileSync(path, "utf8");

// Fix 1: fetch both pending and approved
c = c.replace(
  'const res = await fetch(API + "/api/loans?status=pending", { headers: getHeaders() });\n      const data = await res.json();\n      setLoans(Array.isArray(data) ? data : []);',
  `const [res, res2] = await Promise.all([
        fetch(API + "/api/loans?status=pending", { headers: getHeaders() }),
        fetch(API + "/api/loans?status=approved", { headers: getHeaders() }),
      ]);
      const [data, data2] = await Promise.all([res.json(), res2.json()]);
      const pending = Array.isArray(data) ? data.map((l) => ({...l, _stage:"pending"})) : [];
      const approved = Array.isArray(data2) ? data2.map((l) => ({...l, _stage:"approved"})) : [];
      setLoans([...pending, ...approved]);`
);

// Fix 2: add handleDisburse function after handleReject
c = c.replace(
  'const filtered = loans.filter',
  `const handleDisburse = async (id) => {
    if (!confirm("Disburse Loan #" + id + "? This will generate the repayment schedule.")) return;
    setProcessing(id);
    try {
      const res = await fetch(API + "/api/loans/" + id + "/disburse", { method:"PATCH", headers: getHeaders() });
      const data = await res.json();
      if (data.error) { setMsg({ type:"error", text:data.error }); }
      else { setMsg({ type:"success", text:"Loan #" + id + " disbursed! Repayment schedule generated." }); loadLoans(); }
    } catch { setMsg({ type:"error", text:"Failed to disburse loan" }); }
    setProcessing(null);
    setTimeout(() => setMsg(null), 4000);
  };

  const filtered = loans.filter`
);

// Fix 3: update pending count in KPI to show both
c = c.replace(
  '{ label:"Pending Approvals", val:loans.length',
  '{ label:"Pending Approvals", val:loans.filter((l) => l._stage==="pending").length'
);

// Fix 4: update card header to show correct badge and add disburse button
c = c.replace(
  '<span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">Pending</span>',
  `{loan._stage === "pending" ? (
                    <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">Pending</span>
                  ) : (
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">Approved</span>
                  )}`
);

// Fix 5: replace action buttons to show disburse for approved loans
c = c.replace(
  `                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => router.push("/loans/" + loan.id)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-semibold transition-colors">
                      View Details
                    </button>
                    {rejectId === loan.id ? (
                      <>
                        <button onClick={() => handleReject(loan.id)} disabled={processing === loan.id}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
                          {processing === loan.id ? "..." : "Confirm Reject"}
                        </button>
                        <button onClick={() => { setRejectId(null); setRejectReason(""); }}
                          className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-xl text-xs font-semibold">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleApprove(loan.id)} disabled={processing === loan.id}
                          className="flex-1 bg-[#059669] hover:bg-[#047857] text-white py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
                          {processing === loan.id ? "..." : "Approve"}
                        </button>
                        <button onClick={() => setRejectId(loan.id)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-semibold transition-colors">
                          Reject
                        </button>
                      </>
                    )}
                  </div>`,
  `                  {/* Actions */}
                  <div className="flex gap-2 flex-col">
                    <button onClick={() => router.push("/loans/" + loan.id)}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-semibold transition-colors">
                      View Details
                    </button>
                    {loan._stage === "approved" ? (
                      <button onClick={() => handleDisburse(loan.id)} disabled={processing === loan.id}
                        className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
                        {processing === loan.id ? "Disbursing..." : "Disburse Loan"}
                      </button>
                    ) : rejectId === loan.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleReject(loan.id)} disabled={processing === loan.id}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-xs font-semibold disabled:opacity-50">
                          {processing === loan.id ? "..." : "Confirm Reject"}
                        </button>
                        <button onClick={() => { setRejectId(null); setRejectReason(""); }}
                          className="px-3 bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-semibold">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(loan.id)} disabled={processing === loan.id}
                          className="flex-1 bg-[#059669] hover:bg-[#047857] text-white py-2 rounded-xl text-xs font-semibold disabled:opacity-50">
                          {processing === loan.id ? "..." : "Approve"}
                        </button>
                        <button onClick={() => setRejectId(loan.id)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-semibold">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>`
);

fs.writeFileSync(path, c, "utf8");
console.log("Done, length:", c.length);
process.exit(0);
