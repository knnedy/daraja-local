"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";

export default function CallbackUrlCard() {
  const [url, setUrl] = useState("https://your-app.com/api/mpesa/callback");
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
        className="rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[12.5px] text-foreground outline-none focus:border-ring"
      />
      <button
        type="button"
        onClick={save}
        className="flex items-center justify-center gap-1.5 self-start rounded-lg bg-green px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green/90">
        {saved ? (
          <>
            <CheckIcon className="size-3.5" />
            Saved
          </>
        ) : (
          "Save callback URL"
        )}
      </button>
    </div>
  );
}
