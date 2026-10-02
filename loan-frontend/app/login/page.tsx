"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState<"email" | "sms">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, method })
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.requires_otp) {
        // Redirect to OTP page
        router.push(`/otp?user_id=${data.user_id}&method=${data.method}&message=${encodeURIComponent(data.message)}`);
      } else {
        // Fallback: direct login (if 2FA disabled)
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      }
    } catch {
      setError("Connection failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F7F5] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#04342C] flex-col items-center justify-center p-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#1D9E75] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🏦</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Blessed Ventures</h1>
          <p className="text-[#A7F3D0] text-lg mb-8">Microfinance Management System</p>
          <div className="space-y-3 text-left">
            {['Secure 2FA login — email or SMS', 'Real-time loan portfolio tracking', 'KCB Paybill integration', 'Multi-branch management'].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-[#1D9E75] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <p className="text-[#D1FAE5] text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-[#04342C] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🏦</span>
            </div>
            <h1 className="text-2xl font-bold text-[#04342C]">Blessed Ventures</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-[#04342C] mb-1">Sign In</h2>
            <p className="text-gray-500 text-sm mb-6">Enter your credentials to continue</p>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all" />
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <button type="button" onClick={() => router.push("/forgot-password")}
                    className="text-[#1D9E75] text-xs hover:underline">Forgot password?</button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* 2FA Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Send verification code via</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setMethod("email")}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      method === "email"
                        ? "border-[#04342C] bg-[#F0FDF4] text-[#04342C]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    <span className="text-lg">📧</span> Email
                  </button>
                  <button type="button" onClick={() => setMethod("sms")}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      method === "sms"
                        ? "border-[#04342C] bg-[#F0FDF4] text-[#04342C]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    <span className="text-lg">📱</span> SMS
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full bg-[#04342C] text-white py-3 rounded-xl font-semibold hover:bg-[#0F6E56] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? "Signing in..." : "Sign In →"}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              🔒 Protected by 2-factor authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
