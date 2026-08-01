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
  },
  {
    label: "Success rate",
    value: "—",
    icon: CheckIcon,
    bg: "bg-green-light",
    fg: "text-green",
  },
  {
    label: "Active sessions",
    value: "0",
    icon: BoltIcon,
    bg: "bg-amber-bg",
    fg: "text-amber",
  },
];

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
            Overview
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Live stats and recent activity for this project.
          </p>
        </div>
        <button className="flex h-[34px] items-center gap-1.5 rounded-md bg-green px-3.5 text-[13px] font-medium text-white">
          <PlayIcon className="size-[15px]" />
          Trigger STK Push
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-2.5 rounded-md bg-surface-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
              <div
                className={`flex size-6 items-center justify-center rounded-md ${stat.bg}`}>
                <stat.icon className={`size-[13px] ${stat.fg}`} />
              </div>
            </div>
            <span className="text-2xl font-medium text-foreground">
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
          <span className="text-xs text-green">View all</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-md bg-surface-2 py-11">
          <AntennaIcon className="size-6 text-muted-foreground" />
          <span className="text-[13px] text-foreground">No requests yet</span>
          <span className="text-xs text-muted-foreground">
            Trigger an STK Push to see live activity here.
          </span>
        </div>
      </div>
    </div>
  );
}
