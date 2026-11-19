import { pageIcons } from "@/lib/page-icons";

/** The title block at the top of every dashboard page. */
export function PageHeader({
  page,
  title,
  description,
  actions,
}: {
  page: keyof typeof pageIcons;
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const Icon = pageIcons[page];
  return (
    <header className="flex items-start gap-3.5">
      <span
        aria-hidden
        className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-green-mid/60 bg-green-light text-green shadow-[inset_0_1px_0_oklch(1_0_0/0.4)] dark:shadow-none">
        <Icon className="size-[18px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="font-heading text-[22px] leading-tight font-semibold tracking-tight text-balance text-foreground">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}
