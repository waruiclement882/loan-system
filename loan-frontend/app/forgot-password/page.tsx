"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = "https://loan-system-h794.onrender.com";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email) { setError("Email is required"); return; }
    setLoading(true); setError(""); setMessage("");
    const res = await fetch(API + "/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setMessage(data.message || "Reset link sent!");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">Forgot Password</h2>
        <p className="text-gray-500 text-sm text-center mb-6">Enter your email to receive a reset link</p>
        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">{message}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2" placeholder="your@email.com" />
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        <button onClick={() => router.push("/login")} className="w-full mt-3 text-gray-500 text-sm hover:text-blue-600">Back to Login</button>
      </div>
    </div>
  );
}
