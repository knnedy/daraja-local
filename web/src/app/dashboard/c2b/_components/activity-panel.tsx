"use client";

import { RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/components/phone";
import { useReplayConfirmation } from "@/hooks/use-c2b";
import { cn } from "@/lib/utils";
import {
  ActivityPanel as Shell,
  CallDetail,
  CopyId,
  DeliveryStep,
  DetailHeader,
  JsonDisclosure,
  Step,
  StepNote,
  at,
  elapsed,
  type Tone,
} from "../../_components/activity";
import { paymentStatus, settledAt, type PaymentSession } from "../lib/sessions";

const TONES: Record<ReturnType<typeof paymentStatus>["state"], Tone> = {
  paid: "success",
  processing: "pending",
  declined: "danger",
  rejected: "danger",
};

const COMMANDS: Record<string, string> = {
  CustomerPayBillOnline: "Pay Bill",
  CustomerBuyGoodsOnline: "Buy Goods",
};

function Detail({ p, slug, registered }: { p: PaymentSession; slug: string; registered: boolean }) {
  const replay = useReplayConfirmation(slug);
  const status = paymentStatus(p);
  const v = p.validation;
  const deliveries = p.confirmation?.deliveries ?? [];
  const settled = settledAt(p);

  return (
    <div className="flex min-w-0 flex-col gap-5 p-5">
      <DetailHeader
        amount={p.amount}
        tone={TONES[status.state]}
        status={status.label}
        facts={[
          <span key="m" className="font-mono">
            {p.msisdn ? formatPhone(p.msisdn) : "No MSISDN"}
          </span>,
          COMMANDS[p.commandId] ?? p.commandId,
          p.commandId !== "CustomerBuyGoodsOnline" && p.billRef && `Account ${p.billRef}`,
        ]}
        id={p.transId && <CopyId value={p.transId} label="TransID" />}
        action={
          deliveries.length > 0 && (
            <Button
              variant="outline"
              disabled={!registered || replay.isPending}
              onClick={() => replay.mutate(p.id)}
              title="POST the same Confirmation body to your current ConfirmationURL again">
              <RotateCwIcon className={cn("size-3.5", replay.isPending && "animate-spin motion-reduce:animate-none")} />
              Resend confirmation
            </Button>
          )
        }
      />
      {replay.isError && <p className="text-[12px] text-red">{replay.error.message}</p>}

      <ol>
        <Step tone="success" title="Customer paid from their phone" time={at(p.createdAt)} last={p.rejected}>
          <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
            {p.commandId || "simulate"} · to your shortcode
          </p>
          <JsonDisclosure label="Simulate body" code={p.request} />
        </Step>

        {p.rejected ? (
          <Step tone="danger" title="Rejected by Daraja" last>
            <StepNote>
              {p.rejectionMessage ?? "The request was invalid."} Nothing reached your server.
            </StepNote>
          </Step>
        ) : (
          <>
            {!v ? (
              <Step tone="idle" title="Validation skipped">
                <StepNote>No ValidationURL is registered, so the payment completes straight away.</StepNote>
              </Step>
            ) : (
              <Step
                tone={v.accepted ? (v.fallback ? "warning" : "success") : "danger"}
                title={
                  v.fallback
                    ? `Validation ${v.accepted ? "passed" : "declined"} by ResponseType`
                    : `Validation ${v.accepted ? "passed" : "declined"} · ResultCode ${v.resultCode || "—"}`
                }
                time={v.attempt ? at(v.attempt.at) : undefined}
                delta={v.attempt ? elapsed(p.createdAt, v.attempt.at) : undefined}
                last={!v.accepted}>
                {v.fallback && (
                  <StepNote>
                    Your ValidationURL didn&apos;t give a usable answer{v.err ? ` (${v.err})` : ""}, so the registered
                    ResponseType decided.
                  </StepNote>
                )}
                {v.attempt ? (
                  <CallDetail
                    url={v.url}
                    attempts={[v.attempt]}
                    sent={v.sent}
                    ok={!v.attempt?.err && v.attempt?.statusCode !== undefined && v.attempt.statusCode < 300}
                    sentLabel="Validation body"
                  />
                ) : (
                  <StepNote>Logged before call details were kept.</StepNote>
                )}
                {!v.accepted && (
                  <StepNote>The payment doesn&apos;t go through, and no Confirmation is sent.</StepNote>
                )}
              </Step>
            )}

            {(!v || v.accepted) && (
              <>
                <Step
                  tone={settled ? "success" : "pending"}
                  title={settled ? "Payment completed · M-PESA SMS sent" : "Completing the payment"}
                  time={settled ? at(settled) : undefined}
                  last={deliveries.length === 0 && !!settled}>
                  <StepNote>
                    {settled
                      ? "The money has moved. The Confirmation below can't reverse it."
                      : "Waiting for the Confirmation to go out."}
                  </StepNote>
                </Step>
                {deliveries.length === 0 && !settled && (
                  <Step tone="pending" title="Sending the Confirmation…" last />
                )}
                {deliveries.map((d, i) => (
                  <DeliveryStep
                    key={`${d.at}-${i}`}
                    d={d}
                    from={p.createdAt}
                    noun="Confirmation"
                    last={i === deliveries.length - 1}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ol>
    </div>
  );
}

/** Every C2B payment to this shortcode, with the full story of the selected one. */
export default function ActivityPanel({
  slug,
  payments,
  registered,
  loading,
}: {
  slug: string;
  payments: PaymentSession[];
  registered: boolean;
  loading?: boolean;
}) {
  const items = payments.map((p) => {
    const s = paymentStatus(p);
    return {
      ...p,
      at: p.createdAt,
      who: p.msisdn ? formatPhone(p.msisdn) : "",
      reference: p.commandId === "CustomerBuyGoodsOnline" ? "Buy Goods" : p.billRef,
      tone: TONES[s.state],
      status: s.label,
    };
  });
  return (
    <Shell
      loading={loading}
      description="Every payment customers made to your shortcode, step by step."
      items={items}
      empty={{
        title: "No payments yet",
        body: (
          <>
            Pay from the <span className="font-medium text-foreground">Customer&apos;s phone</span>, or call simulate
            from your app. Each payment shows up here with its validation and confirmation.
          </>
        ),
      }}
      renderDetail={(p) => <Detail p={p} slug={slug} registered={registered} />}
    />
  );
}
