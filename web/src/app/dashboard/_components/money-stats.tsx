"use client";

import { useAccounts } from "@/hooks/use-accounts";
import { useProject } from "@/hooks/use-projects";
import { useTransactions } from "@/hooks/use-transactions";
import { formatKesWhole } from "@/lib/format";
import type { RequestLogEntry } from "@/lib/types/request-log";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function Tile({ label, value, sub, accent }: { label: string; value: string | null; sub: string | null; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 bg-surface-1 px-5 py-4">
      <p className="text-[12.5px] text-muted-foreground">{label}</p>
      {value === null ? (
        <Skeleton className="my-1 h-[22px] w-28" />
      ) : (
        <p
          className={cn(
            "text-[24px] leading-tight font-semibold tracking-[-0.02em] tabular-nums",
            accent ? "text-green" : "text-foreground",
          )}>
          {value}
        </p>
      )}
      {sub === null ? <Skeleton className="mt-1 h-3 w-40" /> : <p className="truncate text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Money in and out of the shortcode, its balances, and how reliably callbacks land. */
export default function MoneyStats({ slug, entries, loading }: { slug: string; entries: RequestLogEntry[]; loading?: boolean }) {
  const { data: project } = useProject(slug);
  const { data: transactions = [], isPending: txPending } = useTransactions(slug);
  const { data: accounts, isPending: accountsPending } = useAccounts(slug);
  const money = txPending || !project;
  const shortCode = project?.shortCode ?? "";

  const into = transactions.filter((t) => t.creditParty === shortCode && t.kind !== "reversal" && !t.reversedBy);
  const out = transactions.filter((t) => t.debitParty === shortCode);
  const sum = (list: typeof transactions) => list.reduce((n, t) => n + t.amount, 0);

  const deliveries = entries.filter((e) => e.direction === "outbound" && (e.status === "delivered" || e.status === "failed"));
  const delivered = deliveries.filter((e) => e.status === "delivered").length;

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-border shadow-(--panel-shadow) ring-1 ring-border sm:grid-cols-2 xl:grid-cols-4">
      <Tile
        label="Collected"
        value={money ? null : `KES ${formatKesWhole(sum(into))}`}
        sub={money ? null : `${into.length} customer ${into.length === 1 ? "payment" : "payments"}, STK and C2B`}
        accent={into.length > 0}
      />
      <Tile
        label="Paid out"
        value={money ? null : `KES ${formatKesWhole(sum(out))}`}
        sub={money ? null : `${out.length} B2C, B2B and reversal ${out.length === 1 ? "payment" : "payments"}`}
      />
      <Tile
        label="Utility account"
        value={accountsPending ? null : accounts ? `KES ${formatKesWhole(accounts.utility)}` : "—"}
        sub={accountsPending ? null : accounts ? `Working account KES ${formatKesWhole(accounts.working)}` : "Couldn't load balances"}
      />
      <Tile
        label="Callbacks delivered"
        value={loading ? null : deliveries.length ? `${Math.round((delivered / deliveries.length) * 100)}%` : "—"}
        sub={loading ? null : deliveries.length ? `${delivered} of ${deliveries.length} reached your server` : "None sent yet"}
      />
    </div>
  );
}
