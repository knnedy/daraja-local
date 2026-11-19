"use client";

import { useEffect, useRef, useState } from "react";
import { BanIcon, ClockIcon, WalletIcon } from "lucide-react";
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

// Long enough to read "Processing…", short enough not to feel slow.
const MIN_PROCESSING_MS = 700;
const FAILURE_VISIBLE_MS = 2800;

const DEV_ACTIONS: {
  outcome: FailureOutcome;
  label: string;
  code: number;
  icon: typeof BanIcon;
}[] = [
  { outcome: "cancelled", label: "Cancel", code: 1032, icon: BanIcon },
  {
    outcome: "insufficient_balance",
    label: "No funds",
    code: 1,
    icon: WalletIcon,
  },
  { outcome: "timeout", label: "Timeout", code: 1037, icon: ClockIcon },
];

export default function SimulatorCard({ slug }: { slug: string }) {
  const { data: sessions = [] } = usePendingSessions(slug);
  const { data: project } = useProject(slug);
  const { mutate: resolve } = useResolveSession(slug);

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
    const started = performance.now();

    resolve(
      { checkoutRequestId: session.checkoutRequestId, outcome },
      {
        onSuccess: (result) => {
          const wait = Math.max(
            0,
            MIN_PROCESSING_MS - (performance.now() - started),
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

  return (
    <div className="flex flex-col gap-4 panel p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">
          Virtual Phone
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              sorted.length === 0 ? "bg-muted-foreground/40" : "bg-green-2",
            )}
          />
          {sorted.length === 0 ? "Listening" : `${sorted.length} pending`}
        </span>
      </div>

      {sorted.length > 1 && (
        <div
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
          role="tablist"
          aria-label="Pending requests">
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
                  "shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10.5px] transition-colors active:scale-[0.97]",
                  selected
                    ? "border-green/40 bg-green-light text-green"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}>
                KES {formatKes(s.amount)} · {s.phoneNumber.slice(-4)}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-center pt-1">
        <VirtualPhone
          session={failure ? null : focused}
          merchant={merchant}
          processing={!!processing}
          failure={failure}
          messages={messages}
          onResolve={handleResolve}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!active}
          onClick={() => {
            for (const d of TEST_PIN)
              window.dispatchEvent(new KeyboardEvent("keydown", { key: d }));
          }}
          className="group flex items-center justify-between rounded-lg border border-dashed border-border-strong px-3 py-2 text-left transition-colors enabled:hover:border-green/50 enabled:hover:bg-green-light disabled:opacity-60">
          <span className="text-[11.5px] text-muted-foreground">
            Test PIN{" "}
            <span className="font-mono font-semibold tracking-[0.2em] text-foreground">
              {TEST_PIN}
            </span>{" "}
            approves
          </span>
          <span className="text-[10.5px] text-muted-foreground group-enabled:group-hover:text-green">
            {active ? "Fill in" : "Any other PIN · 2001"}
          </span>
        </button>

        <div className="grid grid-cols-3 gap-1.5">
          {DEV_ACTIONS.map(({ outcome, label, code, icon: Icon }) => (
            <button
              key={outcome}
              type="button"
              disabled={!active}
              onClick={() => handleResolve(outcome)}
              title={`Resolve with ResultCode ${code}`}
              className="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-surface-2 py-2 transition-[transform,background-color,border-color] duration-150 ease-out enabled:hover:border-border-strong enabled:hover:bg-surface-1 enabled:active:scale-[0.97] disabled:opacity-45">
              <Icon className="size-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-foreground">
                {label}
              </span>
              <span className="font-mono text-[9.5px] text-muted-foreground">
                {code}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        className="min-h-[38px] rounded-lg bg-surface-2 px-3 py-2"
        aria-live="polite">
        {focused && !failure ? (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[10.5px] text-muted-foreground">
              {formatPhone(focused.phoneNumber)}
            </span>
            <span className="shrink-0 text-[11px] font-medium text-foreground">
              {processing ? "Sending callback…" : "Waiting for the customer"}
            </span>
          </div>
        ) : status ? (
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "truncate font-mono text-[10.5px]",
                status.ok ? "text-green" : "text-red",
              )}>
              {status.text}
            </span>
            {status.code !== undefined && (
              <span className="shrink-0 rounded-full bg-surface-1 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                ResultCode {status.code}
              </span>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Call the endpoint above from your app and the prompt appears here.
          </p>
        )}
      </div>
    </div>
  );
}
