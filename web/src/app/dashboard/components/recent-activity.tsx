import Link from "next/link";
import { ScrollTextIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RecentActivity({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-1 px-6 py-10 text-center",
        className,
      )}>
      <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-2">
        <ScrollTextIcon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-foreground">
          No requests yet
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Requests to this project&apos;s endpoints will show up here as they
          come in.
        </p>
      </div>
      <Link
        href="/dashboard/stk"
        className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-green hover:underline">
        <PlayIcon className="size-3" />
        Send a test STK Push
      </Link>
    </div>
  );
}
