"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CommandItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

function PaletteDialog({
  items,
  onClose,
}: {
  items: CommandItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const item = filtered[activeIndex];
        if (item) {
          router.push(item.href);
          onClose();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, activeIndex, onClose, router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-lg border border-border-strong bg-surface-1 shadow-xl">
        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-2.5">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Jump to a page…"
            className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 rounded border border-border-strong bg-surface-2 px-1 font-mono text-[10px] leading-none text-muted-foreground">
            esc
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">
              No matching pages.
            </p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.href}
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  router.push(item.href);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors",
                  i === activeIndex
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:bg-surface-2/60",
                )}>
                <item.icon className="size-3.75 shrink-0" />
                {item.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommandPalette({
  items,
  open,
  onClose,
}: {
  items: CommandItem[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return <PaletteDialog items={items} onClose={onClose} />;
}
