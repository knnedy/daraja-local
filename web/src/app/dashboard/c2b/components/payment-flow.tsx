"use client";

import { CheckIcon, MinusIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentSession } from "../lib/sessions";

type StepStatus = "pending" | "success" | "error" | "skipped";

function StepNode({
  index,
  label,
  detail,
  status,
}: {
  index: number;
  label: string;
  detail: string;
  status: StepStatus;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[11px] transition-colors",
          status === "pending" &&
            "border-border-strong bg-surface-2 text-muted-foreground",
          status === "success" && "border-green bg-green-light text-green",
          status === "error" &&
            "border-destructive bg-destructive/15 text-destructive",
          status === "skipped" &&
            "border-dashed border-border bg-surface-2 text-muted-foreground/50",
        )}>
        {status === "success" && <CheckIcon className="size-4" />}
        {status === "error" && <XIcon className="size-4" />}
        {status === "skipped" && <MinusIcon className="size-3.5" />}
        {status === "pending" && index}
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-foreground">{label}</p>
        <p className="truncate text-[10.5px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "ml-4 h-6 w-px shrink-0 sm:mx-2 sm:mt-4 sm:h-px sm:w-auto sm:flex-1",
        active ? "bg-green/50" : "bg-border",
      )}
    />
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] text-foreground">
      <span className="text-muted-foreground">{label} </span>
      {value}
    </span>
  );
}

export default function PaymentFlow({
  session,
}: {
  session: PaymentSession | null;
}) {
  if (!session) {
    return (
      <div className="rounded-lg border border-border-strong bg-surface-1 p-5 shadow-sm">
        <p className="mb-3 text-[13px] font-medium text-foreground">
          Payment flow
        </p>
        <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
          <p className="text-[12px] text-muted-foreground">No payments yet.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
            POST to the simulate endpoint above and this traces every step as it
            happens.
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
      ? "skipped — validation off"
      : validation.fallback
        ? `unreachable · fell back to ${validation.accepted ? "accept" : "reject"}`
        : `${validation.accepted ? "accepted" : "rejected"} · ${validation.resultCode || "—"}`;

  const confirmationDetail = session.rejected
    ? "not reached"
    : validation && !validation.accepted
      ? "blocked by validation"
      : !confirmation
        ? "waiting…"
        : confirmation.delivered
          ? `delivered · ${confirmation.attempts} attempt${confirmation.attempts === 1 ? "" : "s"}`
          : `failed · ${confirmation.attempts} attempts`;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-foreground">
          Payment flow
        </span>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          latest · {session.createdAt.slice(11, 19)}
        </span>
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
    </div>
  );
}
