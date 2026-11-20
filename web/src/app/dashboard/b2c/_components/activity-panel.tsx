"use client";

import { formatPhone } from "@/components/phone";
import { formatKes } from "@/lib/format";
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
import { outcomeInfo } from "../lib/outcomes";
import type { PayoutSession } from "../lib/payouts";

const COMMANDS: Record<string, string> = {
  BusinessPayment: "Business payment",
  SalaryPayment: "Salary",
  PromotionPayment: "Promotion",
};

function statusOf(p: PayoutSession): { label: string; tone: Tone } {
  if (p.rejected) return { label: "Rejected", tone: "danger" };
  if (!p.result) return { label: "Processing", tone: "pending" };
  const o = p.result.outcome;
  if (o === "completed") return { label: "Paid out", tone: "success" };
  if (o === "queue_timeout") return { label: "Timed out", tone: "warning" };
  return { label: outcomeInfo[o].short, tone: "danger" };
}

function Detail({ p }: { p: PayoutSession }) {
  const status = statusOf(p);
  const r = p.result;
  const completed = r?.outcome === "completed";

  return (
    <div className="flex min-w-0 flex-col gap-5 p-5">
      <DetailHeader
        amount={p.amount}
        tone={status.tone}
        status={status.label}
        facts={[
          <span key="to" className="font-mono">
            to {p.partyB ? formatPhone(p.partyB) : "—"}
          </span>,
          COMMANDS[p.commandId] ?? p.commandId,
          p.remarks && `“${p.remarks}”`,
        ]}
        id={r?.transactionId && completed ? <CopyId value={r.transactionId} label="TransactionID" /> : undefined}
      />

      <ol>
        <Step tone="success" title="Payout request from your app" time={at(p.createdAt)}>
          <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">POST /mpesa/b2c/v3/paymentrequest</p>
          <JsonDisclosure label="Request body" code={p.request} />
        </Step>

        {p.rejected ? (
          <Step tone="danger" title="Rejected" time={p.response ? at(p.response.at) : undefined} last>
            <StepNote>{p.rejectionMessage ?? "The request was invalid."} No money moved and no result will follow.</StepNote>
            <JsonDisclosure label="Error response" code={p.response?.body ?? ""} />
          </Step>
        ) : (
          <>
            <Step
              tone="success"
              title="Accepted for processing · ResponseCode 0"
              time={p.response ? at(p.response.at) : undefined}
              delta={p.response ? elapsed(p.createdAt, p.response.at) : undefined}>
              <StepNote>Only means queued. A wrong credential or an empty account shows up in the result.</StepNote>
              <JsonDisclosure label="Response body" code={p.response?.body ?? ""} />
            </Step>

            {!r ? (
              <Step tone="pending" title="M-PESA is processing the payout" last>
                <StepNote>Checks the initiator, the limits and your utility balance. Takes about two seconds.</StepNote>
              </Step>
            ) : (
              <>
                <Step
                  tone={completed ? "success" : r.outcome === "queue_timeout" ? "warning" : "danger"}
                  title={
                    completed
                      ? "Paid out · ResultCode 0"
                      : `${outcomeInfo[r.outcome].label} · ResultCode ${r.resultCode ?? outcomeInfo[r.outcome].code}`
                  }
                  time={at(r.at)}
                  delta={elapsed(p.createdAt, r.at)}>
                  <StepNote>
                    {completed ? (
                      <>
                        {r.receiverName || formatPhone(p.partyB)} received the money
                        {r.utilityAfter !== null && <> · your utility balance is now KES {formatKes(r.utilityAfter)}</>}.
                      </>
                    ) : (
                      r.resultDesc || "The payout failed. The customer gets nothing and no money left your account."
                    )}
                  </StepNote>
                </Step>
                <DeliveryStep
                  d={{ at: r.at, delivered: r.delivered, replay: false, url: r.url, sent: r.sent, attempts: r.attempts }}
                  from={p.createdAt}
                  noun={r.step === "timeout" ? "Timeout notice" : "Result"}
                  last
                />
              </>
            )}
          </>
        )}
      </ol>
    </div>
  );
}

/** Every payout this project sent, with the full story of the selected one. */
export default function ActivityPanel({ payouts }: { payouts: PayoutSession[] }) {
  const items = payouts.map((p) => {
    const s = statusOf(p);
    return {
      ...p,
      at: p.createdAt,
      who: p.partyB ? formatPhone(p.partyB) : "",
      reference: COMMANDS[p.commandId] ?? "",
      tone: s.tone,
      status: s.label,
    };
  });
  return (
    <Shell
      description="Every payout this project sent, step by step."
      items={items}
      empty={{
        title: "No payouts yet",
        body: (
          <>
            Call paymentrequest from your app, or use <span className="font-medium text-foreground">Send test payout</span>.
            Each payout shows up here with its result.
          </>
        ),
      }}
      renderDetail={(p) => <Detail p={p} />}
    />
  );
}
