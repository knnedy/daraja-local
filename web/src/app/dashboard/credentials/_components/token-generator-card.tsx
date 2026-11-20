"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { useProject } from "@/hooks/use-projects";
import { useGenerateToken } from "@/hooks/use-oauth";
import { useNow } from "@/hooks/use-now";
import { useCopy } from "@/hooks/use-copy";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { cn } from "@/lib/utils";
import { StatusPill } from "../../_components/activity";

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(seconds % 60).padStart(2, "0")}`;
}

const R = 34;
const C = 2 * Math.PI * R;

/** Fetches a real token from /oauth/v1/generate and counts down to its expiry. */
export default function TokenGeneratorCard({ slug }: { slug: string }) {
  const { data: project } = useProject(slug);
  const generate = useGenerateToken();
  const now = useNow(1000);
  const { copied, copy } = useCopy();
  const [token, setToken] = useState<{ value: string; ttl: number; expiresAt: number; body: string } | null>(null);

  const left = token ? Math.max(0, Math.round((token.expiresAt - now) / 1000)) : 0;
  const expired = token !== null && left === 0;
  const fraction = token ? left / token.ttl : 0;

  return (
    <section className="panel overflow-hidden" aria-labelledby="token-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 id="token-title" className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
            Access token
          </h2>
          <p className="font-mono text-[12px] text-muted-foreground">GET /oauth/v1/generate</p>
        </div>
        {token && <StatusPill tone={expired ? "danger" : "success"} label={expired ? "Expired" : "Valid"} />}
      </div>

      <div className="flex flex-col items-center gap-4 px-4 pt-6 pb-5">
        <div className="relative size-[132px]">
          <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
            <circle cx="40" cy="40" r={R} fill="none" strokeWidth="5" className="stroke-surface-2" />
            <circle
              cx="40"
              cy="40"
              r={R}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - fraction)}
              className={cn(
                "transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none",
                fraction > 0.15 ? "stroke-green-2" : "stroke-amber",
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {token ? (
              <>
                <span className="font-mono text-[22px] font-semibold text-foreground tabular-nums" aria-live="off">
                  {clock(left)}
                </span>
                <span className="text-[11px] text-muted-foreground">{expired ? "get a new one" : "left"}</span>
              </>
            ) : (
              <KeyRoundIcon className="size-7 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>
        </div>

        {token ? (
          <div className="flex h-9 w-full min-w-0 items-center gap-1 rounded-lg bg-surface-2 pr-1 pl-3 ring-1 ring-border">
            <span className={cn("min-w-0 flex-1 truncate font-mono text-[12.5px]", expired ? "text-muted-foreground line-through" : "text-foreground")}>
              {token.value}
            </span>
            <button
              type="button"
              aria-label="Copy access token"
              onClick={() => void copy(token.value)}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground">
              {copied ? <CheckIcon className="size-3.5 text-green" /> : <CopyIcon className="size-3.5" />}
            </button>
          </div>
        ) : (
          <p className="max-w-[260px] text-center text-[13px] text-pretty text-muted-foreground">
            Uses this project&apos;s consumer key and secret, exactly as your app would. Every other endpoint needs it as
            a Bearer token.
          </p>
        )}

        <Button
          size="lg"
          className="w-full"
          disabled={!project || generate.isPending}
          onClick={() =>
            project &&
            generate.mutate(
              { consumerKey: project.consumerKey, consumerSecret: project.consumerSecret },
              {
                onSuccess: (data) => {
                  const ttl = Number(data.expires_in) || 3599;
                  setToken({ value: data.access_token, ttl, expiresAt: Date.now() + ttl * 1000, body: JSON.stringify(data, null, 2) });
                },
              },
            )
          }>
          {generate.isPending ? "Getting a token…" : token ? "Get a new token" : "Get an access token"}
        </Button>
        {generate.isError && (
          <p className="text-[12px] text-red">Couldn&apos;t get a token. Check the consumer key and secret.</p>
        )}
      </div>

      {token && (
        <div className="border-t border-border bg-surface-1 p-3">
          <CodeBlock
            code={token.body}
            lang="json"
            lineNumbers={false}
            maxHeight="10rem"
            caption={<span className="px-2 text-[12px] font-medium text-foreground">Response · 200</span>}
          />
        </div>
      )}
    </section>
  );
}
