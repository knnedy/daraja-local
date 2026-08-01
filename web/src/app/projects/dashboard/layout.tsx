"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveProjectStore } from "@/store/active-project";
import { ProjectSidebar } from "./components/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ProjectTopbar } from "./components/topbar";

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
      <ProjectSidebar />
      <SidebarInset>
        <ProjectTopbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
