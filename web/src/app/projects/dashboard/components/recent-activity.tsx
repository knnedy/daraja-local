import Link from "next/link";
import { ScrollTextIcon, PlayIcon } from "lucide-react";

export function RecentActivity() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-1 px-6 py-10 text-center">
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
        href="/projects/dashboard/stk"
        className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-green hover:underline">
        <PlayIcon className="size-3" />
        Send a test STK Push
      </Link>
    </div>
  );
}
