"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Layout from "../../components/Layout";

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
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState({ category: "visit", note: "" });
  const [addingNote, setAddingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({ location: "", nearest_landmark: "", latitude: "", longitude: "" });
  const [savingLocation, setSavingLocation] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadAll();
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProfile(), loadKyc(), loadNotes()]);
    setLoading(false);
  };

  const loadProfile = async () => {
    try {
      const res = await fetch(API + "/api/customers/" + id + "/profile", { headers });
      const data = await res.json();
      setProfile(data);
      setEditForm(data.customer || {});
      setLocationForm({
        location: data.customer?.location || "",
        nearest_landmark: data.customer?.nearest_landmark || "",
        latitude: data.customer?.latitude || "",
        longitude: data.customer?.longitude || "",
      });
    } catch {}
  };

  const loadKyc = async () => {
    try {
      const res = await fetch(API + "/api/kyc/" + id, { headers });
      const data = await res.json();
      if (data && !data.error && (data.customer_id || data.national_id_url)) setKycDocs([data]);
      else setKycDocs([]);
    } catch {}
  };

  const loadNotes = async () => {
    try {
      const res = await fetch(API + "/api/customers/" + id + "/notes", { headers });
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch {}
  };

  const verifyKyc = async () => {
    try {
      const res = await fetch(API + "/api/kyc/" + id + "/verify", { method: "PATCH", headers });
      const data = await res.json();
      if (data.error) alert("Error: " + data.error);
      else { alert("✅ KYC verified!"); loadKyc(); loadProfile(); }
    } catch { alert("Failed to verify KYC"); }
  };

  const rejectKyc = async () => {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    try {
      const res = await fetch(API + "/api/kyc/" + id + "/reject", { method: "PATCH", headers, body: JSON.stringify({ reason }) });
      const data = await res.json();
      if (data.error) alert("Error: " + data.error);
      else { alert("KYC rejected!"); loadKyc(); loadProfile(); }
    } catch { alert("Failed to reject KYC"); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(API + "/api/customers/" + id, { method: "PUT", headers, body: JSON.stringify(editForm) });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { setEditing(false); loadProfile(); }
    } catch { alert("Failed to update"); }
    setSaving(false);
  };

  const handleKycUpload = async (e: any, docType: string) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("doc_type", docType);
      const res = await fetch(API + "/api/kyc/" + id + "/upload", {
        method: "POST", headers: { Authorization: "Bearer " + token }, body: formData
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { alert("Document uploaded!"); loadKyc(); }
    } catch { alert("Upload failed"); }
    setUploading(false);
  };

  const saveNote = async () => {
    if (!newNote.note.trim()) { alert("Please enter a note"); return; }
    setSavingNote(true);
    try {
      const res = await fetch(API + "/api/customers/" + id + "/notes", {
        method: "POST", headers, body: JSON.stringify(newNote)
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { setNotes([data, ...notes]); setNewNote({ category: "visit", note: "" }); setAddingNote(false); }
    } catch { alert("Failed to save note"); }
    setSavingNote(false);
  };

  const deleteNote = async (noteId: number) => {
    if (!confirm("Delete this note?")) return;
    await fetch(API + "/api/customers/" + id + "/notes/" + noteId, { method: "DELETE", headers });
    setNotes(notes.filter((n: any) => n.id !== noteId));
  };

  const saveLocation = async () => {
    setSavingLocation(true);
    try {
      const body: any = { location: locationForm.location, nearest_landmark: locationForm.nearest_landmark };
      if (locationForm.latitude) body.latitude = parseFloat(locationForm.latitude);
      if (locationForm.longitude) body.longitude = parseFloat(locationForm.longitude);
      const res = await fetch(API + "/api/customers/" + id + "/location", {
        method: "PATCH", headers, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { setEditingLocation(false); loadProfile(); }
    } catch { alert("Failed to save location"); }
    setSavingLocation(false);
  };

  const openMaps = () => {
    const c = profile?.customer;
    if (c?.latitude && c?.longitude) {
      window.open(`https://www.google.com/maps?q=${c.latitude},${c.longitude}`, "_blank");
    } else if (c?.location) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(c.location + " Kenya")}`, "_blank");
    } else {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent((c?.name || "") + " Kenya")}`, "_blank");
    }
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading profile...</p></div></Layout>;
  if (!profile) return <Layout><div className="flex items-center justify-center h-64"><p className="text-red-400">Customer not found</p></div></Layout>;

  const { customer, loans, payments, stats } = profile;
  const kyc = kycDocs[0];
  const kycStatus = kyc?.kyc_verified ? "verified" : kyc?.national_id_url ? "pending" : "none";

  const categoryColors: any = { call: "bg-blue-100 text-blue-700", visit: "bg-green-100 text-green-700", payment: "bg-purple-100 text-purple-700", other: "bg-gray-100 text-gray-600" };
  const categoryIcons: any = { call: "📞", visit: "🚶", payment: "💳", other: "📌" };

  const tabs = [
    { key: "loans", label: "📋 Loans" },
    { key: "payments", label: "💳 Payments" },
    { key: "notes", label: `📝 Notes ${notes.length > 0 ? `(${notes.length})` : ""}` },
    { key: "kyc", label: "🪪 KYC" },
    { key: "details", label: "👤 Details" },
  ];

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Back */}
        <button onClick={() => router.push("/customers")} className="text-blue-600 hover:underline text-sm mb-4 flex items-center gap-1">← Back to Customers</button>

        {/* Header */}
        <div className="bg-white rounded-xl shadow p-5 mb-4">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#04342C] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {customer?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{customer?.name}</h1>
                <p className="text-gray-500 text-sm">{customer?.phone} · {customer?.national_id || "No ID"}</p>
                {customer?.location && (
                  <p className="text-gray-400 text-xs mt-0.5">📍 {customer.location}{customer.nearest_landmark ? ` · near ${customer.nearest_landmark}` : ""}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${kycStatus === "verified" ? "bg-green-100 text-green-700" : kycStatus === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                {kycStatus === "verified" ? "✅ KYC Verified" : kycStatus === "pending" ? "⏳ KYC Pending" : "❌ KYC Missing"}
              </span>
              <button onClick={openMaps} className="bg-[#04342C] text-white px-3 py-1.5 rounded-lg text-xs hover:bg-[#0F6E56] flex items-center gap-1">
                🗺️ Open in Maps
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center"><p className="text-xs text-gray-500">Loans</p><p className="font-bold text-blue-600">{stats?.total_loans || 0}</p></div>
            <div className="text-center"><p className="text-xs text-gray-500">Borrowed</p><p className="font-bold text-purple-600">KSh {parseFloat(stats?.total_borrowed || 0).toLocaleString()}</p></div>
            <div className="text-center"><p className="text-xs text-gray-500">Paid</p><p className="font-bold text-green-600">KSh {parseFloat(stats?.total_paid || 0).toLocaleString()}</p></div>
            <div className="text-center"><p className="text-xs text-gray-500">Outstanding</p><p className="font-bold text-red-600">KSh {parseFloat(stats?.outstanding || 0).toLocaleString()}</p></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl shadow p-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.key ? "bg-[#04342C] text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── LOANS TAB ── */}
        {activeTab === "loans" && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">Loan History</h3>
              <button onClick={() => router.push("/loans")} className="bg-[#04342C] text-white px-3 py-1.5 rounded-lg text-xs hover:bg-[#0F6E56]">+ New Loan</button>
            </div>
            {!loans?.length ? <div className="p-10 text-center text-gray-400">No loans yet</div> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
                  <th className="px-5 py-3">Loan</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Balance</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th>
                </tr></thead>
                <tbody>
                  {loans.map((l: any) => (
                    <tr key={l.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push("/loans/" + l.id)}>
                      <td className="px-5 py-3 text-blue-600 font-medium">#{l.id}</td>
                      <td className="px-5 py-3">KSh {parseFloat(l.amount).toLocaleString()}</td>
                      <td className="px-5 py-3 text-red-600">KSh {parseFloat(l.balance).toLocaleString()}</td>
                      <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.status === "paid" ? "bg-green-100 text-green-700" : l.status === "active" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>{l.status}</span></td>
                      <td className="px-5 py-3 text-gray-400">{new Date(l.created_at).toLocaleDateString("en-KE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── PAYMENTS TAB ── */}
        {activeTab === "payments" && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b"><h3 className="font-bold">Payment History</h3></div>
            {!payments?.length ? <div className="p-10 text-center text-gray-400">No payments yet</div> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
                  <th className="px-5 py-3">Date</th><th className="px-5 py-3">Loan</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Code</th>
                </tr></thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-400">{new Date(p.payment_date).toLocaleDateString("en-KE")}</td>
                      <td className="px-5 py-3">#{p.loan_id}</td>
                      <td className="px-5 py-3 text-green-600 font-bold">KSh {parseFloat(p.amount).toLocaleString()}</td>
                      <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">{p.source === "kcb_paybill" ? "KCB Paybill" : p.source}</span></td>
                      <td className="px-5 py-3 font-mono text-xs">{p.transaction_code || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            {/* Location Card */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">📍 Customer Location</h3>
                <div className="flex gap-2">
                  <button onClick={() => setEditingLocation(!editingLocation)} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200">✏️ Edit</button>
                  <button onClick={openMaps} className="bg-[#04342C] text-white px-4 py-1.5 rounded-lg text-sm hover:bg-[#0F6E56] flex items-center gap-2">🗺️ Open in Maps</button>
                </div>
              </div>

              {editingLocation ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Area / Location</label>
                      <input value={locationForm.location} onChange={e => setLocationForm({ ...locationForm, location: e.target.value })}
                        placeholder="e.g. Wanguru, near market" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nearest Landmark</label>
                      <input value={locationForm.nearest_landmark} onChange={e => setLocationForm({ ...locationForm, nearest_landmark: e.target.value })}
                        placeholder="e.g. Near Wanguru Primary" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Latitude (optional)</label>
                      <input value={locationForm.latitude} onChange={e => setLocationForm({ ...locationForm, latitude: e.target.value })}
                        placeholder="e.g. -0.6234" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Longitude (optional)</label>
                      <input value={locationForm.longitude} onChange={e => setLocationForm({ ...locationForm, longitude: e.target.value })}
                        placeholder="e.g. 37.2905" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingLocation(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={saveLocation} disabled={savingLocation} className="px-4 py-2 text-sm text-white bg-[#04342C] rounded-lg hover:bg-[#0F6E56] disabled:opacity-50">
                      {savingLocation ? "Saving..." : "✅ Save Location"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Location / Area</p>
                    <p className="font-medium text-gray-800">{customer?.location || <span className="text-gray-400 italic text-sm">Not set</span>}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Nearest Landmark</p>
                    <p className="font-medium text-gray-800">{customer?.nearest_landmark || <span className="text-gray-400 italic text-sm">Not set</span>}</p>
                  </div>
                  {customer?.latitude && customer?.longitude && (
                    <div className="bg-blue-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-blue-500 mb-1">GPS Coordinates</p>
                      <p className="font-mono text-sm text-blue-700">{customer.latitude}, {customer.longitude}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes Card */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">📝 Field Notes ({notes.length})</h3>
                <button onClick={() => setAddingNote(!addingNote)} className="bg-[#04342C] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0F6E56]">+ Add Note</button>
              </div>

              {addingNote && (
                <div className="bg-[#F0FDF4] border border-[#1D9E75] rounded-xl p-4 mb-4">
                  <div className="mb-3">
                    <label className="text-xs text-gray-600 mb-1 block font-medium">Category</label>
                    <select value={newNote.category} onChange={e => setNewNote({ ...newNote, category: e.target.value })}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]">
                      <option value="visit">🚶 Field Visit</option>
                      <option value="call">📞 Phone Call</option>
                      <option value="payment">💳 Payment Follow-up</option>
                      <option value="other">📌 Other</option>
                    </select>
                  </div>
                  <textarea value={newNote.note} onChange={e => setNewNote({ ...newNote, note: e.target.value })}
                    placeholder="e.g. Visited customer at home, promised to pay KSh 1,500 by Friday. Customer was cooperative."
                    rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75] resize-none mb-3" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setAddingNote(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Cancel</button>
                    <button onClick={saveNote} disabled={savingNote} className="px-4 py-2 text-sm text-white bg-[#04342C] rounded-lg hover:bg-[#0F6E56] disabled:opacity-50">
                      {savingNote ? "Saving..." : "✅ Save Note"}
                    </button>
                  </div>
                </div>
              )}

              {notes.length === 0 && !addingNote ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-2">📝</p>
                  <p className="text-gray-400 text-sm">No notes yet. Add a note after a call or field visit.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note: any) => (
                    <div key={note.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[note.category]}`}>
                            {categoryIcons[note.category]} {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(note.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <button onClick={() => deleteNote(note.id)} className="text-gray-300 hover:text-red-400 text-sm transition-colors">🗑</button>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{note.note}</p>
                      <p className="text-xs text-gray-400 mt-2 font-medium">— {note.officer_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── KYC TAB ── */}
        {activeTab === "kyc" && (
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">🪪 KYC Documents</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${kycStatus === "verified" ? "bg-green-100 text-green-700" : kycStatus === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                {kycStatus === "verified" ? "✅ Verified" : kycStatus === "pending" ? "⏳ Awaiting Verification" : "❌ Not Uploaded"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[{ key: "national_id", label: "National ID", required: true }, { key: "passport_photo", label: "Passport Photo", required: false }].map(doc => (
                <div key={doc.key} className="border-2 border-dashed border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-700 text-sm">{doc.label} {doc.required && <span className="text-red-500">*</span>}</h4>
                    {kyc?.[doc.key + "_url"] && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ Uploaded</span>}
                  </div>
                  {kyc?.[doc.key + "_url"] ? (
                    <img src={kyc[doc.key + "_url"]} alt={doc.label} className="w-full h-36 object-cover rounded-lg border cursor-pointer mb-3"
                      onClick={() => window.open(kyc[doc.key + "_url"], "_blank")} />
                  ) : (
                    <div className="w-full h-36 bg-gray-50 rounded-lg flex items-center justify-center mb-3">
                      <p className="text-gray-400 text-xs">Not uploaded</p>
                    </div>
                  )}
                  <label className="w-full block text-center bg-blue-600 text-white py-1.5 rounded-lg text-xs cursor-pointer hover:bg-blue-700">
                    {uploading ? "Uploading..." : kyc?.[doc.key + "_url"] ? "Replace" : "Upload"}
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => handleKycUpload(e, doc.key)} disabled={uploading} />
                  </label>
                </div>
              ))}
            </div>
            {kycStatus === "pending" && (
              <div className="flex gap-3 justify-center">
                <button onClick={verifyKyc} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium">✅ Verify KYC</button>
                <button onClick={rejectKyc} className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 font-medium">❌ Reject</button>
              </div>
            )}
          </div>
        )}

        {/* ── DETAILS TAB ── */}
        {activeTab === "details" && (
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Customer Details</h3>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="bg-[#04342C] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0F6E56]">✏️ Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleUpdate} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                  <button onClick={() => setEditing(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ label: "Full Name", key: "name" }, { label: "Phone", key: "phone" }, { label: "Email", key: "email" }, { label: "National ID", key: "national_id" }].map(({ label, key }) => (
                <div key={key}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  {editing ? (
                    <input value={editForm?.[key] || ""} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]" />
                  ) : (
                    <p className="font-medium text-gray-800">{customer?.[key] || "—"}</p>
                  )}
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-500 mb-1">KYC Status</p>
                <p className="font-medium">{kycStatus === "verified" ? "✅ Verified" : kycStatus === "pending" ? "⏳ Pending" : "❌ Not uploaded"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Member Since</p>
                <p className="font-medium">{customer?.created_at ? new Date(customer.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
