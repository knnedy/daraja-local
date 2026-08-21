"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useActiveProjectStore } from "@/store/active-project";
import { useProjectSettings } from "@/hooks/use-settings";
import { useUpdateSettings } from "@/hooks/use-update-settings";
import { updateSettingsSchema } from "@/lib/schemas/settings";
import type { ProjectSettings } from "@/lib/types/settings";

export default function SimulationDefaultsCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: settings } = useProjectSettings(slug);
  const updateSettings = useUpdateSettings(slug);

  const [stkTimeout, setStkTimeout] = useState(20);
  const [externalValidation, setExternalValidation] = useState(false);
  const [responseType, setResponseType] = useState<"Completed" | "Cancelled">(
    "Completed",
  );
  const [phoneNumber, setPhoneNumber] = useState("");

  const [syncedSettings, setSyncedSettings] = useState<ProjectSettings | null>(
    null,
  );
  if (settings && settings !== syncedSettings) {
    setSyncedSettings(settings);
    setStkTimeout(settings.stkTimeoutSeconds);
    setExternalValidation(settings.externalValidationDefault);
    setResponseType(settings.c2bResponseType);
    setPhoneNumber(settings.defaultPhoneNumber);
  }

  const phoneCheck = updateSettingsSchema.shape.defaultPhoneNumber.safeParse(
    phoneNumber.trim(),
  );
  const timeoutValid = stkTimeout >= 5 && stkTimeout <= 60;

  const isDirty =
    settings !== undefined &&
    (stkTimeout !== settings.stkTimeoutSeconds ||
      externalValidation !== settings.externalValidationDefault ||
      responseType !== settings.c2bResponseType ||
      phoneNumber.trim() !== settings.defaultPhoneNumber);

  const canSave =
    isDirty && timeoutValid && phoneCheck.success && !updateSettings.isPending;

  function handleSave() {
    if (!settings || !canSave) return;
    updateSettings.mutate({
      callbackUrl: settings.callbackUrl,
      stkTimeoutSeconds: stkTimeout,
      c2bResponseType: responseType,
      externalValidationDefault: externalValidation,
      defaultPhoneNumber: phoneNumber.trim(),
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <span className="text-[13px] font-medium text-foreground">
        Simulation defaults
      </span>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          STK Push timeout (seconds)
        </label>
        <input
          type="number"
          min={5}
          max={60}
          value={stkTimeout}
          disabled={!settings}
          onChange={(e) => setStkTimeout(Number(e.target.value))}
          className="w-24 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[13px] text-foreground outline-none focus:border-ring disabled:opacity-60"
        />
        <p className="text-[10.5px] text-muted-foreground">
          Real M-Pesa uses ~60s. Shorter is faster to test with.
        </p>
        {!timeoutValid && (
          <p className="text-xs text-destructive">Must be between 5 and 60</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Default phone number
        </label>
        <input
          value={phoneNumber}
          disabled={!settings}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="254708374149"
          className="w-40 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[13px] text-foreground outline-none focus:border-ring disabled:opacity-60"
        />
        <p className="text-[10.5px] text-muted-foreground">
          Pre-fills the STK virtual phone. Change it to simulate a wrong or
          unreachable number.
        </p>
        {phoneNumber.trim().length > 0 && !phoneCheck.success && (
          <p className="text-xs text-destructive">
            Enter a valid number in the format 254XXXXXXXXX
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          C2B response type
        </label>
        <div className="flex gap-2">
          {(["Completed", "Cancelled"] as const).map((option) => (
            <button
              key={option}
              type="button"
              disabled={!settings}
              onClick={() => setResponseType(option)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                responseType === option
                  ? "border-green bg-green-light text-green"
                  : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}>
              {option}
            </button>
          ))}
        </div>
        <p className="text-[10.5px] text-muted-foreground">
          What happens if your ValidationURL is unreachable — accept anyway, or
          cancel the transaction.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2.5">
        <Label htmlFor="default-external-validation" className="cursor-pointer">
          <p className="text-[12.5px] font-medium text-foreground">
            External validation by default
          </p>
          <p className="text-[10.5px] font-normal text-muted-foreground">
            New C2B sessions start with this on or off
          </p>
        </Label>
        <Switch
          id="default-external-validation"
          checked={externalValidation}
          disabled={!settings}
          onCheckedChange={setExternalValidation}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex items-center justify-center gap-1.5 self-start rounded-lg bg-green px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green/90 disabled:cursor-not-allowed disabled:opacity-50">
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
        </button>
        {updateSettings.isError && (
          <span className="text-xs text-destructive">
            Failed to save — try again.
          </span>
        )}
      </div>
    </div>
  );
}
