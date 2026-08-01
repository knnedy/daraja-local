"use client";

import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useActiveProjectStore } from "@/store/active-project";
import { useAppConfigStore } from "@/store/app-config";

const labels: Record<string, string> = {
  "/projects/dashboard": "Overview",
  "/projects/dashboard/credentials": "Credentials",
  "/projects/dashboard/stk": "STK Push",
  "/projects/dashboard/c2b": "C2B",
  "/projects/dashboard/logs": "Request log",
  "/projects/dashboard/settings": "Settings",
};

export function ProjectTopbar() {
  const pathname = usePathname();
  const name = useActiveProjectStore((s) => s.name);
  const port = useAppConfigStore((s) => s.port);
  const label = pathname ? (labels[pathname] ?? "") : "";

  return (
    <header className="flex h-12.5 shrink-0 items-center gap-2.5 border-b border-border bg-surface-2 px-5">
      <SidebarTrigger />
      <span className="font-mono text-xs text-muted-foreground">{name}</span>
      <ChevronRightIcon className="size-3.25 text-muted-foreground" />
      <span className="text-[13px] font-medium text-foreground">{label}</span>

      <div className="ml-auto flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 rounded-full bg-green-light px-2.5 py-1 text-[11px] font-medium text-green">
          <span className="size-1.5 rounded-full bg-green" />
          running
        </span>
        <span className="font-mono text-[11.5px] text-muted-foreground">
          localhost:{port}
        </span>
      </div>
    </header>
  );
}
