import { cn } from "@/lib/utils";
import { Call, Empty } from "../../components/delivery-call";
import type { InitiatorResult } from "../lib/results";

/** The newest Result posted back, with what your server replied. */
export default function LatestResult({
  result,
  waiting,
}: {
  result: InitiatorResult | null;
  waiting: boolean;
}) {
  const ok = result && result.resultCode === "0";
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-foreground">
          Latest result
        </span>
        {result && !waiting && (
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {result.operation === "reversal"
              ? "Reversal"
              : "Transaction Status"}{" "}
            · {result.receipt || "—"} · {result.at.slice(11, 19)}
          </span>
        )}
      </div>

      {waiting && <Empty>Waiting for M-Pesa to process the request…</Empty>}
      {!waiting && !result && (
        <Empty>
          Check a status or reverse a payment, and the result your ResultURL
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
