import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const rules = [
  {
    trigger: "normal reference",
    result: "validation accepts",
    tone: "success",
  },
  { trigger: "INVALID", result: "invalid account · C2B00012", tone: "error" },
  { trigger: "amount = 0", result: "invalid amount · C2B00013", tone: "error" },
  {
    trigger: "validation off",
    result: "confirmation only, always accepted",
    tone: "neutral",
  },
] as const;

export default function SimulationGuide() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 py-3">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <InfoIcon className="size-3.5" />
        Simulation triggers:
      </span>
      {rules.map((rule) => (
        <span
          key={rule.trigger}
          className="flex items-center gap-1.5 rounded-md border border-border-strong bg-surface-2 px-2 py-1 text-[11px]">
          <span
            className={cn(
              "font-mono",
              rule.tone === "success" && "text-green",
              rule.tone === "error" && "text-destructive",
              rule.tone === "neutral" && "text-muted-foreground",
            )}>
            {rule.trigger}
          </span>
          <span className="text-muted-foreground">→ {rule.result}</span>
        </span>
      ))}
    </div>
  );
}
