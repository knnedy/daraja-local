"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

const ENV_TEMPLATE = `DARAJA_BASE_URL=http://localhost:8080
DARAJA_SHORTCODE=174379
DARAJA_CONSUMER_KEY=dl_ck_9f2a1e7c4b8d3f60
DARAJA_CONSUMER_SECRET=dl_cs_7e0b2c9a5f1d8e34a6c2
DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
DARAJA_CALLBACK_URL=https://your-app.com/api/mpesa/callback`;

export default function EnvExportCard() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(ENV_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">
          Export as .env
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md border border-border-strong bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          {copied ? (
            <CheckIcon className="size-3.5 text-green" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          Copy
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-[#0B120D] p-3.5 font-mono text-[11.5px] leading-relaxed text-green/80">
        {ENV_TEMPLATE}
      </pre>
      <p className="text-[10.5px] text-muted-foreground">
        Shown here with placeholder values — this will reflect your real
        credentials once Credentials and Settings share one source.
      </p>
    </div>
  );
}
