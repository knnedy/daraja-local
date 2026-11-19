import { cn } from "@/lib/utils";
import { Call, Empty } from "../../_components/delivery-call";
import type { B2BResult } from "../lib/results";
import { formatClock } from "@/lib/format";

/** The newest Result posted back, with what your server replied. */
export default function LatestResult({
  result,
  waiting,
}: {
  result: B2BResult | null;
  waiting: boolean;
}) {
  const ok = result?.resultCode === "0";
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-foreground">
          Latest result
        </span>
        {result && !waiting && (
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {result.operation === "b2b_payment"
              ? "B2B payment"
              : "Account Balance"}
            {result.receipt && ` · ${result.receipt}`} ·{" "}
            {formatClock(result.at)}
          </span>
        )}
      </div>

      {waiting && <Empty>Waiting for M-Pesa to process the request…</Empty>}
      {!waiting && !result && (
        <Empty>
          Pay a business or query your balance, and the result your ResultURL
          receives shows here.
        </Empty>
      )}
      {!waiting && result && (
        <>
          <p
            className={cn(
              "rounded-md border px-3 py-2 font-mono text-[11.5px]",
              ok
                ? "border-green/30 bg-green-light text-green"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            ResultCode {result.resultCode} · {result.resultDesc}
          </p>
          {result.accounts.length > 0 && (
            <div className="overflow-hidden rounded-md border border-border">
              {result.accounts.map((a) => (
                <div
                  key={a.name}
                  className="flex justify-between gap-3 border-b border-border px-3 py-1.5 text-[11.5px] last:border-0"
                >
                  <span className="text-muted-foreground">{a.name}</span>
                  <span className="font-mono text-foreground tabular-nums">
                    KES {a.available}
                  </span>
                </div>
              ))}
            </div>
          )}
          {result.url ? (
            <Call
              url={result.url}
              sent={result.sent}
              attempts={result.attempts}
            />
          ) : (
            <Empty>This result was logged before call details were kept.</Empty>
          )}
        </>
      )}
    </div>
  );
}
