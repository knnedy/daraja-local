"use client";

import { useState } from "react";
import { useProjectSettings, useUpdateSettings } from "@/hooks/use-settings";
import { updateSettingsSchema } from "@/lib/schemas/settings";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/form";
import { formatPhone } from "@/components/phone";
import { Section } from "./section";
import { Skeleton } from "@/components/ui/skeleton";

/** How the simulated phone behaves, and what the test forms pre-fill. */
export default function SimulationDefaultsCard({ slug }: { slug: string }) {
  const { data: settings } = useProjectSettings(slug);
  const update = useUpdateSettings(slug);
  const [timeoutDraft, setTimeoutDraft] = useState<number | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);

  const timeout = timeoutDraft ?? settings?.stkTimeoutSeconds ?? 20;
  const phone = (phoneDraft ?? settings?.defaultPhoneNumber ?? "").trim();
  const phoneOk = updateSettingsSchema.shape.defaultPhoneNumber.safeParse(phone).success;
  const dirty = !!settings && (timeout !== settings.stkTimeoutSeconds || phone !== settings.defaultPhoneNumber);

  return (
    <Section
      title="Simulation"
      description="How the virtual phone behaves, and what the test forms fill in for you."
      onSubmit={() =>
        dirty &&
        phoneOk &&
        update.mutate(
          { stkTimeoutSeconds: timeout, defaultPhoneNumber: phone },
          {
            onSuccess: () => {
              setTimeoutDraft(null);
              setPhoneDraft(null);
            },
          },
        )
      }
      footer={
        <>
          <p className="text-[12.5px] text-muted-foreground">
            {update.isError ? (
              <span className="text-red">Couldn&apos;t save. Is Daraja Local still running?</span>
            ) : update.isSuccess && !dirty ? (
              <span className="text-green">Saved.</span>
            ) : (
                "Applies to the next request."
            )}
          </p>
          <Button type="submit" disabled={!dirty || !phoneOk || update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="stk-timeout" className="text-[12px] font-medium text-muted-foreground">
            STK Push timeout
          </label>
          {settings ? (
            <span className="font-mono text-[13px] text-foreground tabular-nums">{timeout} s</span>
          ) : (
            <Skeleton className="h-3.5 w-10" />
          )}
        </div>
        {!settings ? (
          <Skeleton className="my-[3px] h-2 rounded-full" />
        ) : (
          <input
            id="stk-timeout"
            type="range"
            min={5}
            max={60}
            step={1}
            value={timeout}
            disabled={!settings}
            onChange={(e) => setTimeoutDraft(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-(--green-2)"
          />
        )}
        <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>5 s</span>
          <span>60 s</span>
        </div>
        <p className="text-[12px] text-muted-foreground">
          How long the virtual phone waits for a PIN before the callback reports ResultCode 1037. Short is quicker to
          test with.
        </p>
      </div>

      <Field
        label="Default phone number"
        error={phone && !phoneOk ? "Use the format 254XXXXXXXXX" : null}
        hint={phoneOk ? `Pre-fills the test forms · shows as ${formatPhone(phone)}` : "Pre-fills the C2B and B2C test forms."}>
        {!settings ? (
          <Skeleton className="h-9 rounded-lg sm:w-56" />
        ) : (
          <TextInput
            name="defaultPhoneNumber"
            type="tel"
            inputMode="numeric"
            value={phone}
            disabled={!settings}
            onChange={(e) => setPhoneDraft(e.target.value)}
            placeholder="254708374149"
            className="sm:w-56"
          />
        )}
      </Field>
    </Section>
  );
}
