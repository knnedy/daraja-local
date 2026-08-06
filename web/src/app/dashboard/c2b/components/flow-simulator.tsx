import { ArrowRightIcon, CheckIcon, PlayIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "idle" | "validating" | "validated" | "confirming" | "done";
type StepStatus = "pending" | "active" | "success" | "error" | "skipped";

function StepNode({
  label,
  sub,
  status,
}: {
  label: string;
  sub: string;
  status: StepStatus;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-full border-2 transition-colors",
          status === "pending" &&
            "border-border-strong bg-surface-2 text-muted-foreground",
          status === "active" && "border-blue bg-blue-bg text-blue",
          status === "success" && "border-green bg-green-light text-green",
          status === "error" &&
            "border-destructive bg-destructive/15 text-destructive",
          status === "skipped" &&
            "border-border bg-surface-2 text-muted-foreground/50",
        )}>
        {status === "success" && <CheckIcon className="size-4" />}
        {status === "error" && <XIcon className="size-4" />}
        {status === "active" && (
          <span className="size-2 animate-pulse rounded-full bg-current" />
        )}
        {status === "pending" && (
          <span className="size-2 rounded-full bg-current" />
        )}
        {status === "skipped" && <span className="text-[10px]">–</span>}
      </div>
      <div>
        <p className="text-[12px] font-medium text-foreground">{label}</p>
        <p className="text-[10.5px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

export default function FlowSimulator({
  phase,
  outcome,
  externalValidation,
  onSimulate,
}: {
  phase: Phase;
  outcome: "accepted" | "invalid_account" | "invalid_amount" | null;
  externalValidation: boolean;
  onSimulate: () => void;
}) {
  const validationStatus: StepStatus = !externalValidation
    ? "skipped"
    : phase === "validating"
      ? "active"
      : phase === "validated" || phase === "confirming" || phase === "done"
        ? outcome === "accepted"
          ? "success"
          : "error"
        : "pending";

  const confirmStatus: StepStatus =
    phase === "confirming"
      ? "active"
      : phase === "done"
        ? "success"
        : "pending";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">
          Payment flow
        </span>
        <button
          type="button"
          onClick={onSimulate}
          disabled={phase !== "idle"}
          className="flex items-center gap-1.5 rounded-lg bg-green px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green/90 disabled:opacity-40">
          <PlayIcon className="size-3.5" />
          Simulate incoming payment
        </button>
      </div>
      <div className="flex items-center">
        <StepNode
          label="Customer pays"
          sub="Paybill / Till"
          status={phase === "idle" ? "pending" : "success"}
        />
        <ArrowRightIcon className="mx-1 size-4 shrink-0 text-muted-foreground/40" />
        <StepNode
          label="Validation"
          sub={externalValidation ? "your ValidationURL" : "disabled"}
          status={validationStatus}
        />
        <ArrowRightIcon className="mx-1 size-4 shrink-0 text-muted-foreground/40" />
        <StepNode
          label="Confirmation"
          sub="your ConfirmationURL"
          status={confirmStatus}
        />
      </div>
      <p className="text-center text-[10.5px] text-muted-foreground">
        Narrated in the log below — no real request is sent yet.
      </p>
    </div>
  );
}
