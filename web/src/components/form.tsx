"use client";

import { createContext, useContext, useId } from "react";
import { cn } from "@/lib/utils";

interface FieldIds {
  inputId: string;
  messageId: string;
  invalid: boolean;
  hasMessage: boolean;
}

const FieldContext = createContext<FieldIds | null>(null);

/**
 * A labelled form field. The error (or hint) renders under the control, and
 * the TextInput inside picks up its id, aria-invalid and aria-describedby.
 */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const message = error || hint;
  const ids: FieldIds = {
    inputId: `${id}-input`,
    messageId: `${id}-message`,
    invalid: !!error,
    hasMessage: !!message,
  };

  return (
    <FieldContext.Provider value={ids}>
      <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
        <label
          htmlFor={ids.inputId}
          className="text-[11.5px] font-medium text-muted-foreground">
          {label}
        </label>
        {children}
        {message && (
          <p
            id={ids.messageId}
            aria-live={error ? "polite" : undefined}
            className={cn(
              "text-[11px] leading-snug",
              error ? "text-destructive" : "text-muted-foreground",
            )}>
            {message}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/** A text input styled for the dashboard; monospace by default for codes and amounts. */
export function TextInput({
  className,
  mono = true,
  ...props
}: React.ComponentProps<"input"> & { mono?: boolean }) {
  const field = useContext(FieldContext);
  return (
    <input
      id={field?.inputId}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.hasMessage ? field.messageId : undefined}
      autoComplete="off"
      spellCheck={false}
      {...props}
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-surface-1 px-3 text-[13px] text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground/70 hover:border-border-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/15 dark:bg-surface-2",
        mono && "font-mono text-[12.5px] tabular-nums",
        className,
      )}
    />
  );
}

/** A compact single-choice toggle, e.g. PayBill / Buy Goods. Arrow keys move between options. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  function onKeyDown(e: React.KeyboardEvent) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + step + options.length) % options.length];
    onChange(next.value);
    const group = e.currentTarget as HTMLElement;
    requestAnimationFrame(() =>
      group
        .querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
        ?.focus(),
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5",
        className,
      )}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            data-value={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
              selected &&
                "bg-surface-1 text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--border)] dark:bg-secondary",
            )}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
