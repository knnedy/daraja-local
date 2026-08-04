"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SimulationDefaultsCard() {
  const [stkTimeout, setStkTimeout] = useState(20);
  const [externalValidation, setExternalValidation] = useState(false);
  const [responseType, setResponseType] = useState<"Completed" | "Cancelled">(
    "Completed",
  );

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
          onChange={(e) => setStkTimeout(Number(e.target.value))}
          className="w-24 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[13px] text-foreground outline-none focus:border-ring"
        />
        <p className="text-[10.5px] text-muted-foreground">
          Real M-Pesa uses ~60s. Shorter is faster to test with.
        </p>
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
              onClick={() => setResponseType(option)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
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
          onCheckedChange={setExternalValidation}
        />
      </div>
    </div>
  );
}
