"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { useActiveProjectStore } from "@/store/active-project";
import { useProjectSettings } from "@/hooks/use-settings";
import { useUpdateSettings } from "@/hooks/use-settings";
import { updateSettingsSchema } from "@/lib/schemas/settings";
import type { ProjectSettings } from "@/lib/types/settings";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/form";

export default function SimulationDefaultsCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: settings } = useProjectSettings(slug);
  const updateSettings = useUpdateSettings(slug);

  const [stkTimeout, setStkTimeout] = useState(20);
  const [phoneNumber, setPhoneNumber] = useState("");

  const [syncedSettings, setSyncedSettings] = useState<ProjectSettings | null>(
    null,
  );
  if (settings && settings !== syncedSettings) {
    setSyncedSettings(settings);
    setStkTimeout(settings.stkTimeoutSeconds);
    setPhoneNumber(settings.defaultPhoneNumber);
  }

  const phoneCheck = updateSettingsSchema.shape.defaultPhoneNumber.safeParse(
    phoneNumber.trim(),
  );
  const timeoutValid = stkTimeout >= 5 && stkTimeout <= 60;

  const isDirty =
    settings !== undefined &&
    (stkTimeout !== settings.stkTimeoutSeconds ||
      phoneNumber.trim() !== settings.defaultPhoneNumber);

  const canSave =
    isDirty && timeoutValid && phoneCheck.success && !updateSettings.isPending;

  function handleSave() {
    if (!settings || !canSave) return;
    updateSettings.mutate({
      stkTimeoutSeconds: stkTimeout,
      defaultPhoneNumber: phoneNumber.trim(),
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="flex flex-col gap-4 rounded-xl border border-border-strong bg-surface-1 p-4 shadow-sm">
      <span className="text-[13px] font-medium text-foreground">
        Simulation defaults
      </span>

      <Field
        label="STK Push timeout (seconds)"
        error={timeoutValid ? null : "Must be between 5 and 60"}
        hint="How long the Virtual Phone waits before sending ResultCode 1037. Shorter is faster to test with.">
        <TextInput
          name="stkTimeoutSeconds"
          type="number"
          inputMode="numeric"
          min={5}
          max={60}
          value={stkTimeout}
          disabled={!settings}
          onChange={(e) => setStkTimeout(Number(e.target.value))}
          className="w-24"
        />
      </Field>

      <Field
        label="Default phone number"
        error={
          phoneNumber.trim().length > 0 && !phoneCheck.success
            ? "Use the format 254XXXXXXXXX"
            : null
        }
        hint="Pre-fills the phone on the C2B and B2C test forms.">
        <TextInput
          name="defaultPhoneNumber"
          type="tel"
          inputMode="numeric"
          value={phoneNumber}
          disabled={!settings}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="254708374149…"
          className="w-44"
        />
      </Field>

      <div className="flex items-center gap-3" aria-live="polite">
        <Button type="submit" disabled={!canSave}>
          {updateSettings.isPending ? (
            "Saving…"
          ) : updateSettings.isSuccess && !isDirty ? (
            <>
              <CheckIcon className="size-3.5" />
              Saved
            </>
          ) : (
            "Save defaults"
          )}
        </Button>
        {updateSettings.isError && (
          <span className="text-xs text-destructive">
            Couldn&apos;t save. Check that Daraja Local is running, then try
            again.
          </span>
        )}
      </div>
    </form>
  );
}
