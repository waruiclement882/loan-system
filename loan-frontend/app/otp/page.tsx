"use client"
use client
import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

function OTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id");
  const method = searchParams.get("method");
  const message = searchParams.get("message");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(180);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    if (!userId) { router.push("/login"); return; }
    const timer = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timer); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const handleInput = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...code];
    newCode[i] = val.slice(-1);
    setCode(newCode);
    setError("");
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
    if (val && i === 5 && newCode.every(d => d)) handleVerify(newCode.join(""));
  };
  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setCode(pasted.split("")); handleVerify(pasted); }
  };
  const handleVerify = async (fullCode?: string) => {
    const otp = fullCode || code.join("");
    if (otp.length < 6) { setError("Please enter all 6 digits"); return; }
    if (timeLeft === 0) { setError("Code expired. Please request a new one."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, code: otp })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setCode(["", "", "", "", "", ""]); inputRefs.current[0]?.focus(); }
      else { localStorage.setItem("token", data.token); localStorage.setItem("user", JSON.stringify(data.user)); router.push("/dashboard"); }
    } catch { setError("Verification failed. Please try again."); }
    setLoading(false);
  };
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      const res = await fetch(`${API}/api/auth/resend-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, method })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setCode(["", "", "", "", "", ""]); setTimeLeft(180); setResendCooldown(60); setError(""); inputRefs.current[0]?.focus(); }
    } catch { setError("Failed to resend. Try again."); }
    setResending(false);
  };
  return (
    <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#04342C] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{method === "sms" ? "SMS" : "EMAIL"}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#04342C]">Enter Your Code</h1>
          <p className="text-gray-500 text-sm mt-2">
            {method === "sms" ? "We sent a 6-digit code via SMS" : "We sent a 6-digit code to your email"}
          </p>
          {message && <p className="text-[#1D9E75] text-xs mt-1 font-medium">{decodeURIComponent(message)}</p>}
        </div>
        <div className={`text-center mb-6 ${timeLeft <= 30 ? "text-red-500" : "text-gray-500"}`}>
          <span className="text-sm font-medium">
            {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : "Code expired - request a new one"}
          </span>
        </div>
        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input key={i} ref={el => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit}
              onChange={e => handleInput(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                ${digit ? "border-[#04342C] bg-[#F0FDF4]" : "border-gray-200"} ${error ? "border-red-400" : ""}
                focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20`} />
          ))}
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center"><p className="text-red-600 text-sm">{error}</p></div>}
        <button onClick={() => handleVerify()} disabled={loading || code.some(d => !d) || timeLeft === 0}
          className="w-full bg-[#04342C] text-white py-3 rounded-xl font-semibold text-base hover:bg-[#0F6E56] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4">
          {loading ? "Verifying..." : "Verify Code"}
        </button>
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-2">Did not receive the code?</p>
          <button onClick={handleResend} disabled={resending || resendCooldown > 0}
            className="text-[#1D9E75] font-semibold text-sm hover:underline disabled:opacity-50 disabled:no-underline">
            {resending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
          </button>
        </div>
        <div className="text-center mt-4">
          <button onClick={() => router.push("/login")} className="text-gray-400 text-xs hover:text-gray-600">Back to Login</button>
        </div>
      </div>
    </div>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <OTPContent />
    </Suspense>
  );
}
