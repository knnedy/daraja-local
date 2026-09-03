"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, TerminalIcon } from "lucide-react";
import { useAppConfigStore } from "@/store/app-config";

const PATH = "/mpesa/stkpush/v1/processrequest";

const CURL = (url: string) => `curl -X POST ${url} \\
  -H "Authorization: Bearer <access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "BusinessShortCode": <shortcode>,
    "Password": <base64(shortcode+passkey+timestamp)>,
    "Timestamp": <yyyyMMddHHmmss>,
    "TransactionType": "CustomerPayBillOnline",
    "Amount": 1000,
    "PartyA": 254712345678,
    "PartyB": <shortcode>,
    "PhoneNumber": 254712345678,
    "CallBackURL": "<your-callback-url>",
    "AccountReference": "test",
    "TransactionDesc": "Payment"
  }'`;

export default function RequestBar() {
  const port = useAppConfigStore((s) => s.port);
  const [copied, setCopied] = useState<"url" | "curl" | null>(null);
  const baseUrl = `http://localhost:${port}`;
  const fullUrl = `${baseUrl}${PATH}`;

  function copy(value: string, key: "url" | "curl") {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-strong bg-surface-1 p-1.5 shadow-sm sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-2.5 rounded-md bg-surface-2 px-3 py-2">
        <span className="shrink-0 rounded border border-border-strong bg-surface-1 px-2 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
          POST
        </span>
        <span className="min-w-0 truncate font-mono text-[13px] text-foreground">
          {fullUrl}
        </span>
      </div>
      <div className="flex shrink-0 gap-1.5 px-1 sm:px-0">
        <button
          onClick={() => copy(fullUrl, "url")}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
          {copied === "url" ? (
            <CheckIcon className="size-3.5 text-green" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          URL
        </button>
        <button
          onClick={() => copy(CURL(fullUrl), "curl")}
          className="flex items-center gap-1.5 rounded-md bg-green px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green/90">
          {copied === "curl" ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <TerminalIcon className="size-3.5" />
          )}
          Copy curl
        </button>
      </div>
    </div>
  );
}
