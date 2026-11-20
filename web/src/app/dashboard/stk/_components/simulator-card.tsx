"use client";

import { useEffect, useRef, useState } from "react";
import { BanIcon, CheckIcon, ClockIcon, KeyRoundIcon, WalletIcon, XIcon } from "lucide-react";
import VirtualPhone, {
  TEST_PIN,
  formatPhone,
  type FailureOutcome,
  type PhoneMessage,
} from "./virtual-phone";
import { usePendingSessions, useResolveSession } from "@/hooks/use-stk";
import { useProject } from "@/hooks/use-projects";
import type { PendingSession, StkOutcome } from "@/lib/types/stk";
import { cn } from "@/lib/utils";
import { formatKes } from "@/lib/format";
import { useNow } from "@/hooks/use-now";

// Long enough to read "Processing…", short enough not to feel slow.
const MIN_PROCESSING_MS = 700;
const FAILURE_VISIBLE_MS = 2800;

const tick = () => performance.now();

const DEV_ACTIONS: {
  outcome: FailureOutcome;
  label: string;
  code: number;
  icon: typeof BanIcon;
}[] = [
  { outcome: "wrong_pin", label: "Wrong PIN", code: 2001, icon: KeyRoundIcon },
  { outcome: "cancelled", label: "Cancel", code: 1032, icon: BanIcon },
  { outcome: "insufficient_balance", label: "No funds", code: 1, icon: WalletIcon },
  { outcome: "timeout", label: "Time out", code: 1037, icon: ClockIcon },
];

// Types a PIN on the phone's keypad one digit at a time, then presses OK.
function typePin(pin: string, timers: ReturnType<typeof setTimeout>[]) {
  const keys = [...pin, "Enter"];
  keys.forEach((key, i) =>
    timers.push(
      setTimeout(
        () => window.dispatchEvent(new KeyboardEvent("keydown", { key })),
        i * 90 + (key === "Enter" ? 140 : 0),
      ),
    ),
  );
}

export default function SimulatorCard({ slug }: { slug: string }) {
  const { data: sessions = [] } = usePendingSessions(slug);
  const { data: project } = useProject(slug);
  const { mutate: resolve } = useResolveSession(slug);

  const now = useNow();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<PendingSession | null>(null);
  const [failure, setFailure] = useState<FailureOutcome | null>(null);
  const [messages, setMessages] = useState<PhoneMessage[]>([]);
  const [status, setStatus] = useState<{
    text: string;
    code?: number;
    ok: boolean;
  } | null>(
    null,
  );

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const handled = useRef(new Set<string>());
  const seen = useRef(new Map<string, PendingSession>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function showFailure(outcome: FailureOutcome) {
    setFailure(outcome);
    timers.current.push(
      setTimeout(() => setFailure(null), FAILURE_VISIBLE_MS),
    );
  }

  const sorted = [...sessions].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  const focused =
    processing ??
    sorted.find((s) => s.checkoutRequestId === focusedId) ??
    sorted[0] ??
    null;
  const merchant = project?.name ?? "Merchant";

  // A session that vanishes unanswered after its deadline timed out server-side.
  useEffect(() => {
    const current = new Set(sessions.map((s) => s.checkoutRequestId));
    for (const [id, s] of seen.current) {
      if (current.has(id)) continue;
      seen.current.delete(id);
      if (handled.current.has(id)) continue;
      if (Date.now() >= Date.parse(s.timeoutAt) - 1500) {
        setFailure("timeout");
        timers.current.push(
          setTimeout(() => setFailure(null), FAILURE_VISIBLE_MS),
        );
        setStatus({
          text: "Timeout",
          code: 1037,
          ok: false,
        });
      }
    }
    for (const s of sessions) seen.current.set(s.checkoutRequestId, s);
  }, [sessions]);

  function handleResolve(outcome: StkOutcome) {
    const session = focused;
    if (!session || processing) return;
    handled.current.add(session.checkoutRequestId);
    setFailure(null);
    setProcessing(session);
    setStatus(null);
    const started = tick();

    resolve(
      { checkoutRequestId: session.checkoutRequestId, outcome },
      {
        onSuccess: (result) => {
          const wait = Math.max(
            0,
            MIN_PROCESSING_MS - (tick() - started),
          );
          const t = setTimeout(() => {
            setProcessing(null);
            setFocusedId(null);
            if (outcome === "approved" && result.receipt) {
              setMessages((m) =>
                [
                  {
                    id: result.receipt!,
                    at: Date.now(),
                    receipt: result.receipt!,
                    amount: session.amount,
                    merchant,
                    accountReference: session.accountReference,
                  },
                  ...m,
                ].slice(0, 5),
              );
            } else if (outcome !== "approved") {
              showFailure(outcome);
            }
            setStatus({
              text:
                result.receipt ??
                (outcome === "wrong_pin"
                  ? "Wrong PIN"
                  : (DEV_ACTIONS.find((a) => a.outcome === outcome)?.label ??
                    "Declined")),
              code: result.resultCode,
              ok: result.resultCode === 0,
            });
          }, wait);
          timers.current.push(t);
        },
        onError: (err) => {
          handled.current.delete(session.checkoutRequestId);
          setProcessing(null);
          setStatus({
            text: err instanceof Error ? err.message : "Could not resolve",
            ok: false,
          });
        },
      },
    );
  }

  const active = !!focused && !processing && !failure;
  const secondsLeft = focused
    ? Math.max(0, Math.ceil((Date.parse(focused.timeoutAt) - now) / 1000))
    : 0;

  function respond(outcome: FailureOutcome) {
    if (outcome === "wrong_pin") typePin("0000", timers.current);
    else handleResolve(outcome);
  }

  return (
    <section className="panel overflow-hidden" aria-labelledby="phone-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 id="phone-title" className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
            Virtual Phone
          </h2>
          <p className="text-[12px] text-muted-foreground">The customer&apos;s side of the payment</p>
        </div>
        <span
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium ring-1 ring-inset",
            sorted.length
              ? "bg-green-light text-green ring-green-mid/60"
              : "bg-surface-2 text-muted-foreground ring-border",
          )}
          aria-live="polite">
          <span className="relative flex size-1.5">
            {sorted.length > 0 && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-2 opacity-60 motion-reduce:hidden" />
            )}
            <span
              className={cn(
                "relative inline-flex size-1.5 rounded-full",
                sorted.length ? "bg-green-2" : "bg-muted-foreground/50",
              )}
            />
          </span>
          {sorted.length ? `${sorted.length} waiting` : "Listening"}
        </span>
      </div>

      {sorted.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2" role="tablist" aria-label="Waiting prompts">
          {sorted.map((s) => {
            const selected = s.checkoutRequestId === focused?.checkoutRequestId;
            return (
              <button
                key={s.checkoutRequestId}
                type="button"
                role="tab"
                aria-selected={selected}
                disabled={!!processing}
                onClick={() => {
                  setFailure(null);
                  setFocusedId(s.checkoutRequestId);
                }}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] ring-1 transition-colors active:scale-[0.97]",
                  selected
                    ? "bg-green-light text-green ring-green-mid"
                    : "text-muted-foreground ring-border hover:text-foreground",
                )}>
                KES {formatKes(s.amount)} · {s.phoneNumber.slice(-4)}
              </button>
            );
          })}
        </div>
      )}

      <div
        className="relative flex justify-center px-4 py-4"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 45%, color-mix(in oklch, var(--green-2) 13%, transparent), transparent 75%), radial-gradient(circle, color-mix(in oklch, var(--border-strong) 70%, transparent) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 16px 16px",
        }}>
        <VirtualPhone
          session={failure ? null : focused}
          merchant={merchant}
          processing={!!processing}
          failure={failure}
          messages={messages}
          onResolve={handleResolve}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-border bg-surface-1 p-3">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[12px] font-medium text-foreground">Answer as the customer</p>
          <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {active ? `${secondsLeft}s left` : "no prompt open"}
          </p>
        </div>
        <button
          type="button"
          disabled={!active}
          onClick={() => typePin(TEST_PIN, timers.current)}
          className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-xs transition-[transform,background-color,opacity] duration-150 ease-out enabled:hover:bg-[color-mix(in_oklch,var(--primary),var(--foreground)_10%)] enabled:active:scale-[0.98] disabled:opacity-40 motion-reduce:active:scale-100">
          <CheckIcon className="size-4" strokeWidth={2.25} />
          Approve with PIN {TEST_PIN}
        </button>
        <div className="grid grid-cols-4 gap-1.5">
          {DEV_ACTIONS.map(({ outcome, label, code, icon: Icon }) => (
            <button
              key={outcome}
              type="button"
              disabled={!active}
              onClick={() => respond(outcome)}
              title={`Ends with ResultCode ${code}`}
              className="flex h-[50px] flex-col items-center justify-center gap-0.5 rounded-lg bg-surface-2 ring-1 ring-border transition-[transform,background-color,box-shadow] duration-150 ease-out enabled:hover:bg-surface-3 enabled:hover:ring-border-strong enabled:active:scale-[0.97] disabled:opacity-40 motion-reduce:active:scale-100">
              <span className="flex items-center gap-1 text-[11.5px] font-medium text-foreground">
                <Icon className="size-3 text-muted-foreground" />
                {label}
              </span>
              <span className="font-mono text-[10.5px] text-muted-foreground">{code}</span>
            </button>
          ))}
        </div>

        <div className="flex min-h-7 items-center gap-2 px-0.5 text-[12px]" aria-live="polite">
          {focused && !failure ? (
            <span className="truncate text-muted-foreground">
              {processing ? "Sending the callback to your app…" : `Prompt on ${formatPhone(focused.phoneNumber)}`}
            </span>
          ) : status ? (
            <>
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full",
                  status.ok ? "bg-green-light text-green" : "bg-red-bg text-red",
                )}>
                {status.ok ? <CheckIcon className="size-2.5" strokeWidth={3} /> : <XIcon className="size-2.5" strokeWidth={3} />}
              </span>
              <span className={cn("min-w-0 truncate font-medium", status.ok ? "text-foreground" : "text-foreground")}>
                {status.ok ? `Paid · ${status.text}` : status.text}
              </span>
              {status.code !== undefined && (
                <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                  ResultCode {status.code}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Prompts from your app appear on the phone.</span>
          )}
        </div>
      </div>
    </section>
  );
}
