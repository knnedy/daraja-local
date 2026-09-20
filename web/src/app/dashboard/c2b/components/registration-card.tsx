"use client";

import { CheckCircle2Icon, CircleDashedIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Registration } from "../lib/sessions";

function UrlRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "truncate rounded-md border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[11.5px]",
          muted ? "text-muted-foreground/60" : "text-foreground",
        )}
        title={value || undefined}>
        {value || "not set"}
      </span>
    </div>
  );
}

export default function RegistrationCard({
  registration,
}: {
  registration: Registration | null;
}) {
  const registered = registration !== null;
  const validationOn = registration?.responseType === "Cancelled";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium text-foreground">
            Registered URLs
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Live from your last registerurl call
          </p>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10.5px] font-medium",
            registered
              ? "border-green/30 bg-green/10 text-green"
              : "border-border text-muted-foreground",
          )}>
          {registered ? (
            <CheckCircle2Icon className="size-3" />
          ) : (
            <CircleDashedIcon className="size-3" />
          )}
          {registered ? "Registered" : "Not registered"}
        </span>
      </div>

      {registered ? (
        <>
          <UrlRow
            label="Confirmation URL"
            value={registration.confirmationUrl}
          />
          <UrlRow
            label="Validation URL"
            value={registration.validationUrl}
            muted={!validationOn}
          />

          <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12.5px] font-medium text-foreground">
                External validation
              </p>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[10.5px]",
                  validationOn
                    ? "bg-blue-bg text-blue"
                    : "bg-surface-1 text-muted-foreground",
                )}>
                {validationOn ? "on" : "off"}
              </span>
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
              {validationOn
                ? "ResponseType is Cancelled — every payment calls your ValidationURL first and waits for its ResultCode."
                : "ResponseType is Completed — validation is skipped entirely and payments go straight to confirmation."}
            </p>
          </div>
        </>
      ) : (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11.5px] leading-relaxed text-muted-foreground">
          Call registerurl with your ConfirmationURL to get started.
          <br />
          Whatever you register appears here.
        </p>
      )}
    </div>
  );
}
