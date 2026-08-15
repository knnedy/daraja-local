"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { RadioIcon } from "lucide-react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./components/sidebar";
import { DashboardTopbar } from "./components/topbar";
import { useActiveProjectStore } from "@/store/active-project";

function useHasHydrated() {
  return useSyncExternalStore(
    (callback) => useActiveProjectStore.persist.onFinishHydration(callback),
    () => useActiveProjectStore.persist.hasHydrated(),
    () => false,
  );
}

function ConnectingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="relative flex size-9 items-center justify-center rounded-lg border border-green-mid bg-green-light">
        <RadioIcon className="size-4 text-green" />
        <span className="absolute -right-0.5 -top-0.5 flex size-2 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-green ring-2 ring-background" />
        </span>
      </div>
    </div>
  );
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
