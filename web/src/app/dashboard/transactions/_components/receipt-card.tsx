"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ReceiptTextIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import { useInitiatorCall } from "@/hooks/use-transactions";
import { useNow } from "@/hooks/use-now";
import { useProject } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatKes, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/types/transactions";
import { CopyId, StatusPill } from "../../_components/activity";
import { kindInfo, notReversibleReason, partyLabel, reversible } from "../lib/kinds";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionStatus, type InitiatorSession } from "../lib/sessions";

// A torn-paper bottom edge.
const TORN = {
  WebkitMask:
    "radial-gradient(circle at 6px 100%, transparent 5px, #000 5.5px) bottom / 12px 10px repeat-x, linear-gradient(#000, #000) top / 100% calc(100% - 9px) no-repeat",
  mask:
    "radial-gradient(circle at 6px 100%, transparent 5px, #000 5.5px) bottom / 12px 10px repeat-x, linear-gradient(#000, #000) top / 100% calc(100% - 9px) no-repeat",
} as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-[12.5px]">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-foreground">{children}</dd>
    </div>
  );
}

/** The selected transaction as an M-PESA receipt, with Transaction Status and Reversal. */
export default function ReceiptCard({
  slug,
  transaction: t,
  sessions,
  onSelect,
  loading,
}: {
  slug: string;
  loading?: boolean;
  transaction: Transaction | null;
  sessions: InitiatorSession[];
  onSelect: (receipt: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const now = useNow(5000);
  const { data: project } = useProject(slug);
  const status = useInitiatorCall(slug, "status");
  const reverse = useInitiatorCall(slug, "reverse");
  const [confirming, setConfirming] = useState<string | null>(null);

  const shortCode = project?.shortCode ?? "";
  const base = project?.callbackBaseUrl.replace(/\/+$/, "") ?? "";

  if (!t && loading) {
    return (
      <section className="panel flex flex-col gap-4 p-6" aria-label="Receipt" aria-busy>
        <Skeleton className="mx-auto h-4 w-24" />
        <Skeleton className="mx-auto h-8 w-40" />
        <div className="mt-2 flex flex-col gap-3 border-t border-dashed border-border pt-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="flex justify-between gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
            </span>
          ))}
        </div>
        <Skeleton className="mt-2 h-9" />
      </section>
    );
  }

  if (!t) {
    return (
      <section className="panel flex flex-col items-center px-6 py-16 text-center" aria-label="Receipt">
        <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-border">
          <ReceiptTextIcon className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </span>
        <p className="mt-4 text-[14px] font-medium text-foreground">No receipt selected</p>
        <p className="mt-1 max-w-[240px] text-[13px] text-pretty text-muted-foreground">
          Completed payments land in the ledger. Pick one to check its status or reverse it.
        </p>
      </section>
    );
  }

  const about = sessions.filter((s) => s.target === t.receipt || s.target === t.originatorConversationId);
  const pending = about.some((s) => !s.rejected && !s.result);
  const canReverse = reversible(t);
  const askingToReverse = confirming === t.receipt;
  const targets = { resultUrl: `${base}/transactions/result`, queueTimeOutUrl: `${base}/transactions/timeout` };
  const busy = !base || status.isPending || reverse.isPending;
  const error = status.error ?? reverse.error;

  return (
    <section className="panel overflow-hidden" aria-labelledby="receipt-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 id="receipt-title" className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
            Receipt
          </h2>
          <p className="text-[12px] text-muted-foreground">{kindInfo[t.kind].label}</p>
        </div>
        {pending && <StatusPill tone="pending" label="Asking M-PESA" />}
      </div>

      <div
        className="bg-surface-2/60 px-4 pt-4 pb-5 dark:bg-transparent"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in oklch, var(--border-strong) 70%, transparent) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}>
        <div className="drop-shadow-[0_10px_18px_oklch(0_0_0/0.10)]">
          <div style={TORN} className="relative bg-surface-1 px-4 pt-4 pb-6 dark:bg-surface-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-[0.14em] text-green">M-PESA</span>
              <span className="font-mono text-[11px] text-muted-foreground">{formatDateTime(t.finalisedAt)}</span>
            </div>

            <div className="mt-4 text-center">
              <p className="font-mono text-[19px] font-semibold tracking-[0.06em] text-foreground">{t.receipt}</p>
              <p className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
                <span className="mr-1 text-[13px] font-medium text-muted-foreground">KES</span>
                <span className={t.reversedBy ? "text-muted-foreground line-through decoration-1" : "text-foreground"}>
                  {formatKes(t.amount)}
                </span>
              </p>
              <div className="mt-2 flex h-7 items-center justify-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={t.reversedBy ? "reversed" : "completed"}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "rotate(-4deg) scale(1.25)" }}
                    animate={{ opacity: 1, transform: "rotate(-4deg) scale(1)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                    className={cn(
                      "rounded-md border-2 px-2 py-0.5 text-[11px] font-bold tracking-[0.16em] uppercase",
                      t.reversedBy ? "border-amber/70 text-amber" : "border-green/60 text-green",
                    )}>
                    {t.reversedBy ? "Reversed" : "Completed"}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            <dl className="mt-3 border-t border-dashed border-border-strong pt-2">
              <Row label="From">
                <span className="font-mono">{partyLabel(t.debitParty, shortCode)}</span>
              </Row>
              <Row label="To">
                <span className="font-mono">{partyLabel(t.creditParty, shortCode)}</span>
              </Row>
              <Row label="ReasonType">{t.reasonType}</Row>
              {t.reversedBy && (
                <Row label="Reversed by">
                  <button
                    type="button"
                    onClick={() => onSelect(t.reversedBy)}
                    className="font-mono text-amber underline decoration-amber/40 underline-offset-2 hover:decoration-amber">
                    {t.reversedBy}
                  </button>
                </Row>
              )}
            </dl>
            {t.originatorConversationId && (
              <div className="mt-1 border-t border-dashed border-border-strong pt-1.5">
                <p className="text-[11px] text-muted-foreground">OriginatorConversationID</p>
                <CopyId value={t.originatorConversationId} label="OriginatorConversationID" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface-1 p-3">
        {askingToReverse ? (
          <div className="flex flex-col gap-2.5 rounded-xl bg-red-bg/60 p-3 ring-1 ring-red-border/60 dark:bg-red/10">
            <p className="text-[12.5px] text-pretty text-foreground">
              Refund <span className="font-semibold tabular-nums">KES {formatKes(t.amount)}</span> to{" "}
              <span className="font-mono">{partyLabel(t.debitParty, shortCode)}</span> from your utility account?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() =>
                  reverse.mutate({ receipt: t.receipt, amount: t.amount, ...targets }, { onSettled: () => setConfirming(null) })
                }>
                {reverse.isPending ? "Sending…" : "Reverse payment"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => status.mutate({ receipt: t.receipt, amount: t.amount, ...targets })}>
              <SearchIcon className="size-3.5" />
              Check status
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !canReverse}
              title={canReverse ? "Send a Reversal" : notReversibleReason(t)}
              onClick={() => {
                status.reset();
                reverse.reset();
                setConfirming(t.receipt);
              }}>
              <RotateCcwIcon className="size-3.5" />
              Reverse
            </Button>
          </div>
        )}
        {!canReverse && !askingToReverse && (
          <p className="px-0.5 text-[11.5px] text-muted-foreground">{notReversibleReason(t)}.</p>
        )}
        {error && <p className="px-0.5 text-[12px] text-red">{error.message}</p>}

        {about.length > 0 && (
          <ul className="flex flex-col border-t border-border pt-2" aria-live="polite">
            {about.slice(0, 3).map((s) => {
              const st = sessionStatus(s);
              return (
                <li key={s.id} className="flex items-center gap-2 py-1 text-[12px]">
                  <span className="min-w-0 truncate text-foreground">
                    {s.kind === "reversal" ? "Reversal" : "Status query"}
                  </span>
                  <span className="text-muted-foreground">{relativeTime(s.createdAt, now)}</span>
                  <span className="ml-auto">
                    <StatusPill tone={st.tone} label={st.label} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
