"use client";
import { useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function Keepalive() {
  useEffect(() => {
    // Ping backend every 10 minutes to prevent sleep
    const ping = () => {
      fetch(`${API}/ping`).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return null;
}