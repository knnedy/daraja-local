import type { pageIcons } from "@/lib/page-icons";

/** The title block at the top of every dashboard page. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  /** Kept for callers; the header no longer draws the page icon. */
  page?: keyof typeof pageIcons;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-4">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="mb-1.5 font-mono text-[11.5px] font-medium tracking-wide text-green">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] text-balance text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
