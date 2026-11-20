"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimate,
  useReducedMotion,
} from "framer-motion";
import { CheckIcon, DeleteIcon, LockIcon, MessageSquareTextIcon } from "lucide-react";
import { useNow } from "@/hooks/use-now";
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

  const banner =
    messages[0] && now - messages[0].at < 4500 ? messages[0] : null;
  const showDialog = !!session || !!failure;

  return (
    <div ref={scope} className="relative w-[264px] select-none">
      {/* Power and volume keys sit on the right edge, as on most Android phones. */}
      <div className="absolute top-[118px] -right-[2px] h-11 w-[3px] rounded-r-sm bg-[linear-gradient(90deg,#2b2f2c,#5d625f)]" />
      <div className="absolute top-[182px] -right-[2px] h-[72px] w-[3px] rounded-r-sm bg-[linear-gradient(90deg,#2b2f2c,#5d625f)]" />

      <div className="rounded-[44px] bg-[linear-gradient(150deg,#6e7470_0%,#2a2e2b_28%,#1b1e1c_55%,#3d423f_80%,#757b77_100%)] p-[3px] shadow-[0_40px_70px_-28px_oklch(0.2_0.03_160/0.55),0_18px_30px_-18px_oklch(0_0_0/0.4)]">
        <div className="rounded-[41px] bg-[#050606] p-[6px] shadow-[inset_0_0_0_1px_oklch(1_0_0/0.06)]">
          <div
            className="relative h-[526px] overflow-hidden rounded-[35px] bg-[#0b1210] font-sans"
            aria-label="Virtual phone"
            role="group">
            <Wallpaper />

            <div className="absolute top-[11px] left-1/2 z-50 size-[11px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10" />

            <StatusBar now={new Date(now)} />

            <LockScreen
              now={new Date(now)}
              listening={!session && !failure}
              messages={banner ? messages.slice(1) : messages}
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
                  <SmsCard message={banner} now={now} elevated />
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
                  className={cn(
                    "absolute inset-x-3 z-20 overflow-hidden rounded-[26px] bg-[#f3f6f2] text-[#191c1a] shadow-[0_12px_40px_oklch(0_0_0/0.45)] dark:bg-[#2a302c] dark:text-[#e1e5e0]",
                    prompting ? "top-[40px]" : "top-[150px]",
                  )}>
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
                        <FailureContent outcome={failure} />
                      </DialogBody>
                    ) : processing ? (
                      <DialogBody key="processing">
                        <div className="flex items-center gap-4 px-6 py-6">
                          <span className="size-7 shrink-0 animate-spin rounded-full border-[3px] border-[#1fae5a]/20 border-t-[#1fae5a] [animation-duration:700ms]" />
                          <p className="text-[14px]">Processing your request…</p>
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
                  className="absolute inset-x-0 bottom-0 z-30 bg-[#e3e8e4] px-[7px] pt-2 pb-3 dark:bg-[#1c211e]">
                  <div className="grid grid-cols-3 gap-[6px]">
                    {KEYS.map(([key, letters]) => (
                      <Key key={key} value={key} letters={letters} disabled={key === "ok" && pin.length !== 4} onPress={press} />
                    ))}
                  </div>
                  <div className="mx-auto mt-3 h-[3px] w-24 rounded-full bg-black/45 dark:bg-white/50" />
                </motion.div>
              )}
            </AnimatePresence>

            {!prompting && (
              <div className="absolute bottom-2 left-1/2 z-30 h-[3px] w-24 -translate-x-1/2 rounded-full bg-white/70" />
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
    <div className="px-5 pt-4 pb-3">
      <div className="flex items-center justify-between">
        <span id="stk-dialog-title" className="text-[16px] font-semibold tracking-[-0.01em]">
          M-PESA
        </span>
        <span
          className={cn("font-mono text-[11px] tabular-nums opacity-55", secondsLeft <= 5 && "text-[#d93025] opacity-100")}
          aria-label={`${secondsLeft} seconds left`}>
          0:{String(secondsLeft).padStart(2, "0")}
        </span>
      </div>

      <p className="mt-2.5 text-[13.5px] leading-[1.45] opacity-85">
        Do you want to pay <span className="font-semibold opacity-100">Ksh{formatKes(session.amount)}</span> to{" "}
        <span className="font-semibold uppercase">{merchant}</span>
        {session.accountReference && (
          <>
            {" "}account no. <span className="font-semibold">{session.accountReference}</span>
          </>
        )}
        ?
      </p>

      <div className="relative mt-4" aria-label={`${pin.length} of 4 digits entered`} aria-live="polite">
        <span className="absolute -top-2 left-2.5 bg-[#f3f6f2] px-1 text-[10.5px] font-medium text-[#1a8f4c] dark:bg-[#2a302c] dark:text-[#5fd68f]">
          Enter M-PESA PIN
        </span>
        <div className="flex h-11 items-center gap-2.5 rounded-[6px] border-2 border-[#1a8f4c] px-3.5 dark:border-[#5fd68f]">
          {Array.from({ length: pin.length }, (_, i) => (
            <span key={i} className="size-2 rounded-full bg-current" />
          ))}
          <span className="h-5 w-[2px] animate-[blink_1.05s_steps(1)_infinite] bg-[#1a8f4c] motion-reduce:animate-none dark:bg-[#5fd68f]" />
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-1">
        <DialogButton onClick={onCancel}>Cancel</DialogButton>
        <DialogButton onClick={onSubmit} disabled={pin.length !== 4}>
          OK
        </DialogButton>
      </div>
    </div>
  );
}

function FailureContent({ outcome }: { outcome: FailureOutcome }) {
  const f = FAILURES[outcome];
  return (
    <div className="px-5 pt-5 pb-3">
      <p id="stk-dialog-title" className="text-[16px] font-semibold tracking-[-0.01em]">
        {f.title}
      </p>
      <p className="mt-2 text-[13.5px] leading-[1.45] opacity-80">{f.body}</p>
      <div className="mt-3 flex justify-end">
        <DialogButton onClick={() => {}}>OK</DialogButton>
      </div>
    </div>
  );
}

function DialogButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full px-4 py-2 text-[13.5px] font-medium text-[#1a8f4c] transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-[#1a8f4c]/10 active:scale-[0.96] disabled:opacity-35 disabled:hover:bg-transparent disabled:active:scale-100 dark:text-[#5fd68f] dark:hover:bg-[#5fd68f]/10">
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
  const label = value === "back" ? "Delete" : value === "ok" ? "Send PIN" : value;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => onPress(value)}
      className={cn(
        "flex h-[38px] items-center justify-center gap-1.5 rounded-[10px] transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.95] disabled:opacity-40",
        value === "ok"
          ? "bg-[#1a8f4c] text-white hover:bg-[#178244] dark:bg-[#5fd68f] dark:text-[#0d2a19]"
          : value === "back"
            ? "bg-[#c9d0cb] text-[#1d211f] hover:bg-[#bfc6c1] dark:bg-[#2f3532] dark:text-white"
            : "bg-white text-[#1d211f] shadow-[0_1px_0_oklch(0_0_0/0.14)] hover:bg-[#f6f8f6] dark:bg-[#3a403c] dark:text-white dark:shadow-none dark:hover:bg-[#444a46]",
      )}>
      {value === "back" ? (
        <DeleteIcon className="size-[18px]" />
      ) : value === "ok" ? (
        <CheckIcon className="size-[18px]" strokeWidth={2.5} />
      ) : (
        <>
          <span className="text-[19px] leading-none">{value}</span>
          {letters && <span className="w-7 text-[8.5px] font-medium tracking-[0.06em] opacity-50">{letters}</span>}
        </>
      )}
    </button>
  );
}

function StatusBar({ now }: { now: Date }) {
  return (
    <div className="relative z-30 flex h-8 items-center justify-between px-6 pt-1 text-[11.5px] font-medium text-white">
      <span className="tabular-nums">{formatShortTime(now)}</span>
      <span className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold tracking-wide opacity-90">4G</span>
        <svg viewBox="0 0 16 12" className="h-[10px] w-auto" aria-hidden>
          <path d="M16 0v12H0z" fill="currentColor" opacity="0.35" />
          <path d="M13 3v9H1z" fill="currentColor" />
        </svg>
        <span className="flex items-center gap-0.5">
          <span className="relative h-[11px] w-[20px] rounded-[3px] border-[1.5px] border-white/80 p-[1px]">
            <span className="block h-full w-[72%] rounded-[1px] bg-white" />
          </span>
          <span className="text-[10.5px] tabular-nums">72</span>
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
  const [hh, mm] = formatShortTime(now).split(":");
  return (
    <div
      className={cn("absolute inset-0 flex flex-col px-5 pt-14 transition-[filter] duration-200", dimmed && "blur-[1.5px]")}
      aria-hidden={dimmed}>
      <p className="text-[12.5px] font-medium text-white/85">
        {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        <span className="text-white/55"> · Safaricom</span>
      </p>
      <p className="mt-1 text-[92px] leading-[0.86] font-light tracking-[-0.04em] text-[#d9f7e3] tabular-nums">
        {hh}
        <br />
        {mm}
      </p>

      <div className="mt-6 flex flex-col gap-1.5">
        {messages.slice(0, 2).map((m) => (
          <SmsCard key={m.id} message={m} now={now.getTime()} />
        ))}
      </div>

      {listening && (
        <div className="absolute inset-x-0 bottom-9 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-black/25 px-3.5 py-1.5 text-[11.5px] font-medium text-white/90 ring-1 ring-white/10 backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4ee08a] opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-[#4ee08a]" />
            </span>
            Waiting for an STK Push
          </div>
          <LockIcon className="size-4 text-white/70" />
        </div>
      )}
    </div>
  );
}

function SmsCard({ message, now, elevated }: { message: PhoneMessage; now: number; elevated?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[22px] px-3.5 py-3 text-left",
        elevated
          ? "bg-[#f3f6f2] text-[#191c1a] shadow-[0_10px_30px_oklch(0_0_0/0.35)] dark:bg-[#2a302c] dark:text-[#e1e5e0]"
          : "bg-white/[0.13] text-white ring-1 ring-white/[0.08] backdrop-blur-xl",
      )}>
      <div className="flex items-center gap-2">
        <span className="flex size-[18px] items-center justify-center rounded-full bg-[#1a8f4c] text-white">
          <MessageSquareTextIcon className="size-[10px]" strokeWidth={2.5} />
        </span>
        <span className={cn("text-[11px]", elevated ? "opacity-60" : "text-white/70")}>
          Messages · {now - message.at < 60_000 ? "now" : formatShortTime(message.at)}
        </span>
      </div>
      <p className="mt-1.5 text-[12.5px] font-semibold">MPESA</p>
      <p className={cn("mt-0.5 text-[12px] leading-snug", elevated ? "line-clamp-4 opacity-85" : "line-clamp-2 text-white/85")}>
        {message.receipt} Confirmed. Ksh{formatKes(message.amount)} sent to {message.merchant.toUpperCase()}
        {message.accountReference && ` for account ${message.accountReference}`} on {smsTime(message.at)}.
      </p>
    </div>
  );
}

function Wallpaper() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-[radial-gradient(70%_45%_at_15%_95%,oklch(0.62_0.17_152/0.85),transparent_70%),radial-gradient(60%_40%_at_95%_70%,oklch(0.55_0.12_190/0.6),transparent_70%),radial-gradient(80%_50%_at_80%_0%,oklch(0.38_0.08_165/0.7),transparent_70%),linear-gradient(180deg,oklch(0.2_0.03_165),oklch(0.14_0.02_165))]"
    />
  );
}

export { formatPhone };
