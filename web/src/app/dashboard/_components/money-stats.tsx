"use client";

import { useAccounts } from "@/hooks/use-accounts";
import { useProject } from "@/hooks/use-projects";
import { useTransactions } from "@/hooks/use-transactions";
import { formatKesWhole } from "@/lib/format";
import type { RequestLogEntry } from "@/lib/types/request-log";
import { cn } from "@/lib/utils";

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 bg-surface-1 px-5 py-4">
      <p className="text-[12.5px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-[24px] leading-tight font-semibold tracking-[-0.02em] tabular-nums",
          accent ? "text-green" : "text-foreground",
        )}>
        {value}
      </p>
      <p className="truncate text-[12px] text-muted-foreground">{sub}</p>
    </div>
  );
}

/** Money in and out of the shortcode, its balances, and how reliably callbacks land. */
export default function MoneyStats({ slug, entries }: { slug: string; entries: RequestLogEntry[] }) {
  const { data: project } = useProject(slug);
  const { data: transactions = [] } = useTransactions(slug);
  const { data: accounts } = useAccounts(slug);
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
        value={`KES ${formatKesWhole(sum(into))}`}
        sub={`${into.length} customer ${into.length === 1 ? "payment" : "payments"}, STK and C2B`}
        accent={into.length > 0}
      />
      <Tile
        label="Paid out"
        value={`KES ${formatKesWhole(sum(out))}`}
        sub={`${out.length} B2C, B2B and reversal ${out.length === 1 ? "payment" : "payments"}`}
      />
      <Tile
        label="Utility account"
        value={accounts ? `KES ${formatKesWhole(accounts.utility)}` : "—"}
        sub={accounts ? `Working account KES ${formatKesWhole(accounts.working)}` : "…"}
      />
      <Tile
        label="Callbacks delivered"
        value={deliveries.length ? `${Math.round((delivered / deliveries.length) * 100)}%` : "—"}
        sub={deliveries.length ? `${delivered} of ${deliveries.length} reached your server` : "None sent yet"}
      />
    </div>
  );
}
