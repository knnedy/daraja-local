"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRightIcon, PencilIcon, RefreshCwIcon } from "lucide-react";
import { useAccounts, useBalanceQuery, useUpdateAccounts } from "@/hooks/use-accounts";
import { useNow } from "@/hooks/use-now";
import { useProject } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/form";
import { formatClock, formatKes, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { B2BSession } from "../lib/sessions";

const money = /^\d+(\.\d{1,2})?$/;

function BalanceForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const { data: accounts } = useAccounts(slug);
  const update = useUpdateAccounts(slug);
  const [working, setWorking] = useState(String(accounts?.working ?? ""));
  const [utility, setUtility] = useState(String(accounts?.utility ?? ""));
  const ok = money.test(working) && money.test(utility);

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) update.mutate({ working: Number(working), utility: Number(utility) }, { onSuccess: onDone });
      }}>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Working (KES)" error={money.test(working) ? null : "Up to 2 decimals"}>
          <TextInput autoFocus inputMode="decimal" value={working} onChange={(e) => setWorking(e.target.value.trim())} />
        </Field>
        <Field label="Utility (KES)" error={money.test(utility) ? null : "Up to 2 decimals"}>
          <TextInput inputMode="decimal" value={utility} onChange={(e) => setUtility(e.target.value.trim())} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!ok || update.isPending}>
          {update.isPending ? "Saving…" : "Save balances"}
        </Button>
      </div>
      {update.isError && <p className="text-[12px] text-red">{update.error.message}</p>}
    </form>
  );
}

/** Your shortcode's M-PESA accounts: what B2B draws from and what a balance query reports. */
export default function AccountsCard({ slug, sessions }: { slug: string; sessions: B2BSession[] }) {
  const reduceMotion = useReducedMotion();
  const now = useNow(1000);
  const { data: project } = useProject(slug);
  const { data: accounts } = useAccounts(slug);
  const query = useBalanceQuery(slug);
  const [editing, setEditing] = useState(false);

  const base = project?.callbackBaseUrl.replace(/\/+$/, "") ?? "";
  const lastPayment = sessions.find((s) => s.kind === "payment" && s.result?.resultCode === "0");
  const lastReport = sessions.find((s) => s.kind === "balance" && s.result?.accounts.length);
  const pendingQuery = sessions.some((s) => s.kind === "balance" && !s.rejected && !s.result);
  const fresh = lastPayment?.result && now - Date.parse(lastPayment.result.at) < 6000 ? lastPayment : null;

  return (
    <section className="panel overflow-hidden" aria-labelledby="accounts-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 id="accounts-title" className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
            Your accounts
          </h2>
          <p className="text-[12px] text-muted-foreground">What B2B pays from</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          <PencilIcon className="size-3" />
          Set balances
        </Button>
      </div>

      <div className="p-4">
        <div className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(140deg,oklch(0.36_0.09_158),oklch(0.24_0.05_165)_55%,oklch(0.19_0.03_170))] p-4 text-white shadow-[0_18px_36px_-18px_oklch(0.3_0.08_160/0.7),inset_0_1px_0_oklch(1_0_0/0.12)]">
          <div
            aria-hidden
            className="absolute -top-16 -right-10 size-48 rounded-full bg-[radial-gradient(circle,oklch(0.75_0.18_150/0.35),transparent_65%)]"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{project?.name ?? "Your business"}</p>
              <p className="font-mono text-[11.5px] text-white/65">Shortcode {project?.shortCode ?? "—"}</p>
            </div>
            <span className="rounded-md bg-white/12 px-1.5 py-0.5 text-[10.5px] font-semibold tracking-[0.08em] text-white/85 ring-1 ring-white/15">
              M-PESA
            </span>
          </div>

          <div className="relative mt-6">
            <p className="text-[11.5px] text-white/65">Working account</p>
            <div className="flex items-baseline gap-2">
              <p className="text-[26px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
                <span className="mr-1 text-[13px] font-medium text-white/65">KES</span>
                {accounts ? formatKes(accounts.working) : "—"}
              </p>
              <AnimatePresence>
                {fresh && (
                  <motion.span
                    key={fresh.id}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px)" }}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[11px] text-white">
                    −{formatKes(Number(fresh.amount))}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/12 pt-3">
            <div>
              <p className="text-[11px] text-white/60">Utility</p>
              <p className="font-mono text-[12.5px] tabular-nums">{accounts ? formatKes(accounts.utility) : "—"}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/60">Charges paid</p>
              <p className="font-mono text-[12.5px] tabular-nums">{accounts ? formatKes(accounts.chargesPaid) : "—"}</p>
            </div>
          </div>
        </div>

        {editing && (
          <div className="mt-4">
            <BalanceForm slug={slug} onDone={() => setEditing(false)} />
          </div>
        )}

        {lastPayment?.result && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 ring-1 ring-border">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-1 ring-1 ring-border">
              <ArrowUpRightIcon className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-foreground">
                Paid {lastPayment.partyB}
                {lastPayment.accountReference && (
                  <span className="font-normal text-muted-foreground"> · {lastPayment.accountReference}</span>
                )}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {lastPayment.result.receipt} · {relativeTime(lastPayment.result.at, now)}
              </p>
            </div>
            <p className="shrink-0 font-mono text-[12.5px] text-foreground tabular-nums">
              −{formatKes(Number(lastPayment.amount))}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12.5px] font-medium text-foreground">Account Balance query</p>
            <p className="text-[11.5px] text-muted-foreground">
              {lastReport?.result ? `Last report ${formatClock(lastReport.result.at)}` : "Ask Daraja what each account holds"}
            </p>
          </div>
          <Button
            variant="outline"
            disabled={!base || query.isPending || pendingQuery}
            onClick={() => query.mutate({ resultUrl: `${base}/balance/result`, queueTimeOutUrl: `${base}/balance/timeout` })}>
            <RefreshCwIcon
              className={cn("size-3.5", (query.isPending || pendingQuery) && "animate-spin motion-reduce:animate-none")}
            />
            Query
          </Button>
        </div>
        {lastReport?.result && (
          <dl className="overflow-hidden rounded-lg ring-1 ring-border">
            {lastReport.result.accounts.map((a) => (
              <div
                key={a.name}
                className="flex items-center justify-between gap-3 border-b border-border px-3 py-1.5 text-[12px] last:border-0">
                <dt className="text-muted-foreground">{a.name}</dt>
                <dd className="font-mono text-foreground tabular-nums">{formatKes(Number(a.available))}</dd>
              </div>
            ))}
          </dl>
        )}
        {query.isError && <p className="text-[12px] text-red">{query.error.message}</p>}
      </div>
    </section>
  );
}
