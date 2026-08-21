"use client";

import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { useActiveProjectStore } from "@/store/active-project";
import { useAppConfigStore } from "@/store/app-config";
import { useProject } from "@/hooks/use-projects";
import type { Project } from "@/lib/types/project";

interface EnvVar {
  key: string;
  value: string;
  secret?: boolean;
}

function buildEnvVars(project: Project, port: number): EnvVar[] {
  return [
    { key: "DARAJA_BASE_URL", value: `http://127.0.0.1:${port}` },
    { key: "DARAJA_CONSUMER_KEY", value: project.consumerKey },
    {
      key: "DARAJA_CONSUMER_SECRET",
      value: project.consumerSecret,
      secret: true,
    },
    { key: "DARAJA_SHORTCODE", value: project.shortCode },
    { key: "DARAJA_PASSKEY", value: project.passkey, secret: true },
  ];
}

function EnvVarRow({ envVar }: { envVar: EnvVar }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const display = envVar.secret && !revealed ? "•".repeat(24) : envVar.value;

  function copy() {
    navigator.clipboard.writeText(envVar.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="group flex items-center gap-3 border-b border-border/60 px-4 py-2.5 font-mono text-[12.5px] last:border-0">
      <span className="shrink-0 text-muted-foreground">{envVar.key}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        <span
          className="truncate text-foreground"
          title={envVar.secret && !revealed ? undefined : envVar.value}>
          {display}
        </span>
        {envVar.secret && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
            {revealed ? (
              <EyeOffIcon className="size-3.5" />
            ) : (
              <EyeIcon className="size-3.5" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-emerald-500 group-hover:opacity-100">
          {copied ? (
            <CheckIcon className="size-3.5 text-emerald-500" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function EnvCard() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: project } = useProject(slug ?? "");
  const port = useAppConfigStore((s) => s.port);

  if (!project) {
    return <div className="h-40 animate-pulse rounded-lg bg-surface-1" />;
  }

  return (
    <div className="rounded-lg border border-border bg-surface-1">
      {buildEnvVars(project, port).map((envVar) => (
        <EnvVarRow key={envVar.key} envVar={envVar} />
      ))}
    </div>
  );
}
