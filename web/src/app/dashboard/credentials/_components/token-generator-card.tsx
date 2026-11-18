"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { useActiveProjectStore } from "@/store/active-project";
import { useProject } from "@/hooks/use-projects";
import { useGenerateToken } from "@/hooks/use-oauth";

function formatRemaining(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TokenGeneratorCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const generateToken = useGenerateToken();

  const [token, setToken] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token || remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [token, remaining]);

  function generate() {
    if (!project) return;
    generateToken.mutate(
      {
        consumerKey: project.consumerKey,
        consumerSecret: project.consumerSecret,
      },
      {
        onSuccess: (data) => {
          setToken(data.access_token);
          setRemaining(Number(data.expires_in));
        },
      },
    );
  }

  function copy() {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
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
        Fetches a real token from{" "}
        <code className="font-mono text-foreground">/oauth/v1/generate</code>{" "}
        using this project&apos;s actual credentials — see the request shape
        below.
      </p>

      {token ? (
        <div className="group flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2.5">
          <span className="truncate font-mono text-[11.5px] text-foreground">
            {token}
          </span>
          <div className="flex shrink-0 items-center gap-2 pl-2">
            <span
              className={`text-[10.5px] font-medium ${
                expired ? "text-destructive" : "text-green"
              }`}>
              {expired ? "expired" : formatRemaining(remaining)}
            </span>
            <button
              type="button"
              onClick={copy}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
              {copied ? (
                <CheckIcon className="size-3.5 text-green" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-surface-2/50 px-3 py-2.5 text-center">
          <span className="text-[11.5px] text-muted-foreground">
            No token generated yet
          </span>
        </div>
      )}

      {generateToken.isError && (
        <p className="text-xs text-destructive">
          Failed to generate a token — try again.
        </p>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={!project || generateToken.isPending}
        className="rounded-lg bg-green py-2 text-xs font-medium text-white transition-colors hover:bg-green/90 disabled:cursor-not-allowed disabled:opacity-50">
        {generateToken.isPending
          ? "Generating…"
          : token
            ? "Regenerate token"
            : "Generate access token"}
      </button>
    </div>
  );
}
