"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BatteryFull, CheckIcon, SignalHighIcon, XIcon } from "lucide-react";
import type { PendingSession, StkOutcome } from "@/lib/types/stk";

const OUTCOME_COPY: Record<
  StkOutcome,
  { title: string; code: string; tone: "success" | "error" }
> = {
  approved: { title: "Payment confirmed", code: "0", tone: "success" },
  wrong_pin: { title: "Wrong PIN entered", code: "2001", tone: "error" },
  insufficient_balance: {
    title: "Insufficient balance",
    code: "1",
    tone: "error",
  },
  cancelled: { title: "Request cancelled", code: "1032", tone: "error" },
  timeout: { title: "Request timed out", code: "1037", tone: "error" },
};

const ACTIONS: { outcome: StkOutcome; label: string }[] = [
  { outcome: "approved", label: "Approve" },
  { outcome: "wrong_pin", label: "Wrong PIN" },
  { outcome: "insufficient_balance", label: "Insufficient" },
  { outcome: "cancelled", label: "Cancel" },
];

function useCountdown(session: PendingSession | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  if (!session) return { secondsLeft: 0, total: 0 };

  const created = Date.parse(session.createdAt);
  const deadline = Date.parse(session.timeoutAt);
  const total = Math.max(Math.round((deadline - created) / 1000), 1);
  const secondsLeft = Math.max(Math.ceil((deadline - now) / 1000), 0);
  return { secondsLeft, total };
}

function CountdownRing({
  secondsLeft,
  total,
}: {
  secondsLeft: number;
  total: number;
}) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(secondsLeft, 0) / total : 0;

  return (
    <div className="relative flex size-10 items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="3"
          className="text-terminal-green"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="text-terminal-green transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute font-mono text-[10.5px] text-terminal-green">
        {secondsLeft}
      </span>
    </div>
  );
}

export default function VirtualPhone({
  session,
  resolvedOutcome,
  resolving,
  onResolve,
}: {
  session: PendingSession | null;
  resolvedOutcome: StkOutcome | null;
  resolving?: boolean;
  onResolve: (outcome: StkOutcome) => void;
}) {
  const { secondsLeft, total } = useCountdown(session);
  const phase = resolvedOutcome ? "resolved" : session ? "prompt" : "idle";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-64">
        <div className="absolute -left-0.5 top-20 h-7 w-0.75 rounded-l-sm bg-neutral-800" />
        <div className="absolute -left-0.5 top-30 h-12 w-0.75 rounded-l-sm bg-neutral-800" />
        <div className="absolute -right-0.5 top-24 h-16 w-0.75 rounded-r-sm bg-neutral-800" />

        <div className="relative overflow-hidden rounded-[30px] border-[6px] border-neutral-900 bg-terminal-bg shadow-xl">
          <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-[radial-gradient(ellipse_at_top,transparent_60%,rgba(0,0,0,0.35))]" />

          <div className="mx-auto mt-2 h-4 w-20 rounded-full bg-neutral-900" />

          <div className="flex items-center justify-between px-4 pt-2 pb-1.5 font-mono text-[10px] tracking-wide text-terminal-green-dim">
            <span>9:41</span>
            <span className="flex items-center gap-1.5">
              <SignalHighIcon className="size-3" />
              <span>SAFARICOM</span>
              <BatteryFull className="size-3.5" />
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
                className="flex min-h-112 flex-col items-center justify-center gap-4 px-7 text-center">
                <span className="relative flex size-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terminal-green opacity-40" />
                  <span className="relative inline-flex size-3.5 rounded-full bg-terminal-green" />
                </span>
                <p className="font-mono text-[13px] leading-relaxed text-terminal-green-dim">
                  No active prompt.
                  <br />
                  Waiting for STK Push…
                </p>
              </motion.div>
            )}

            {phase === "prompt" && session && (
              <motion.div
                key={session.checkoutRequestId}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-112 flex-col justify-between px-5 pt-2 pb-5">
                <div className="flex items-start justify-between">
                  <p className="pt-2 font-mono text-[11.5px] text-terminal-green-dim">
                    Confirm payment
                  </p>
                  <CountdownRing secondsLeft={secondsLeft} total={total} />
                </div>
                <div className="text-center">
                  <p className="font-mono text-[26px] font-medium text-terminal-green">
                    KES {session.amount}
                  </p>
                  <p className="mt-1.5 truncate font-mono text-[12px] text-terminal-green-dim">
                    to {session.accountReference || "merchant"}
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.outcome}
                      type="button"
                      disabled={resolving}
                      onClick={() => onResolve(a.outcome)}
                      className="rounded-lg bg-white/5 py-3 font-mono text-[11px] uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 active:scale-95 disabled:opacity-30">
                      {a.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {phase === "resolved" && resolvedOutcome && (
              <motion.div
                key="resolved"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex min-h-112 flex-col items-center justify-center gap-4 px-7 text-center">
                <div
                  className={`flex size-11 items-center justify-center rounded-full ${
                    OUTCOME_COPY[resolvedOutcome].tone === "success"
                      ? "bg-terminal-green/15 text-terminal-green"
                      : "bg-destructive/15 text-destructive"
                  }`}>
                  {OUTCOME_COPY[resolvedOutcome].tone === "success" ? (
                    <CheckIcon className="size-5" />
                  ) : (
                    <XIcon className="size-5" />
                  )}
                </div>
                <p className="font-mono text-[13.5px] text-terminal-green">
                  {OUTCOME_COPY[resolvedOutcome].title}
                </p>
                <p className="font-mono text-[11px] text-terminal-green-dim">
                  ResultCode {OUTCOME_COPY[resolvedOutcome].code}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
