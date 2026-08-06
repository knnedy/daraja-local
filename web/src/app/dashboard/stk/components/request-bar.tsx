"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, TerminalIcon } from "lucide-react";

const CURL = (url: string) => `curl -X POST ${url} \\
  -H "Authorization: Bearer <access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{"BusinessShortCode":174379,"Amount":1000,"PhoneNumber":254712345678,...}'`;

export default function RequestBar({
  baseUrl,
  path,
}: {
  baseUrl: string;
  path: string;
}) {
  const [copied, setCopied] = useState<"url" | "curl" | null>(null);
  const fullUrl = `${baseUrl}${path}`;

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
