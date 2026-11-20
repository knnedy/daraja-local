import { useId } from "react";
import { cn } from "@/lib/utils";

/** The Daraja Local mark: a D whose counter is an arch ("daraja" is bridge), on an M-PESA green tile. */
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
      <path fill="white" fillRule="evenodd" d="M8.5 7h6.5a9 9 0 0 1 0 18H8.5Z M12.25 21.75v-4a3.75 3.75 0 0 1 7.5 0v4Z" />
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
