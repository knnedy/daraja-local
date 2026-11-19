"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimulatePayment } from "@/hooks/use-c2b";
import { useProjectSettings } from "@/hooks/use-settings";
import type { C2BCommandId } from "@/lib/types/c2b";
import { formatKesWhole } from "@/lib/format";

const commands: { id: C2BCommandId; label: string }[] = [
  { id: "CustomerPayBillOnline", label: "PayBill" },
  { id: "CustomerBuyGoodsOnline", label: "Buy Goods" },
];

const fieldClass =
  "w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[12.5px] text-foreground outline-none focus:border-ring disabled:opacity-60";

function errorText(error: Error): string {
  try {
    return (
      (JSON.parse(error.message) as { error?: string }).error ?? error.message
    );
  } catch {
    return error.message;
  }
}

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
      className="flex flex-col gap-3.5 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm"
    >
      <div>
        <p className="text-[13px] font-medium text-foreground">
          Send a test payment
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Same as calling simulate from your app
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
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Amount
          </span>
          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.trim())}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Phone
          </span>
          <input
            inputMode="numeric"
            value={phone}
            onChange={(e) => setMsisdn(e.target.value.trim())}
            placeholder="254708374149"
            className={fieldClass}
          />
        </label>
      </div>

      {commandId === "CustomerPayBillOnline" && (
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Account number (BillRefNumber)
          </span>
          <input
            value={billRef}
            onChange={(e) => setBillRef(e.target.value)}
            className={fieldClass}
          />
        </label>
      )}

      {!amountValid && amount !== "" && (
        <p className="text-[11px] text-destructive">
          Whole shillings only, above 0
        </p>
      )}
      {!phoneValid && phone !== "" && (
        <p className="text-[11px] text-destructive">
          Use the format 254XXXXXXXXX
        </p>
      )}

      <button
        type="submit"
        disabled={!canPay}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-green px-3.5 py-2 text-xs font-medium text-white transition-[background-color,transform] hover:bg-green/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <SendIcon className="size-3.5" />
        {simulate.isPending
          ? "Sending…"
          : `Pay KES ${amountValid ? formatKesWhole(Number(amount)) : "—"}`}
      </button>

      {!registered && (
        <p className="text-[11px] text-muted-foreground">
          Call registerurl first so the payment has somewhere to go.
        </p>
      )}
      {simulate.isError && (
        <p className="text-[11px] text-destructive">
          {errorText(simulate.error)}
        </p>
      )}
    </form>
  );
}
