import {
  ArrowLeftRightIcon,
  CheckCircle2Icon,
  SmartphoneIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const stats = [
  {
    label: "STK requests today",
    value: "0",
    icon: SmartphoneIcon,
  },
  {
    label: "C2B requests today",
    value: "0",
    icon: ArrowLeftRightIcon,
  },
  {
    label: "Success rate",
    value: "—",
    icon: CheckCircle2Icon,
  },
];

export default function StatsCard() {
  return (
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
  );
}
