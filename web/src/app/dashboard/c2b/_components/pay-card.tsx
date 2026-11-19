"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SegmentedControl, TextInput } from "@/components/form";
import { useSimulatePayment } from "@/hooks/use-c2b";
import { useProjectSettings } from "@/hooks/use-settings";
import type { C2BCommandId } from "@/lib/types/c2b";
import { formatKesWhole } from "@/lib/format";

const commands: { id: C2BCommandId; label: string }[] = [
  { id: "CustomerPayBillOnline", label: "PayBill" },
  { id: "CustomerBuyGoodsOnline", label: "Buy Goods" },
];

/** Makes a Simulated Payment from the dashboard, as simulate would from an app. */
export default function PayCard({
  slug,
  registered,
}: {
  slug: string;
  registered: boolean;
}) {
  const { data: settings } = useProjectSettings(slug);
  const simulate = useSimulatePayment(slug);

  const [commandId, setCommandId] = useState<C2BCommandId>(
    "CustomerPayBillOnline",
  );
  const [amount, setAmount] = useState("100");
  const [msisdn, setMsisdn] = useState<string | null>(null);
  const [billRef, setBillRef] = useState("INV-001");

  const phone = msisdn ?? settings?.defaultPhoneNumber ?? "";
  const amountValid = /^[1-9]\d*$/.test(amount);
  const phoneValid = /^254\d{9}$/.test(phone);
  const canPay = registered && amountValid && phoneValid && !simulate.isPending;

  function pay() {
    if (!canPay) return;
    simulate.mutate({
      commandId,
      amount,
      msisdn: phone,
      billRefNumber:
        commandId === "CustomerPayBillOnline" ? billRef.trim() : "",
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        pay();
      }}
      className="flex flex-col gap-3.5 rounded-xl border border-border-strong bg-surface-1 p-4 shadow-sm">
      <div>
        <p className="text-[13px] font-medium text-foreground">
          Send a test payment
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Same as calling simulate from your app
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
          label="Phone"
          error={
            !phoneValid && phone !== "" ? "Use the format 254XXXXXXXXX" : null
          }>
          <TextInput
            name="msisdn"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setMsisdn(e.target.value.trim())}
            placeholder="254708374149…"
          />
        </Field>
      </div>

      {commandId === "CustomerPayBillOnline" && (
        <Field label="Account number (BillRefNumber)">
          <TextInput
            name="billRefNumber"
            value={billRef}
            onChange={(e) => setBillRef(e.target.value)}
          />
        </Field>
      )}

      <Button type="submit" size="lg" disabled={!canPay}>
        <SendIcon className="size-3.5" />
        {simulate.isPending
          ? "Sending…"
          : `Pay KES ${amountValid ? formatKesWhole(Number(amount)) : "—"}`}
      </Button>

      {!registered && (
        <p className="text-[11px] text-muted-foreground">
          Call registerurl first so the payment has somewhere to go.
        </p>
      )}
      {simulate.isError && (
        <p className="text-[11px] text-destructive">
          {simulate.error.message}
        </p>
      )}
    </form>
  );
}
