"use client";

import Link from "next/link";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { generate, languages } from "@/lib/snippets/generate";
import { requests, type RequestName } from "@/lib/snippets/requests";
import { useSnippetLanguage } from "@/store/snippet-language";
import { useActiveProjectStore } from "@/store/active-project";
import { useInitiator, useProject } from "@/hooks/use-projects";
import { useCopy } from "@/hooks/use-copy";

/** A Daraja request as a body or as runnable code, in the language last picked anywhere. */
export default function CodeSnippets({ request }: { request: RequestName }) {
  const { language, setLanguage } = useSnippetLanguage();
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const { data: initiator } = useInitiator(slug);
  const { copied, copy: copyText } = useCopy();

  const code = generate(language, requests[request], {
    DARAJA_SHORTCODE: project?.shortCode,
    DARAJA_CALLBACK_URL: project?.callbackBaseUrl.replace(/\/+$/, ""),
    DARAJA_INITIATOR_NAME: initiator?.name,
  });

  function copy() {
    void copyText(code);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="tablist"
        aria-label="Snippet language"
        className="flex flex-wrap gap-0.5 self-start rounded-md border border-border bg-surface-2 p-0.5">
        {languages.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={language === l.id}
            onClick={() => setLanguage(l.id)}
            className={cn(
              "rounded px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              language === l.id && "bg-surface-1 text-foreground shadow-sm",
            )}>
            {l.label}
          </button>
        ))}
      </div>

      <div className="group relative">
        <button
          type="button"
          onClick={copy}
          aria-label="Copy snippet"
          className="absolute top-2.5 right-5 z-10 rounded p-1 text-terminal-fg-muted opacity-70 transition-opacity hover:text-terminal-green hover:opacity-100 focus-visible:opacity-100">
          {copied ? (
            <CheckIcon className="size-3.5 text-terminal-green" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
        <pre className="max-h-112 overflow-auto rounded-md border border-terminal-border bg-terminal-bg p-3.5 pr-10 font-mono text-[12px] leading-relaxed text-terminal-green">
          {code}
        </pre>
      </div>

      {language !== "body" && (
        <p className="text-[11px] text-muted-foreground">
          Reads the variables from your .env (export it from{" "}
          <Link
            href="/dashboard/settings"
            className="text-green underline-offset-2 hover:underline">
            Settings
          </Link>
          ). The same code runs against Safaricom once you swap the values.
        </p>
      )}
    </div>
  );
}
