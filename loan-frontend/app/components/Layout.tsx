"use client";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F7F5] lg:flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:pl-0">
        <div className="pt-16 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
