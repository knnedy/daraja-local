"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogGroup } from "../lib/group";
import { groupStatus } from "../lib/status";

const KIND_LABEL: Record<LogGroup["kind"], string> = {
  stk_push: "STK",
  c2b: "C2B",
  mixed: "—",
};

function pretty(payload: string) {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

function Row({ group }: { group: LogGroup }) {
  const [open, setOpen] = useState(false);
  const status = groupStatus(group);

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2/50">
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
        <span className="w-16 shrink-0 font-mono text-[10.5px] text-muted-foreground">
          {group.createdAt.slice(11, 19)}
        </span>
        <span className="w-10 shrink-0 rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold text-muted-foreground">
          {KIND_LABEL[group.kind]}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
          {group.summary || group.id}
        </span>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10.5px]",
            status.tone === "success" && "bg-green/10 text-green",
            status.tone === "error" && "bg-destructive/10 text-destructive",
            status.tone === "pending" && "bg-blue-bg text-blue",
            status.tone === "neutral" && "bg-surface-2 text-muted-foreground",
          )}>
          {status.label}
        </span>
        <span className="w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
          {group.entries.length}
        </span>
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-border/60 bg-terminal-bg px-3.5 py-3">
          {[...group.entries].reverse().map((entry) => (
            <div key={entry.id} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0 font-mono text-[10px] text-terminal-fg-muted">
                {entry.createdAt.slice(11, 23)}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[10px] font-semibold text-terminal-blue">
                  {entry.direction === "inbound"
                    ? "[REQ]"
                    : `[${entry.status.toUpperCase()}]`}
                </span>
                <pre className="mt-0.5 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-terminal-fg">
                  {pretty(entry.payload)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LogTable({ groups }: { groups: LogGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-14 text-center">
        <p className="text-[12.5px] text-muted-foreground">
          No matching requests.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border-strong bg-surface-1 shadow-sm">
      {groups.map((group) => (
        <Row key={group.id} group={group} />
      ))}
    </div>
  );
}
