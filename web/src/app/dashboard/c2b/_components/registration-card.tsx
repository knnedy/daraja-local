"use client";

import { CheckCircle2Icon, CircleDashedIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { C2BRegistration } from "@/lib/types/c2b";

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
  registration: C2BRegistration | null;
}) {
  const registered = registration?.registered ?? false;
  const validationOn = Boolean(registration?.validationUrl);
  const fallbackWord =
    registration?.responseType === "Cancelled" ? "rejected" : "accepted";

  return (
    <div className="flex flex-col gap-4 panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium text-foreground">
            Registered URLs
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Set by your last registerurl call
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

      {registration && registered ? (
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

          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">
              Registered via{" "}
              <span className="font-mono text-foreground">
                {registration.apiVersion}
              </span>
            </span>
            <span className="text-muted-foreground">
              MSISDN arrives{" "}
              {registration.apiVersion === "v1" ? "SHA-256 hashed" : "masked"}
            </span>
          </div>

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
                ? `Every payment calls your ValidationURL first. If it can't answer, the payment is ${fallbackWord} (ResponseType: ${registration.responseType}).`
                : "No ValidationURL registered, so payments go straight to confirmation."}
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
