"use client";

import Link from "next/link";
import { useApiPort } from "@/hooks/use-api-port";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/** The header for pages outside a project: the logo, the emulator's address, and the theme. */
export default function FrontHeader() {
  const port = useApiPort();
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Daraja Local, all projects">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full bg-surface-1 px-3 py-1 text-[12px] text-muted-foreground ring-1 ring-border sm:inline-flex">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-2 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-1.5 rounded-full bg-green-2" />
            </span>
            Running at <span className="font-mono text-foreground">127.0.0.1:{port}</span>
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
