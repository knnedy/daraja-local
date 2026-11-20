"use client";

import Link from "next/link";
import { CodeBlock, type CodeLang } from "@/components/code-block";
import { generate, languages, type Language } from "@/lib/snippets/generate";
import { requests, type RequestName } from "@/lib/snippets/requests";
import { useSnippetLanguage } from "@/store/snippet-language";
import { useActiveProjectStore } from "@/store/active-project";
import { useInitiator, useProject } from "@/hooks/use-projects";
import { cn } from "@/lib/utils";

const highlightAs: Record<Language, CodeLang> = {
  body: "http",
  curl: "bash",
  node: "javascript",
  python: "python",
  php: "php",
  go: "go",
};

/** A Daraja request as a body or as runnable code, in the language last picked anywhere. */
export default function CodeSnippets({
  request,
  showEnvNote = true,
}: {
  request: RequestName;
  showEnvNote?: boolean;
}) {
  const { language, setLanguage } = useSnippetLanguage();
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const { data: initiator } = useInitiator(slug);

  const code = generate(language, requests[request], {
    DARAJA_SHORTCODE: project?.shortCode,
    DARAJA_CALLBACK_URL: project?.callbackBaseUrl.replace(/\/+$/, ""),
    DARAJA_INITIATOR_NAME: initiator?.name,
  });

  return (
    <div className="flex flex-col gap-2.5">
      <CodeBlock
        code={code}
        lang={highlightAs[language]}
        caption={
          <div role="tablist" aria-label="Snippet language" className="flex gap-0.5">
            {languages.map((l) => (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={language === l.id}
                onClick={() => setLanguage(l.id)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground",
                  language === l.id &&
                    "bg-surface-1 text-foreground shadow-(--raised-shadow) ring-1 ring-border/80",
                )}>
                {l.label}
              </button>
            ))}
          </div>
        }
      />
      {showEnvNote && language !== "body" && (
        <p className="text-[12px] text-muted-foreground">
          Reads its values from your <span className="font-mono text-[11.5px]">.env</span> (export it
          from{" "}
          <Link href="/dashboard/settings" className="font-medium text-green underline-offset-2 hover:underline">
            Settings
          </Link>
          ). Swap the values and the same code runs against Safaricom.
        </p>
      )}
    </div>
  );
}
