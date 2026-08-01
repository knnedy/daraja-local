"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function DashboardTopbar({ slug }: { slug: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <span className="font-mono text-xs text-muted-foreground">{slug}</span>
      <div className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-green-light px-2 py-1 text-xs text-green">
          <span className="size-1.5 rounded-full bg-green" />
          running
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          localhost:7060
        </span>
      </div>
    </header>
  );
}
