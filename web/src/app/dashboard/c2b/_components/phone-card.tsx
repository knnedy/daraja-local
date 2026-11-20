"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSimulatePayment } from "@/hooks/use-c2b";
import { useProject } from "@/hooks/use-projects";
import { useProjectSettings } from "@/hooks/use-settings";
import { TextInput } from "@/components/form";
import { TEST_PIN, formatPhone } from "@/components/phone";
import { cn } from "@/lib/utils";
import { paymentStatus, settledAt, type PaymentSession } from "../lib/sessions";
import CustomerPhone, { type PayInput, type PayOutcome, type PhoneSms } from "./customer-phone";

/** The customer's side of C2B: they pay from their own phone, unprompted by your app. */
export default function PhoneCard({
  slug,
  payments,
  registered,
}: {
  slug: string;
  payments: PaymentSession[];
  registered: boolean;
}) {
  const { data: project } = useProject(slug);
  const { data: settings } = useProjectSettings(slug);
  const simulate = useSimulatePayment(slug);
  const queryClient = useQueryClient();
  const [msisdnDraft, setMsisdn] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  const msisdn = msisdnDraft ?? settings?.defaultPhoneNumber ?? "254708374149";
  const msisdnOk = /^254(7|1)\d{8}$/.test(msisdn);
  const merchant = project?.name ?? "Your business";
  const tracked = trackingId ? payments.find((p) => p.id === trackingId) : undefined;

  // Poll quickly while a payment from the phone is in flight.
  const waiting = !!trackingId && (!tracked || paymentStatus(tracked).state === "processing");
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => void queryClient.invalidateQueries({ queryKey: ["request-log"] }), 500);
    return () => clearInterval(id);
  }, [waiting, queryClient]);

  let outcome: PayOutcome | null = null;
  if (simulate.isError) {
    outcome = { state: "failed", title: "Failed", body: simulate.error.message };
  } else if (simulate.isPending || waiting) {
    outcome = { state: "processing" };
  } else if (tracked) {
    const s = paymentStatus(tracked).state;
    outcome =
      s === "paid"
        ? { state: "paid" }
        : s === "declined"
          ? {
              state: "failed",
              title: "Payment declined",
              body: `${merchant.toUpperCase()} could not accept this payment. Your M-PESA account was not charged.`,
            }
          : { state: "failed", title: "Failed", body: tracked.rejectionMessage ?? "The payment was rejected." };
  }

  const messages: PhoneSms[] = payments
    .filter((p) => p.msisdn === msisdn && p.transId && paymentStatus(p).state === "paid")
    .map((p) => ({
      id: p.id,
      at: Date.parse(settledAt(p) ?? p.createdAt),
      receipt: p.transId ?? "",
      amount: Number(p.amount),
      account: p.billRef,
      buyGoods: p.commandId === "CustomerBuyGoodsOnline",
    }));

  function pay(input: PayInput) {
    setTrackingId(null);
    simulate.mutate(
      { commandId: input.commandId, amount: input.amount, msisdn, billRefNumber: input.billRef },
      { onSuccess: (r) => setTrackingId(r.conversationId) },
    );
  }

  const last = payments[0];
  const lastStatus = last ? paymentStatus(last) : null;

  return (
    <section className="panel overflow-hidden" aria-labelledby="phone-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 id="phone-title" className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
            Customer&apos;s phone
          </h2>
          <p className="text-[12px] text-muted-foreground">Pay like a customer would</p>
        </div>
        <span
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium ring-1 ring-inset",
            registered ? "bg-green-light text-green ring-green-mid/60" : "bg-amber-bg text-amber ring-amber-border/60",
          )}>
          <span className={cn("size-1.5 rounded-full", registered ? "bg-green-2" : "bg-amber")} />
          {registered ? "Registered" : "Not registered"}
        </span>
      </div>

      <div
        className="relative flex justify-center px-4 py-4"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 45%, color-mix(in oklch, var(--green-2) 13%, transparent), transparent 75%), radial-gradient(circle, color-mix(in oklch, var(--border-strong) 70%, transparent) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 16px 16px",
        }}>
        <CustomerPhone
          merchant={merchant}
          shortCode={project?.shortCode ?? ""}
          messages={messages}
          outcome={outcome}
          onPay={pay}
          onDone={() => {
            simulate.reset();
            setTrackingId(null);
          }}
        />
      </div>

      <div className="flex flex-col gap-2.5 border-t border-border bg-surface-1 p-3">
        <label className="flex items-center justify-between gap-3 px-0.5">
          <span className="text-[12px] font-medium text-foreground">Customer&apos;s number</span>
          <TextInput
            name="msisdn"
            type="tel"
            inputMode="numeric"
            value={msisdn}
            aria-invalid={!msisdnOk}
            onChange={(e) => setMsisdn(e.target.value.trim())}
            className="h-8 w-[150px] font-mono text-[12.5px]"
          />
        </label>
        <p className="px-0.5 text-[12px] leading-relaxed text-muted-foreground">
          Open <span className="font-medium text-foreground">Pay Bill</span> or{" "}
          <span className="font-medium text-foreground">Buy Goods</span> on the phone. PIN{" "}
          <span className="font-mono text-foreground">{TEST_PIN}</span> pays; any other PIN fails on the phone, before
          anything reaches your server.
        </p>
        <div className="flex min-h-7 items-center gap-2 border-t border-border px-0.5 pt-2.5 text-[12px]" aria-live="polite">
          {last && lastStatus ? (
            <>
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  lastStatus.state === "paid" ? "bg-green-2" : lastStatus.state === "processing" ? "bg-blue" : "bg-red",
                )}
              />
              <span className="min-w-0 truncate text-foreground">
                Last: KES {last.amount} from {formatPhone(last.msisdn)}
              </span>
              <span className="ml-auto shrink-0 text-muted-foreground">{lastStatus.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No payments yet.</span>
          )}
        </div>
      </div>
    </section>
  );
}
