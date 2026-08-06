"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./components/sidebar";
import { DashboardTopbar } from "./components/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <DashboardTopbar />
        <main
          className="min-h-0 flex-1 overflow-y-auto p-6"
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
