import { ProjectMark } from "@/components/project-mark";

const KEYS = ["Shortcode", "Consumer key", "Consumer secret", "Passkey", "Initiator and certificate"];

const CALLBACKS = [
  ["STK Push", "/stk/callback"],
  ["C2B validation", "/c2b/validation"],
  ["C2B confirmation", "/c2b/confirmation"],
  ["B2C", "/b2c/result"],
  ["B2B", "/b2b/result"],
  ["Status, reversal", "/transactions/result"],
];

/** A live preview of the project being created: its mark, its keys, and where callbacks go. */
export function CredentialPreview({ name, base }: { name: string; base: string }) {
  const url = /^https?:\/\/\S+$/.test(base) ? base.replace(/\/+$/, "") : "";

  return (
    <aside
      className="flex flex-col gap-6 border-t border-border bg-surface-2/50 p-6 sm:p-8 lg:border-t-0 lg:border-l"
      aria-label="What you'll get">
      <div className="flex items-center gap-3">
        <ProjectMark name={name || "New project"} className="size-11 rounded-xl text-[14px]" />
        <div className="min-w-0">
          <p className={name ? "truncate text-[15px] font-semibold text-foreground" : "text-[15px] font-semibold text-muted-foreground"}>
            {name || "Your project"}
          </p>
          <p className="font-mono text-[12px] text-muted-foreground">Shortcode generated on create</p>
        </div>
      </div>

      <div>
        <p className="text-[12px] font-medium text-muted-foreground">Generated for you</p>
        <ul className="mt-2 overflow-hidden rounded-xl bg-surface-1 ring-1 ring-border">
          {KEYS.map((k) => (
            <li key={k} className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2 text-[12.5px] last:border-0">
              <span className="text-foreground">{k}</span>
              <span aria-hidden className="font-mono text-[12px] tracking-[0.15em] text-muted-foreground/70">
                ••••••••
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[12px] font-medium text-muted-foreground">Test callbacks go to</p>
        <p className={url ? "mt-2 truncate font-mono text-[12.5px] text-foreground" : "mt-2 font-mono text-[12.5px] text-muted-foreground/60"}>
          {url || "your-base-url"}
        </p>
        <ul className="mt-1.5 flex flex-col gap-1 border-l border-border-strong pl-3">
          {CALLBACKS.map(([label, path]) => (
            <li key={path} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="font-mono text-green">{path}</span>
              <span className="text-muted-foreground">{label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-pretty text-muted-foreground">
          Your own app sends its own CallBackURL or ResultURL with each request; these are only the dashboard&apos;s
          defaults.
        </p>
      </div>
    </aside>
  );
}
