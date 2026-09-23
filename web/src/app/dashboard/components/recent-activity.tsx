import Link from "next/link";
import { PlayIcon, ScrollTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupEntries } from "@/lib/request-log/group";
import { groupStatus } from "@/lib/request-log/status";
import { relativeTime } from "@/lib/request-log/time";
import type { RequestLogEntry } from "@/lib/types/request-log";

const KIND_LABEL = { stk_push: "STK", c2b: "C2B", mixed: "—" } as const;

export default function RecentActivity({
  entries,
  className,
}: {
  entries: RequestLogEntry[];
  className?: string;
}) {
  const groups = groupEntries(entries).slice(0, 5);

  if (groups.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-1 px-6 py-10 text-center",
          className,
        )}>
        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-2">
          <ScrollTextIcon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-foreground">
            No requests yet
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Requests to this project&apos;s endpoints will show up here as they
            come in.
          </p>
        </div>
        <Link
          href="/dashboard/stk"
          className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-green hover:underline">
          <PlayIcon className="size-3" />
          Set up STK Push
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-1 flex-col rounded-lg border border-border bg-surface-1",
        className,
      )}>
      {groups.map((group) => {
        const status = groupStatus(group);
        return (
          <div
            key={group.id}
            className="flex items-center gap-2.5 border-b border-border/60 px-4 py-2.5 last:border-0">
            <span className="w-8 shrink-0 rounded border border-border-strong bg-surface-2 px-1 py-0.5 text-center font-mono text-[9.5px] font-semibold text-muted-foreground">
              {KIND_LABEL[group.kind]}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
              {group.summary || group.id}
            </span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]",
                status.tone === "success" && "bg-green/10 text-green",
                status.tone === "error" && "bg-destructive/10 text-destructive",
                status.tone === "pending" && "bg-blue-bg text-blue",
              )}>
              {status.label}
            </span>
            <span className="w-12 shrink-0 text-right text-[10.5px] text-muted-foreground">
              {relativeTime(group.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
