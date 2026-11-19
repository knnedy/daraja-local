"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useB2CState, useUpdateB2CState } from "@/hooks/use-b2c";
import type { B2COutcome } from "@/lib/types/b2c";
import { outcomeInfo } from "../lib/outcomes";
import { formatKes } from "@/lib/format";

const fieldClass =
  "w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[12.5px] text-foreground outline-none focus:border-ring disabled:opacity-60";

/** The simulated utility account payouts draw from, and the forced next result. */
export default function AccountCard({ slug }: { slug: string }) {
  const { data: state } = useB2CState(slug);
  const update = useUpdateB2CState(slug);
  const [draft, setDraft] = useState<string | null>(null);

  const draftValid = draft !== null && /^\d+(\.\d{1,2})?$/.test(draft);

  function saveBalance() {
    if (!draftValid) return;
    update.mutate(
      { utilityBalance: Number(draft) },
      { onSuccess: () => setDraft(null) },
    );
  }

  function force(outcome: B2COutcome | "") {
    update.mutate({ nextOutcome: outcome });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <div>
        <p className="text-[13px] font-medium text-foreground">
          Utility account
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Every completed payout is drawn from here
        </p>
      </div>

      {draft === null ? (
        <div className="flex items-end justify-between gap-2">
          <p className="font-heading text-[21px] font-medium text-foreground tabular-nums">
            <span className="mr-1 text-[12px] text-muted-foreground">KES</span>
            {state ? formatKes(state.utilityBalance) : "—"}
          </p>
          <button
            type="button"
            disabled={!state}
            onClick={() => setDraft(String(state?.utilityBalance ?? ""))}
            className="rounded-md border border-border-strong px-2.5 py-1 text-[11.5px] font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            Set balance
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveBalance();
          }}
          className="flex flex-col gap-2"
        >
          <input
            autoFocus
            inputMode="decimal"
            aria-label="Utility balance in KES"
            value={draft}
            onChange={(e) => setDraft(e.target.value.trim())}
            onKeyDown={(e) => e.key === "Escape" && setDraft(null)}
            className={fieldClass}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!draftValid || update.isPending}
              className="flex-1 rounded-md bg-green px-2.5 py-1.5 text-[11.5px] font-medium text-white transition-[background-color,transform] hover:bg-green/90 active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-md border border-border-strong px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
          {!draftValid && draft !== "" && (
            <p className="text-[11px] text-destructive">
              A number of shillings, up to 2 decimals
            </p>
          )}
        </form>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3.5">
        <div>
          <p className="text-[12px] font-medium text-foreground">
            Next payout result
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Applies to the next payout only, then resets
          </p>
        </div>
        <div className="flex flex-col gap-1" role="radiogroup">
          {(["", ...(state?.forcibleOutcomes ?? [])] as const).map(
            (outcome) => {
              const active = (state?.nextOutcome ?? "") === outcome;
              return (
                <button
                  key={outcome || "natural"}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!state || update.isPending}
                  onClick={() => force(outcome)}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-[11.5px] transition-colors disabled:opacity-60",
                    active
                      ? "border-green/50 bg-green-light text-green"
                      : "border-border text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  <span className="font-medium">
                    {outcome ? outcomeInfo[outcome].label : "Natural result"}
                  </span>
                  <span className="font-mono text-[10.5px] opacity-80">
                    {outcome ? outcomeInfo[outcome].code : "balance & limits"}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </div>

      {update.isError && (
        <p className="text-[11px] text-destructive">{update.error.message}</p>
      )}
    </div>
  );
}
