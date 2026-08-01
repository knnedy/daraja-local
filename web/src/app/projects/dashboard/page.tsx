import {
  ActivityIcon,
  AntennaIcon,
  BoltIcon,
  CheckIcon,
  PlayIcon,
} from "lucide-react";

const stats = [
  {
    label: "Requests today",
    value: "0",
    icon: ActivityIcon,
    bg: "bg-blue-bg",
    fg: "text-blue",
    border: "border-blue-border",
  },
  {
    label: "Success rate",
    value: "—",
    icon: CheckIcon,
    bg: "bg-green-light",
    fg: "text-green",
    border: "border-green-mid",
  },
  {
    label: "Active sessions",
    value: "0",
    icon: BoltIcon,
    bg: "bg-amber-bg",
    fg: "text-amber",
    border: "border-amber-border",
  },
];

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
            Overview
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Live stats and recent activity for this project.
          </p>
        </div>
        <button className="flex h-8.5 items-center gap-1.5 rounded-md bg-green px-3.5 text-[13px] font-medium text-white">
          <PlayIcon className="size-3.75" />
          Trigger STK Push
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-3 rounded-md border border-border bg-surface-1 p-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex size-7 items-center justify-center rounded-[7px] border ${stat.border} ${stat.bg}`}>
                <stat.icon className={`size-3.5 ${stat.fg}`} />
              </div>
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <span className="text-[26px] font-medium text-foreground">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[13px] font-medium text-foreground">
            Recent activity
          </span>
          <span className="flex items-center gap-1 text-xs text-green">
            View all
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-border bg-surface-1 py-11">
          <div className="mb-0.5 flex size-10 items-center justify-center rounded-[10px] bg-surface-2">
            <AntennaIcon className="size-4.75 text-muted-foreground" />
          </div>
          <span className="text-[13px] text-foreground">No requests yet</span>
          <span className="text-xs text-muted-foreground">
            Trigger an STK Push to see live activity here.
          </span>
        </div>
      </div>
    </div>
  );
}
