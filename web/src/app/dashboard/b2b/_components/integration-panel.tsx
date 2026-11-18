"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import CodeSnippets from "../../_components/code-snippets";

const tabs = ["B2B", "Balance", "Failures"] as const;

const parseSnippet = `// "Working Account|KES|700000.00|700000.00|0.00|0.00&Utility Account|..."
const accounts = value.split("&").map((line) => {
  const [name, currency, available] = line.split("|");
  return { name, currency, available: Number(available) };
});`;

const failures = [
  ["0", "Success"],
  ["1", "The balance is insufficient for the transaction."],
  ["2001", "The initiator information is invalid."],
] as const;

const code =
  "overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg p-3.5 font-mono text-[12px] leading-relaxed text-terminal-green";

const field = (name: string) => (
  <span className="font-mono text-foreground">{name}</span>
);

export default function IntegrationPanel() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("B2B");

  return (
    <div className="flex flex-col rounded-lg border border-border-strong bg-surface-1 shadow-sm">
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              tab === t &&
                "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-green",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "B2B" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Use {field('"BusinessBuyGoods"')} to pay a Till instead. Both
              identifier types must be {field('"4"')}. Safaricom&apos;s samples
              spell {field('"Command ID"')} with a space and misspell{" "}
              {field("RecieverIdentifierType")}; every spelling works here.{" "}
              {field("AccountReference")} is up to 13 characters and{" "}
              {field("Requester")} is optional.
            </p>
            <CodeSnippets request="b2b" />
          </>
        )}
        {tab === "Balance" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              The result&apos;s {field("AccountBalance")} parameter is one
              string: accounts joined by {field("&")}, each one{" "}
              {field("name|currency|available|current|reserved|uncleared")}.
            </p>
            <CodeSnippets request="accountBalance" />
            <pre className={cn(code, "mt-3")}>{parseSnippet}</pre>
          </>
        )}
        {tab === "Failures" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Failures arrive at your ResultURL with a single{" "}
              {field("BOCompletedTime")} parameter instead of a list. Account
              Balance sends {field("ResultCode")} as a string and B2B as a
              number, so compare it as a string.
            </p>
            <div className="overflow-hidden rounded-md border border-border">
              {failures.map(([c, desc]) => (
                <div
                  key={c}
                  className="flex gap-3 border-b border-border px-3 py-2 text-[11.5px] last:border-0"
                >
                  <span className="w-20 shrink-0 font-mono text-foreground">
                    {c}
                  </span>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-amber">
              Safaricom documents no insufficient-balance code for B2B. Daraja
              Local reuses B2C&apos;s code 1, which is a guess.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
