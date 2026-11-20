"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "framer-motion";
import { useNow } from "@/hooks/use-now";
import type { PendingSession, StkOutcome } from "@/lib/types/stk";
import { cn } from "@/lib/utils";
import { formatKes } from "@/lib/format";
import {
  DialogBody,
  DialogButton,
  EASE_DRAWER,
  EASE_OUT,
  HomeIndicator,
  LockScreen,
  Keypad,
  PhoneFrame,
  PinField,
  SmsCard,
  Spinner,
  StatusBar,
  TEST_PIN,
  Wallpaper,
  dialogSurface,
  smsTime,
} from "@/components/phone";

export { TEST_PIN, formatPhone } from "@/components/phone";

export interface PhoneMessage {
  id: string;
  at: number;
  receipt: string;
  amount: number;
  merchant: string;
  accountReference: string;
}

export type FailureOutcome = Exclude<StkOutcome, "approved">;

const FAILURES: Record<FailureOutcome, { title: string; body: string }> = {
  wrong_pin: {
    title: "Wrong PIN",
    body: "The M-PESA PIN you entered is incorrect. The payment was not made.",
  },
  insufficient_balance: {
    title: "Insufficient funds",
    body: "Your M-PESA balance is too low to complete this payment.",
  },
  cancelled: {
    title: "Request cancelled",
    body: "You cancelled the payment request.",
  },
  timeout: {
    title: "Request timed out",
    body: "The payment request expired before it was answered.",
  },
};

function smsText(m: PhoneMessage) {
  return `${m.receipt} Confirmed. Ksh${formatKes(m.amount)} sent to ${m.merchant.toUpperCase()}${
    m.accountReference ? ` for account ${m.accountReference}` : ""
  } on ${smsTime(m.at)}.`;
}

export default function VirtualPhone({
  session,
  merchant,
  processing,
  failure,
  messages,
  onResolve,
}: {
  session: PendingSession | null;
  merchant: string;
  processing: boolean;
  failure: FailureOutcome | null;
  messages: PhoneMessage[];
  onResolve: (outcome: StkOutcome) => void;
}) {
  const reduceMotion = useReducedMotion();
  const now = useNow();
  const sessionId = session?.checkoutRequestId ?? null;
  // Keyed by session so a new prompt always starts with an empty PIN.
  const [entry, setEntry] = useState({ id: sessionId, pin: "" });
  const pin = entry.id === sessionId ? entry.pin : "";
  const setPin = (next: (p: string) => string) => setEntry({ id: sessionId, pin: next(pin) });
  const prompting = !!session && !processing && !failure;

  const [scope, animate] = useAnimate<HTMLDivElement>();

  // A new prompt buzzes the phone once, like a real incoming STK push.
  useEffect(() => {
    if (!sessionId || reduceMotion || !scope.current) return;
    animate(scope.current, { x: [0, -3, 3, -2, 2, -1, 0] }, { duration: 0.45, ease: "easeInOut" });
  }, [sessionId, reduceMotion, animate, scope]);

  function press(key: string) {
    if (!prompting) return;
    if (key === "back") setPin((p) => p.slice(0, -1));
    else if (key === "ok") submit();
    else setPin((p) => (p.length < 4 ? p + key : p));
  }

  function submit() {
    if (!prompting || pin.length !== 4) return;
    onResolve(pin === TEST_PIN ? "approved" : "wrong_pin");
  }

  // Typing on the keyboard works while a prompt is open, unless a field has focus.
  const pressRef = useRef(press);
  const resolveRef = useRef(onResolve);
  useEffect(() => {
    pressRef.current = press;
    resolveRef.current = onResolve;
  });
  useEffect(() => {
    if (!prompting) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (t instanceof Element && t.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) pressRef.current(e.key);
      else if (e.key === "Backspace") pressRef.current("back");
      else if (e.key === "Enter") pressRef.current("ok");
      else if (e.key === "Escape") resolveRef.current("cancelled");
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prompting]);

  const total = session ? Math.max(Date.parse(session.timeoutAt) - Date.parse(session.createdAt), 1) : 1;
  const msLeft = session ? Math.max(Date.parse(session.timeoutAt) - now, 0) : 0;
  const secondsLeft = Math.ceil(msLeft / 1000);

  const banner = messages[0] && now - messages[0].at < 4500 ? messages[0] : null;
  const showDialog = !!session || !!failure;

  return (
    <PhoneFrame ref={scope} label="Virtual phone">
      <Wallpaper />
      <StatusBar now={now} />

      <LockScreen
        now={now}
        idleLabel={!session && !failure ? "Waiting for an STK Push" : null}
        messages={(banner ? messages.slice(1) : messages).map((m) => ({ id: m.id, at: m.at, text: smsText(m) }))}
        dimmed={showDialog}
      />

      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-110%)" }}
            animate={{ opacity: 1, transform: "translateY(0%)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-110%)" }}
            transition={{ duration: 0.42, ease: EASE_DRAWER }}
            className="absolute inset-x-2 top-8 z-40">
            <SmsCard text={smsText(banner)} at={banner.at} now={now} elevated />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.16 } }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 bg-black/50"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDialog && (
          <motion.div
            key="dialog"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "scale(0.94)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            exit={{
              opacity: 0,
              transform: reduceMotion ? "scale(1)" : "scale(0.97)",
              transition: { duration: 0.15, ease: EASE_OUT },
            }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
            role="alertdialog"
            aria-modal="false"
            aria-labelledby="stk-dialog-title"
            className={cn("absolute inset-x-3 z-20", dialogSurface, prompting ? "top-[40px]" : "top-[150px]")}>
            {session && prompting && (
              <div className="h-[3px] bg-black/[0.06] dark:bg-white/[0.08]">
                <div
                  className="h-full origin-left bg-[#1fae5a]"
                  style={{ transform: `scaleX(${msLeft / total})`, transition: "transform 1000ms linear" }}
                />
              </div>
            )}
            <AnimatePresence mode="popLayout" initial={false}>
              {failure ? (
                <DialogBody key="failure">
                  <div className="px-5 pt-5 pb-3">
                    <p id="stk-dialog-title" className="text-[16px] font-semibold tracking-[-0.01em]">
                      {FAILURES[failure].title}
                    </p>
                    <p className="mt-2 text-[13.5px] leading-[1.45] opacity-80">{FAILURES[failure].body}</p>
                    <div className="mt-3 flex justify-end">
                      <DialogButton>OK</DialogButton>
                    </div>
                  </div>
                </DialogBody>
              ) : processing ? (
                <DialogBody key="processing">
                  <div className="flex items-center gap-4 px-6 py-6">
                    <Spinner />
                    <p className="text-[14px]">Processing your request…</p>
                  </div>
                </DialogBody>
              ) : session ? (
                <DialogBody key={`prompt-${session.checkoutRequestId}`}>
                  <div className="px-5 pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <span id="stk-dialog-title" className="text-[16px] font-semibold tracking-[-0.01em]">
                        M-PESA
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[11px] tabular-nums opacity-55",
                          secondsLeft <= 5 && "text-[#d93025] opacity-100",
                        )}
                        aria-label={`${secondsLeft} seconds left`}>
                        0:{String(secondsLeft).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-2.5 text-[13.5px] leading-[1.45] opacity-85">
                      Do you want to pay{" "}
                      <span className="font-semibold opacity-100">Ksh{formatKes(session.amount)}</span> to{" "}
                      <span className="font-semibold uppercase">{merchant}</span>
                      {session.accountReference && (
                        <>
                          {" "}account no. <span className="font-semibold">{session.accountReference}</span>
                        </>
                      )}
                      ?
                    </p>
                    <div className="mt-4">
                      <PinField length={pin.length} />
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      <DialogButton onClick={() => onResolve("cancelled")}>Cancel</DialogButton>
                      <DialogButton onClick={submit} disabled={pin.length !== 4}>
                        OK
                      </DialogButton>
                    </div>
                  </div>
                </DialogBody>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {prompting && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 1, transform: "translateY(100%)" }}
            animate={{ opacity: 1, transform: "translateY(0%)" }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { transform: "translateY(100%)", transition: { duration: 0.2, ease: EASE_OUT } }
            }
            transition={{ duration: 0.36, ease: EASE_DRAWER }}
            className="absolute inset-x-0 bottom-0 z-30">
            <Keypad okDisabled={pin.length !== 4} onPress={press} />
          </motion.div>
        )}
      </AnimatePresence>

      {!prompting && <HomeIndicator />}
    </PhoneFrame>
  );
}
