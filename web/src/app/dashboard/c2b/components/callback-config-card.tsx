"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function CallbackConfigCard({
  externalValidation,
  onToggleValidation,
}: {
  externalValidation: boolean;
  onToggleValidation: (value: boolean) => void;
}) {
  const [confirmationUrl, setConfirmationUrl] = useState(
    "https://your-app.com/api/mpesa/c2b/confirmation",
  );
  const [validationUrl, setValidationUrl] = useState(
    "https://your-app.com/api/mpesa/c2b/validation",
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <span className="text-[13px] font-medium text-foreground">
        Your callback URLs
      </span>
      <p className="text-[11px] text-muted-foreground">
        Where Daraja Local will POST once wired to a real call. Use your local
        ngrok URL — Safaricom (and later, this tool) can&apos;t reach localhost
        directly.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Confirmation URL
        </Label>
        <input
          value={confirmationUrl}
          onChange={(e) => setConfirmationUrl(e.target.value)}
          className="rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] text-foreground outline-none focus:border-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Validation URL
        </Label>
        <input
          value={validationUrl}
          onChange={(e) => setValidationUrl(e.target.value)}
          disabled={!externalValidation}
          className="rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] text-foreground outline-none focus:border-ring disabled:opacity-40"
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2.5">
        <Label htmlFor="external-validation" className="cursor-pointer">
          <p className="text-[12.5px] font-medium text-foreground">
            External validation
          </p>
          <p className="text-[10.5px] font-normal text-muted-foreground">
            Disabled by default on real Daraja shortcodes
          </p>
        </Label>
        <Switch
          id="external-validation"
          checked={externalValidation}
          onCheckedChange={onToggleValidation}
        />
      </div>
    </div>
  );
}
