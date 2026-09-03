"use client";

import { useRef, useState } from "react";
import VirtualPhone from "./virtual-phone";
import { usePendingSessions, useResolveSession } from "@/hooks/use-stk";
import type { StkOutcome } from "@/lib/types/stk";

export default function SimulatorCard({ slug }: { slug: string }) {
  const { data: sessions = [] } = usePendingSessions(slug);
  const { mutate: resolve, isPending: resolving } = useResolveSession(slug);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [lastResolved, setLastResolved] = useState<StkOutcome | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sorted = [...sessions].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  const focused =
    sorted.find((s) => s.checkoutRequestId === focusedId) ?? sorted[0] ?? null;

  function focusSession(id: string | null) {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setLastResolved(null);
    setFocusedId(id);
  }

  function handleResolve(outcome: StkOutcome) {
    if (!focused) return;
    resolve(
      { checkoutRequestId: focused.checkoutRequestId, outcome },
      {
        onSuccess: () => {
          setLastResolved(outcome);
          setFocusedId(null);
          clearTimer.current = setTimeout(() => setLastResolved(null), 2500);
        },
      },
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">
          Virtual Phone
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={`size-1.5 rounded-full ${
              sorted.length === 0 ? "bg-muted-foreground/40" : "bg-green"
            }`}
          />
          {sorted.length === 0 ? "Listening" : `${sorted.length} pending`}
        </span>
      </div>

      {sorted.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {sorted.map((s) => (
            <button
              key={s.checkoutRequestId}
              type="button"
              onClick={() => focusSession(s.checkoutRequestId)}
              className={`shrink-0 rounded-md border px-2 py-1 font-mono text-[10.5px] transition-colors ${
                s.checkoutRequestId === focused?.checkoutRequestId
                  ? "border-green/40 bg-green/10 text-green"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}>
              KES {s.amount} · {s.phoneNumber.slice(-4)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 items-center justify-center">
        <VirtualPhone
          session={focused}
          resolvedOutcome={lastResolved}
          resolving={resolving}
          onResolve={handleResolve}
        />
      </div>

      <div className="rounded-md border border-border bg-surface-2 px-3 py-2">
        {focused ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground">
                Awaiting response
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                KES {focused.amount}
              </span>
            </div>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {focused.checkoutRequestId}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">No active session</p>
        )}
      </div>

      <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground">
        Call the endpoint above from your app — real requests appear here
        automatically.
      </p>
    </div>
  );
}
