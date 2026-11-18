"use client";

import { useState } from "react";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReplayConfirmation } from "@/hooks/use-c2b";
import type { DeliveryAttempt, PaymentSession } from "../lib/sessions";

const panels = ["Validation", "Confirmation"] as const;
type Panel = (typeof panels)[number];

const terminal =
  "max-h-64 overflow-auto rounded-md border border-terminal-border bg-terminal-bg p-3 font-mono text-[11.5px] leading-relaxed";

function errorText(error: Error): string {
  try {
    return (
      (JSON.parse(error.message) as { error?: string }).error ?? error.message
    );
  } catch {
    return error.message;
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function AttemptRow({
  attempt,
  index,
}: {
  attempt: DeliveryAttempt;
  index: number;
}) {
  const ok = attempt.statusCode === 200;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px]">
        <span className="text-muted-foreground">#{index + 1}</span>
        <span className="text-muted-foreground">
          {attempt.at.slice(11, 19)}
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5",
            ok
              ? "bg-green/10 text-green"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {attempt.err ? "no response" : `HTTP ${attempt.statusCode}`}
        </span>
        {attempt.durationMs !== null && (
          <span className="text-muted-foreground">{attempt.durationMs} ms</span>
        )}
      </div>
      {attempt.err ? (
        <p className="font-mono text-[11px] break-all text-destructive">
          {attempt.err}
        </p>
      ) : (
        <pre className={cn(terminal, "text-terminal-fg-muted")}>
          {attempt.reply || "(empty reply)"}
        </pre>
      )}
    </div>
  );
}

function Call({
  url,
  sent,
  attempts,
}: {
  url: string;
  sent: string;
  attempts: DeliveryAttempt[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        <Label>Sent</Label>
        <p className="mb-1.5 truncate font-mono text-[11px] text-foreground">
          <span className="text-muted-foreground">POST </span>
          {url}
        </p>
        <pre className={cn(terminal, "text-terminal-green")}>{sent}</pre>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <Label>
          Your server replied
          {attempts.length > 1 ? ` · ${attempts.length} attempts` : ""}
        </Label>
        {attempts.map((attempt, i) => (
          <AttemptRow key={i} attempt={attempt} index={i} />
        ))}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-[11.5px] text-muted-foreground">
      {children}
    </p>
  );
}

/** What each call to the developer's server sent and got back, with replay. */
export default function DeliveryInspector({
  slug,
  session,
  registered,
}: {
  slug: string;
  session: PaymentSession;
  registered: boolean;
}) {
  const [panel, setPanel] = useState<Panel>("Confirmation");
  const replay = useReplayConfirmation(slug);

  const validation = session.validation;
  const deliveries = session.confirmation?.deliveries ?? [];

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-md border border-border bg-surface-2 p-0.5">
          {panels.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPanel(p)}
              aria-pressed={panel === p}
              className={cn(
                "rounded px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                panel === p && "bg-surface-1 text-foreground shadow-sm",
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {panel === "Confirmation" && deliveries.length > 0 && (
          <div className="flex items-center gap-2.5">
            {replay.isError && (
              <span className="text-[11px] text-destructive">
                {errorText(replay.error)}
              </span>
            )}
            <button
              type="button"
              disabled={!registered || replay.isPending}
              onClick={() => replay.mutate(session.id)}
              title="Send the same Confirmation body again to your current ConfirmationURL"
              className="flex items-center gap-1.5 rounded-md border border-border-strong bg-surface-1 px-2.5 py-1 text-[11.5px] font-medium text-foreground transition-[background-color,transform] hover:bg-surface-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <RotateCwIcon
                className={cn(
                  "size-3.5",
                  replay.isPending && "animate-spin motion-reduce:animate-none",
                )}
              />
              Resend confirmation
            </button>
          </div>
        )}
      </div>

      {panel === "Validation" &&
        (!validation ? (
          <Empty>
            No ValidationURL was registered, so validation was skipped.
          </Empty>
        ) : !validation.attempt ? (
          <Empty>This payment was logged before call details were kept.</Empty>
        ) : (
          <Call
            url={validation.url}
            sent={validation.sent}
            attempts={[validation.attempt]}
          />
        ))}

      {panel === "Confirmation" &&
        (deliveries.length === 0 ? (
          <Empty>
            {session.rejected || (validation && !validation.accepted)
              ? "No Confirmation was sent for this payment."
              : "Waiting for the Confirmation…"}
          </Empty>
        ) : (
          <div className="flex flex-col gap-5">
            {[...deliveries].reverse().map((d, i) => (
              <div key={`${d.at}-${i}`} className="flex flex-col gap-2">
                {deliveries.length > 1 && (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {d.replay ? "replay" : "original"} · {d.at.slice(11, 19)} ·{" "}
                    <span
                      className={
                        d.delivered ? "text-green" : "text-destructive"
                      }
                    >
                      {d.delivered ? "delivered" : "failed"}
                    </span>
                  </p>
                )}
                {d.url ? (
                  <Call url={d.url} sent={d.sent} attempts={d.attempts} />
                ) : (
                  <Empty>
                    This delivery was logged before call details were kept.
                  </Empty>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
