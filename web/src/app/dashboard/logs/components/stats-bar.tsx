import type { LogGroup } from "@/lib/request-log/group";
import { groupStatus } from "@/lib/request-log/status";

export default function StatsBar({ groups }: { groups: LogGroup[] }) {
  const stats = [
    { label: "Loaded", value: groups.length },
    { label: "STK", value: groups.filter((g) => g.kind === "stk_push").length },
    { label: "C2B", value: groups.filter((g) => g.kind === "c2b").length },
    {
      label: "Errors",
      value: groups.filter((g) => groupStatus(g).tone === "error").length,
      isError: true,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-border-strong bg-surface-1 px-3.5 py-2.5">
          <p
            className={`font-heading text-[19px] font-medium ${
              s.isError && s.value > 0 ? "text-destructive" : "text-foreground"
            }`}>
            {s.value}
          </p>
          <p className="text-[10.5px] text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
