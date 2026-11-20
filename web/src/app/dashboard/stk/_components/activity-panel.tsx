"use client";

import { RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/components/phone";
import { useResendCallback } from "@/hooks/use-stk";
import { cn } from "@/lib/utils";
import {
  ActivityPanel as Shell,
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
import type { StkAttempt } from "../lib/sessions";

const OUTCOMES: Record<string, { label: string; tone: Tone }> = {
  approved: { label: "Paid", tone: "success" },
  wrong_pin: { label: "Wrong PIN", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "danger" },
  insufficient_balance: { label: "No funds", tone: "danger" },
  timeout: { label: "Timed out", tone: "warning" },
};

function statusOf(a: StkAttempt): { label: string; tone: Tone } {
  if (a.rejected) return { label: "Rejected", tone: "danger" };
  if (!a.outcome) return { label: "Waiting", tone: "pending" };
  return OUTCOMES[a.outcome] ?? { label: a.outcome, tone: "danger" };
}

function Detail({ attempt, slug }: { attempt: StkAttempt; slug: string }) {
  const resend = useResendCallback(slug);
  const status = statusOf(attempt);
  const answered = attempt.deliveries[0];

  return (
    <div className="flex min-w-0 flex-col gap-5 p-5">
      <DetailHeader
        amount={attempt.amount}
        tone={status.tone}
        status={status.label}
        facts={[
          <span key="p" className="font-mono">
            {attempt.phone ? formatPhone(attempt.phone) : "No phone"}
          </span>,
          attempt.reference || "No AccountReference",
          attempt.resultCode !== "" && (
            <span key="r" className="font-mono">
              ResultCode {attempt.resultCode}
            </span>
          ),
        ]}
        id={!attempt.rejected && <CopyId value={attempt.id} label="CheckoutRequestID" />}
        action={
          attempt.deliveries.length > 0 && (
            <Button
              variant="outline"
              disabled={resend.isPending}
              onClick={() => resend.mutate(attempt.id)}
              title="POST the same callback body to the same CallBackURL again">
              <RotateCwIcon className={cn("size-3.5", resend.isPending && "animate-spin motion-reduce:animate-none")} />
              Resend callback
            </Button>
          )
        }
      />
      {resend.isError && <p className="text-[12px] text-red">{resend.error.message}</p>}

      <ol>
        <Step tone="success" title="Request received from your app" time={at(attempt.at)}>
          <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">POST /mpesa/stkpush/v1/processrequest</p>
          <JsonDisclosure label="Request body" code={attempt.request} />
        </Step>

        {attempt.rejected ? (
          <Step
            tone="danger"
            title={`Rejected · ${attempt.rejection?.code ?? ""}`}
            time={attempt.response ? at(attempt.response.at) : undefined}
            last>
            <StepNote>{attempt.rejection?.message}. No prompt was sent and no callback will follow.</StepNote>
            <JsonDisclosure label="Error response" code={attempt.response?.body ?? ""} />
          </Step>
        ) : (
          <>
            <Step
              tone="success"
              title="Accepted · ResponseCode 0"
              time={attempt.response ? at(attempt.response.at) : undefined}
              delta={attempt.response ? elapsed(attempt.at, attempt.response.at) : undefined}>
              <StepNote>Only means &ldquo;prompt sent&rdquo;. The outcome arrives later, in the callback.</StepNote>
              <JsonDisclosure label="Response body" code={attempt.response?.body ?? ""} />
            </Step>

            <Step
              tone={attempt.outcome ? status.tone : "pending"}
              title={
                attempt.outcome
                  ? `Customer: ${status.label.toLowerCase()}`
                  : "Waiting for the customer on the Virtual Phone"
              }
              time={answered ? at(answered.at) : undefined}
              last={attempt.deliveries.length === 0}>
              <StepNote>
                {attempt.outcome
                  ? "The phone's answer decides the ResultCode in the callback."
                  : "Answer the prompt on the phone, or let it time out."}
              </StepNote>
            </Step>

            {attempt.deliveries.map((d, i) => (
              <DeliveryStep
                key={`${d.at}-${i}`}
                d={d}
                from={attempt.at}
                noun="Callback"
                last={i === attempt.deliveries.length - 1}
              />
            ))}
          </>
        )}
      </ol>
    </div>
  );
}

/** Every STK Push this project received, with the full story of the selected one. */
export default function ActivityPanel({
  slug,
  attempts,
  loading,
}: {
  slug: string;
  attempts: StkAttempt[];
  loading?: boolean;
}) {
  const items = attempts.map((a) => {
    const s = statusOf(a);
    return { ...a, who: a.phone ? formatPhone(a.phone) : "", tone: s.tone, status: s.label };
  });
  return (
    <Shell
      loading={loading}
      description="Every STK Push this project received, step by step."
      items={items}
      empty={{
        title: "No STK Pushes yet",
        body: (
          <>
            Call processrequest from your app, or use{" "}
            <span className="font-medium text-foreground">Send test prompt</span>. Each request shows up here with its
            callback.
          </>
        ),
      }}
      renderDetail={(a) => <Detail attempt={a} slug={slug} />}
    />
  );
}
