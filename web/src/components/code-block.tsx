"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { HighlighterCore } from "shiki/core";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

export type CodeLang =
  | "bash"
  | "javascript"
  | "python"
  | "php"
  | "go"
  | "json"
  | "http";

// One highlighter for the whole app, loaded on first use and cached.
let highlighter: Promise<HighlighterCore> | null = null;
const html = new Map<string, string>();
const listeners = new Set<() => void>();

function load() {
  highlighter ??= (async () => {
    const [{ createHighlighterCore, createCssVariablesTheme }, { createJavaScriptRegexEngine }] =
      await Promise.all([import("shiki/core"), import("shiki/engine/javascript")]);
    return createHighlighterCore({
      themes: [createCssVariablesTheme({ name: "tokens", variablePrefix: "--shiki-" })],
      langs: [
        import("shiki/langs/bash.mjs"),
        import("shiki/langs/javascript.mjs"),
        import("shiki/langs/python.mjs"),
        import("shiki/langs/php.mjs"),
        import("shiki/langs/go.mjs"),
        import("shiki/langs/json.mjs"),
        import("shiki/langs/http.mjs"),
      ],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    });
  })();
  return highlighter;
}

function highlight(code: string, lang: CodeLang) {
  const key = `${lang}\u0000${code}`;
  if (html.has(key)) return;
  void load().then((h) => {
    const out = h.codeToHtml(code, { lang, theme: "tokens" });
    // Keep only the inner <code>; the wrapper is ours.
    html.set(key, out.replace(/^<pre[^>]*>/, "").replace(/<\/pre>$/, ""));
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Highlighted code with line numbers and a copy button. Plain text renders until shiki loads. */
export function CodeBlock({
  code,
  lang,
  caption,
  className,
  maxHeight = "28rem",
  lineNumbers = true,
}: {
  code: string;
  lang: CodeLang;
  caption?: React.ReactNode;
  className?: string;
  maxHeight?: string;
  lineNumbers?: boolean;
}) {
  const key = `${lang}\u0000${code}`;
  const rendered = useSyncExternalStore(
    subscribe,
    () => html.get(key),
    () => undefined,
  );
  const { copied, copy } = useCopy();

  useEffect(() => highlight(code, lang), [code, lang]);

  return (
    <div
      className={cn(
        "group/code relative overflow-hidden rounded-xl border border-code-border bg-code-bg",
        className,
      )}>
      {caption && (
        <div className="flex h-10 items-center gap-2 border-b border-code-border pr-11 pl-1.5 text-[12px] text-muted-foreground">
          {caption}
        </div>
      )}
      <button
        type="button"
        onClick={() => void copy(code)}
        aria-label={copied ? "Copied" : "Copy code"}
        className={cn(
          "absolute right-2 z-10 flex size-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-[background-color,color,opacity,border-color] duration-150 hover:border-code-border hover:bg-surface-1 hover:text-foreground focus-visible:opacity-100",
          caption ? "top-1.5 opacity-100!" : "top-2",
          !copied && "opacity-0 group-hover/code:opacity-100",
        )}>
        {copied ? (
          <CheckIcon className="size-3.5 text-green" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
      <pre
        style={{ maxHeight }}
        className={cn(
          "code-block overflow-auto py-3.5 pr-12 font-mono text-[12.5px] leading-[1.7] text-(--code-fg) [tab-size:2]",
          lineNumbers ? "pl-0" : "pl-4",
          lineNumbers && "with-line-numbers",
        )}>
        {rendered ? (
          <code dangerouslySetInnerHTML={{ __html: rendered.replace(/^<code>|<\/code>$/g, "") }} />
        ) : (
          <code>
            {code.split("\n").map((line, i) => (
              <span key={i} className="line">
                {line}
                {"\n"}
              </span>
            ))}
          </code>
        )}
      </pre>
    </div>
  );
}
