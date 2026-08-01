"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveProjectStore } from "@/store/active-project";
import { AppSidebar } from "./components/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardTopbar } from "./components/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const slug = useActiveProjectStore((s) => s.slug);

  useEffect(() => {
    if (!slug) {
      router.replace("/projects");
    }
  }, [slug, router]);

  if (!slug) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardTopbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
