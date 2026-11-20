"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { LoadingMark } from "@/components/loading-mark";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./_components/sidebar";
import { DashboardTopbar } from "./_components/topbar";
import { useActiveProjectStore } from "@/store/active-project";

function useHasHydrated() {
  return useSyncExternalStore(
    (callback) => useActiveProjectStore.persist.onFinishHydration(callback),
    () => useActiveProjectStore.persist.hasHydrated(),
    () => false,
  );
}

function ConnectingScreen() {
  return <LoadingMark label="Opening project…" className="min-h-svh" />;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const slug = useActiveProjectStore((s) => s.slug);
  const hasHydrated = useHasHydrated();

  useEffect(() => {
    if (hasHydrated && !slug) {
      router.replace("/");
    }
  }, [hasHydrated, slug, router]);

  if (!hasHydrated || !slug) {
    return <ConnectingScreen />;
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="h-svh overflow-hidden bg-background">
        <DashboardTopbar />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1360px] px-8 pt-7 pb-16 max-md:px-4">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
