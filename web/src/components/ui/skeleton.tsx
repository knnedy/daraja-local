import { cn } from "@/lib/utils";

/** A placeholder bar for content that is still loading. */
function Skeleton({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="skeleton"
      className={cn("block animate-pulse rounded-md bg-foreground/[0.07] motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
