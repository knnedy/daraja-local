"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="relative flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.045] hover:text-foreground">
      <SunIcon className="size-4 transition-[scale,rotate] duration-200 motion-reduce:transition-none dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-[scale,rotate] duration-200 motion-reduce:transition-none dark:scale-100 dark:rotate-0" />
    </button>
  );
}
