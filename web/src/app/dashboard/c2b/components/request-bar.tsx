"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useAppConfigStore } from "@/store/app-config";

export default function RequestBar({
  path,
  label,
}: {
  path: string;
  label: string;
}) {
  const port = useAppConfigStore((s) => s.port);
  const [copied, setCopied] = useState(false);
  const fullUrl = `http://localhost:${port}${path}`;

  function copy() {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-1 p-1.5 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md bg-surface-2 px-3 py-2">
        <span className="shrink-0 rounded border border-border-strong bg-surface-1 px-2 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
          POST
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
          {fullUrl}
        </span>
        <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">
          {label}
        </span>
      </div>
      <button
        onClick={copy}
        aria-label={`Copy ${label} URL`}
        className="flex shrink-0 items-center rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
        {copied ? (
          <CheckIcon className="size-3.5 text-green" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
    </div>
  );
}
