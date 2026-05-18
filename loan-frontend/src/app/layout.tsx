import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Microfinance System",
  description: "Loan management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
