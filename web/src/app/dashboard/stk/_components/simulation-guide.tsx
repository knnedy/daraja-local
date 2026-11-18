import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const outcomes: {
  label: string;
  code: string;
  desc: string;
  tone: "success" | "error";
}[] = [
  {
    label: "Approve",
    code: "0",
    desc: "The service request is processed successfully.",
    tone: "success",
  },
  {
    label: "Wrong PIN",
    code: "2001",
    desc: "Wrong PIN entered by user.",
    tone: "error",
  },
  {
    label: "Insufficient balance",
    code: "1",
    desc: "Insufficient funds on user's M-Pesa account.",
    tone: "error",
  },
  {
    label: "Cancel",
    code: "1032",
    desc: "Request cancelled by user.",
    tone: "error",
  },
  {
    label: "Let it time out",
    code: "1037",
    desc: "DS timeout — phone unreachable. Fires automatically after the project's configured timeout.",
    tone: "error",
  },
];

export default function SimulationGuide() {
  return (
    <div className="rounded-lg border border-border bg-surface-1">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <InfoIcon className="size-3.5 text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground">
          Resolving a pending request
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="mb-3 text-xs text-muted-foreground">
          When a request comes in, the Virtual Phone shows it as pending. Pick
          an outcome below to resolve it — each maps to a real Daraja ResultCode
          in the callback.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {outcomes.map((o) => (
            <div
              key={o.code}
              className="flex items-start justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
              <div>
                <p className="text-[12.5px] font-medium text-foreground">
                  {o.label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {o.desc}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10.5px]",
                  o.tone === "success" &&
                    "border-green/30 bg-green/10 text-green",
                  o.tone === "error" &&
                    "border-destructive/30 bg-destructive/10 text-destructive",
                )}>
                {o.code}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
