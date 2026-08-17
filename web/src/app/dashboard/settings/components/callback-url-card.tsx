"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { useActiveProjectStore } from "@/store/active-project";
import { useProjectSettings } from "@/hooks/use-project-settings";
import { useUpdateSettings } from "@/hooks/use-update-settings";
import { updateSettingsSchema } from "@/lib/schemas/settings";

export default function CallbackUrlCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: settings } = useProjectSettings(slug);
  const updateSettings = useUpdateSettings(slug);

  const [url, setUrl] = useState("");
  const [lastSyncedUrl, setLastSyncedUrl] = useState<string | null>(null);

  if (settings && settings.callbackUrl !== lastSyncedUrl) {
    setLastSyncedUrl(settings.callbackUrl);
    setUrl(settings.callbackUrl);
  }

  const trimmed = url.trim();
  const urlCheck = updateSettingsSchema.shape.callbackUrl.safeParse(trimmed);
  const isDirty = settings !== undefined && trimmed !== settings.callbackUrl;
  const canSave = isDirty && urlCheck.success && !updateSettings.isPending;

  function handleSave() {
    if (!settings || !canSave) return;

    updateSettings.mutate({
      callbackUrl: trimmed,
      stkTimeoutSeconds: settings.stkTimeoutSeconds,
      c2bResponseType: settings.c2bResponseType,
      externalValidationDefault: settings.externalValidationDefault,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <span className="text-[13px] font-medium text-foreground">
        Callback URL
      </span>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Where STK Push and C2B callbacks get sent. Used across every page in
        this project — one value, not a separate copy per page.
      </p>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={!settings}
        placeholder="https://your-app.com/api/mpesa/callback"
        className="rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[12.5px] text-foreground outline-none focus:border-ring disabled:opacity-60"
      />
      {trimmed.length > 0 && !urlCheck.success && (
        <p className="text-xs text-destructive">
          Enter a valid URL, including http:// or https://
        </p>
      )}

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
            "Save callback URL"
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
