"use client";

import { useState } from "react";
import {
  Chip,
  Connector,
  Pager,
  StepNode,
  type StepStatus,
} from "../../_components/flow-parts";
import type { PaymentSession } from "../lib/sessions";
import DeliveryInspector from "./delivery-inspector";
import { formatClock } from "@/lib/format";

export default function PaymentFlow({
  slug,
  payments,
  registered,
}: {
  slug: string;
  payments: PaymentSession[];
  registered: boolean;
}) {
  // null follows the newest payment as new ones arrive.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const index = Math.max(
    0,
    payments.findIndex((p) => p.id === selectedId),
  );
  const session = payments[index] ?? null;

  if (!session) {
    return (
      <div className="rounded-lg border border-border-strong bg-surface-1 p-5 shadow-sm">
        <p className="mb-3 text-[13px] font-medium text-foreground">
          Payment flow
        </p>
        <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
          <p className="text-[12px] text-muted-foreground">No payments yet.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
            Call simulate or send a test payment, and this traces every step as
            it happens.
          </p>
        </div>
      </div>
    );
  }

  const validation = session.validation;
  const confirmation = session.confirmation;

  const receivedStatus: StepStatus = session.rejected ? "error" : "success";

  const validationStatus: StepStatus = session.rejected
    ? "pending"
    : !validation
      ? "skipped"
      : validation.accepted
        ? "success"
        : "error";

  const confirmationStatus: StepStatus =
    session.rejected || (validation && !validation.accepted)
      ? "pending"
      : !confirmation
        ? "pending"
        : confirmation.delivered
          ? "success"
          : "error";

  const validationDetail = session.rejected
    ? "not reached"
    : !validation
      ? "skipped — no ValidationURL"
      : validation.fallback
        ? `unreachable · fell back to ${validation.accepted ? "accept" : "reject"}`
        : `${validation.accepted ? "accepted" : "rejected"} · ${validation.resultCode || "—"}`;

  const confirmationDetail = session.rejected
    ? "not reached"
    : validation && !validation.accepted
      ? "blocked by validation"
      : !confirmation
        ? "waiting…"
        : (confirmation.delivered
            ? `delivered · ${confirmation.attempts} attempt${confirmation.attempts === 1 ? "" : "s"}`
            : `failed · ${confirmation.attempts} attempts`) +
          (confirmation.deliveries.length > 1
            ? ` · resent ${confirmation.deliveries.length - 1}×`
            : "");

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-foreground">
          Payment flow
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {index === 0 ? "latest" : "earlier"} ·{" "}
            {formatClock(session.createdAt)}
          </span>
          {payments.length > 1 && (
            <Pager
              index={index}
              total={payments.length}
              noun="payment"
              onMove={(i) => setSelectedId(i === 0 ? null : payments[i].id)}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-heading text-[19px] font-medium text-foreground">
          KES {session.amount}
        </span>
        <span className="mx-1 text-muted-foreground/40">·</span>
        <Chip label="from" value={session.msisdn || "—"} />
        <Chip label="ref" value={session.billRef || "—"} />
        {session.transId && <Chip label="id" value={session.transId} />}
      </div>

      {session.rejected && session.rejectionMessage && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive">
          {session.rejectionMessage}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start">
        <StepNode
          index={1}
          label="Payment received"
          detail={session.rejected ? "rejected at the door" : session.commandId}
          status={receivedStatus}
        />
        <Connector active={validationStatus === "success"} />
        <StepNode
          index={2}
          label="Validation"
          detail={validationDetail}
          status={validationStatus}
        />
        <Connector active={confirmationStatus === "success"} />
        <StepNode
          index={3}
          label="Confirmation"
          detail={confirmationDetail}
          status={confirmationStatus}
        />
      </div>

      {validation?.fallback && (
        <p className="text-[10.5px] leading-relaxed text-amber">
          Your ValidationURL didn&apos;t return a usable response
          {validation.err ? ` (${validation.err})` : ""} — Daraja falls back to
          the registered ResponseType, which{" "}
          {validation.accepted ? "accepted" : "rejected"} this payment.
        </p>
      )}

      <DeliveryInspector
        key={session.id}
        slug={slug}
        session={session}
        registered={registered}
      />
    </div>
  );
}
