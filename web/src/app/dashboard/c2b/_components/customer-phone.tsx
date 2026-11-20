"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeftIcon, LandmarkIcon, LockIcon, ShoppingBagIcon } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { formatKes, formatShortTime } from "@/lib/format";
import type { C2BCommandId } from "@/lib/types/c2b";
import {
  DialogBody,
  DialogButton,
  EASE_DRAWER,
  EASE_OUT,
  HomeIndicator,
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

export type PayInput = { commandId: C2BCommandId; amount: string; billRef: string };

export type PhoneSms = { id: string; at: number; receipt: string; amount: number; account: string; buyGoods: boolean };

/** What the phone is waiting on, as decided by the page from the request log. */
export type PayOutcome =
  | { state: "processing" }
  | { state: "paid" }
  | { state: "failed"; title: string; body: string };

type Screen = "home" | "form" | "pin" | "sent" | "wrong-pin";

const MODES: Record<C2BCommandId, { title: string; numberLabel: string; icon: typeof LandmarkIcon }> = {
  CustomerPayBillOnline: { title: "Pay Bill", numberLabel: "Business no.", icon: LandmarkIcon },
  CustomerBuyGoodsOnline: { title: "Buy Goods and Services", numberLabel: "Till no.", icon: ShoppingBagIcon },
};

function smsText(m: PhoneSms, merchant: string) {
  const to = merchant.toUpperCase();
  return m.buyGoods
    ? `${m.receipt} Confirmed. Ksh${formatKes(m.amount)} paid to ${to} on ${smsTime(m.at)}.`
    : `${m.receipt} Confirmed. Ksh${formatKes(m.amount)} sent to ${to} for account ${m.account} on ${smsTime(m.at)}.`;
}

/** The customer's own phone: they open M-PESA, pay your Paybill or Till, and get the SMS. */
export default function CustomerPhone({
  merchant,
  shortCode,
  messages,
  outcome,
  onPay,
  onDone,
}: {
  merchant: string;
  shortCode: string;
  messages: PhoneSms[];
  /** null until a payment is sent from this phone. */
  outcome: PayOutcome | null;
  onPay: (input: PayInput) => void;
  onDone: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const now = useNow();
  const [screen, setScreen] = useState<Screen>("home");
  const [commandId, setCommandId] = useState<C2BCommandId>("CustomerPayBillOnline");
  const [account, setAccount] = useState("INV-1001");
  const [amount, setAmount] = useState("500");
  const [pin, setPin] = useState("");

  const isPayBill = commandId === "CustomerPayBillOnline";
  const amountOk = /^[1-9]\d{0,5}$/.test(amount);
  const formOk = amountOk && (!isPayBill || account.trim().length > 0);
  const mode = MODES[commandId];

  // "sent" hands over to the page's outcome; once paid the phone is back on its home screen.
  const view: Screen | "processing" | "failed" =
    screen === "sent" ? (outcome?.state === "failed" ? "failed" : outcome?.state === "paid" ? "home" : "processing") : screen;
  const prompting = view === "pin";

  function open(id: C2BCommandId) {
    setCommandId(id);
    setScreen("form");
  }

  function press(key: string) {
    if (!prompting) return;
    if (key === "back") setPin((p) => p.slice(0, -1));
    else if (key === "ok") submit();
    else setPin((p) => (p.length < 4 ? p + key : p));
  }

  function submit() {
    if (pin.length !== 4) return;
    setPin("");
    if (pin !== TEST_PIN) {
      setScreen("wrong-pin");
      return;
    }
    setScreen("sent");
    onPay({ commandId, amount, billRef: isPayBill ? account.trim() : "" });
  }

  function cancel() {
    setPin("");
    setScreen("form");
  }

  const pressRef = useRef(press);
  const cancelRef = useRef(cancel);
  useEffect(() => {
    pressRef.current = press;
    cancelRef.current = cancel;
  });
  useEffect(() => {
    if (!prompting) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) pressRef.current(e.key);
      else if (e.key === "Backspace") pressRef.current("back");
      else if (e.key === "Enter") pressRef.current("ok");
      else if (e.key === "Escape") cancelRef.current();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prompting]);

  const banner = messages[0] && now - messages[0].at < 5000 ? messages[0] : null;
  const onApp = view !== "home";
  const showDialog = view === "pin" || view === "processing" || view === "failed" || view === "wrong-pin";

  return (
    <PhoneFrame label="Customer's phone">
      <Wallpaper />

      <HomeScreen
        now={now}
        merchant={merchant}
        messages={banner ? messages.slice(1) : messages}
        onOpen={open}
        hidden={onApp}
      />

      <AnimatePresence>
        {onApp && (
          <motion.div
            key="app"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "scale(0.96)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "scale(0.97)", transition: { duration: 0.15 } }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="absolute inset-0 z-10 flex flex-col bg-[#f3f6f2] text-[#191c1a] dark:bg-[#161a18] dark:text-[#e1e5e0]">
            <StatusBar now={now} dark />
            <div className="flex h-12 items-center gap-1 px-2">
              <button
                type="button"
                aria-label="Back"
                onClick={() => setScreen("home")}
                className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                <ArrowLeftIcon className="size-[18px]" />
              </button>
              <p className="truncate text-[16px] font-medium">{mode.title}</p>
            </div>

            <form
              className="flex flex-1 flex-col gap-4 px-5 pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (formOk) setScreen("pin");
              }}>
              <OutlinedField label={mode.numberLabel}>
                <span className="flex items-center justify-between font-mono text-[14px]">
                  {shortCode || "—"}
                  <LockIcon className="size-3.5 opacity-50" aria-label="Your shortcode" />
                </span>
              </OutlinedField>
              {isPayBill && (
                <OutlinedField label="Account no." htmlFor="c2b-account">
                  <input
                    id="c2b-account"
                    value={account}
                    maxLength={20}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full bg-transparent text-[14px] outline-none"
                  />
                </OutlinedField>
              )}
              <OutlinedField label="Amount (Ksh)" htmlFor="c2b-amount" invalid={amount !== "" && !amountOk}>
                <input
                  id="c2b-amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-transparent text-[14px] tabular-nums outline-none"
                />
              </OutlinedField>
              <button
                type="submit"
                disabled={!formOk}
                className="mt-2 h-11 rounded-full bg-[#1a8f4c] text-[14px] font-medium text-white transition-[transform,opacity,background-color] duration-150 ease-out hover:bg-[#178244] active:scale-[0.98] disabled:opacity-40 dark:bg-[#5fd68f] dark:text-[#0d2a19]">
                Continue
              </button>
            </form>
            <HomeIndicator dark />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.16 } }}
            className="absolute inset-0 z-20 bg-black/50"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDialog && (
          <motion.div
            key="dialog"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "scale(0.94)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
            role="alertdialog"
            aria-modal="false"
            aria-labelledby="c2b-dialog-title"
            className={cn("absolute inset-x-3 z-30", dialogSurface, prompting ? "top-[40px]" : "top-[150px]")}>
            <AnimatePresence mode="popLayout" initial={false}>
              {view === "pin" ? (
                <DialogBody key="pin">
                  <div className="px-5 pt-4 pb-3">
                    <p id="c2b-dialog-title" className="text-[16px] font-semibold tracking-[-0.01em]">
                      M-PESA
                    </p>
                    <p className="mt-2.5 text-[13.5px] leading-[1.45] opacity-85">
                      Pay <span className="font-semibold">Ksh{formatKes(Number(amount))}</span> to{" "}
                      <span className="font-semibold uppercase">{merchant}</span>
                      {isPayBill && (
                        <>
                          {" "}account no. <span className="font-semibold">{account.trim()}</span>
                        </>
                      )}
                      ?
                    </p>
                    <div className="mt-4">
                      <PinField length={pin.length} />
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      <DialogButton onClick={cancel}>Cancel</DialogButton>
                      <DialogButton onClick={submit} disabled={pin.length !== 4}>
                        OK
                      </DialogButton>
                    </div>
                  </div>
                </DialogBody>
              ) : view === "processing" ? (
                <DialogBody key="processing">
                  <div className="flex items-center gap-4 px-6 py-6">
                    <Spinner />
                    <p id="c2b-dialog-title" className="text-[14px]">
                      Processing your request…
                    </p>
                  </div>
                </DialogBody>
              ) : (
                <DialogBody key="failed">
                  <div className="px-5 pt-5 pb-3">
                    <p id="c2b-dialog-title" className="text-[16px] font-semibold tracking-[-0.01em]">
                      {view === "wrong-pin" ? "Wrong PIN" : outcome?.state === "failed" ? outcome.title : "Failed"}
                    </p>
                    <p className="mt-2 text-[13.5px] leading-[1.45] opacity-80">
                      {view === "wrong-pin"
                        ? "The M-PESA PIN you entered is incorrect. The payment was not made."
                        : outcome?.state === "failed"
                          ? outcome.body
                          : ""}
                    </p>
                    <div className="mt-3 flex justify-end">
                      <DialogButton
                        onClick={() => {
                          if (view === "wrong-pin") setScreen("pin");
                          else {
                            setScreen("form");
                            onDone();
                          }
                        }}>
                        {view === "wrong-pin" ? "Try again" : "OK"}
                      </DialogButton>
                    </div>
                  </div>
                </DialogBody>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {prompting && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { transform: "translateY(100%)" }}
            animate={{ opacity: 1, transform: "translateY(0%)" }}
            exit={reduceMotion ? { opacity: 0 } : { transform: "translateY(100%)", transition: { duration: 0.2, ease: EASE_OUT } }}
            transition={{ duration: 0.36, ease: EASE_DRAWER }}
            className="absolute inset-x-0 bottom-0 z-40">
            <Keypad okDisabled={pin.length !== 4} onPress={press} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-110%)" }}
            animate={{ opacity: 1, transform: "translateY(0%)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-110%)" }}
            transition={{ duration: 0.42, ease: EASE_DRAWER }}
            className="absolute inset-x-2 top-8 z-50">
            <SmsCard text={smsText(banner, merchant)} at={banner.at} now={now} elevated />
          </motion.div>
        )}
      </AnimatePresence>

      {!onApp && <HomeIndicator />}
    </PhoneFrame>
  );
}

function OutlinedField({
  label,
  htmlFor,
  invalid,
  children,
}: {
  label: string;
  htmlFor?: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-[6px] border px-3.5 py-3 transition-colors focus-within:border-2 focus-within:border-[#1a8f4c] focus-within:px-[13px] focus-within:py-[11px] dark:focus-within:border-[#5fd68f]",
        invalid ? "border-[#d93025]" : "border-[#c4cbc6] dark:border-[#3d4440]",
      )}>
      <label
        htmlFor={htmlFor}
        className="absolute -top-2 left-2.5 bg-[#f3f6f2] px-1 text-[10.5px] font-medium text-[#5b625e] dark:bg-[#161a18] dark:text-[#a5aca8]">
        {label}
      </label>
      {children}
    </div>
  );
}

function HomeScreen({
  now,
  merchant,
  messages,
  onOpen,
  hidden,
}: {
  now: number;
  merchant: string;
  messages: PhoneSms[];
  onOpen: (id: C2BCommandId) => void;
  hidden: boolean;
}) {
  return (
    <div className="absolute inset-0 isolate flex flex-col" aria-hidden={hidden} inert={hidden}>
      <StatusBar now={now} />
      <div className="px-5 pt-5">
        <p className="text-[48px] leading-none font-light tracking-[-0.03em] text-[#d9f7e3] tabular-nums">
          {formatShortTime(now)}
        </p>
        <p className="mt-1.5 text-[12.5px] font-medium text-white/80">
          {new Date(now).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="mx-3 mt-6 rounded-[24px] bg-white/[0.12] p-3 ring-1 ring-white/[0.08] backdrop-blur-xl">
        <div className="flex items-center justify-between px-1">
          <p className="text-[13px] font-semibold text-white">M-PESA</p>
          <p className="text-[11px] text-white/60">Lipa na M-PESA</p>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {(Object.keys(MODES) as C2BCommandId[]).map((id) => {
            const Icon = MODES[id].icon;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onOpen(id)}
                className="flex flex-col items-start gap-3 rounded-[16px] bg-white/[0.92] p-3 text-left text-[#191c1a] transition-[transform,background-color] duration-150 ease-out hover:bg-white active:scale-[0.97] dark:bg-[#2a302c]/95 dark:text-[#e1e5e0] dark:hover:bg-[#323833]">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#1a8f4c]/12 text-[#1a8f4c] dark:bg-[#5fd68f]/15 dark:text-[#5fd68f]">
                  <Icon className="size-4" />
                </span>
                <span className="text-[12.5px] leading-tight font-medium">
                  {id === "CustomerPayBillOnline" ? "Pay Bill" : "Buy Goods"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 px-3">
        {messages.slice(0, 2).map((m) => (
          <SmsCard key={m.id} text={smsText(m, merchant)} at={m.at} now={now} />
        ))}
      </div>
    </div>
  );
}
