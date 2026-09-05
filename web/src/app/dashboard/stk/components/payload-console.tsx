"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useRequestLog } from "@/hooks/use-request-log";

const DIRECTION_LABEL: Record<string, string> = {
  inbound: "REQ",
  outbound: "CB",
};

const DIRECTION_COLOR: Record<string, string> = {
  inbound: "text-blue",
  outbound: "text-terminal-green",
};

function formatTime(iso: string) {
  return iso.slice(11, 23);
}

export default function PayloadConsole({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const { data: entries = [] } = useRequestLog(slug);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lines = [...entries].reverse();

  useEffect(() => {
    if (lines.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lines.length]);

  return (
    <div
      className={cn(
        "flex h-80 flex-col rounded-lg border border-terminal-border bg-terminal-bg p-4",
        className,
      )}>
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-terminal-fg-muted">
          live session
        </span>
        <div className="flex items-center gap-3">
          {lines.length > 0 && (
            <span className="font-mono text-[10px] text-terminal-fg-muted">
              {lines.length} {lines.length === 1 ? "entry" : "entries"}
            </span>
          )}
          <span className="text-[10px] text-terminal-fg-muted">View all →</span>
        </div>
      </div>

      <div className="scrollbar-console min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="font-mono text-[11.5px] text-terminal-fg-muted">
              waiting for a request…
            </p>
            <p className="font-mono text-[11.5px] text-terminal-fg-muted">
              call the endpoint above to open a session
            </p>
          </div>
        ) : (
          lines.map((entry) => (
            <div key={entry.id} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0 font-mono text-[10px] text-terminal-fg-muted">
                {formatTime(entry.createdAt)}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold",
                    DIRECTION_COLOR[entry.direction],
                  )}>
                  [{DIRECTION_LABEL[entry.direction] ?? entry.direction}]
                </span>
                <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-terminal-fg">
                  {entry.payload}
                </pre>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
