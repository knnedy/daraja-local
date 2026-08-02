import { CheckIcon, SignalHighIcon, XIcon } from "lucide-react";
import Keypad from "./keypad";
import { RESULT_CODES, type StkOutcome } from "../lib/result-codes";

type RequestPayload = {
  phone: string;
  amount: string;
  accountRef: string;
};

type Phase = "idle" | "prompt" | "processing" | "resolved";

const OUTCOME_COPY: Record<
  StkOutcome,
  { title: string; tone: "success" | "error" }
> = {
  success: { title: "Payment confirmed", tone: "success" },
  wrong_pin: { title: "Wrong PIN entered", tone: "error" },
  insufficient_balance: { title: "Insufficient balance", tone: "error" },
  cancelled: { title: "Request cancelled", tone: "error" },
  timeout: { title: "Request timed out", tone: "error" },
};

export default function VirtualPhone({
  phase,
  request,
  pin,
  secondsLeft,
  outcome,
  onDigit,
  onBackspace,
  onSubmitPin,
  onCancel,
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
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface-1 p-8">
      <div className="w-52.5 overflow-hidden rounded-[26px] border-[5px] border-neutral-900 bg-[#0B120D] shadow-xl">
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 font-mono text-[9px] tracking-wide text-green/60">
          <span>SAFARICOM</span>
          <span className="flex items-center gap-1">
            <SignalHighIcon className="size-2.5" />
            4G
          </span>
        </div>

        {phase === "idle" && (
          <div className="flex min-h-67.5 flex-col items-center justify-center gap-3 px-5 text-center">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-40" />
              <span className="relative inline-flex size-2.5 rounded-full bg-green" />
            </span>
            <p className="font-mono text-[11px] leading-relaxed text-green/70">
              No active prompt.
              <br />
              Waiting for STK Push…
            </p>
          </div>
        )}

        {phase === "prompt" && request && (
          <div className="flex min-h-67.5 flex-col justify-between px-4 pt-3 pb-1">
            <div className="text-center">
              <p className="font-mono text-[10px] text-green/50">
                Confirm payment · {String(secondsLeft).padStart(2, "0")}s
              </p>
              <p className="mt-2 font-mono text-[18px] font-medium text-green">
                KES {request.amount || "0"}
              </p>
              <p className="mt-0.5 font-mono text-[10.5px] text-green/60">
                to {request.accountRef || "merchant"}
              </p>
              <div className="mt-3 flex items-center justify-center gap-2.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`size-2 rounded-full border border-green/40 ${
                      i < pin.length ? "bg-green" : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>
            <Keypad onDigit={onDigit} onBackspace={onBackspace} />
          </div>
        )}

        {phase === "processing" && (
          <div className="flex min-h-67.5 flex-col items-center justify-center gap-3 px-5 text-center">
            <div className="size-4 animate-spin rounded-full border-2 border-green/30 border-t-green" />
            <p className="font-mono text-[11px] text-green/70">Processing…</p>
          </div>
        )}

        {phase === "resolved" && outcome && (
          <div className="flex min-h-67.5 flex-col items-center justify-center gap-3 px-5 text-center">
            <div
              className={`flex size-8 items-center justify-center rounded-full ${
                OUTCOME_COPY[outcome].tone === "success"
                  ? "bg-green/15 text-green"
                  : "bg-destructive/15 text-destructive"
              }`}>
              {OUTCOME_COPY[outcome].tone === "success" ? (
                <CheckIcon className="size-4" />
              ) : (
                <XIcon className="size-4" />
              )}
            </div>
            <p className="font-mono text-[11px] text-green/80">
              {OUTCOME_COPY[outcome].title}
            </p>
            <p className="font-mono text-[9.5px] text-green/40">
              ResultCode {RESULT_CODES[outcome].code}
            </p>
          </div>
        )}

        <div className="flex divide-x divide-white/10 border-t border-white/10">
          <button
            type="button"
            disabled={phase !== "prompt"}
            onClick={onCancel}
            className="flex-1 py-2.5 font-mono text-[10px] uppercase tracking-wide text-white/70 transition-colors disabled:text-white/25">
            Cancel
          </button>
          <button
            type="button"
            disabled={phase !== "prompt" || pin.length !== 4}
            onClick={onSubmitPin}
            className="flex-1 py-2.5 font-mono text-[10px] uppercase tracking-wide text-white/70 transition-colors disabled:text-white/25">
            Approve
          </button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {phase === "idle" ? "Idle — simulated handset" : "Simulated handset"}
      </p>
    </div>
  );
}
