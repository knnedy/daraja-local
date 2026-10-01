"use client";

import { useEffect, useState } from "react";
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
import CommandPalette from "@/components/command-palette";

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

const commandItems = Object.entries(pages).map(([href, page]) => ({
  href,
  label: page.label,
  icon: page.icon,
}));

function VerticalDivider() {
  return <div className="h-5 w-px shrink-0 bg-border-strong" />;
}

function useShortcutHint() {
  const isMac =
    typeof navigator !== "undefined" &&
    /mac/i.test(navigator.platform ?? navigator.userAgent);

  return isMac ? "⌘K" : "Ctrl K";
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const normalizedPath = pathname ? stripTrailingSlash(pathname) : "";
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: project } = useProject(slug ?? "");
  const port = useAppConfigStore((s) => s.port);
  const { theme, setTheme } = useTheme();
  const page = pages[normalizedPath];
  const shortcutHint = useShortcutHint();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isShortcut =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (!isShortcut) return;
      e.preventDefault();
      setPaletteOpen((open) => !open);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-2 rounded-md border border-border-strong bg-surface-1 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <SearchIcon className="size-3.5" />
          <span>Search</span>
          <kbd className="rounded border border-border-strong bg-surface-2 px-1 font-mono text-[10px] leading-none text-muted-foreground">
            {shortcutHint}
          </kbd>
        </button>

        <div className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-green-mid/70 bg-green-light/60 px-2.5 transition-colors hover:border-green-mid hover:bg-green-light">
          <span className="relative flex size-2 shrink-0 items-center justify-center">
            <span className="absolute size-full animate-ping rounded-full bg-green/30" />
            <span className="relative size-1.5 rounded-full bg-green" />
          </span>

          <span className="text-[10px] font-semibold tracking-[0.08em] text-green">
            SANDBOX
          </span>

          <span className="h-3.5 w-px bg-green-mid/50" />

          <span className="font-mono text-[11px] tabular-nums text-green/70">
            127.0.0.1:{port}
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

      <CommandPalette
        items={commandItems}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </header>
  );
}
