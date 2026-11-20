import { useId } from "react";
import { cn } from "@/lib/utils";

/** The Daraja Local mark: a "d" built from a disc and a stem, on an M-PESA green tile. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const gid = `dl-tile-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14a05a" />
          <stop offset="1" stopColor="#0b7a43" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gid})`} />
      <circle cx="12.75" cy="19" r="6.25" fill="white" />
      <rect x="20.25" y="6" width="4.75" height="19.25" rx="2.375" fill="white" />
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
