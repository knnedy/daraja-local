/** A settings section: a title and blurb, the controls, and an optional footer bar. */
export function Section({
  title,
  description,
  footer,
  tone = "default",
  children,
  onSubmit,
}: {
  title: string;
  description: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "default" | "danger";
  children: React.ReactNode;
  onSubmit?: () => void;
}) {
  const body = (
    <>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <h2 className={tone === "danger" ? "text-[15px] font-semibold text-red" : "text-[15px] font-semibold tracking-[-0.01em] text-foreground"}>
            {title}
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-pretty text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
      {footer && (
        <div
          className={
            tone === "danger"
              ? "flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-red-border/60 bg-red-bg/50 px-5 py-3 sm:px-6 dark:bg-red/5"
              : "flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-2/50 px-5 py-3 sm:px-6"
          }
          aria-live="polite">
          {footer}
        </div>
      )}
    </>
  );

  const cls = tone === "danger" ? "panel overflow-hidden ring-1 ring-red-border/60" : "panel overflow-hidden";
  return onSubmit ? (
    <form
      className={cls}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}>
      {body}
    </form>
  ) : (
    <section className={cls}>{body}</section>
  );
}

/** A read-only value laid out like a field. */
export function ReadOnly({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <div
        className={
          mono
            ? "flex h-9 min-w-0 items-center gap-2 rounded-lg bg-surface-2 px-3 font-mono text-[12.5px] text-foreground ring-1 ring-border"
            : "flex h-9 min-w-0 items-center gap-2 rounded-lg bg-surface-2 px-3 text-[13px] text-foreground ring-1 ring-border"
        }>
        {children}
      </div>
    </div>
  );
}
