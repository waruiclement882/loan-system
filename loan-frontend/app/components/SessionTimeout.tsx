"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

const TIMEOUT_MINUTES = 30;
const WARNING_MINUTES = 2;

export default function SessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_MINUTES * 60);

  const isPublicPage = pathname === "/login" || pathname === "/";

  const logout = useCallback(() => {
    localStorage.clear();
    setShowWarning(false);
    router.push("/login");
  }, [router]);

  const resetTimer = useCallback(() => {
    const expiry = Date.now() + TIMEOUT_MINUTES * 60 * 1000;
    localStorage.setItem("session_expiry", expiry.toString());
    setShowWarning(false);
    setCountdown(WARNING_MINUTES * 60);
  }, []);

  useEffect(() => {
    if (isPublicPage) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    // Set initial expiry if not set
    if (!localStorage.getItem("session_expiry")) resetTimer();

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    const handleActivity = () => {
      if (!showWarning) resetTimer();
    };

    events.forEach(e => window.addEventListener(e, handleActivity));

    const interval = setInterval(() => {
      const expiry = parseInt(localStorage.getItem("session_expiry") || "0");
      const remaining = expiry - Date.now();

      if (remaining <= 0) {
        logout();
      } else if (remaining <= WARNING_MINUTES * 60 * 1000) {
        setShowWarning(true);
        setCountdown(Math.floor(remaining / 1000));
      }
    }, 1000);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearInterval(interval);
    };
  }, [isPublicPage, showWarning, logout, resetTimer]);

  if (!showWarning || isPublicPage) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">⏱️</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Session Expiring Soon</h3>
        <p className="text-gray-500 mb-4">You will be logged out in</p>
        <p className="text-4xl font-bold text-red-600 mb-6">
          {mins}:{secs.toString().padStart(2, "0")}
        </p>
        <div className="flex gap-3">
          <button onClick={resetTimer}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium">
            Stay Logged In
          </button>
          <button onClick={logout}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}