"use client";
import TopNav from "./TopNav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <TopNav />
      <main className="pt-12">
        {children}
      </main>
    </div>
  );
}