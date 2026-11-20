import { cn } from "@/lib/utils";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "·";
}

/** A project's initials on a green tile. */
export function ProjectMark({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(140deg,oklch(0.68_0.18_150),oklch(0.48_0.14_160))] text-[11.5px] font-semibold tracking-wide text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.25),0_1px_2px_oklch(0_0_0/0.15)]",
        className,
      )}>
      {initials(name)}
    </span>
  );
}
