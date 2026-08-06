import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  description: string;
  href?: string;
};

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
  },
  {
    method: "POST",
    path: "/mpesa/stkpushquery/v1/query",
    description: "STK Push query",
    href: "/dashboard/stk",
  },
  {
    method: "POST",
    path: "/mpesa/c2b/v1/registerurl",
    description: "C2B URL registration",
    href: "/dashboard/c2b",
  },
  {
    method: "POST",
    path: "/mpesa/c2b/v2/simulate",
    description: "C2B payment simulation",
    href: "/dashboard/c2b",
  },
];

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

export default function EndpointsCard() {
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
