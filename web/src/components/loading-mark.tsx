import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

/** A neutral "starting up" state for when we can't yet know which layout to show. */
export function LoadingMark({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <LogoMark className="size-10 animate-[pulse_1.6s_ease-in-out_infinite] motion-reduce:animate-none" />
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
    </div>
  );
}
