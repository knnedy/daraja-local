"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useActiveProjectStore } from "@/store/active-project";
import { useApiPort } from "@/hooks/use-api-port";
import { useInitiator, useProject } from "@/hooks/use-projects";
import type { Initiator } from "@/lib/types/initiator";
import type { Project } from "@/lib/types/project";
import { useCopy } from "@/hooks/use-copy";

function buildEnvTemplate(
  baseUrl: string,
  project: Project,
  initiator: Initiator,
) {
  return `DARAJA_BASE_URL=${baseUrl}
DARAJA_SHORTCODE=${project.shortCode}
DARAJA_CONSUMER_KEY=${project.consumerKey}
DARAJA_CONSUMER_SECRET=${project.consumerSecret}
DARAJA_PASSKEY=${project.passkey}
DARAJA_CALLBACK_URL=${project.callbackBaseUrl}
DARAJA_INITIATOR_NAME=${initiator.name}
DARAJA_INITIATOR_PASSWORD=${initiator.password}
# The certificate from the Credentials page, saved next to your app
DARAJA_CERT_PATH=./daraja-local-${project.slug}.cer`;
}

export default function EnvExportCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const { data: initiator } = useInitiator(slug);
  const port = useApiPort();
  const { copied, copy: copyText } = useCopy();

  const ready = project && initiator;
  const envTemplate = ready
    ? buildEnvTemplate(`http://127.0.0.1:${port}`, project, initiator)
    : "";

  function copy() {
    if (!ready) return;
    void copyText(envTemplate);
  }

  return (
    <div className="flex flex-col gap-3 panel p-4">
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
        Reflects this project&apos;s real credentials and callback URL. Rotate
        credentials from the Credentials page.
      </p>
    </div>
  );
}
