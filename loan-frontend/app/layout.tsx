import type { Metadata } from "next";
import "./globals.css";
import SessionTimeout from "./components/SessionTimeout";

export const metadata: Metadata = {
  title: "Blessed Ventures LTD",
  description: "Loan Management System",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Blessed Ventures LTD",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
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
        <SessionTimeout />
        {children}
      </body>
    </html>
  );
}