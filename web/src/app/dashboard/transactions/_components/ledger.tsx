"use client";

import { useEffect, useRef, useState } from "react";
import { InboxIcon, SearchIcon } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { SegmentedControl } from "@/components/form";
import { formatKes, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction, TransactionKind } from "@/lib/types/transactions";
import { direction, kindInfo, partyLabel } from "../lib/kinds";

type Filter = "all" | TransactionKind;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stk_push", label: "STK" },
  { value: "c2b", label: "C2B" },
  { value: "b2c", label: "B2C" },
  { value: "b2b", label: "B2B" },
  { value: "reversal", label: "Reversals" },
];

/** Every completed transaction on the shortcode; selecting one opens its receipt. */
export default function Ledger({
  transactions,
  shortCode,
  selected,
  onSelect,
  loading,
}: {
  transactions: Transaction[];
  loading?: boolean;
  shortCode: string;
  selected: string | null;
  onSelect: (receipt: string) => void;
}) {
  const now = useNow(5000);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const list = useRef<HTMLUListElement>(null);

  // Bring a receipt opened from elsewhere (e.g. "Reversed by") into view.
  useEffect(() => {
    list.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const q = query.trim().toUpperCase();
  const shown = transactions.filter(
    (t) => (filter === "all" || t.kind === filter) && (!q || t.receipt.includes(q) || t.debitParty.includes(q) || t.creditParty.includes(q)),
  );

  return (
    <section className="panel overflow-hidden" aria-labelledby="ledger-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="ledger-title" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Ledger
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {loading ? "Loading completed transactions…" : <>{transactions.length} completed {transactions.length === 1 ? "transaction" : "transactions"}. Pick one to
            check or reverse it.</>}
          </p>
        </div>
        <label className="relative w-full sm:w-52">
          <span className="sr-only">Search receipts and parties</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Receipt or party"
            className="h-8 w-full rounded-lg bg-surface-2 pr-2.5 pl-8 font-mono text-[12.5px] text-foreground ring-1 ring-border outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      <div className="overflow-x-auto border-b border-border px-5 py-2.5 [scrollbar-width:none]">
        <SegmentedControl label="Filter by type" value={filter} options={filters} onChange={setFilter} className="w-max" />
      </div>

      {loading ? (
        <ul role="status" aria-label="Loading transactions">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-3 border-b border-border/70 px-5 py-3 last:border-0">
              <Skeleton className="size-8 rounded-lg" />
              <span className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-40" />
              </span>
              <span className="flex flex-col items-end gap-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-12" />
              </span>
            </li>
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-border">
            <InboxIcon className="size-5 text-muted-foreground" strokeWidth={1.75} />
          </span>
          <p className="mt-4 text-[14px] font-medium text-foreground">
            {transactions.length === 0 ? "No transactions yet" : "Nothing matches"}
          </p>
          <p className="mt-1 max-w-sm text-[13px] text-pretty text-muted-foreground">
            {transactions.length === 0
              ? "Approve an STK Push, simulate a C2B payment, or send a B2C or B2B payment, and its receipt lands here."
              : "Try another type or search."}
          </p>
        </div>
      ) : (
        <ul ref={list} className="max-h-[440px] overflow-y-auto [scrollbar-width:thin]">
          {shown.map((t) => {
            const dir = direction(t, shortCode);
            const active = t.receipt === selected;
            return (
              <li key={t.receipt} className="border-b border-border/70 last:border-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(t.receipt)}
                  className={cn(
                    "grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 text-left transition-colors",
                    active ? "bg-green-light/60 dark:bg-green/10" : "hover:bg-surface-2/70",
                  )}>
                  <span
                    className={cn(
                      "rounded-md py-0.5 text-center font-mono text-[10.5px] font-medium ring-1",
                      t.kind === "reversal"
                        ? "bg-amber-bg text-amber ring-amber-border/60"
                        : "bg-surface-2 text-muted-foreground ring-border",
                    )}>
                    {kindInfo[t.kind].short}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={cn("font-mono text-[13px] text-foreground", t.reversedBy && "text-muted-foreground line-through")}>
                        {t.receipt}
                      </span>
                      {t.reversedBy && (
                        <span className="rounded-full bg-amber-bg px-1.5 py-px text-[10.5px] font-medium text-amber ring-1 ring-amber-border/60">
                          Reversed
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {partyLabel(t.debitParty, shortCode)} → {partyLabel(t.creditParty, shortCode)} · {t.reasonType}
                    </span>
                  </span>
                  <span className="text-right">
                    <span
                      className={cn(
                        "block font-mono text-[13px] tabular-nums",
                        dir === "in" ? "text-green" : "text-foreground",
                      )}>
                      {dir === "in" ? "+" : "−"}
                      {formatKes(t.amount)}
                    </span>
                    <span className="block text-[11.5px] text-muted-foreground">{relativeTime(t.finalisedAt, now)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
