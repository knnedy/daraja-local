import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RequestLogEntry } from "@/lib/types/request-log";

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  description: string;
  href?: string;
  count?: number;
};

function hasKey(payload: string, key: string): boolean {
  try {
    return key in (JSON.parse(payload) as Record<string, unknown>);
  } catch {
    return false;
  }
}

function countHits(entries: RequestLogEntry[]) {
  let stk = 0;
  let register = 0;
  let simulate = 0;

  for (const e of entries) {
    if (e.direction !== "inbound") continue;
    if (e.kind === "stk_push") stk++;
    else if (hasKey(e.payload, "ConfirmationURL")) register++;
    else if (hasKey(e.payload, "CommandID")) simulate++;
  }

  return { stk, register, simulate };
}

function MethodBadge({ method }: { method: Endpoint["method"] }) {
  return (
    <span
      className={cn(
        "w-11 shrink-0 rounded border px-1.5 py-0.5 text-center font-mono text-[10px] font-medium",
        method === "GET"
          ? "border-blue-border bg-blue-bg text-blue"
          : "border-border-strong bg-surface-2 text-muted-foreground",
      )}>
      {method}
    </span>
  );
}

export default function EndpointsCard({
  entries,
}: {
  entries: RequestLogEntry[];
}) {
  const hits = countHits(entries);

  const endpoints: Endpoint[] = [
    {
      method: "GET",
      path: "/oauth/v1/generate",
      description: "Access token generation",
    },
    {
      method: "POST",
      path: "/mpesa/stkpush/v1/processrequest",
      description: "STK Push (Lipa na M-Pesa Online)",
      href: "/dashboard/stk",
      count: hits.stk,
    },
    {
      method: "POST",
      path: "/mpesa/c2b/v2/registerurl",
      description: "C2B URL registration",
      href: "/dashboard/c2b",
      count: hits.register,
    },
    {
      method: "POST",
      path: "/mpesa/c2b/v2/simulate",
      description: "C2B payment simulation",
      href: "/dashboard/c2b",
      count: hits.simulate,
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-surface-1">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-[13px] font-medium text-foreground">
          Mocked endpoints
        </span>
        <span className="text-xs text-muted-foreground">
          {endpoints.length} endpoints
        </span>
      </div>
      <div>
        {endpoints.map((endpoint) => {
          const row = (
            <div className="group flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0">
              <MethodBadge method={endpoint.method} />
              <span className="min-w-0 truncate font-mono text-[12px] text-foreground">
                {endpoint.path}
              </span>
              <span className="ml-auto shrink-0 truncate pl-3 text-right text-xs text-muted-foreground">
                {endpoint.description}
              </span>
              {typeof endpoint.count === "number" && (
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[10.5px]",
                    endpoint.count > 0
                      ? "bg-green/10 text-green"
                      : "bg-surface-2 text-muted-foreground",
                  )}>
                  {endpoint.count}
                </span>
              )}
              {endpoint.href && (
                <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </div>
          );

          return endpoint.href ? (
            <Link
              key={endpoint.path}
              href={endpoint.href}
              className="block hover:bg-surface-2/60">
              {row}
            </Link>
          ) : (
            <div key={endpoint.path}>{row}</div>
          );
        })}
      </div>
    </div>
  );
}
