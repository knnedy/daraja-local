"use client";

import { RotateCcwIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/request-log/time";
import type { Transaction } from "@/lib/types/transactions";

const kindLabel: Record<Transaction["kind"], string> = {
  stk_push: "STK",
  c2b: "C2B",
  b2c: "B2C",
  b2b: "B2B",
  reversal: "REV",
};

const action =
  "flex items-center gap-1 rounded-md border border-border-strong px-2 py-1 text-[11px] font-medium text-foreground transition-[background-color,transform] hover:bg-surface-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100";

/** Every completed transaction, with the two initiator APIs as row actions. */
export default function TransactionsTable({
  transactions,
  busy,
  disabledReason,
  onStatus,
  onReverse,
}: {
  transactions: Transaction[];
  busy: boolean;
  /** Set when the result URLs aren't usable yet. */
  disabledReason: string | null;
  onStatus: (t: Transaction) => void;
  onReverse: (t: Transaction) => void;
}) {
  return (
    <div className="rounded-lg border border-border-strong bg-surface-1 shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-[13px] font-medium text-foreground">
          Completed transactions
        </span>
        <span className="text-xs text-muted-foreground">
          {transactions.length} recorded
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-[12px] text-muted-foreground">
            No completed transactions yet.
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
            Approve an STK Push, simulate a C2B payment or send a B2C payout,
            and its receipt appears here.
          </p>
        </div>
      ) : (
        <ul>
          {transactions.map((t) => {
            const reversible =
              (t.kind === "stk_push" || t.kind === "c2b") && !t.reversedBy;
            return (
              <li
                key={t.receipt}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/60 px-4 py-2.5 last:border-0"
              >
                <span className="w-9 shrink-0 rounded border border-border-strong bg-surface-2 py-0.5 text-center font-mono text-[10px] text-muted-foreground">
                  {kindLabel[t.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 font-mono text-[12px] text-foreground">
                    {t.receipt}
                    <span className="text-muted-foreground">
                      KES {t.amount.toLocaleString()}
                    </span>
                    {t.reversedBy && (
                      <span className="rounded bg-amber/10 px-1.5 py-0.5 text-[10px] text-amber">
                        reversed by {t.reversedBy}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t.debitParty} → {t.creditParty} · {t.reasonType} ·{" "}
                    {relativeTime(t.finalisedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    disabled={busy || disabledReason !== null}
                    title={disabledReason ?? "Send a Transaction Status query"}
                    onClick={() => onStatus(t)}
                    className={action}
                  >
                    <SearchIcon className="size-3" />
                    Status
                  </button>
                  <button
                    type="button"
                    disabled={busy || disabledReason !== null || !reversible}
                    title={
                      disabledReason ??
                      (reversible
                        ? "Reverse this payment"
                        : t.reversedBy
                          ? "Already reversed"
                          : "Only STK and C2B payments can be reversed")
                    }
                    onClick={() => onReverse(t)}
                    className={cn(action, "text-destructive")}
                  >
                    <RotateCcwIcon className="size-3" />
                    Reverse
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
