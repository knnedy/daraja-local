import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const rules: {
  trigger: string;
  result: string;
  tone: "neutral" | "success" | "error";
}[] = [
  { trigger: "any number", result: "Phone not validated", tone: "neutral" },
  { trigger: "1234 or any PIN", result: "Approves", tone: "success" },
  { trigger: "0000", result: "Wrong PIN · 2001", tone: "error" },
  { trigger: "1111", result: "Insufficient balance · 1", tone: "error" },
  { trigger: "Cancel button", result: "Cancelled · 1032", tone: "error" },
  { trigger: "no action", result: "Timeout after 20s · 1037", tone: "error" },
];

export default function SimulationGuide() {
  return (
    <div className="rounded-lg border border-border bg-surface-1">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <InfoIcon className="size-3.5 text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground">
          How the simulation works
        </span>
      </div>
      <div className="grid grid-cols-2">
        {rules.map((rule, i) => (
          <div
            key={rule.trigger}
            className={cn(
              "border-border/60 px-3.5 py-2.5",
              i % 2 === 0 && "border-r",
              i < rules.length - 2 && "border-b",
            )}>
            <p
              className={cn(
                "font-mono text-[11.5px]",
                rule.tone === "success" && "text-green",
                rule.tone === "error" && "text-destructive",
                rule.tone === "neutral" && "text-muted-foreground",
              )}>
              {rule.trigger}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {rule.result}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
