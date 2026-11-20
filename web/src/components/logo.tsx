import { useId } from "react";
import { cn } from "@/lib/utils";

/** The Daraja Local mark: a suspension bridge ("daraja"), on an M-PESA green tile. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const gid = `dl-tile-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.6 0.16 152)" />
          <stop offset="1" stopColor="oklch(0.42 0.11 156)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8.5" fill={`url(#${gid})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="none" stroke="white" strokeOpacity="0.14" />
      <g stroke="white" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M12.5 13.4V20.5M16 15V20.5M19.5 13.4V20.5" strokeWidth="1.3" strokeOpacity="0.7" />
        <path d="M3.5 16.5L9.5 8Q16 22 22.5 8L28.5 16.5" strokeWidth="1.9" />
        <path d="M9.5 7V25M22.5 7V25" strokeWidth="2.7" />
        <path d="M3.5 20.5H28.5" strokeWidth="2.7" />
      </g>
    </svg>
  );
}

/** The mark with the "Daraja local" wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7" />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Daraja</span>
        <span className="font-mono text-[12.5px] font-medium text-green">local</span>
      </span>
    </span>
  );
}
