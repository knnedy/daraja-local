"use client";

import { useState } from "react";
import {
  Chip,
  Connector,
  Pager,
  StepNode,
  type StepStatus,
} from "../../components/flow-parts";
import { Call, Empty } from "../../components/delivery-call";
import type { PayoutSession } from "../lib/payouts";
import { outcomeInfo } from "../lib/outcomes";

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[13px] font-medium text-foreground">
        Payout flow
      </span>
      {children}
    </div>
  );
}

export default function PayoutFlow({ payouts }: { payouts: PayoutSession[] }) {
  // null follows the newest payout as new ones arrive.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const index = Math.max(
    0,
    payouts.findIndex((p) => p.id === selectedId),
  );
  const session = payouts[index] ?? null;

  if (!session) {
    return (
      <div className="rounded-lg border border-border-strong bg-surface-1 p-5 shadow-sm">
        <Header />
        <div className="mt-3 rounded-md border border-dashed border-border px-4 py-10 text-center">
          <p className="text-[12px] text-muted-foreground">No payouts yet.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
            Call paymentrequest or send a test payout, and this traces every
            step as it happens.
          </p>
        </div>
      </div>
    );
  }

  const result = session.result;
  const completed = result?.outcome === "completed";

  const acceptedStatus: StepStatus = session.rejected ? "error" : "success";
  const processedStatus: StepStatus = session.rejected
    ? "pending"
    : !result
      ? "pending"
      : completed
        ? "success"
        : "error";
  const deliveredStatus: StepStatus = !result
    ? "pending"
    : result.delivered
      ? "success"
      : "error";

  const processedDetail = session.rejected
    ? "not reached"
    : !result
      ? "processing…"
      : `${outcomeInfo[result.outcome]?.label ?? result.outcome} · ${result.resultCode ?? "—"}`;

  const deliveredDetail = !result
    ? session.rejected
      ? "not reached"
      : "waiting…"
    : `${result.step === "timeout" ? "QueueTimeOutURL" : "ResultURL"} · ${
        result.delivered
          ? `delivered${result.attempts.length > 1 ? ` · ${result.attempts.length} attempts` : ""}`
          : "failed"
      }`;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-5 shadow-sm">
      <Header>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {index === 0 ? "latest" : "earlier"} ·{" "}
            {session.createdAt.slice(11, 19)}
          </span>
          {payouts.length > 1 && (
            <Pager
              index={index}
              total={payouts.length}
              noun="payout"
              onMove={(i) => setSelectedId(i === 0 ? null : payouts[i].id)}
            />
          )}
        </div>
      </Header>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-heading text-[19px] font-medium text-foreground">
          KES {session.amount}
        </span>
        <span className="mx-1 text-muted-foreground/40">·</span>
        <Chip label="to" value={session.partyB || "—"} />
        {session.originatorId && (
          <Chip label="ref" value={session.originatorId} />
        )}
        {completed && result.transactionId && (
          <Chip label="receipt" value={result.transactionId} />
        )}
        {completed && result.utilityAfter !== null && (
          <Chip
            label="balance"
            value={result.utilityAfter.toLocaleString("en-KE", {
              minimumFractionDigits: 2,
            })}
          />
        )}
      </div>

      {session.rejected && session.rejectionMessage && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive">
          {session.rejectionMessage}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start">
        <StepNode
          index={1}
          label="Accepted"
          detail={session.rejected ? "rejected at the door" : session.commandId}
          status={acceptedStatus}
        />
        <Connector active={processedStatus === "success"} />
        <StepNode
          index={2}
          label="Processed"
          detail={processedDetail}
          status={processedStatus}
        />
        <Connector active={deliveredStatus === "success"} />
        <StepNode
          index={3}
          label="Result sent"
          detail={deliveredDetail}
          status={deliveredStatus}
        />
      </div>

      {result && !completed && result.resultDesc && (
        <p className="font-mono text-[11px] text-muted-foreground">
          ResultDesc: {result.resultDesc}
        </p>
      )}

      {!session.rejected && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          {!result ? (
            <Empty>Waiting for M-Pesa to process the payout…</Empty>
          ) : result.url ? (
            <Call
              url={result.url}
              sent={result.sent}
              attempts={result.attempts}
            />
          ) : (
            <Empty>This result was logged before call details were kept.</Empty>
          )}
        </div>
      )}
    </div>
  );
}
