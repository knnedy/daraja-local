"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, CopyIcon, InboxIcon } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { CodeBlock } from "@/components/code-block";
import { useNow } from "@/hooks/use-now";
import type { DeliveryAttempt } from "@/lib/request-log/delivery";
import { formatClock, formatDateTime, formatKesWhole, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Tone = "success" | "danger" | "warning" | "pending" | "idle";

const toneClass: Record<Tone, string> = {
  success: "bg-green-light text-green ring-green-mid/60",
  danger: "bg-red-bg text-red ring-red-border/60",
  warning: "bg-amber-bg text-amber ring-amber-border/60",
  pending: "bg-blue-bg text-blue ring-blue-border/60",
  idle: "bg-surface-2 text-muted-foreground ring-border",
};

const dotClass: Record<Tone, string> = {
  success: "bg-green-2",
  danger: "bg-red",
  warning: "bg-amber",
  pending: "bg-blue",
  idle: "bg-border-strong",
};

export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium ring-1 ring-inset",
        toneClass[tone],
      )}>
      <span className="relative flex size-1.5">
        {tone === "pending" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue opacity-60 motion-reduce:hidden" />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", dotClass[tone])} />
      </span>
      {label}
    </span>
  );
}

export function kes(amount: string | number) {
  const n = Number(amount);
  return amount === "" || Number.isNaN(n) ? "—" : `KES ${formatKesWhole(n)}`;
}

export function elapsed(from: string, to: string) {
  const ms = Math.max(0, Date.parse(to) - Date.parse(from));
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function Disclosure({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronDownIcon
          className={cn("size-3.5 transition-transform duration-150 motion-reduce:transition-none", !open && "-rotate-90")}
        />
        {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function JsonDisclosure({
  label,
  code,
  maxHeight,
  defaultOpen,
}: {
  label: string;
  code: string;
  maxHeight?: string;
  defaultOpen?: boolean;
}) {
  if (!code) return null;
  return (
    <Disclosure label={label} defaultOpen={defaultOpen}>
      <CodeBlock code={code} lang="json" lineNumbers={false} maxHeight={maxHeight ?? "20rem"} />
    </Disclosure>
  );
}

/** One row of a vertical timeline: a dot, a title with its time, and any detail below. */
export function Step({
  tone,
  title,
  time,
  delta,
  last,
  children,
}: {
  tone: Tone;
  title: React.ReactNode;
  time?: string;
  delta?: string;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative grid grid-cols-[20px_1fr] gap-x-3">
      {!last && <span aria-hidden className="absolute top-5 bottom-0 left-[9.5px] w-px bg-border" />}
      <span className="relative mt-[3px] flex size-5 items-center justify-center">
        <span className={cn("size-2.5 rounded-full ring-4 ring-surface-1", dotClass[tone])} />
        {tone === "pending" && (
          <span className="absolute size-2.5 animate-ping rounded-full bg-blue opacity-50 motion-reduce:hidden" />
        )}
      </span>
      <div className={cn("min-w-0", !last && "pb-5")}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className={cn("text-[13.5px] font-medium", tone === "idle" ? "text-muted-foreground" : "text-foreground")}>
            {title}
          </p>
          {delta && (
            <span className="rounded bg-surface-2 px-1.5 py-px font-mono text-[11px] text-muted-foreground">+{delta}</span>
          )}
          {time && <time className="ml-auto font-mono text-[11.5px] text-muted-foreground tabular-nums">{time}</time>}
        </div>
        {children}
      </div>
    </li>
  );
}

export function StepNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{children}</p>;
}

export function at(value: string) {
  return formatClock(value, { ms: true });
}

/** A POST to the developer's server: where it went, how it answered, and both bodies. */
export function CallDetail({
  url,
  attempts,
  sent,
  ok,
  sentLabel,
}: {
  url: string;
  attempts: DeliveryAttempt[];
  sent: string;
  ok: boolean;
  sentLabel: string;
}) {
  const final = attempts[attempts.length - 1];
  return (
    <>
      <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground" title={url}>
        POST {url || "your URL"}
      </p>
      {final && (
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Your server answered{" "}
          <span className={cn("font-mono text-[12px] font-medium", ok ? "text-green" : "text-red")}>
            {final.err ? "no response" : `HTTP ${final.statusCode}`}
          </span>
          {final.durationMs !== null && <> in {final.durationMs} ms</>}
          {attempts.length > 1 && <> after {attempts.length} attempts</>}
          {final.err && <span className="mt-0.5 block font-mono text-[11.5px] break-all text-red">{final.err}</span>}
        </p>
      )}
      <JsonDisclosure label={sentLabel} code={sent} />
      {final?.reply && <JsonDisclosure label="Your server's reply" code={final.reply} maxHeight="12rem" />}
    </>
  );
}

export type Delivery = {
  at: string;
  delivered: boolean;
  replay: boolean;
  url: string;
  sent: string;
  attempts: DeliveryAttempt[];
};

/** A callback or confirmation POST, as one timeline step. */
export function DeliveryStep({
  d,
  from,
  last,
  noun,
}: {
  d: Delivery;
  from: string;
  last: boolean;
  noun: string;
}) {
  return (
    <Step
      tone={d.delivered ? "success" : "danger"}
      title={`${noun} ${d.replay ? "resent" : d.delivered ? "delivered" : "failed"}`}
      time={at(d.at)}
      delta={d.replay ? undefined : elapsed(from, d.at)}
      last={last}>
      <CallDetail url={d.url} attempts={d.attempts} sent={d.sent} ok={d.delivered} sentLabel={`${noun} body`} />
    </Step>
  );
}

export type ActivityItem = {
  id: string;
  at: string;
  amount: string;
  who: string;
  reference: string;
  tone: Tone;
  status: string;
  /** Shown instead of the amount, for requests that move no money. */
  title?: string;
};

/** A list of transactions beside the full story of the selected one. */
export function ActivityPanel<T extends ActivityItem>({
  title = "Activity",
  description,
  items,
  empty,
  renderDetail,
}: {
  title?: string;
  description: string;
  items: T[];
  empty: { title: string; body: React.ReactNode };
  renderDetail: (item: T) => React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const now = useNow(5000);
  const recent = items.slice(0, 30);
  const selected = recent.find((a) => a.id === selectedId) ?? recent[0];

  return (
    <section className="panel overflow-hidden" aria-labelledby="activity-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="activity-title" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        </div>
        <Link
          href="/dashboard/logs"
          className="inline-flex shrink-0 items-center gap-1 rounded text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
          Request log
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-border">
            <InboxIcon className="size-5 text-muted-foreground" strokeWidth={1.75} />
          </span>
          <p className="mt-4 text-[14px] font-medium text-foreground">{empty.title}</p>
          <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{empty.body}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)]">
          <ul
            aria-label={title}
            className="flex max-h-[560px] flex-col gap-0.5 overflow-y-auto border-b [scrollbar-width:thin] border-border p-2 md:border-r md:border-b-0">
            {recent.map((a) => {
              const isSelected = a === selected;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    aria-current={isSelected}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-2",
                      isSelected && "bg-surface-2 ring-1 ring-border",
                    )}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-medium text-foreground tabular-nums">{a.title ?? kes(a.amount)}</span>
                      <StatusPill tone={a.tone} label={a.status} />
                    </span>
                    <span className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
                      <span className="truncate font-mono">
                        {a.who || "—"}
                        {a.reference && <span className="font-sans"> · {a.reference}</span>}
                      </span>
                      <time className="shrink-0" title={formatDateTime(a.at)}>
                        {relativeTime(a.at, now)}
                      </time>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {selected && <div key={selected.id} className="min-w-0">{renderDetail(selected)}</div>}
        </div>
      )}
    </section>
  );
}

/** Header of the selected transaction: amount, status, facts and actions. */
export function DetailHeader({
  amount,
  heading,
  tone,
  status,
  facts,
  id,
  action,
}: {
  amount: string;
  /** Replaces the amount as the headline. */
  heading?: string;
  tone: Tone;
  status: string;
  facts: React.ReactNode[];
  id?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <p className="text-[22px] leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums">
            {heading ?? kes(amount)}
          </p>
          <StatusPill tone={tone} label={status} />
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
          {facts.filter(Boolean).map((f, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>·</span>}
              {f}
            </span>
          ))}
        </p>
        {id}
      </div>
      {action}
    </div>
  );
}

/** A transaction ID under the header that copies on click. */
export function CopyId({ value, label }: { value: string; label: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => void copy(value)}
      className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded font-mono text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
      title={`Copy ${label}`}>
      <span className="truncate">{value}</span>
      {copied ? <CheckIcon className="size-3 shrink-0 text-green" /> : <CopyIcon className="size-3 shrink-0" />}
    </button>
  );
}
