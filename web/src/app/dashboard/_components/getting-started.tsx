"use client";

import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { groupEntries } from "@/lib/request-log/group";
import { groupStatus } from "@/lib/request-log/status";
import type { RequestLogEntry } from "@/lib/types/request-log";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** First-run checklist, ticked off from what the request log has actually seen. */
export default function GettingStarted({ entries, loading }: { entries: RequestLogEntry[]; loading?: boolean }) {
  const groups = groupEntries(entries);
  const steps = [
    {
      title: "Point your app at Daraja Local",
      body: "Copy the .env from Settings; every Daraja call your app makes lands here.",
      href: "/dashboard/settings",
      cta: "Get the .env",
      done: entries.some((e) => e.direction === "inbound"),
    },
    {
      title: "Send an STK Push",
      body: "Approve it on the virtual phone with PIN 1234.",
      href: "/dashboard/stk",
      cta: "Open STK Push",
      done: entries.some((e) => e.operation === "stk_push" && e.step === "request"),
    },
    {
      title: "Receive a callback",
      body: "Your server answers a callback with a 2xx.",
      href: "/dashboard/logs",
      cta: "See deliveries",
      done: entries.some((e) => e.direction === "outbound" && e.status === "delivered"),
    },
    {
      title: "Handle a failure",
      body: "Cancel a prompt, enter a wrong PIN, or force a B2C failure.",
      href: "/dashboard/b2c",
      cta: "Force one",
      done: groups.some((g) => groupStatus(g).tone === "error"),
    },
  ];
  const done = steps.filter((s) => s.done).length;
  if (loading) return <GettingStartedSkeleton />;
  if (done === steps.length) return null;
  const next = steps.findIndex((s) => !s.done);

  return (
    <section className="panel overflow-hidden" aria-labelledby="start-title">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 id="start-title" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Getting started
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {done} of {steps.length} done. Ticks itself off as your app talks to Daraja Local.
          </p>
        </div>
        <div className="flex w-32 items-center gap-2" aria-hidden>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-green-2 transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${(done / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <ol className="grid sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={cn(
              "flex flex-col gap-2 border-border p-5 not-last:border-b sm:nth-[odd]:border-r xl:border-b-0 xl:not-last:border-r",
              i === next && "bg-green-light/40 dark:bg-green/5",
            )}>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[12px] font-semibold ring-1",
                s.done
                  ? "bg-green-2 text-white ring-green-2"
                  : i === next
                    ? "bg-surface-1 text-green ring-green-2"
                    : "bg-surface-2 text-muted-foreground ring-border",
              )}>
              {s.done ? <CheckIcon className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <p className={cn("text-[13.5px] font-medium", s.done ? "text-muted-foreground line-through" : "text-foreground")}>
              {s.title}
            </p>
            <p className="text-[12.5px] text-pretty text-muted-foreground">{s.body}</p>
            {!s.done && (
              <Link
                href={s.href}
                className="mt-auto inline-flex items-center gap-1 self-start rounded pt-1 text-[12.5px] font-medium text-green transition-colors hover:text-green-2">
                {s.cta}
                <ArrowRightIcon className="size-3.5" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function GettingStartedSkeleton() {
  return (
    <section className="panel overflow-hidden" aria-busy aria-label="Getting started">
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 border-border p-5 not-last:border-b sm:not-last:border-r xl:not-last:border-b-0">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
