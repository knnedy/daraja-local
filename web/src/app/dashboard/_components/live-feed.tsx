"use client";

import Link from "next/link";
import { ArrowRightIcon, InboxIcon } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { groupEntries } from "@/lib/request-log/group";
import { relativeTime } from "@/lib/format";
import type { RequestLogEntry } from "@/lib/types/request-log";
import { StatusPill } from "./activity";
import { kindShort, sessionStatus, summaryOf } from "../logs/lib/describe";
import { Skeleton } from "@/components/ui/skeleton";

/** The newest sessions across every API, refreshed as they happen. */
export default function LiveFeed({ entries, loading }: { entries: RequestLogEntry[]; loading?: boolean }) {
  const now = useNow(5000);
  const groups = groupEntries(entries).slice(0, 9);

  return (
    <section className="panel overflow-hidden" aria-labelledby="feed-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-2 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-green-2" />
          </span>
          <h2 id="feed-title" className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
            Live
          </h2>
        </div>
        <Link
          href="/dashboard/logs"
          className="inline-flex items-center gap-1 rounded text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
          Request log
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
      {loading ? (
        <ul className="divide-y divide-border" role="status" aria-label="Loading requests">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 px-4 py-3">
              <Skeleton className="row-span-2 h-5" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-24" />
            </li>
          ))}
        </ul>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-border">
            <InboxIcon className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
          </span>
          <p className="mt-3 text-[13.5px] font-medium text-foreground">Quiet so far</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">Requests show up here the moment they arrive.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {groups.map((g) => {
            const st = sessionStatus(g);
            return (
              <li key={g.id} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-x-2.5 px-4 py-2.5">
                <span className="row-span-2 rounded-md bg-surface-2 py-0.5 text-center font-mono text-[10.5px] font-medium text-muted-foreground ring-1 ring-border">
                  {kindShort(g.kind)}
                </span>
                <span className="truncate text-[13px] text-foreground">{summaryOf(g)}</span>
                <StatusPill tone={st.tone} label={st.label} />
                <span className="col-span-2 text-[11.5px] text-muted-foreground">{relativeTime(g.createdAt, now)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
