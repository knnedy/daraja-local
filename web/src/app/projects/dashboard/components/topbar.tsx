"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronRightIcon, MoonIcon, RadioIcon, SunIcon } from "lucide-react";
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
      <Separator orientation="vertical" className="h-13" />
      <span className="text-xs text-muted-foreground">{name}</span>
      <ChevronRightIcon className="size-3.25 text-muted-foreground" />
      <span className="text-[13px] font-medium text-foreground">{label}</span>

      <div className="ml-auto flex items-center gap-2">
        <span className="rounded-md border border-border-strong bg-surface-1 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          sandbox
        </span>
        <div className="flex items-center gap-2 rounded-full border border-green-mid bg-green-light px-3 py-1">
          <RadioIcon className="size-3.25 text-green" />
          <span className="text-[11px] font-medium text-green">on air</span>
          <span className="text-[11px] text-green/50">·</span>
          <span className="font-mono text-[11px] text-green/80">:{port}</span>
        </div>
        <Separator orientation="vertical" className="h-13" />
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
