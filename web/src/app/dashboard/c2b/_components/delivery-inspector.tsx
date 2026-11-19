"use client";

import { useState } from "react";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReplayConfirmation } from "@/hooks/use-c2b";
import type { PaymentSession } from "../lib/sessions";
import { Call, Empty } from "../../_components/delivery-call";
import { formatClock } from "@/lib/format";

const panels = ["Validation", "Confirmation"] as const;
type Panel = (typeof panels)[number];

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
                {replay.error.message}
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
                    {d.replay ? "replay" : "original"} · {formatClock(d.at)} ·{" "}
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
