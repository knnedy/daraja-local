"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { CheckIcon, DeleteIcon, LockIcon, MessageSquareTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortTime } from "@/lib/format";

// The emulator can't know a customer's real PIN, so one test PIN approves.
export const TEST_PIN = "1234";

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

/** 254712345678 → "0712 345 678". */
export function formatPhone(msisdn: string) {
  const local = msisdn.replace(/^254/, "0");
  return local.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
}

/** The date format M-PESA SMS use, e.g. "20/11/26 at 3:56 PM". */
export function smsTime(at: number) {
  const d = new Date(at);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

/** An Android phone: metal rim, side keys, punch-hole camera and a 264×526 screen. */
export const PhoneFrame = forwardRef<HTMLDivElement, { label: string; children: React.ReactNode }>(
  function PhoneFrame({ label, children }, ref) {
    return (
      <div ref={ref} className="relative w-[264px] select-none">
        <div className="absolute top-[118px] -right-[2px] h-11 w-[3px] rounded-r-sm bg-[linear-gradient(90deg,#2b2f2c,#5d625f)]" />
        <div className="absolute top-[182px] -right-[2px] h-[72px] w-[3px] rounded-r-sm bg-[linear-gradient(90deg,#2b2f2c,#5d625f)]" />
        <div className="rounded-[44px] bg-[linear-gradient(150deg,#6e7470_0%,#2a2e2b_28%,#1b1e1c_55%,#3d423f_80%,#757b77_100%)] p-[3px] shadow-[0_40px_70px_-28px_oklch(0.2_0.03_160/0.55),0_18px_30px_-18px_oklch(0_0_0/0.4)]">
          <div className="rounded-[41px] bg-[#050606] p-[6px] shadow-[inset_0_0_0_1px_oklch(1_0_0/0.06)]">
            <div
              className="relative h-[526px] overflow-hidden rounded-[35px] bg-[#0b1210] font-sans"
              aria-label={label}
              role="group">
              {children}
              <div className="absolute top-[11px] left-1/2 z-50 size-[11px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export function Wallpaper() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-[radial-gradient(70%_45%_at_15%_95%,oklch(0.62_0.17_152/0.85),transparent_70%),radial-gradient(60%_40%_at_95%_70%,oklch(0.55_0.12_190/0.6),transparent_70%),radial-gradient(80%_50%_at_80%_0%,oklch(0.38_0.08_165/0.7),transparent_70%),linear-gradient(180deg,oklch(0.2_0.03_165),oklch(0.14_0.02_165))]"
    />
  );
}

export function StatusBar({ now, dark }: { now: number; dark?: boolean }) {
  return (
    <div
      className={cn(
        "relative z-30 flex h-8 items-center justify-between px-6 pt-1 text-[11.5px] font-medium",
        dark ? "text-[#191c1a] dark:text-white" : "text-white",
      )}>
      <span className="tabular-nums">{formatShortTime(now)}</span>
      <span className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold tracking-wide opacity-90">4G</span>
        <svg viewBox="0 0 16 12" className="h-[10px] w-auto" aria-hidden>
          <path d="M16 0v12H0z" fill="currentColor" opacity="0.35" />
          <path d="M13 3v9H1z" fill="currentColor" />
        </svg>
        <span className="flex items-center gap-0.5">
          <span className="relative h-[11px] w-[20px] rounded-[3px] border-[1.5px] border-current p-[1px] opacity-90">
            <span className="block h-full w-[72%] rounded-[1px] bg-current" />
          </span>
          <span className="text-[10.5px] tabular-nums">72</span>
        </span>
      </span>
    </div>
  );
}

export function HomeIndicator({ dark }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "absolute bottom-2 left-1/2 z-30 h-[3px] w-24 -translate-x-1/2 rounded-full",
        dark ? "bg-black/45 dark:bg-white/50" : "bg-white/70",
      )}
    />
  );
}

/** Material-style dialog surface, used for prompts and results. */
export const dialogSurface =
  "overflow-hidden rounded-[26px] bg-[#f3f6f2] text-[#191c1a] shadow-[0_12px_40px_oklch(0_0_0/0.45)] dark:bg-[#2a302c] dark:text-[#e1e5e0]";

export function DialogBody({ children }: { children: React.ReactNode }) {
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

export function DialogButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-full px-4 py-2 text-[13.5px] font-medium text-[#1a8f4c] transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-[#1a8f4c]/10 active:scale-[0.96] disabled:opacity-35 disabled:hover:bg-transparent disabled:active:scale-100 dark:text-[#5fd68f] dark:hover:bg-[#5fd68f]/10">
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <span className="size-7 shrink-0 animate-spin rounded-full border-[3px] border-[#1fae5a]/20 border-t-[#1fae5a] [animation-duration:700ms]" />
  );
}

/** Outlined PIN field with a blinking caret. */
export function PinField({ length }: { length: number }) {
  return (
    <div className="relative" aria-label={`${length} of 4 digits entered`} aria-live="polite">
      <span className="absolute -top-2 left-2.5 bg-[#f3f6f2] px-1 text-[10.5px] font-medium text-[#1a8f4c] dark:bg-[#2a302c] dark:text-[#5fd68f]">
        Enter M-PESA PIN
      </span>
      <div className="flex h-11 items-center gap-2.5 rounded-[6px] border-2 border-[#1a8f4c] px-3.5 dark:border-[#5fd68f]">
        {Array.from({ length }, (_, i) => (
          <span key={i} className="size-2 rounded-full bg-current" />
        ))}
        <span className="h-5 w-[2px] animate-[blink_1.05s_steps(1)_infinite] bg-[#1a8f4c] motion-reduce:animate-none dark:bg-[#5fd68f]" />
      </div>
    </div>
  );
}

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

/** Numeric keypad docked to the bottom of the screen. Emits digits, "back" and "ok". */
export function Keypad({ okDisabled, onPress }: { okDisabled: boolean; onPress: (key: string) => void }) {
  return (
    <div className="bg-[#e3e8e4] px-[7px] pt-2 pb-3 dark:bg-[#1c211e]">
      <div className="grid grid-cols-3 gap-[6px]">
        {KEYS.map(([key, letters]) => (
          <Key key={key} value={key} letters={letters} disabled={key === "ok" && okDisabled} onPress={onPress} />
        ))}
      </div>
      <div className="mx-auto mt-3 h-[3px] w-24 rounded-full bg-black/45 dark:bg-white/50" />
    </div>
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
          <span aria-hidden className="w-7 text-[8.5px] font-medium tracking-[0.06em] opacity-50">
            {letters}
          </span>
        </>
      )}
    </button>
  );
}

/** An M-PESA SMS as a notification: on the lock screen, or elevated as a heads-up. */
export function SmsCard({
  text,
  at,
  now,
  elevated,
}: {
  text: string;
  at: number;
  now: number;
  elevated?: boolean;
}) {
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
          Messages · {now - at < 60_000 ? "now" : formatShortTime(at)}
        </span>
      </div>
      <p className="mt-1.5 text-[12.5px] font-semibold">MPESA</p>
      <p className={cn("mt-0.5 text-[12px] leading-snug", elevated ? "line-clamp-4 opacity-85" : "line-clamp-2 text-white/85")}>
        {text}
      </p>
    </div>
  );
}

export type LockMessage = { id: string; at: number; text: string };

/** Lock screen: big clock, recent SMS, and an idle chip saying what the phone waits for. */
export function LockScreen({
  now,
  idleLabel,
  messages,
  dimmed,
}: {
  now: number;
  /** Shown at the bottom while nothing is happening; null hides it. */
  idleLabel: string | null;
  messages: LockMessage[];
  dimmed: boolean;
}) {
  const [hh, mm] = formatShortTime(now).split(":");
  return (
    <div
      className={cn("absolute inset-0 flex flex-col px-5 pt-14 transition-[filter] duration-200", dimmed && "blur-[1.5px]")}
      aria-hidden={dimmed}>
      <p className="text-[12.5px] font-medium text-white/85">
        {new Date(now).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        <span className="text-white/55"> · Safaricom</span>
      </p>
      <p className="mt-1 text-[92px] leading-[0.86] font-light tracking-[-0.04em] text-[#d9f7e3] tabular-nums">
        {hh}
        <br />
        {mm}
      </p>

      <div className="mt-6 flex flex-col gap-1.5">
        {messages.slice(0, idleLabel ? 1 : 2).map((m) => (
          <SmsCard key={m.id} text={m.text} at={m.at} now={now} />
        ))}
      </div>

      {idleLabel && (
        <div className="absolute inset-x-0 bottom-9 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-black/25 px-3.5 py-1.5 text-[11.5px] font-medium text-white/90 ring-1 ring-white/10 backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4ee08a] opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-[#4ee08a]" />
            </span>
            {idleLabel}
          </div>
          <LockIcon className="size-4 text-white/70" />
        </div>
      )}
    </div>
  );
}
