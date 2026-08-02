import { PlayIcon } from "lucide-react";
import VirtualPhone from "./virtual-phone";
import type { StkOutcome } from "../lib/result-codes";

type Phase = "idle" | "prompt" | "processing" | "resolved";
type RequestPayload = { phone: string; amount: string; accountRef: string };

export default function SimulatorCard({
  phase,
  request,
  pin,
  secondsLeft,
  outcome,
  onDigit,
  onBackspace,
  onSubmitPin,
  onCancel,
  onSimulate,
}: {
  phase: Phase;
  request: RequestPayload | null;
  pin: string;
  secondsLeft: number;
  outcome: StkOutcome | null;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmitPin: () => void;
  onCancel: () => void;
  onSimulate: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">
          Simulator
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={`size-1.5 rounded-full ${
              phase === "idle" ? "bg-muted-foreground/40" : "bg-green"
            }`}
          />
          {phase === "idle" ? "Listening" : "Active"}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <VirtualPhone
          phase={phase}
          request={request}
          pin={pin}
          secondsLeft={secondsLeft}
          outcome={outcome}
          onDigit={onDigit}
          onBackspace={onBackspace}
          onSubmitPin={onSubmitPin}
          onCancel={onCancel}
        />
      </div>

      <button
        type="button"
        onClick={onSimulate}
        disabled={phase !== "idle"}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-2/70 disabled:opacity-40">
        <PlayIcon className="size-3.5" />
        Simulate incoming request
      </button>
      <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground">
        Stands in for your backend calling the endpoint above — wire your real
        integration to it and this becomes live.
      </p>
    </div>
  );
}
