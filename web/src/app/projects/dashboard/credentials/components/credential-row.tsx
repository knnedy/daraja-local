"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";

export default function CredentialRow({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const display = secret && !revealed ? "•".repeat(28) : value;

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="group flex items-center justify-between px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[12.5px] text-foreground">
          {display}
        </span>
        {secret && (
          <button
            onClick={() => setRevealed((v) => !v)}
            className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
            {revealed ? (
              <EyeOffIcon className="size-3.5" />
            ) : (
              <EyeIcon className="size-3.5" />
            )}
          </button>
        )}
        <button
          onClick={copy}
          className="text-muted-foreground opacity-0 transition-opacity hover:text-green group-hover:opacity-100">
          {copied ? (
            <CheckIcon className="size-3.5 text-green" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
