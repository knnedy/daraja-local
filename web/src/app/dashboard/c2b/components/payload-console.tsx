"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RequestLogEntry } from "@/lib/types/request-log";

function lineMeta(entry: RequestLogEntry): { label: string; color: string } {
  if (entry.direction === "inbound") {
    return { label: "REQ", color: "text-terminal-blue" };
  }
  if (entry.status === "rejected") {
    return { label: "ERR", color: "text-terminal-red" };
  }
  if (entry.status === "accepted") {
    return { label: "ACK", color: "text-terminal-green" };
  }
  if (entry.outcome === "confirmed") {
    return {
      label: "CB",
      color:
        entry.status === "delivered"
          ? "text-terminal-green"
          : "text-terminal-red",
    };
  }
  return {
    label: "VAL",
    color:
      entry.outcome === "accepted"
        ? "text-terminal-green"
        : "text-terminal-red",
  };
}

function pretty(payload: string) {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

const COLLAPSE_LINES = 6;

function LogLine({ entry }: { entry: RequestLogEntry }) {
  const { label, color } = lineMeta(entry);
  const [expanded, setExpanded] = useState(false);
  const body = pretty(entry.payload);
  const lines = body.split("\n");
  const isLong = lines.length > COLLAPSE_LINES;
  const shown =
    expanded || !isLong ? body : lines.slice(0, COLLAPSE_LINES).join("\n");

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 font-mono text-[10px] text-terminal-fg-muted">
        {entry.createdAt.slice(11, 23)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-[10px] font-semibold", color)}>
            [{label}]
          </span>
          {entry.correlationId && (
            <span className="rounded border border-terminal-border px-1 font-mono text-[9.5px] text-terminal-fg-muted">
              {entry.correlationId.slice(-8)}
            </span>
          )}
        </div>
        <pre className="mt-0.5 overflow-x-auto whitespace-pre font-mono text-[11.5px] leading-relaxed text-terminal-fg">
          {shown}
          {isLong && !expanded ? "\n…" : ""}
        </pre>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-0.5 font-mono text-[10px] text-terminal-fg-muted hover:text-terminal-fg hover:underline">
            {expanded ? "collapse" : "show more"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PayloadConsole({
  entries,
}: {
  entries: RequestLogEntry[];
}) {
  return (
    <div className="flex h-80 flex-col rounded-lg border border-terminal-border bg-terminal-bg p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-terminal-fg-muted">
          callback log
        </span>
        {entries.length > 0 && (
          <span className="font-mono text-[10px] text-terminal-fg-muted">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      <div className="scrollbar-console min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="font-mono text-[11.5px] text-terminal-fg-muted">
              waiting for a payment…
            </p>
            <p className="font-mono text-[11.5px] text-terminal-fg-muted">
              register your URLs, then call simulate
            </p>
          </div>
        ) : (
          entries.map((entry) => <LogLine key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}
