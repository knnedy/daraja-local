"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { BookOpenIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import { pageIcons } from "@/lib/page-icons";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useActiveProjectStore } from "@/store/active-project";
import { useProject } from "@/hooks/use-projects";
import { stripTrailingSlash } from "@/lib/utils";
import CommandPalette from "@/components/command-palette";

const pages: Record<string, { label: string; icon: React.ElementType }> = {
  "/dashboard": { label: "Overview", icon: pageIcons.overview },
  "/dashboard/stk": {
    label: "STK Push",
    icon: pageIcons.stk,
  },
  "/dashboard/c2b": { label: "C2B", icon: pageIcons.c2b },
  "/dashboard/b2c": { label: "B2C", icon: pageIcons.b2c },
  "/dashboard/b2b": { label: "B2B", icon: pageIcons.b2b },
  "/dashboard/transactions": {
    label: "Transactions",
    icon: pageIcons.transactions,
  },
  "/dashboard/logs": { label: "Request log", icon: pageIcons.logs },
  "/dashboard/credentials": {
    label: "Credentials",
    icon: pageIcons.credentials,
  },
  "/dashboard/settings": { label: "Settings", icon: pageIcons.settings },
};

const commandItems = Object.entries(pages).map(([href, page]) => ({
  href,
  label: page.label,
  icon: page.icon,
}));

const subscribeNoop = () => () => {};

function useShortcutHint() {
  return useSyncExternalStore(
    subscribeNoop,
    () =>
      /mac/i.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K",
    () => "Ctrl K",
  );
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const normalizedPath = pathname ? stripTrailingSlash(pathname) : "";
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: project } = useProject(slug ?? "");
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
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-border/80 bg-background/80 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/70">
      <SidebarTrigger className="size-7 text-muted-foreground hover:text-foreground" />
      <div className="mx-1 h-4 w-px bg-border-strong" />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <span className="truncate text-muted-foreground">{project?.name ?? "…"}</span>
        <span className="text-muted-foreground/50">/</span>
        {page && (
          <span aria-current="page" className="flex shrink-0 items-center gap-1.5 font-medium text-foreground">
            {page.label}
          </span>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex h-8 w-60 items-center gap-2 rounded-lg border border-border bg-surface-1 pr-1.5 pl-2.5 text-[13px] text-muted-foreground shadow-xs transition-colors hover:border-border-strong hover:text-foreground max-md:w-8 max-md:justify-center max-md:px-0">
          <SearchIcon className="size-3.5 shrink-0" />
          <span className="flex-1 text-left max-md:hidden">Jump to…</span>
          <kbd className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] leading-none text-muted-foreground max-md:hidden">
            {shortcutHint}
          </kbd>
        </button>

        <a
          href="https://github.com/knnedy/daraja-local/tree/main/docs"
          target="_blank"
          rel="noreferrer"
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/[0.045] hover:text-foreground max-sm:hidden">
          <BookOpenIcon className="size-3.5" />
          Docs
        </a>

        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="relative flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.045] hover:text-foreground">
          <SunIcon className="size-4 transition-[scale,rotate] duration-200 motion-reduce:transition-none dark:scale-0 dark:-rotate-90" />
          <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-[scale,rotate] duration-200 motion-reduce:transition-none dark:scale-100 dark:rotate-0" />
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
