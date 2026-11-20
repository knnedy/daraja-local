"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  InboxIcon,
  RotateCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { useResendCallback } from "@/hooks/use-stk";
import { useCopy } from "@/hooks/use-copy";
import { useNow } from "@/hooks/use-now";
import { formatClock, formatDateTime, formatKesWhole, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StkAttempt } from "../lib/sessions";
import type { CallbackDelivery } from "../lib/callbacks";
import { formatPhone } from "./virtual-phone";

type Tone = "success" | "danger" | "warning" | "pending";

const OUTCOMES: Record<string, { label: string; tone: Tone }> = {
  approved: { label: "Paid", tone: "success" },
  wrong_pin: { label: "Wrong PIN", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "danger" },
  insufficient_balance: { label: "No funds", tone: "danger" },
  timeout: { label: "Timed out", tone: "warning" },
};

function statusOf(a: StkAttempt): { label: string; tone: Tone } {
  if (a.rejected) return { label: "Rejected", tone: "danger" };
  if (!a.outcome) return { label: "Waiting", tone: "pending" };
  return OUTCOMES[a.outcome] ?? { label: a.outcome, tone: "danger" };
}

const toneClass: Record<Tone, string> = {
  success: "bg-green-light text-green ring-green-mid/60",
  danger: "bg-red-bg text-red ring-red-border/60",
  warning: "bg-amber-bg text-amber ring-amber-border/60",
  pending: "bg-blue-bg text-blue ring-blue-border/60",
};

const dotClass: Record<Tone, string> = {
  success: "bg-green-2",
  danger: "bg-red",
  warning: "bg-amber",
  pending: "bg-blue",
};

function StatusBadge({ attempt }: { attempt: StkAttempt }) {
  const s = statusOf(attempt);
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium ring-1 ring-inset",
        toneClass[s.tone],
      )}>
      <span className="relative flex size-1.5">
        {s.tone === "pending" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue opacity-60 motion-reduce:hidden" />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", dotClass[s.tone])} />
      </span>
      {s.label}
    </span>
  );
}

function elapsed(from: string, to: string) {
  const ms = Math.max(0, Date.parse(to) - Date.parse(from));
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function Disclosure({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
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

function Step({
  tone,
  title,
  time,
  delta,
  last,
  children,
}: {
  tone: Tone | "idle";
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
        <span
          className={cn(
            "size-2.5 rounded-full ring-4 ring-surface-1",
            tone === "idle" ? "bg-border-strong" : dotClass[tone],
          )}
        />
        {tone === "pending" && (
          <span className="absolute size-2.5 animate-ping rounded-full bg-blue opacity-50 motion-reduce:hidden" />
        )}
      </span>
      <div className={cn("min-w-0", !last && "pb-5")}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-[13.5px] font-medium text-foreground">{title}</p>
          {delta && (
            <span className="rounded bg-surface-2 px-1.5 py-px font-mono text-[11px] text-muted-foreground">
              +{delta}
            </span>
          )}
          {time && (
            <time className="ml-auto font-mono text-[11.5px] text-muted-foreground tabular-nums">{time}</time>
          )}
        </div>
        {children}
      </div>
    </li>
  );
}

function DeliveryStep({ d, from, last }: { d: CallbackDelivery; from: string; last: boolean }) {
  const final = d.attempts[d.attempts.length - 1];
  const reply = final ? (final.err ? "no response" : `HTTP ${final.statusCode}`) : "";
  return (
    <Step
      tone={d.delivered ? "success" : "danger"}
      title={d.replay ? "Callback resent" : d.delivered ? "Callback delivered" : "Callback failed"}
      time={formatClock(d.at, { ms: true })}
      delta={d.replay ? undefined : elapsed(from, d.at)}
      last={last}>
      <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground" title={d.url}>
        POST {d.url || "your CallBackURL"}
      </p>
      {final && (
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Your server answered{" "}
          <span className={cn("font-mono text-[12px] font-medium", d.delivered ? "text-green" : "text-red")}>
            {reply}
          </span>
          {final.durationMs !== null && <> in {final.durationMs} ms</>}
          {d.attempts.length > 1 && <> after {d.attempts.length} attempts</>}
          {final.err && <span className="mt-0.5 block font-mono text-[11.5px] break-all text-red">{final.err}</span>}
        </p>
      )}
      {d.sent && (
        <Disclosure label="Callback body">
          <CodeBlock code={d.sent} lang="json" lineNumbers={false} maxHeight="20rem" />
        </Disclosure>
      )}
      {final?.reply && (
        <Disclosure label="Your server's reply">
          <CodeBlock code={final.reply} lang="json" lineNumbers={false} maxHeight="12rem" />
        </Disclosure>
      )}
    </Step>
  );
}

function Detail({ attempt, slug }: { attempt: StkAttempt; slug: string }) {
  const resend = useResendCallback(slug);
  const { copied, copy } = useCopy();
  const answered = attempt.deliveries[0];

  return (
    <div className="flex min-w-0 flex-col gap-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <p className="text-[22px] leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums">
              {attempt.amount ? `KES ${formatKesWhole(Number(attempt.amount))}` : "—"}
            </p>
            <StatusBadge attempt={attempt} />
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
            <span className="font-mono">{attempt.phone ? formatPhone(attempt.phone) : "No phone"}</span>
            <span aria-hidden>·</span>
            <span>{attempt.reference || "No AccountReference"}</span>
            {attempt.resultCode !== "" && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono">ResultCode {attempt.resultCode}</span>
              </>
            )}
          </p>
          {!attempt.rejected && (
            <button
              type="button"
              onClick={() => void copy(attempt.id)}
              className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded font-mono text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
              title="Copy CheckoutRequestID">
              <span className="truncate">{attempt.id}</span>
              {copied ? <CheckIcon className="size-3 shrink-0 text-green" /> : <CopyIcon className="size-3 shrink-0" />}
            </button>
          )}
        </div>
        {attempt.deliveries.length > 0 && (
          <Button
            variant="outline"
            disabled={resend.isPending}
            onClick={() => resend.mutate(attempt.id)}
            title="POST the same callback body to the same CallBackURL again">
            <RotateCwIcon className={cn("size-3.5", resend.isPending && "animate-spin motion-reduce:animate-none")} />
            Resend callback
          </Button>
        )}
      </div>
      {resend.isError && <p className="text-[12px] text-red">{resend.error.message}</p>}

      <ol>
        <Step tone="success" title="Request received from your app" time={formatClock(attempt.at, { ms: true })}>
          <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">POST /mpesa/stkpush/v1/processrequest</p>
          <Disclosure label="Request body">
            <CodeBlock code={attempt.request} lang="json" lineNumbers={false} maxHeight="20rem" />
          </Disclosure>
        </Step>

        {attempt.rejected ? (
          <Step
            tone="danger"
            title={`Rejected · ${attempt.rejection?.code ?? ""}`}
            time={attempt.response ? formatClock(attempt.response.at, { ms: true }) : undefined}
            last>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {attempt.rejection?.message}. No prompt was sent and no callback will follow.
            </p>
            {attempt.response && (
              <Disclosure label="Error response">
                <CodeBlock code={attempt.response.body} lang="json" lineNumbers={false} />
              </Disclosure>
            )}
          </Step>
        ) : (
          <>
            <Step
              tone="success"
              title="Accepted · ResponseCode 0"
              time={attempt.response ? formatClock(attempt.response.at, { ms: true }) : undefined}
              delta={attempt.response ? elapsed(attempt.at, attempt.response.at) : undefined}>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                Only means &ldquo;prompt sent&rdquo;. The outcome arrives later, in the callback.
              </p>
              {attempt.response && (
                <Disclosure label="Response body">
                  <CodeBlock code={attempt.response.body} lang="json" lineNumbers={false} />
                </Disclosure>
              )}
            </Step>

            <Step
              tone={attempt.outcome ? statusOf(attempt).tone : "pending"}
              title={
                attempt.outcome
                  ? `Customer: ${statusOf(attempt).label.toLowerCase()}`
                  : "Waiting for the customer on the Virtual Phone"
              }
              time={answered ? formatClock(answered.at, { ms: true }) : undefined}
              last={attempt.deliveries.length === 0}>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {attempt.outcome
                  ? "The phone's answer decides the ResultCode in the callback."
                  : "Answer the prompt on the phone, or let it time out."}
              </p>
            </Step>

            {attempt.deliveries.map((d, i) => (
              <DeliveryStep key={`${d.at}-${i}`} d={d} from={attempt.at} last={i === attempt.deliveries.length - 1} />
            ))}
          </>
        )}
      </ol>
    </div>
  );
}

/** Every STK Push this project received, with the full story of the selected one. */
export default function ActivityPanel({ slug, attempts }: { slug: string; attempts: StkAttempt[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const now = useNow(5000);
  const recent = attempts.slice(0, 30);
  const selected = recent.find((a) => a.id === selectedId) ?? recent[0];

  return (
    <section className="panel overflow-hidden" aria-labelledby="activity-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="activity-title" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Activity
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Every STK Push this project received, step by step.
          </p>
        </div>
        <Link
          href="/dashboard/logs"
          className="inline-flex items-center gap-1 rounded text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
          Request log
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-border">
            <InboxIcon className="size-5 text-muted-foreground" strokeWidth={1.75} />
          </span>
          <p className="mt-4 text-[14px] font-medium text-foreground">No STK Pushes yet</p>
          <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
            Call processrequest from your app, or use <span className="font-medium text-foreground">Send test prompt</span>.
            Each request shows up here with its callback.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)]">
          <ul
            aria-label="STK Pushes"
            className="flex max-h-[560px] flex-col gap-0.5 overflow-y-auto border-b border-border p-2 md:border-r md:border-b-0">
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
                      <span className="text-[13.5px] font-medium text-foreground tabular-nums">
                        {a.amount ? `KES ${formatKesWhole(Number(a.amount))}` : "—"}
                      </span>
                      <StatusBadge attempt={a} />
                    </span>
                    <span className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
                      <span className="truncate font-mono">
                        {a.phone ? formatPhone(a.phone) : "—"}
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
          {selected && <Detail key={selected.id} attempt={selected} slug={slug} />}
        </div>
      )}
    </section>
  );
}
