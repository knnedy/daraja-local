"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BatteryFull, CheckIcon, SignalHighIcon, XIcon } from "lucide-react";
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

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Idle",
  prompt: "Awaiting PIN",
  processing: "Processing",
  resolved: "Resolved",
};

function CountdownRing({
  secondsLeft,
  total,
}: {
  secondsLeft: number;
  total: number;
}) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(secondsLeft, 0) / total;

  return (
    <div className="relative flex size-8 items-center justify-center">
      <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="2.5"
          className="text-green"
        />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="text-green transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute font-mono text-[9px] text-green">
        {secondsLeft}
      </span>
    </div>
  );
}

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
  totalSeconds = 20,
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
  totalSeconds?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-52.5">
        <div className="absolute -left-0.5 top-16 h-6 w-0.75 rounded-l-sm bg-neutral-800" />
        <div className="absolute -left-0.5 top-24 h-10 w-0.75 rounded-l-sm bg-neutral-800" />
        <div className="absolute -right-0.5 top-20 h-14 w-0.75 rounded-r-sm bg-neutral-800" />

        <div className="relative overflow-hidden rounded-[26px] border-[5px] border-neutral-900 bg-[#0B120D] shadow-xl">
          <div className="pointer-events-none absolute inset-0 rounded-[21px] bg-[radial-gradient(ellipse_at_top,transparent_60%,rgba(0,0,0,0.35))]" />

          <div className="mx-auto mt-1.5 h-3.5 w-16 rounded-full bg-neutral-900" />

          <div className="flex items-center justify-between px-3 pt-1.5 pb-1 font-mono text-[9px] tracking-wide text-green/60">
            <span>9:41</span>
            <span className="flex items-center gap-1.5">
              <SignalHighIcon className="size-2.5" />
              <span>SAFARICOM</span>
              <BatteryFull className="size-3" />
            </span>
          </div>

          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 text-center">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-40" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-green" />
                </span>
                <p className="font-mono text-[11px] leading-relaxed text-green/70">
                  No active prompt.
                  <br />
                  Waiting for STK Push…
                </p>
              </motion.div>
            )}

            {phase === "prompt" && request && (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-64 flex-col justify-between px-4 pt-2 pb-1">
                <div className="flex items-start justify-between">
                  <p className="pt-1 font-mono text-[10px] text-green/50">
                    Confirm payment
                  </p>
                  <CountdownRing
                    secondsLeft={secondsLeft}
                    total={totalSeconds}
                  />
                </div>
                <div className="-mt-2 text-center">
                  <p className="font-mono text-[18px] font-medium text-green">
                    KES {request.amount || "0"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-green/60">
                    to {request.accountRef || "merchant"}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`size-2 rounded-full border border-green/40 transition-colors ${
                          i < pin.length ? "bg-green" : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <Keypad onDigit={onDigit} onBackspace={onBackspace} />
              </motion.div>
            )}

            {phase === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 text-center">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 animate-bounce rounded-full bg-green"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <p className="font-mono text-[11px] text-green/70">
                  Processing…
                </p>
              </motion.div>
            )}

            {phase === "resolved" && outcome && (
              <motion.div
                key="resolved"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 text-center">
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
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex divide-x divide-white/10 border-t border-white/10">
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
      </div>

      <p className="text-[11px] text-muted-foreground">{PHASE_LABEL[phase]}</p>
    </div>
  );
}
