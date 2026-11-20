"use client";

import { useState, useId } from "react";
import { CheckIcon, CopyIcon, InfoIcon } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

/** A Daraja endpoint as a copyable row: method badge and full URL. */
export function Endpoint({ method = "POST", url }: { method?: string; url: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="flex h-10 items-center gap-2.5 rounded-lg border border-border bg-surface-2/70 pr-1 pl-1.5">
      <span className="rounded-md bg-green-light px-1.5 py-0.5 font-mono text-[11px] font-semibold text-green ring-1 ring-green-mid/70">
        {method}
      </span>
      <span translate="no" className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground">
        {url}
      </span>
      <button
        type="button"
        onClick={() => void copy(url)}
        aria-label={copied ? "Copied" : "Copy URL"}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground">
        {copied ? <CheckIcon className="size-3.5 text-green" /> : <CopyIcon className="size-3.5" />}
      </button>
    </div>
  );
}

/** A caveat worth knowing before shipping, set off with an amber marker. */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
      <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-amber" />
      <span>{children}</span>
    </p>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-muted-foreground">{children}</p>;
}

/** Inline code inside prose. */
export function C({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[12px] text-foreground">{children}</span>;
}

/** The "Integrate" card: one tab per step of the integration. */
export function IntegrateCard<T extends string>({
  title = "Integrate",
  description,
  tabs,
  render,
}: {
  title?: string;
  description: string;
  tabs: readonly { id: T; label: string }[];
  render: (tab: T) => React.ReactNode;
}) {
  const [tab, setTab] = useState<T>(tabs[0].id);
  const titleId = useId();
  return (
    <section className="panel overflow-hidden" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 pt-4">
        <div className="pb-3.5">
          <h2 id={titleId} className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        </div>
        <div role="tablist" aria-label="Integration step" className="-mb-px flex gap-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative pb-3 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground",
                tab === t.id &&
                  "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:bg-green-2",
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4 p-5" role="tabpanel">
        {render(tab)}
      </div>
    </section>
  );
}
