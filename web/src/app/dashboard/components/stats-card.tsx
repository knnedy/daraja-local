import {
  ArrowLeftRightIcon,
  CheckCircle2Icon,
  SmartphoneIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { groupEntries } from "@/lib/request-log/group";
import { groupStatus } from "@/lib/request-log/status";
import type { RequestLogEntry } from "@/lib/types/request-log";

export default function StatsCard({ entries }: { entries: RequestLogEntry[] }) {
  const groups = groupEntries(entries);
  const stk = groups.filter((g) => g.kind === "stk_push").length;
  const c2b = groups.filter((g) => g.kind === "c2b").length;
  const resolved = groups.filter((g) => groupStatus(g).tone !== "pending");
  const successful = resolved.filter((g) => groupStatus(g).tone === "success");
  const successRate = resolved.length
    ? `${Math.round((successful.length / resolved.length) * 100)}%`
    : "—";

  const stats = [
    { label: "STK requests", value: String(stk), icon: SmartphoneIcon },
    { label: "C2B requests", value: String(c2b), icon: ArrowLeftRightIcon },
    { label: "Success rate", value: successRate, icon: CheckCircle2Icon },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 rounded-lg border border-border bg-surface-1 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={cn(
              "flex items-center gap-3 px-5 py-4",
              i > 0 && "border-t border-border sm:border-t-0 sm:border-l",
            )}>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2">
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="font-mono text-[19px] font-medium leading-tight text-foreground">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>
      {entries.length > 0 && (
        <p className="mt-1.5 text-[10.5px] text-muted-foreground">
          Based on the last {entries.length} requests
        </p>
      )}
    </div>
  );
}
