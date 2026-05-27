"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email) { setError("Please enter your email"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setMessage(data.message);
    } catch { setError("Connection failed"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-2">Forgot Password</h1>
        <p className="text-center text-gray-500 text-sm mb-6">Enter your email and we'll send a reset link</p>

        {message ? (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg text-center">
            <p className="text-2xl mb-2">📧</p>
            <p className="font-medium">{message}</p>
            <p className="text-sm mt-2">Check your inbox and spam folder</p>
            <button onClick={() => router.push("/login")} className="mt-4 text-blue-600 hover:underline text-sm">Back to Login</button>
          </div>
        ) : (
          <>
            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="w-full border rounded-lg px-3 py-2" placeholder="john@example.com" />
            </div>
            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <button onClick={() => router.push("/login")} className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm">
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}