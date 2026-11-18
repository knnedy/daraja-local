"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { B2BCommandId } from "@/lib/types/accounts";

const commands: { id: B2BCommandId; label: string; party: string }[] = [
  { id: "BusinessPayBill", label: "Pay Bill", party: "PayBill number" },
  { id: "BusinessBuyGoods", label: "Buy Goods", party: "Till number" },
];

const fieldClass =
  "w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[12.5px] text-foreground outline-none focus:border-ring disabled:opacity-60";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export type B2BPaymentDraft = {
  commandId: B2BCommandId;
  amount: number;
  partyB: string;
  accountReference: string;
};

/** Pays another business from the working account, as the developer's app would. */
export default function PaymentCard({
  shortCode,
  onSend,
  disabledReason,
  sending,
}: {
  shortCode: string;
  onSend: (draft: B2BPaymentDraft) => void;
  disabledReason: string | null;
  sending: boolean;
}) {
  const [commandId, setCommandId] = useState<B2BCommandId>("BusinessPayBill");
  const [amount, setAmount] = useState("1500");
  const [partyB, setPartyB] = useState("000000");
  const [reference, setReference] = useState("INV-001");

  const amountValid = /^[1-9]\d*$/.test(amount);
  const partyValid = /^\d{5,9}$/.test(partyB) && partyB !== shortCode;
  const referenceValid = reference.length <= 13;
  const canSend =
    amountValid && partyValid && referenceValid && !disabledReason && !sending;
  const command = commands.find((c) => c.id === commandId)!;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSend) return;
        onSend({
          commandId,
          amount: Number(amount),
          partyB,
          accountReference: reference,
        });
      }}
      className="flex flex-col gap-3.5 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm"
    >
      <div>
        <p className="text-[13px] font-medium text-foreground">
          Pay a business
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Signed with this project&apos;s initiator, like your app would
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-md border border-border bg-surface-2 p-0.5">
        {commands.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCommandId(c.id)}
            aria-pressed={commandId === c.id}
            className={cn(
              "rounded px-2 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              commandId === c.id && "bg-surface-1 text-foreground shadow-sm",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[88px_1fr] gap-2">
        <Field label="Amount">
          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.trim())}
            className={fieldClass}
          />
        </Field>
        <Field label={`${command.party} (PartyB)`}>
          <input
            inputMode="numeric"
            value={partyB}
            onChange={(e) => setPartyB(e.target.value.trim())}
            className={fieldClass}
          />
        </Field>
      </div>
      <Field label="AccountReference">
        <input
          value={reference}
          maxLength={13}
          onChange={(e) => setReference(e.target.value)}
          className={fieldClass}
        />
      </Field>

      {!amountValid && amount !== "" && (
        <p className="text-[11px] text-destructive">
          Whole shillings only, above 0
        </p>
      )}
      {!partyValid && partyB !== "" && (
        <p className="text-[11px] text-destructive">
          {partyB === shortCode
            ? "That's your own shortcode; pay another business"
            : "A shortcode of 5 to 9 digits"}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSend}
        title={disabledReason ?? undefined}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-green px-3.5 py-2 text-xs font-medium text-white transition-[background-color,transform] hover:bg-green/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <SendIcon className="size-3.5" />
        {sending
          ? "Sending…"
          : `Pay KES ${amountValid ? Number(amount).toLocaleString() : "—"}`}
      </button>
    </form>
  );
}
