"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useActiveProjectStore } from "@/store/active-project";
import { useAppConfigStore } from "@/store/app-config";
import { useProject } from "@/hooks/use-project";
import { useProjectSettings } from "@/hooks/use-project-settings";
import type { Project } from "@/lib/types/project";
import type { ProjectSettings } from "@/lib/types/settings";

function buildEnvTemplate(
  baseUrl: string,
  project: Project,
  settings: ProjectSettings,
) {
  return `DARAJA_BASE_URL=${baseUrl}
DARAJA_SHORTCODE=${project.shortCode}
DARAJA_CONSUMER_KEY=${project.consumerKey}
DARAJA_CONSUMER_SECRET=${project.consumerSecret}
DARAJA_PASSKEY=${project.passkey}
DARAJA_CALLBACK_URL=${settings.callbackUrl}`;
}

export default function EnvExportCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const { data: settings } = useProjectSettings(slug);
  const port = useAppConfigStore((s) => s.port);
  const [copied, setCopied] = useState(false);

  const ready = project && settings;
  const envTemplate = ready
    ? buildEnvTemplate(`http://127.0.0.1:${port}`, project, settings)
    : "";

  function copy() {
    if (!ready) return;
    navigator.clipboard.writeText(envTemplate);
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
          disabled={!ready}
          className="flex items-center gap-1.5 rounded-md border border-border-strong bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60">
          {copied ? (
            <CheckIcon className="size-3.5 text-green" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          Copy
        </button>
      </div>
      {ready ? (
        <pre className="overflow-x-auto rounded-md bg-[#0B120D] p-3.5 font-mono text-[11.5px] leading-relaxed text-green/80">
          {envTemplate}
        </pre>
      ) : (
        <div className="h-32 animate-pulse rounded-md bg-[#0B120D]" />
      )}
      <p className="text-[10.5px] text-muted-foreground">
        Reflects this project&apos;s real credentials and current callback URL.
        Rotate from Credentials, edit the callback URL above.
      </p>
    </div>
  );
}
