"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type LogEntry = {
  id: string;
  time: string;
  kind: "request" | "callback";
  content: string;
};

const KIND_LABEL: Record<LogEntry["kind"], string> = {
  request: "REQ",
  callback: "CB",
};

const KIND_COLOR: Record<LogEntry["kind"], string> = {
  request: "text-blue",
  callback: "text-green",
};

export default function PayloadConsole({
  logs,
  className,
}: {
  logs: LogEntry[];
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div
      className={cn(
        "flex h-80 flex-col rounded-lg border border-green-mid/40 bg-[#0B120D] p-4",
        className,
      )}>
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-green/50">
          live session
        </span>
        <div className="flex items-center gap-3">
          {logs.length > 0 && (
            <span className="font-mono text-[10px] text-green/40">
              {logs.length} {logs.length === 1 ? "entry" : "entries"}
            </span>
          )}
          <span className="text-[10px] text-green/40">View all →</span>
        </div>
      </div>

      <div className="scrollbar-console min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="font-mono text-[11.5px] text-green/50">
              waiting for a request…
            </p>
            <p className="font-mono text-[11.5px] text-green/50">
              simulate one above to open a session
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0 font-mono text-[10px] text-green/35">
                {log.time}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold",
                    KIND_COLOR[log.kind],
                  )}>
                  [{KIND_LABEL[log.kind]}]
                </span>
                <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-green/80">
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
