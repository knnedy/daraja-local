"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const iconButton =
  "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** A labelled credential: what it is, its value, and copy (plus reveal for secrets). */
export default function KeyField({
  label,
  hint,
  value,
  secret = false,
}: {
  label: string;
  hint: React.ReactNode;
  value: string | undefined;
  secret?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const { copied, copy } = useCopy();
  const hidden = secret && !revealed;

  return (
    <div className="grid gap-x-6 gap-y-2 px-5 py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center">
      <div>
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{hint}</p>
      </div>
      <div className="flex h-9 min-w-0 items-center gap-1 rounded-lg bg-surface-2 pr-1 pl-3 ring-1 ring-border">
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground",
            hidden && "text-[15px] leading-none tracking-[0.12em] text-muted-foreground",
          )}>
          {value === undefined ? <Skeleton className="h-3 w-40 max-w-full" /> : hidden ? "•".repeat(Math.min(value.length, 24)) : value}
        </span>
        {secret && (
          <button
            type="button"
            aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
            aria-pressed={revealed}
            onClick={() => setRevealed((r) => !r)}
            className={iconButton}>
            {revealed ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
          </button>
        )}
        <button
          type="button"
          aria-label={`Copy ${label}`}
          disabled={!value}
          onClick={() => value && void copy(value)}
          className={iconButton}>
          {copied ? <CheckIcon className="size-3.5 text-green" /> : <CopyIcon className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
