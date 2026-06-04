import type { Metadata } from "next";
import "./globals.css";
import SessionTimeout from "./components/SessionTimeout";
import Keepalive from "./components/Keepalive";

export const metadata: Metadata = {
  title: "Blessed Ventures LTD",
  description: "Loan Management System",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Blessed Ventures LTD" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <Keepalive />
        <SessionTimeout />
        {children}
      </body>
    </html>
  );
}