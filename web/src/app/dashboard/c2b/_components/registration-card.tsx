"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { C2BRegistration } from "@/lib/types/c2b";

function Url({ label, value, off }: { label: string; value: string; off?: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {value ? (
        <span className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-surface-2/70 pr-1 pl-3">
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground" title={value}>
            {value}
          </span>
          <button
            type="button"
            onClick={() => void copy(value)}
            aria-label={copied ? "Copied" : `Copy ${label}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground">
            {copied ? <CheckIcon className="size-3.5 text-green" /> : <CopyIcon className="size-3.5" />}
          </button>
        </span>
      ) : (
          <span className="flex h-9 items-center rounded-lg border border-dashed border-border px-3 text-[12.5px] text-muted-foreground">
            {off}
          </span>
      )}
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-[13px] text-foreground">{value}</span>
      <span className="text-[12px] leading-snug text-muted-foreground">{hint}</span>
    </div>
  );
}

/** What registerurl last stored for this shortcode, and what it means for each payment. */
export default function RegistrationCard({
  registration,
  loading,
}: {
  registration: C2BRegistration | null;
  loading?: boolean;
}) {
  const registered = registration?.registered ?? false;

  return (
    <section className="panel overflow-hidden" aria-labelledby="registration-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="registration-title" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Registration
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Where payments to this shortcode are sent, from your last registerurl call.
          </p>
        </div>
        {loading ? (
          <Skeleton className="h-[22px] w-24 rounded-full" />
        ) : (
          <span
            className={cn(
              "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium ring-1 ring-inset",
              registered ? "bg-green-light text-green ring-green-mid/60" : "bg-amber-bg text-amber ring-amber-border/60",
            )}>
            <span className={cn("size-1.5 rounded-full", registered ? "bg-green-2" : "bg-amber")} />
            {registered ? "Registered" : "Not registered"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 p-5 md:grid-cols-2" role="status" aria-label="Loading registration">
          {[0, 1].map((i) => (
            <span key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9" />
            </span>
          ))}
        </div>
      ) : registration && registered ? (
        <div className="flex flex-col gap-5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Url label="ConfirmationURL" value={registration.confirmationUrl} />
            <Url
              label="ValidationURL"
              value={registration.validationUrl}
              off="None, so payments skip validation"
            />
          </div>
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <Fact
              label="Validation"
              value={registration.validationUrl ? "On" : "Off"}
              hint={
                registration.validationUrl
                  ? "Your server is asked before each payment completes."
                  : "Every valid payment completes and is confirmed."
              }
            />
            <Fact
              label="ResponseType"
              value={registration.responseType}
              hint={`If your ValidationURL can't answer, the payment is ${
                registration.responseType === "Cancelled" ? "declined" : "accepted"
              }.`}
            />
            <Fact
              label="Registered via"
              value={registration.apiVersion}
              hint={`MSISDN reaches you ${registration.apiVersion === "v1" ? "as a SHA-256 hash" : "masked, e.g. 2547*****149"}.`}
            />
          </div>
        </div>
      ) : (
          <div className="flex flex-col gap-1 px-5 py-6">
            <p className="text-[14px] font-medium text-foreground">Nowhere to send payments yet</p>
            <p className="max-w-[60ch] text-[13px] leading-relaxed text-muted-foreground">
              Call registerurl once with your ConfirmationURL (see <span className="font-medium text-foreground">Integrate</span>{" "}
              below). Until then, payments to this shortcode are rejected.
            </p>
          </div>
      )}
    </section>
  );
}
