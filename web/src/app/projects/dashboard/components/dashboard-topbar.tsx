"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useActiveProjectStore } from "@/store/active-project";
import { useAppConfigStore } from "@/store/app-config";

export function DashboardTopbar() {
  const name = useActiveProjectStore((s) => s.name);
  const port = useAppConfigStore((s) => s.port);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <span className="font-mono text-xs text-muted-foreground">{name}</span>
      <div className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-green-light px-2 py-1 text-xs text-green">
          <span className="size-1.5 rounded-full bg-green" />
          running
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          localhost:{port}
        </span>
      </div>
    </header>
  );
}
