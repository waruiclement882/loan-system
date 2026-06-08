"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

const API = "https://loan-system-h794.onrender.com";

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("loans");

  // KYC states
  const [kycRecord, setKycRecord] = useState<any>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState<"national_id" | "passport_photo" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [kycMsg, setKycMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const nationalIdRef = useRef<HTMLInputElement>(null);
  const passportRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === "admin" || user?.role === "cashier";

  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };
  const authHeaders = { Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadProfile();
  }, [id]);

  useEffect(() => {
    if (activeTab === "kyc") loadKyc();
  }, [activeTab]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/customers/${id}/profile`, { headers });
      const data = await res.json();
      setProfile(data);
      setEditForm(data.customer);
    } catch { }
    setLoading(false);
  };

  const loadKyc = async () => {
    setKycLoading(true);
    try {
      const res = await fetch(`${API}/api/kyc/${id}`, { headers });
      const data = await res.json();
      setKycRecord(data);
    } catch {
      setKycRecord(null);
    }
    setKycLoading(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/customers/${id}`, {
        method: "PUT", headers,
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { setEditing(false); loadProfile(); }
    } catch { alert("Failed to update customer"); }
    setSaving(false);
  };

  const flashMsg = (type: "success" | "error", text: string) => {
    setKycMsg({ type, text });
    setTimeout(() => setKycMsg(null), 4000);
  };

  const handleUpload = async (docType: "national_id" | "passport_photo", file: File) => {
    if (!file) return;
    setUploadingType(docType);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("doc_type", docType);

      const res = await fetch(`${API}/api/kyc/${id}/upload`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        flashMsg("error", data.error);
      } else {
        flashMsg("success", data.message || "Document uploaded successfully!");
        loadKyc();
      }
    } catch {
      flashMsg("error", "Upload failed. Please try again.");
    }
    setUploadingType(null);
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${API}/api/kyc/${id}/verify`, {
        method: "PATCH", headers,
      });
      const data = await res.json();
      if (data.error) flashMsg("error", data.error);
      else { flashMsg("success", "KYC verified successfully!"); loadKyc(); loadProfile(); }
    } catch {
      flashMsg("error", "Verification failed.");
    }
    setVerifying(false);
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      const res = await fetch(`${API}/api/kyc/${id}/reject`, {
        method: "PATCH", headers,
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (data.error) flashMsg("error", data.error);
      else {
        flashMsg("success", "KYC rejected.");
        setShowRejectForm(false);
        setRejectReason("");
        loadKyc();
        loadProfile();
      }
    } catch {
      flashMsg("error", "Rejection failed.");
    }
    setRejecting(false);
  };

  const handleFileDrop = (e: React.DragEvent, docType: "national_id" | "passport_photo") => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(docType, file);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading profile...</p>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-red-400">Customer not found</p>
    </div>
  );

  const { customer, loans, payments, stats } = profile;

  const kycVerified = kycRecord?.kyc_verified;
  const hasNationalId = !!kycRecord?.national_id_url;
  const hasPassport = !!kycRecord?.passport_photo_url;
  const rejectionReason = kycRecord?.rejection_reason;

  const tabs = [
    { key: "loans", label: "Loans", count: loans?.length },
    { key: "payments", label: "Payments", count: payments?.length },
    { key: "kyc", label: "KYC", badge: kycVerified ? "verified" : hasNationalId ? "pending" : "none" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4 text-sm">
          {["dashboard", "customers", "loans", "payments"].map(p => (
            <button key={p} onClick={() => router.push("/" + p)}
              className="text-slate-500 hover:text-blue-600 capitalize transition-colors">{p}</button>
          ))}
          <button onClick={() => { localStorage.clear(); router.push("/login"); }}
            className="text-red-400 hover:text-red-600 transition-colors">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/customers")}
            className="text-slate-400 hover:text-slate-600 text-xl transition-colors">←</button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-800">{customer?.name}</h2>
              {customer?.kyc_verified && (
                <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  ✓ KYC Verified
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm">Customer Profile</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Loans", value: stats.totalLoans ?? 0 },
{ label: "Active Loans", value: stats.activeLoans ?? 0 },
{ label: "Total Paid", value: `KES ${(stats.totalPaid ?? 0).toLocaleString()}` },
{ label: "Outstanding", value: `KES ${(stats.totalOutstanding ?? 0).toLocaleString()}` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className="text-xl font-bold text-slate-800">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-700">Personal Information</h3>
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="text-sm text-blue-600 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)}
                  className="text-sm text-slate-500 border border-slate-200 px-3 py-1 rounded-lg">Cancel</button>
                <button onClick={handleUpdate} disabled={saving}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["name", "email", "phone", "address", "national_id"].map(field => (
                <div key={field}>
                  <label className="block text-xs text-slate-400 mb-1 capitalize">{field.replace("_", " ")}</label>
                  <input value={editForm[field] || ""}
                    onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                ["Name", customer?.name],
                ["Email", customer?.email],
                ["Phone", customer?.phone],
                ["Address", customer?.address],
                ["National ID", customer?.national_id],
                ["Joined", customer?.created_at ? new Date(customer.created_at).toLocaleDateString() : "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <span className="text-slate-400">{label}: </span>
                  <span className="text-slate-700 font-medium">{value || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                {tab.label}
                {"count" in tab && tab.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                  }`}>{tab.count}</span>
                )}
                {"badge" in tab && tab.badge === "verified" && (
                  <span className="text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">✓</span>
                )}
                {"badge" in tab && tab.badge === "pending" && (
                  <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">⏳</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "loans" && (
              loans?.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No loans found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["ID", "Amount", "Balance", "Status", "Due Date"].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loans?.map((loan: any) => (
                        <tr key={loan.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                          onClick={() => router.push(`/loans/${loan.id}`)}>
                          <td className="py-3 px-3 text-blue-600 font-mono text-xs">#{loan.id}</td>
                          <td className="py-3 px-3">KES {loan.amount?.toLocaleString()}</td>
                          <td className="py-3 px-3">KES {loan.balance?.toLocaleString()}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              loan.status === "active" ? "bg-green-100 text-green-700" :
                              loan.status === "completed" ? "bg-slate-100 text-slate-600" :
                              "bg-amber-100 text-amber-700"
                            }`}>{loan.status}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {activeTab === "payments" && (
              payments?.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No payments found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["ID", "Amount", "Loan", "Method", "Date"].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments?.map((pay: any) => (
                        <tr key={pay.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-3 px-3 text-slate-400 font-mono text-xs">#{pay.id}</td>
                          <td className="py-3 px-3 font-medium text-emerald-600">KES {pay.amount?.toLocaleString()}</td>
                          <td className="py-3 px-3 text-blue-600 text-xs">#{pay.loan_id}</td>
                          <td className="py-3 px-3 capitalize text-slate-500">{pay.method || "—"}</td>
                          <td className="py-3 px-3 text-slate-500">
                            {pay.created_at ? new Date(pay.created_at).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {activeTab === "kyc" && (
              <div className="space-y-6">
                {kycMsg && (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${
                    kycMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    <span>{kycMsg.type === "success" ? "✅" : "⚠️"}</span>
                    {kycMsg.text}
                  </div>
                )}

                {kycLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    Loading KYC status...
                  </div>
                ) : (
                  <>
                    <div className={`rounded-xl p-4 border flex items-center justify-between ${
                      kycVerified ? "bg-emerald-50 border-emerald-200" :
                      rejectionReason ? "bg-red-50 border-red-200" :
                      hasNationalId ? "bg-amber-50 border-amber-200" :
                      "bg-slate-50 border-slate-200"
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {kycVerified ? "✅" : rejectionReason ? "❌" : hasNationalId ? "⏳" : "📋"}
                        </span>
                        <div>
                          <p className={`font-semibold text-sm ${
                            kycVerified ? "text-emerald-700" :
                            rejectionReason ? "text-red-700" :
                            hasNationalId ? "text-amber-700" : "text-slate-600"
                          }`}>
                            {kycVerified ? "KYC Verified" :
                             rejectionReason ? "KYC Rejected" :
                             hasNationalId ? "Pending Review" : "No Documents Uploaded"}
                          </p>
                          {rejectionReason && (
                            <p className="text-xs text-red-500 mt-0.5">Reason: {rejectionReason}</p>
                          )}
                          {kycRecord?.verified_at && kycVerified && (
                            <p className="text-xs text-emerald-500 mt-0.5">
                              Verified on {new Date(kycRecord.verified_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {isAdmin && hasNationalId && !kycVerified && !showRejectForm && (
                        <div className="flex gap-2">
                          <button onClick={handleVerify} disabled={verifying}
                            className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1">
                            {verifying ? (
                              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...</>
                            ) : "✓ Verify KYC"}
                          </button>
                          <button onClick={() => setShowRejectForm(true)}
                            className="text-sm bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                            ✗ Reject
                          </button>
                        </div>
                      )}
                      {isAdmin && kycVerified && (
                        <button onClick={() => setShowRejectForm(true)}
                          className="text-sm text-red-400 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          Revoke
                        </button>
                      )}
                    </div>

                    {showRejectForm && (
                      <div className="border border-red-200 rounded-xl p-4 bg-red-50">
                        <p className="text-sm font-medium text-red-700 mb-2">Rejection Reason</p>
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Enter reason for rejection..."
                          rows={2}
                          className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white mb-3"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleReject} disabled={rejecting}
                            className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                            {rejecting ? "Rejecting..." : "Confirm Reject"}
                          </button>
                          <button onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                            className="text-sm text-slate-500 border border-slate-200 px-4 py-1.5 rounded-lg">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {([
                        { key: "national_id", label: "National ID", ref: nationalIdRef, required: true },
                        { key: "passport_photo", label: "Passport Photo", ref: passportRef, required: false },
                      ] as const).map(({ key, label, ref, required }) => {
                        const url = kycRecord?.[`${key}_url`];
                        const isUploading = uploadingType === key;
                        const isImage = url && !url.endsWith(".pdf");
                        return (
                          <div key={key} className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{key === "national_id" ? "🪪" : "📷"}</span>
                                <span className="text-sm font-medium text-slate-700">{label}</span>
                                {required && <span className="text-xs text-red-400">*required</span>}
                              </div>
                              {url && (
                                <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">✓ Uploaded</span>
                              )}
                            </div>
                            <div className="p-4">
                              {url ? (
                                <div className="space-y-3">
                                  {isImage ? (
                                    <img src={url} alt={label}
                                      className="w-full h-40 object-cover rounded-lg border border-slate-200" />
                                  ) : (
                                    <div className="w-full h-40 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
                                      <span className="text-4xl mb-2">📄</span>
                                      <p className="text-xs text-slate-400">PDF Document</p>
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <a href={url} target="_blank" rel="noreferrer"
                                      className="flex-1 text-center text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                                      👁️ View
                                    </a>
                                    <button onClick={() => ref.current?.click()} disabled={!!uploadingType}
                                      className="flex-1 text-center text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                                      🔄 Replace
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onDragOver={e => { e.preventDefault(); setDragOver(key); }}
                                  onDragLeave={() => setDragOver(null)}
                                  onDrop={e => handleFileDrop(e, key)}
                                  onClick={() => !isUploading && ref.current?.click()}
                                  className={`h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                                    dragOver === key ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                                  }`}>
                                  {isUploading ? (
                                    <>
                                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                                      <p className="text-xs text-blue-500">Uploading...</p>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-3xl mb-2">☁️</span>
                                      <p className="text-xs text-slate-500 font-medium">Drop file or <span className="text-blue-500">browse</span></p>
                                      <p className="text-xs text-slate-300 mt-1">JPG, PNG, PDF — max 5MB</p>
                                    </>
                                  )}
                                </div>
                              )}
                              <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                                onChange={e => { const file = e.target.files?.[0]; if (file) handleUpload(key, file); }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!hasNationalId && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                        ⚠️ National ID is required before KYC can be verified.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}