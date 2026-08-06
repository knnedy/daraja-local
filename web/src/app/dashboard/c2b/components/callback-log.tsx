"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type LogEntry = {
  id: string;
  time: string;
  label: string;
  tone: "neutral" | "success" | "error";
  content: string;
};

export default function CallbackLog({ logs }: { logs: LogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logs.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [logs]);

  return (
    <div className="flex h-80 flex-col rounded-lg border border-border-strong bg-terminal-bg p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-terminal-fg-muted">
          callback log
        </span>
        {logs.length > 0 && (
          <span className="font-mono text-[10px] text-terminal-fg-muted">
            {logs.length} {logs.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>
      <div className="scrollbar-console min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="font-mono text-[11.5px] text-terminal-fg-muted">
              waiting for a payment…
            </p>
            <p className="font-mono text-[11.5px] text-terminal-fg-muted">
              simulate one above to open a session
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0 font-mono text-[10px] text-terminal-fg-muted/70">
                {log.time}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold",
                    log.tone === "success" && "text-terminal-green",
                    log.tone === "error" && "text-terminal-red",
                    log.tone === "neutral" && "text-terminal-blue",
                  )}>
                  [{log.label}]
                </span>
                <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-terminal-fg">
                  {log.content}
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
