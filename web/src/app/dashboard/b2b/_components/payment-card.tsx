"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SegmentedControl, TextInput } from "@/components/form";
import type { B2BCommandId } from "@/lib/types/accounts";
import { formatKesWhole } from "@/lib/format";

const commands: { id: B2BCommandId; label: string; party: string }[] = [
  { id: "BusinessPayBill", label: "Pay Bill", party: "PayBill number" },
  { id: "BusinessBuyGoods", label: "Buy Goods", party: "Till number" },
];

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
      className="flex flex-col gap-3.5 rounded-xl border border-border-strong bg-surface-1 p-4 shadow-sm">
      <div>
        <p className="text-[13px] font-medium text-foreground">
          Pay a business
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Signed with this project&apos;s initiator, like your app would
        </p>
      </div>

      <SegmentedControl
        label="Payment type"
        value={commandId}
        options={commands.map((c) => ({ value: c.id, label: c.label }))}
        onChange={setCommandId}
      />

      <div className="grid grid-cols-[96px_1fr] gap-2.5">
        <Field
          label="Amount"
          error={!amountValid && amount !== "" ? "Whole KES above 0" : null}>
          <TextInput
            name="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.trim())}
          />
        </Field>
        <Field
          label={`${command.party} (PartyB)`}
          error={
            !partyValid && partyB !== ""
              ? partyB === shortCode
                ? "That's your own shortcode; pay another business"
                : "A shortcode of 5 to 9 digits"
              : null
          }>
          <TextInput
            name="partyB"
            inputMode="numeric"
            value={partyB}
            onChange={(e) => setPartyB(e.target.value.trim())}
          />
        </Field>
      </div>
      <Field
        label="AccountReference"
        hint={`${reference.length}/13 characters`}>
        <TextInput
          name="accountReference"
          value={reference}
          maxLength={13}
          onChange={(e) => setReference(e.target.value)}
        />
      </Field>

      <Button type="submit" size="lg" disabled={!canSend}>
        <SendIcon className="size-3.5" />
        {sending
          ? "Sending…"
          : `Pay KES ${amountValid ? formatKesWhole(Number(amount)) : "—"}`}
      </Button>
      {disabledReason && !sending && (
        <p className="text-[11px] text-muted-foreground">{disabledReason}</p>
      )}
    </form>
  );
}
