import { CheckCircle2Icon } from "lucide-react";
import { pageIcons } from "@/lib/page-icons";
import { groupEntries } from "@/lib/request-log/group";
import { groupStatus } from "@/lib/request-log/status";
import type { RequestLogEntry } from "@/lib/types/request-log";

export default function StatsCard({ entries }: { entries: RequestLogEntry[] }) {
  const groups = groupEntries(entries);
  const stk = groups.filter((g) => g.kind === "stk_push").length;
  const c2b = groups.filter((g) => g.kind === "c2b").length;
  const b2c = groups.filter((g) => g.kind === "b2c").length;
  const resolved = groups.filter((g) => groupStatus(g).tone !== "pending");
  const successful = resolved.filter((g) => groupStatus(g).tone === "success");
  const successRate = resolved.length
    ? `${Math.round((successful.length / resolved.length) * 100)}%`
    : "—";

  const stats = [
    { label: "STK requests", value: String(stk), icon: pageIcons.stk },
    { label: "C2B requests", value: String(c2b), icon: pageIcons.c2b },
    { label: "B2C payouts", value: String(b2c), icon: pageIcons.b2c },
    { label: "Success rate", value: successRate, icon: CheckCircle2Icon },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-(--panel-shadow) sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 bg-surface-1 px-5 py-4"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-green-mid/60 bg-green-light">
              <stat.icon className="size-4 text-green" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="font-mono text-[20px] leading-tight font-semibold tabular-nums text-foreground">
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
