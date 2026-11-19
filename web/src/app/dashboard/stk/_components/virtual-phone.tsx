"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimate,
  useReducedMotion,
} from "framer-motion";
import { CheckIcon, DeleteIcon, LockIcon, XIcon } from "lucide-react";
import type { PendingSession, StkOutcome } from "@/lib/types/stk";
import { cn } from "@/lib/utils";
import { formatKes, formatShortTime } from "@/lib/format";

// The emulator can't know a customer's real PIN, so one test PIN approves.
export const TEST_PIN = "1234";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

export interface PhoneMessage {
  id: string;
  at: number;
  receipt: string;
  amount: number;
  merchant: string;
  accountReference: string;
}

export type FailureOutcome = Exclude<StkOutcome, "approved">;

const FAILURES: Record<
  FailureOutcome,
  { title: string; body: string; code: number }
> = {
  wrong_pin: {
    title: "Wrong PIN",
    body: "The M-PESA PIN you entered is incorrect.",
    code: 2001,
  },
  insufficient_balance: {
    title: "Insufficient funds",
    body: "Your M-PESA balance is too low for this payment.",
    code: 1,
  },
  cancelled: {
    title: "Request cancelled",
    body: "The payment was cancelled on the phone.",
    code: 1032,
  },
  timeout: {
    title: "Request timed out",
    body: "Nobody answered the prompt in time.",
    code: 1037,
  },
};

const KEYS = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["back", ""],
  ["0", "+"],
  ["ok", ""],
] as const;

function formatPhone(msisdn: string) {
  const local = msisdn.replace(/^254/, "0");
  return local.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
}

function smsTime(at: number) {
  const d = new Date(at);
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} at ${time}`;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
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
  const setPin = (next: (p: string) => string) =>
    setEntry({ id: sessionId, pin: next(pin) });
  const prompting = !!session && !processing && !failure;

  const [scope, animate] = useAnimate<HTMLDivElement>();

  // A new prompt buzzes the phone once, like a real incoming STK push.
  useEffect(() => {
    if (!sessionId || reduceMotion || !scope.current) return;
    animate(
      scope.current,
      { x: [0, -3, 3, -2, 2, -1, 0] },
      { duration: 0.45, ease: "easeInOut" },
    );
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
      if (
        t instanceof Element &&
        t.closest("input, textarea, select, [contenteditable=true]")
      )
        return;
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

  const total = session
    ? Math.max(Date.parse(session.timeoutAt) - Date.parse(session.createdAt), 1)
    : 1;
  const msLeft = session ? Math.max(Date.parse(session.timeoutAt) - now, 0) : 0;
  const secondsLeft = Math.ceil(msLeft / 1000);

  const clock = new Date(now);
  const banner =
    messages[0] && now - messages[0].at < 4500 ? messages[0] : null;
  const showDialog = !!session || !!failure;

  return (
    <div ref={scope} className="relative w-[272px] select-none">
      {/* Side buttons */}
      <div className="absolute top-24 -left-[3px] h-8 w-[3px] rounded-l bg-gradient-to-b from-neutral-500 to-neutral-700" />
      <div className="absolute top-36 -left-[3px] h-14 w-[3px] rounded-l bg-gradient-to-b from-neutral-500 to-neutral-700" />
      <div className="absolute top-52 -left-[3px] h-14 w-[3px] rounded-l bg-gradient-to-b from-neutral-500 to-neutral-700" />
      <div className="absolute top-40 -right-[3px] h-20 w-[3px] rounded-r bg-gradient-to-b from-neutral-500 to-neutral-700" />

      {/* Frame */}
      <div className="rounded-[46px] bg-gradient-to-br from-neutral-400 via-neutral-700 to-neutral-500 p-[2.5px] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45),0_0_0_1px_rgb(0_0_0/0.25)] dark:from-neutral-500 dark:via-neutral-800 dark:to-neutral-600">
        <div className="rounded-[44px] bg-black p-[9px]">
          <div
            className="relative h-[580px] overflow-hidden rounded-[35px] bg-neutral-950"
            aria-label="Virtual phone"
            role="group">
            <Wallpaper />

            {/* Dynamic island */}
            <div className="absolute top-2.5 left-1/2 z-30 h-[26px] w-[88px] -translate-x-1/2 rounded-full bg-black" />

            <StatusBar now={clock} />

            <LockScreen
              now={clock}
              listening={!session}
              messages={banner ? messages.slice(1) : messages}
              dimmed={showDialog}
            />

            {/* SMS banner */}
            <AnimatePresence>
              {banner && (
                <motion.div
                  key={banner.id}
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, transform: "translateY(-120%)" }
                  }
                  animate={{ opacity: 1, transform: "translateY(0%)" }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, transform: "translateY(-120%)" }
                  }
                  transition={{ duration: 0.4, ease: EASE_DRAWER }}
                  className="absolute inset-x-2.5 top-11 z-40">
                  <SmsCard message={banner} now={now} elevated />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrim */}
            <AnimatePresence>
              {showDialog && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.16 } }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-10 bg-black/55 backdrop-blur-[2px]"
                />
              )}
            </AnimatePresence>

            {/* SIM toolkit dialog */}
            <AnimatePresence>
              {showDialog && (
                <motion.div
                  key="dialog"
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, transform: "scale(0.96)" }
                  }
                  animate={{ opacity: 1, transform: "scale(1)" }}
                  exit={{
                    opacity: 0,
                    transform: reduceMotion ? "scale(1)" : "scale(0.97)",
                    transition: { duration: 0.16, ease: EASE_OUT },
                  }}
                  transition={{ duration: 0.24, ease: EASE_OUT }}
                  role="alertdialog"
                  aria-modal="false"
                  aria-labelledby="stk-dialog-title"
                  className="absolute inset-x-4 top-[60px] z-20 overflow-hidden rounded-[22px] bg-white text-neutral-900 shadow-2xl dark:bg-neutral-800 dark:text-neutral-50">
                  {session && prompting && (
                    <div
                      className="h-[3px] origin-left bg-green-2"
                      style={{
                        transform: `scaleX(${msLeft / total})`,
                        transition: "transform 1000ms linear",
                      }}
                    />
                  )}
                  <AnimatePresence mode="popLayout" initial={false}>
                    {failure ? (
                      <DialogBody key="failure">
                        <FailureContent outcome={failure} />
                      </DialogBody>
                    ) : processing ? (
                      <DialogBody key="processing">
                        <div className="flex flex-col items-center gap-3 py-6">
                          <span className="size-7 animate-spin rounded-full border-[2.5px] border-green-2/25 border-t-green-2 [animation-duration:650ms]" />
                          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                            Processing…
                          </p>
                        </div>
                      </DialogBody>
                    ) : session ? (
                      <DialogBody key={`prompt-${session.checkoutRequestId}`}>
                        <PromptContent
                          session={session}
                          merchant={merchant}
                          pin={pin}
                          secondsLeft={secondsLeft}
                          onCancel={() => onResolve("cancelled")}
                          onSubmit={submit}
                        />
                      </DialogBody>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keypad */}
            <AnimatePresence>
              {prompting && (
                <motion.div
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 1, transform: "translateY(100%)" }
                  }
                  animate={{ opacity: 1, transform: "translateY(0%)" }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : {
                          transform: "translateY(100%)",
                          transition: { duration: 0.2, ease: EASE_OUT },
                        }
                  }
                  transition={{ duration: 0.36, ease: EASE_DRAWER }}
                  className="absolute inset-x-0 bottom-0 z-30 rounded-t-[18px] bg-neutral-200/95 px-2 pt-2 pb-5 backdrop-blur-md dark:bg-neutral-900/95">
                  <div className="grid grid-cols-3 gap-1.5">
                    {KEYS.map(([key, letters]) => (
                      <Key
                        key={key}
                        value={key}
                        letters={letters}
                        disabled={key === "ok" && pin.length !== 4}
                        onPress={press}
                      />
                    ))}
                  </div>
                  <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-neutral-900/70 dark:bg-white/60" />
                </motion.div>
              )}
            </AnimatePresence>

            {!prompting && (
              <div className="absolute bottom-2 left-1/2 z-30 h-1 w-24 -translate-x-1/2 rounded-full bg-white/70" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DialogBody({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(3px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(3px)", transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: EASE_OUT }}>
      {children}
    </motion.div>
  );
}

function PromptContent({
  session,
  merchant,
  pin,
  secondsLeft,
  onCancel,
  onSubmit,
}: {
  session: PendingSession;
  merchant: string;
  pin: string;
  secondsLeft: number;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="px-5 pt-4 pb-2">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <MpesaMark />
          <span
            id="stk-dialog-title"
            className="text-[13px] font-semibold tracking-tight">
            M-PESA
          </span>
        </span>
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums text-neutral-400",
            secondsLeft <= 5 && "text-red",
          )}
          aria-label={`${secondsLeft} seconds left`}>
          0:{String(secondsLeft).padStart(2, "0")}
        </span>
      </div>

      <p className="text-[13.5px] leading-snug text-neutral-700 dark:text-neutral-200">
        Do you want to pay{" "}
        <span className="font-semibold text-neutral-950 dark:text-white">
          KES {formatKes(session.amount)}
        </span>{" "}
        to{" "}
        <span className="font-semibold text-neutral-950 uppercase dark:text-white">
          {merchant}
        </span>
        {session.accountReference && (
          <>
            {" "}
            account no.{" "}
            <span className="font-medium text-neutral-950 dark:text-white">
              {session.accountReference}
            </span>
          </>
        )}
        ?
      </p>

      <p className="mt-4 mb-2 text-[11.5px] font-medium text-neutral-500 dark:text-neutral-400">
        Enter M-PESA PIN
      </p>
      <div
        className="flex gap-2.5"
        aria-label={`${pin.length} of 4 digits entered`}
        aria-live="polite">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "flex h-9 flex-1 items-center justify-center rounded-lg border",
              i < pin.length
                ? "border-green-2/60 bg-green-2/8"
                : i === pin.length
                  ? "border-neutral-400 dark:border-neutral-500"
                  : "border-neutral-200 dark:border-neutral-700",
            )}>
            {i < pin.length && (
              <span className="size-2 rounded-full bg-neutral-900 dark:bg-white" />
            )}
          </span>
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-1">
        <DialogButton onClick={onCancel}>Cancel</DialogButton>
        <DialogButton onClick={onSubmit} disabled={pin.length !== 4} primary>
          OK
        </DialogButton>
      </div>
    </div>
  );
}

function FailureContent({ outcome }: { outcome: FailureOutcome }) {
  const f = FAILURES[outcome];
  return (
    <div className="flex flex-col items-center px-5 pt-6 pb-5 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-red-bg text-red">
        <XIcon className="size-5" strokeWidth={2.5} />
      </span>
      <p
        id="stk-dialog-title"
        className="mt-3 text-[14.5px] font-semibold tracking-tight">
        {f.title}
      </p>
      <p className="mt-1 text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">
        {f.body}
      </p>
      <span className="mt-3 rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-[10.5px] text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
        ResultCode {f.code}
      </span>
    </div>
  );
}

function DialogButton({
  children,
  primary,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full px-4 py-2 text-[13px] font-semibold transition-[transform,background-color,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-35 disabled:active:scale-100",
        primary
          ? "text-green hover:bg-green-2/10"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700",
      )}>
      {children}
    </button>
  );
}

function Key({
  value,
  letters,
  disabled,
  onPress,
}: {
  value: string;
  letters: string;
  disabled?: boolean;
  onPress: (key: string) => void;
}) {
  const label =
    value === "back" ? "Delete" : value === "ok" ? "Send PIN" : value;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => onPress(value)}
      className={cn(
        "flex h-10 flex-col items-center justify-center rounded-[10px] transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.95] disabled:opacity-40",
        value === "ok"
          ? "bg-green-2 text-white hover:brightness-105"
          : value === "back"
            ? "text-neutral-700 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/5"
            : "bg-white text-neutral-900 shadow-[0_1px_0_rgb(0_0_0/0.18)] hover:bg-neutral-50 dark:bg-neutral-700 dark:text-white dark:shadow-none dark:hover:bg-neutral-600",
      )}>
      {value === "back" ? (
        <DeleteIcon className="size-5" />
      ) : value === "ok" ? (
        <CheckIcon className="size-5" strokeWidth={2.5} />
      ) : (
        <>
          <span className="text-[18px] leading-none font-normal">{value}</span>
          {letters && (
            <span className="mt-0.5 text-[8px] font-semibold tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
              {letters}
            </span>
          )}
        </>
      )}
    </button>
  );
}

function StatusBar({ now }: { now: Date }) {
  return (
    <div className="relative z-30 flex items-center justify-between px-7 pt-3.5 text-[12px] font-semibold text-white">
      <span className="tabular-nums">
        {formatShortTime(now)}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-[10.5px] font-medium tracking-tight opacity-90">
          Safaricom
        </span>
        <svg viewBox="0 0 17 11" className="h-[9px] w-auto" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={i * 4.5}
              y={8 - i * 2.6}
              width="3"
              height={3 + i * 2.6}
              rx="0.8"
              fill="currentColor"
            />
          ))}
        </svg>
        <span className="flex h-[10px] w-[21px] items-center rounded-[3px] border border-white/45 p-[1.5px]">
          <span className="h-full w-[78%] rounded-[1.5px] bg-white" />
        </span>
      </span>
    </div>
  );
}

function LockScreen({
  now,
  listening,
  messages,
  dimmed,
}: {
  now: Date;
  listening: boolean;
  messages: PhoneMessage[];
  dimmed: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center pt-14 transition-[filter] duration-200",
        dimmed && "blur-[1px]",
      )}
      aria-hidden={dimmed}>
      <LockIcon className="size-3.5 text-white/70" />
      <p className="mt-1.5 text-[12.5px] font-medium text-white/80">
        {now.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>
      <p className="text-[68px] leading-[1.05] font-semibold tracking-tight text-white tabular-nums">
        {formatShortTime(now)}
      </p>

      <div className="mt-5 flex w-full flex-col gap-2 px-2.5">
        {messages.slice(0, 3).map((m) => (
          <SmsCard key={m.id} message={m} now={now.getTime()} />
        ))}
      </div>

      {listening && (
        <div className="absolute bottom-10 flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11.5px] font-medium text-white/85 backdrop-blur-md">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-2 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-green-2" />
          </span>
          Waiting for an STK Push
        </div>
      )}
    </div>
  );
}

function SmsCard({
  message,
  now,
  elevated,
}: {
  message: PhoneMessage;
  now: number;
  elevated?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] px-3.5 py-2.5 text-left backdrop-blur-xl",
        elevated
          ? "bg-white text-neutral-900 shadow-xl dark:bg-neutral-800 dark:text-white"
          : "bg-white/15 text-white",
      )}>
      <div className="mb-0.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <MpesaMark small />
          <span className="text-[11.5px] font-semibold">M-PESA</span>
        </span>
        <span
          className={cn(
            "text-[10.5px]",
            elevated ? "text-neutral-500 dark:text-neutral-400" : "text-white/60",
          )}>
          {now - message.at < 60_000
            ? "now"
            : formatShortTime(message.at)}
        </span>
      </div>
      <p
        className={cn(
          "text-[11.5px] leading-snug",
          elevated ? "line-clamp-4" : "line-clamp-2 text-white/85",
        )}>
        <span className="font-semibold">{message.receipt}</span> Confirmed. Ksh
        {formatKes(message.amount)} sent to {message.merchant.toUpperCase()}
        {message.accountReference &&
          ` for account ${message.accountReference}`}{" "}
        on {smsTime(message.at)}.
      </p>
    </div>
  );
}

function MpesaMark({ small }: { small?: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-[6px] bg-green-2 font-bold text-white",
        small ? "size-4 text-[8px]" : "size-5 text-[9.5px]",
      )}
      aria-hidden>
      M
    </span>
  );
}

function Wallpaper() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_110%,oklch(0.55_0.17_145/0.75),transparent_60%),radial-gradient(90%_60%_at_100%_0%,oklch(0.45_0.12_160/0.5),transparent_60%),linear-gradient(180deg,oklch(0.2_0.02_150),oklch(0.14_0.015_150))]"
    />
  );
}

export { formatPhone };
