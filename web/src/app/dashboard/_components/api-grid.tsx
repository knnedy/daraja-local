"use client";

import Link from "next/link";
import { ArrowUpRightIcon, type LucideIcon } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { pageIcons } from "@/lib/page-icons";
import { groupEntries } from "@/lib/request-log/group";
import { groupStatus } from "@/lib/request-log/status";
import { relativeTime } from "@/lib/format";
import type { RequestLogEntry, RequestLogKind } from "@/lib/types/request-log";

const apis: { href: string; name: string; blurb: string; icon: LucideIcon; kinds: RequestLogKind[]; paths: string[] }[] = [
  {
    href: "/dashboard/stk",
    name: "STK Push",
    blurb: "Prompt a customer's phone for their PIN",
    icon: pageIcons.stk,
    kinds: ["stk_push"],
    paths: ["stkpush/v1/processrequest", "stkpushquery/v1/query"],
  },
  {
    href: "/dashboard/c2b",
    name: "C2B",
    blurb: "Customers pay your PayBill or Till",
    icon: pageIcons.c2b,
    kinds: ["c2b"],
    paths: ["c2b/v2/registerurl", "c2b/v2/simulate"],
  },
  {
    href: "/dashboard/b2c",
    name: "B2C",
    blurb: "Pay out to a customer's phone",
    icon: pageIcons.b2c,
    kinds: ["b2c"],
    paths: ["b2c/v3/paymentrequest"],
  },
  {
    href: "/dashboard/b2b",
    name: "B2B",
    blurb: "Pay a business, check your balances",
    icon: pageIcons.b2b,
    kinds: ["b2b", "account_balance"],
    paths: ["b2b/v1/paymentrequest", "accountbalance/v1/query"],
  },
  {
    href: "/dashboard/transactions",
    name: "Transactions",
    blurb: "Look up or reverse a payment",
    icon: pageIcons.transactions,
    kinds: ["transaction_status", "reversal"],
    paths: ["transactionstatus/v1/query", "reversal/v1/request"],
  },
];

/** One card per Daraja API, with how much this project has used it. */
export default function ApiGrid({ entries }: { entries: RequestLogEntry[] }) {
  const now = useNow(10000);
  const groups = groupEntries(entries);

  return (
    <section aria-labelledby="apis-title" className="flex flex-col gap-3">
      <h2 id="apis-title" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
        APIs
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {apis.map((api) => {
          const mine = groups.filter((g) => api.kinds.includes(g.kind as RequestLogKind));
          const errors = mine.filter((g) => groupStatus(g).tone === "error").length;
          const last = mine[0];
          return (
            <Link
              key={api.href}
              href={api.href}
              className="group flex flex-col gap-3 panel p-4 transition-[box-shadow,background-color] duration-150 hover:bg-surface-2/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-green-light ring-1 ring-green-mid/60 dark:bg-green/10">
                  <api.icon className="size-4.5 text-green" />
                </span>
                <ArrowUpRightIcon className="size-4 text-muted-foreground transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground motion-reduce:transform-none" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">{api.name}</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">{api.blurb}</p>
              </div>
              <div className="flex flex-col gap-0.5">
                {api.paths.map((p) => (
                  <p key={p} className="truncate font-mono text-[11.5px] text-muted-foreground">
                    /mpesa/{p}
                  </p>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-3 border-t border-border pt-3 text-[12px]">
                <span className="font-medium text-foreground tabular-nums">
                  {mine.length} {mine.length === 1 ? "request" : "requests"}
                </span>
                {errors > 0 && <span className="text-red tabular-nums">{errors} failed</span>}
                <span className="ml-auto text-muted-foreground">{last ? relativeTime(last.createdAt, now) : "Not used yet"}</span>
              </div>
            </Link>
          );
        })}
        <Link
          href="/dashboard/credentials"
          className="group flex flex-col justify-between gap-3 rounded-2xl border border-dashed border-border-strong p-4 transition-colors hover:bg-surface-2/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <div>
            <p className="text-[14px] font-semibold text-foreground">OAuth</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">Every call above needs a Bearer token first.</p>
          </div>
          <p className="font-mono text-[11.5px] text-muted-foreground">GET /oauth/v1/generate</p>
        </Link>
      </div>
    </section>
  );
}
