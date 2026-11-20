"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu } from "@base-ui/react/menu";
import { CheckIcon, ChevronsUpDownIcon, PencilIcon } from "lucide-react";
import { useB2CState, useUpdateB2CState } from "@/hooks/use-b2c";
import { useNow } from "@/hooks/use-now";
import { useProject } from "@/hooks/use-projects";
import { useProjectSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/form";
import {
  EASE_DRAWER,
  HomeIndicator,
  LockScreen,
  PhoneFrame,
  SmsCard,
  StatusBar,
  Wallpaper,
  formatPhone,
  smsTime,
} from "@/components/phone";
import { formatKes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { B2COutcome } from "@/lib/types/b2c";
import { outcomeInfo } from "../lib/outcomes";
import type { PayoutSession } from "../lib/payouts";

function UtilityAccount({ slug }: { slug: string }) {
  const { data: state } = useB2CState(slug);
  const update = useUpdateB2CState(slug);
  const [draft, setDraft] = useState<string | null>(null);
  const draftOk = draft !== null && /^\d+(\.\d{1,2})?$/.test(draft);
  const next = state?.nextOutcome ?? "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-muted-foreground">Utility account</p>
          {draft === null ? (
            <p className="mt-0.5 text-[20px] leading-tight font-semibold tracking-[-0.02em] text-foreground tabular-nums">
              <span className="mr-1 text-[12px] font-medium text-muted-foreground">KES</span>
              {state ? formatKes(state.utilityBalance) : "—"}
            </p>
          ) : (
            <form
              className="mt-1 flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (draftOk) update.mutate({ utilityBalance: Number(draft) }, { onSuccess: () => setDraft(null) });
              }}>
              <TextInput
                autoFocus
                inputMode="decimal"
                aria-label="Utility balance in KES"
                aria-invalid={!draftOk}
                value={draft}
                onChange={(e) => setDraft(e.target.value.trim())}
                onKeyDown={(e) => e.key === "Escape" && setDraft(null)}
                className="h-8 w-[130px]"
              />
              <Button type="submit" size="sm" disabled={!draftOk || update.isPending}>
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </form>
          )}
        </div>
        {draft === null && (
          <Button
            variant="outline"
            size="sm"
            disabled={!state}
            onClick={() => setDraft(String(state?.utilityBalance ?? ""))}>
            <PencilIcon className="size-3" />
            Set balance
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-0.5">
        <div>
          <p className="text-[12px] font-medium text-foreground">Next payout</p>
          <p className="text-[11.5px] text-muted-foreground">Forces one result, then resets</p>
        </div>
        <Menu.Root>
          <Menu.Trigger
            disabled={!state || update.isPending}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-[12.5px] font-medium ring-1 transition-colors disabled:opacity-50",
              next
                ? "bg-amber-bg text-amber ring-amber-border/70"
                : "bg-surface-2 text-foreground ring-border hover:ring-border-strong",
            )}>
            {next ? outcomeInfo[next].short : "Natural"}
            <span className="font-mono text-[11px] opacity-70">{next ? outcomeInfo[next].code : "auto"}</span>
            <ChevronsUpDownIcon className="size-3.5 opacity-60" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end" className="z-50">
              <Menu.Popup className="w-60 origin-(--transform-origin) rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[0_12px_32px_-8px_oklch(0_0_0/0.18),0_2px_6px_oklch(0_0_0/0.06)] transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0">
                <Menu.RadioGroup
                  value={next}
                  onValueChange={(v: B2COutcome | "") => update.mutate({ nextOutcome: v })}>
                  {(["", ...(state?.forcibleOutcomes ?? [])] as (B2COutcome | "")[]).map((o) => (
                    <Menu.RadioItem
                      key={o || "natural"}
                      value={o}
                      closeOnClick
                      className="grid cursor-default grid-cols-[16px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] outline-none data-highlighted:bg-foreground/[0.05]">
                      <Menu.RadioItemIndicator className="text-green">
                        <CheckIcon className="size-3.5" />
                      </Menu.RadioItemIndicator>
                      <span className="col-start-2">{o ? outcomeInfo[o].label : "Natural"}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{o ? outcomeInfo[o].code : "auto"}</span>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      {update.isError && <p className="text-[12px] text-red">{update.error.message}</p>}
    </div>
  );
}

/** The customer receiving the payout: the M-PESA SMS lands here once a payout completes. */
export default function RecipientCard({ slug, payouts }: { slug: string; payouts: PayoutSession[] }) {
  const reduceMotion = useReducedMotion();
  const now = useNow();
  const { data: project } = useProject(slug);
  const { data: settings } = useProjectSettings(slug);
  const merchant = (project?.name ?? "Your business").toUpperCase();

  const number = payouts.find((p) => !p.rejected)?.partyB || settings?.defaultPhoneNumber || "";
  const mine = payouts.filter((p) => p.partyB === number && !p.rejected);
  const inFlight = mine.some((p) => !p.result);
  const messages = mine
    .filter((p) => p.result?.outcome === "completed")
    .map((p) => {
      const at = Date.parse(p.result!.at);
      return {
        id: p.id,
        at,
        text: `${p.result!.transactionId} Confirmed. You have received Ksh${formatKes(Number(p.amount))} from ${merchant} on ${smsTime(at)}.`,
      };
    });
  const banner = messages[0] && now - messages[0].at < 5000 ? messages[0] : null;

  const last = payouts[0];
  const lastLabel = !last
    ? null
    : last.rejected
      ? { text: "Rejected", ok: false }
      : !last.result
        ? { text: "Processing", ok: null }
        : { text: outcomeInfo[last.result.outcome].label, ok: last.result.outcome === "completed" };

  return (
    <section className="panel overflow-hidden" aria-labelledby="recipient-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 id="recipient-title" className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
            Recipient&apos;s phone
          </h2>
          <p className="font-mono text-[12px] text-muted-foreground">{number ? formatPhone(number) : "—"}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium ring-1 ring-inset",
            inFlight ? "bg-blue-bg text-blue ring-blue-border/60" : "bg-surface-2 text-muted-foreground ring-border",
          )}
          aria-live="polite">
          <span className={cn("size-1.5 rounded-full", inFlight ? "animate-pulse bg-blue" : "bg-muted-foreground/50")} />
          {inFlight ? "Payout on its way" : "Listening"}
        </span>
      </div>

      <div
        className="relative flex justify-center px-4 py-4"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 45%, color-mix(in oklch, var(--green-2) 13%, transparent), transparent 75%), radial-gradient(circle, color-mix(in oklch, var(--border-strong) 70%, transparent) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 16px 16px",
        }}>
        <PhoneFrame label="Recipient's phone">
          <Wallpaper />
          <StatusBar now={now} />
          <LockScreen
            now={now}
            idleLabel={inFlight ? "Payout on its way…" : "Waiting for a payout"}
            messages={banner ? messages.slice(1) : messages}
            dimmed={false}
          />
          <AnimatePresence>
            {banner && (
              <motion.div
                key={banner.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-110%)" }}
                animate={{ opacity: 1, transform: "translateY(0%)" }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-110%)" }}
                transition={{ duration: 0.42, ease: EASE_DRAWER }}
                className="absolute inset-x-2 top-8 z-40">
                <SmsCard text={banner.text} at={banner.at} now={now} elevated />
              </motion.div>
            )}
          </AnimatePresence>
          <HomeIndicator />
        </PhoneFrame>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface-1 p-3">
        <UtilityAccount slug={slug} />
        <div className="flex min-h-7 items-center gap-2 border-t border-border px-0.5 pt-2.5 text-[12px]" aria-live="polite">
          {last && lastLabel ? (
            <>
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  lastLabel.ok === null ? "bg-blue" : lastLabel.ok ? "bg-green-2" : "bg-red",
                )}
              />
              <span className="min-w-0 truncate text-foreground">
                Last: KES {last.amount} to {formatPhone(last.partyB)}
              </span>
              <span className="ml-auto shrink-0 text-muted-foreground">{lastLabel.text}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Failed payouts never reach the phone.</span>
          )}
        </div>
      </div>
    </section>
  );
}
