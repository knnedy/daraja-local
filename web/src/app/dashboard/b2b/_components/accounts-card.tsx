"use client";

import { useState } from "react";
import { useAccounts, useUpdateAccounts } from "@/hooks/use-accounts";
import type { Accounts } from "@/lib/types/accounts";
import { formatKes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/form";

const rows: { key: keyof Accounts; label: string; hint: string }[] = [
  {
    key: "utility",
    label: "Utility",
    hint: "Customer payments land here; B2C draws from it",
  },
  { key: "working", label: "Working", hint: "B2B payments draw from here" },
  { key: "chargesPaid", label: "Charges paid", hint: "Fees; always 0 here" },
];

/** The project's simulated accounts, editable, plus an Account Balance query. */
export default function AccountsCard({
  slug,
  onQuery,
  queryDisabledReason,
  querying,
}: {
  slug: string;
  onQuery: () => void;
  queryDisabledReason: string | null;
  querying: boolean;
}) {
  const { data: accounts } = useAccounts(slug);
  const update = useUpdateAccounts(slug);
  const [editing, setEditing] = useState<"utility" | "working" | null>(null);
  const [draft, setDraft] = useState("");

  const draftValid = /^\d+(\.\d{1,2})?$/.test(draft);

  function save() {
    if (!editing || !draftValid) return;
    update.mutate(
      { [editing]: Number(draft) },
      { onSuccess: () => setEditing(null) },
    );
  }

  return (
    <div className="flex flex-col gap-3.5 panel p-4">
      <div>
        <p className="text-[13px] font-medium text-foreground">Accounts</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          What an Account Balance query reports
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {rows.map((row) => {
          const editable = row.key !== "chargesPaid";
          return (
            <div key={row.key} className="flex flex-col gap-1.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground">
                    {row.label}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {row.hint}
                  </p>
                </div>
                {editing !== row.key && (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[12.5px] text-foreground tabular-nums">
                      {accounts ? formatKes(accounts[row.key]) : "—"}
                    </span>
                    {editable && (
                      <button
                        type="button"
                        disabled={!accounts}
                        aria-label={`Set ${row.label.toLowerCase()} balance`}
                        onClick={() => {
                          setEditing(row.key as "utility" | "working");
                          setDraft(String(accounts?.[row.key] ?? ""));
                        }}
                        className="rounded border border-border-strong px-1.5 py-0.5 text-[10.5px] font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
                      >
                        Set
                      </button>
                    )}
                  </div>
                )}
              </div>
              {editing === row.key && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    save();
                  }}
                  className="flex gap-2"
                >
                  <TextInput
                    autoFocus
                    inputMode="decimal"
                    aria-label={`${row.label} balance in KES`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.trim())}
                    onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!draftValid || update.isPending}>
                    {update.isPending ? "Saving…" : "Save"}
                  </Button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {update.isError && (
        <p className="text-[11px] text-destructive">{update.error.message}</p>
      )}

      <button
        type="button"
        onClick={onQuery}
        disabled={Boolean(queryDisabledReason) || querying}
        title={queryDisabledReason ?? undefined}
        className="rounded-lg border border-border-strong px-3.5 py-2 text-xs font-medium text-foreground transition-[background-color,transform] hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {querying ? "Querying…" : "Send an Account Balance query"}
      </button>
    </div>
  );
}
