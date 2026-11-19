"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import CodeSnippets from "../../_components/code-snippets";

const tabs = ["Status", "Reversal", "Failures"] as const;

const failures = [
  ["0", "Success"],
  ["2001", "The initiator information is invalid."],
  ['"R000001"', "The transaction has already been reversed."],
  ['"R000002"', "The OriginalTransactionID is invalid."],
  ["1", "The balance is insufficient for the transaction."],
] as const;

const field = (name: string) => (
  <span className="font-mono text-foreground">{name}</span>
);

export default function IntegrationPanel() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Status");

  return (
    <div className="flex flex-col panel">
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
        {tab === "Status" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Send the receipt as {field("TransactionID")}, or leave it empty
              and send the {field("OriginatorConversationID")} of the request
              that made the payment as {field("OriginalConversationID")}.
              Safaricom&apos;s own sample spells two keys{" "}
              {field('"Command ID"')} and {field('"Transaction ID"')}; both
              spellings work here.
            </p>
            <CodeSnippets request="transactionStatus" />
          </>
        )}
        {tab === "Reversal" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Reverses a customer&apos;s STK or C2B payment into your shortcode.{" "}
              {field("Amount")} must match the original. Keep Safaricom&apos;s
              spelling {field("RecieverIdentifierType")}, set to {field('"11"')}
              .
            </p>
            <CodeSnippets request="reversal" />
            <p className="mt-2 text-[11px] text-amber">
              B2C payouts can&apos;t be reversed through the API; Safaricom
              handles those in the M-Pesa org portal.
            </p>
          </>
        )}
        {tab === "Failures" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Failures arrive at your ResultURL without ResultParameters.
              ResultCode is a number, except Reversal&apos;s R codes, which are
              strings, so compare it as a string.
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
              Safaricom documents no code for a status query on an unknown
              receipt. Daraja Local answers with R000002, which is a guess.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
