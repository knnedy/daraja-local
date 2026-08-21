"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronRightIcon,
  KeyIcon,
  MoonIcon,
  ScrollTextIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  ArrowLeftRightIcon,
} from "lucide-react";
import { RxDashboard } from "react-icons/rx";
import { HiOutlineDevicePhoneMobile } from "react-icons/hi2";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useActiveProjectStore } from "@/store/active-project";
import { useAppConfigStore } from "@/store/app-config";
import { useProject } from "@/hooks/use-projects";
import { stripTrailingSlash } from "@/lib/utils";

const pages: Record<string, { label: string; icon: React.ElementType }> = {
  "/dashboard": { label: "Overview", icon: RxDashboard },
  "/dashboard/stk": {
    label: "STK Push",
    icon: HiOutlineDevicePhoneMobile,
  },
  "/dashboard/c2b": { label: "C2B", icon: ArrowLeftRightIcon },
  "/dashboard/logs": { label: "Request log", icon: ScrollTextIcon },
  "/dashboard/credentials": { label: "Credentials", icon: KeyIcon },
  "/dashboard/settings": { label: "Settings", icon: SettingsIcon },
};

function VerticalDivider() {
  return <div className="h-5 w-px shrink-0 bg-border-strong" />;
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const normalizedPath = pathname ? stripTrailingSlash(pathname) : "";
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: project } = useProject(slug ?? "");
  const port = useAppConfigStore((s) => s.port);
  const { theme, setTheme } = useTheme();
  const page = pages[normalizedPath];

  return (
    <header className="flex h-13 shrink-0 items-center gap-3 border-b border-border bg-surface-2 px-5">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <VerticalDivider />

      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-xs text-muted-foreground">
          {project?.name ?? "…"}
        </span>
        <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/60" />
        {page && (
          <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-foreground">
            <page.icon className="size-3.5 text-muted-foreground" />
            {page.label}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-border-strong bg-surface-1 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <SearchIcon className="size-3.5" />
          <span>Search</span>
          <kbd className="rounded border border-border-strong bg-surface-2 px-1 font-mono text-[10px] leading-none text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2 rounded-full border border-green-mid bg-green-light px-3 py-1.5">
          <span className="relative flex size-1.75 shrink-0 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-50" />
            <span className="relative inline-flex size-1.75 rounded-full bg-green" />
          </span>
          <span className="text-[11px] font-medium whitespace-nowrap text-green">
            sandbox
          </span>
          <span className="text-[11px] text-green/40">·</span>
          <span className="font-mono text-[11px] whitespace-nowrap text-green/80">
            :{port}
          </span>
        </div>

        <VerticalDivider />

        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground">
          <span className="absolute inset-0 flex items-center justify-center">
            <SunIcon className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <MoonIcon className="size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </span>
          <span className="sr-only">Toggle theme</span>
        </button>
      </div>
    </header>
  );
}
