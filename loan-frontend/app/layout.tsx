import type { Metadata } from "next";
import "./globals.css";
import SessionTimeout from "./components/SessionTimeout";

export const metadata: Metadata = {
  title: "Microfinance System",
  description: "Loan management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionTimeout />
        {children}
      </body>
    </html>
  );
}