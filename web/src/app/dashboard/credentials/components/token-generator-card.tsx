"use client";

import { useEffect, useState } from "react";
import { KeyRoundIcon } from "lucide-react";

function randomToken() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 26 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

function formatRemaining(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TokenGeneratorCard() {
  const [token, setToken] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!token || remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [token, remaining]);

  function generate() {
    setToken(randomToken());
    setRemaining(3599);
  }

  const expired = token !== null && remaining <= 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <KeyRoundIcon className="size-3.5 text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground">
          Access token
        </span>
      </div>

      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Every other Daraja call needs this as{" "}
        <span className="font-mono text-foreground">
          Authorization: Bearer &lt;token&gt;
        </span>
        . It comes from exchanging your Consumer Key + Secret here — separately,
        and with Basic Auth instead of Bearer.
      </p>

      <div className="rounded-md bg-[#0B120D] p-3.5 font-mono text-[11.5px] leading-relaxed">
        <p className="text-green/50">
          GET /oauth/v1/generate?grant_type=client_credentials
        </p>
        <p className="text-green/50">
          Authorization: Basic base64(consumer_key:consumer_secret)
        </p>
      </div>

      {token ? (
        <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11.5px] text-foreground">
              {token}
            </span>
            <span
              className={`text-[10.5px] font-medium ${
                expired ? "text-destructive" : "text-green"
              }`}>
              {expired ? "expired" : formatRemaining(remaining)}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-surface-2/50 px-3 py-2.5 text-center">
          <span className="text-[11.5px] text-muted-foreground">
            No token generated yet
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={generate}
        className="rounded-lg bg-green py-2 text-xs font-medium text-white transition-colors hover:bg-green/90">
        {token ? "Regenerate token" : "Generate access token"}
      </button>
    </div>
  );
}
