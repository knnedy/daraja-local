"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronRightIcon, MoonIcon, SunIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useActiveProjectStore } from "@/store/active-project";
import { useAppConfigStore } from "@/store/app-config";
import { stripTrailingSlash } from "@/lib/utils";

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
  const normalizedPath = pathname ? stripTrailingSlash(pathname) : "";
  const name = useActiveProjectStore((s) => s.name);
  const port = useAppConfigStore((s) => s.port);
  const { theme, setTheme } = useTheme();
  const label = labels[normalizedPath] ?? "";

  return (
    <header className="flex h-13 shrink-0 items-center gap-2.5 border-b border-border bg-surface-2 px-5">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <span className="text-xs text-muted-foreground">{name}</span>
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
        <Separator orientation="vertical" className="h-4" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <SunIcon className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
