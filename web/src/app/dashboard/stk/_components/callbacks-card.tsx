"use client";

import { useState } from "react";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResendCallback } from "@/hooks/use-stk";
import { Call, Empty } from "../../_components/delivery-call";
import type { StkPayment } from "../lib/callbacks";

const outcomeLabels: Record<string, string> = {
  approved: "Paid",
  wrong_pin: "Wrong PIN",
  cancelled: "Cancelled",
  insufficient_balance: "Insufficient balance",
  timeout: "No answer",
};

function errorText(error: Error): string {
  try {
    return (
      (JSON.parse(error.message) as { error?: string }).error ?? error.message
    );
  } catch {
    return error.message;
  }
}

function Status({ payment }: { payment: StkPayment }) {
  const pending = payment.outcome === "";
  const paid = payment.outcome === "approved";
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[10.5px]",
        pending && "bg-surface-2 text-muted-foreground",
        paid && "bg-green/10 text-green",
        !pending && !paid && "bg-destructive/10 text-destructive",
      )}
    >
      {pending
        ? "waiting"
        : (outcomeLabels[payment.outcome] ?? payment.outcome)}
    </span>
  );
}

/** Every STK callback sent to the developer's server, with a way to send it again. */
export default function CallbacksCard({
  slug,
  payments,
}: {
  slug: string;
  payments: StkPayment[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const resend = useResendCallback(slug);

  const recent = payments.slice(0, 8);
  const selected =
    recent.find((p) => p.checkoutRequestId === selectedId) ?? recent[0];

  return (
    <div className="flex flex-col rounded-lg border border-border-strong bg-surface-1 shadow-sm">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[13px] font-medium text-foreground">Callbacks</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          What reached your CallBackURL and what it answered. Resend one to test
          how your app handles a duplicate.
        </p>
      </div>

      {recent.length === 0 ? (
        <div className="p-5">
          <Empty>
            No STK payments yet. Send an STK Push and answer it on the phone.
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
          <ul className="flex flex-col border-b border-border p-2 md:border-r md:border-b-0">
            {recent.map((p) => (
              <li key={p.checkoutRequestId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.checkoutRequestId)}
                  aria-pressed={p === selected}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface-2",
                    p === selected && "bg-surface-2",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-foreground tabular-nums">
                      KES {p.amount}
                    </span>
                    <Status payment={p} />
                  </span>
                  <span className="truncate font-mono text-[10.5px] text-muted-foreground">
                    {p.phone} · {p.at.slice(11, 19)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="flex min-w-0 flex-col gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11.5px] text-foreground">
                    {selected.checkoutRequestId}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {selected.reference || "No AccountReference"}
                    {selected.resultCode !== "" &&
                      ` · ResultCode ${selected.resultCode}`}
                  </p>
                </div>
                {selected.deliveries.length > 0 && (
                  <button
                    type="button"
                    disabled={resend.isPending}
                    onClick={() => resend.mutate(selected.checkoutRequestId)}
                    title="Send the same callback body again to the same CallBackURL"
                    className="flex items-center gap-1.5 rounded-md border border-border-strong bg-surface-1 px-2.5 py-1 text-[11.5px] font-medium text-foreground transition-[background-color,transform] hover:bg-surface-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
                  >
                    <RotateCwIcon
                      className={cn(
                        "size-3.5",
                        resend.isPending &&
                          "animate-spin motion-reduce:animate-none",
                      )}
                    />
                    Resend callback
                  </button>
                )}
              </div>
              {resend.isError && (
                <p className="text-[11px] text-destructive">
                  {errorText(resend.error)}
                </p>
              )}

              {selected.deliveries.length === 0 ? (
                <Empty>
                  Waiting for the customer. Answer the prompt on the phone and
                  the callback shows here.
                </Empty>
              ) : (
                <div className="flex flex-col gap-5">
                  {[...selected.deliveries].reverse().map((d, i) => (
                    <div key={`${d.at}-${i}`} className="flex flex-col gap-2">
                      {selected.deliveries.length > 1 && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {d.replay ? "resent" : "original"} ·{" "}
                          {d.at.slice(11, 19)} ·{" "}
                          <span
                            className={
                              d.delivered ? "text-green" : "text-destructive"
                            }
                          >
                            {d.delivered ? "delivered" : "failed"}
                          </span>
                        </p>
                      )}
                      {d.url ? (
                        <Call url={d.url} sent={d.sent} attempts={d.attempts} />
                      ) : (
                        <Empty>
                          This callback was logged before call details were
                          kept.
                        </Empty>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
