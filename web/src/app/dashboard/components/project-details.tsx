"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useActiveProjectStore } from "@/store/active-project";

function Row({
  label,
  value,
  mono = true,
  copyable = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="group flex items-center justify-between border-b border-border/60 px-4 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={`truncate text-[12.5px] text-foreground ${
            mono ? "font-mono text-[12px]" : ""
          }`}>
          {value}
        </span>
        {copyable && (
          <button
            onClick={copy}
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-green group-hover:opacity-100">
            {copied ? (
              <CheckIcon className="size-3.5 text-green" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetailsCard() {
  const name = useActiveProjectStore((s) => s.name);
  const callbackUrl = useActiveProjectStore((s) => s.callbackBaseurl);

  // Mocked until the project settings/API wiring is in place.
  const createdAt = "1 Aug 2026";

  return (
    <div className="rounded-lg border border-border bg-surface-1">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-[13px] font-medium text-foreground">
          Project details
        </span>
      </div>
      <div>
        <Row
          label="Project name"
          value={name ?? "Unknown Project"}
          mono={false}
        />
        <Row
          label="Callback URL"
          value={callbackUrl ?? "Unknown Callback URL"}
          copyable
        />
        <Row label="Created" value={createdAt} mono={false} />
      </div>
    </div>
  );
}
