import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "pending" | "success" | "error" | "skipped";

export function StepNode({
  index,
  label,
  detail,
  status,
}: {
  index: number;
  label: string;
  detail: string;
  status: StepStatus;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[11px] transition-colors",
          status === "pending" &&
            "border-border-strong bg-surface-2 text-muted-foreground",
          status === "success" && "border-green bg-green-light text-green",
          status === "error" &&
            "border-destructive bg-destructive/15 text-destructive",
          status === "skipped" &&
            "border-dashed border-border bg-surface-2 text-muted-foreground/50",
        )}
      >
        {status === "success" && <CheckIcon className="size-4" />}
        {status === "error" && <XIcon className="size-4" />}
        {status === "skipped" && <MinusIcon className="size-3.5" />}
        {status === "pending" && index}
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-foreground">{label}</p>
        <p className="truncate text-[10.5px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function Connector({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "ml-4 h-6 w-px shrink-0 sm:mx-2 sm:mt-4 sm:h-px sm:w-auto sm:flex-1",
        active ? "bg-green/50" : "bg-border",
      )}
    />
  );
}

export function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] text-foreground">
      <span className="text-muted-foreground">{label} </span>
      {value}
    </span>
  );
}

export function Pager({
  index,
  total,
  onMove,
  noun,
}: {
  index: number;
  total: number;
  onMove: (index: number) => void;
  noun: string;
}) {
  const button =
    "flex size-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`Newer ${noun}`}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        className={button}
      >
        <ChevronLeftIcon className="size-3.5" />
      </button>
      <span className="min-w-14 text-center font-mono text-[10.5px] text-muted-foreground">
        {index + 1} of {total}
      </span>
      <button
        type="button"
        aria-label={`Older ${noun}`}
        disabled={index === total - 1}
        onClick={() => onMove(index + 1)}
        className={button}
      >
        <ChevronRightIcon className="size-3.5" />
      </button>
    </div>
  );
}
