import { cn } from "@/lib/utils";
import type { DeliveryAttempt } from "@/lib/request-log/delivery";

const terminal =
  "max-h-64 overflow-auto rounded-md border border-terminal-border bg-terminal-bg p-3 font-mono text-[11.5px] leading-relaxed";

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

export function Call({
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

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-[11.5px] text-muted-foreground">
      {children}
    </p>
  );
}
