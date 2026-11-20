"use client";

import CodeSnippets from "../../_components/code-snippets";
import { CodeBlock } from "@/components/code-block";
import { useApiPort } from "@/hooks/use-api-port";
import { C, Endpoint, IntegrateCard, Note, Prose } from "../../_components/integrate";

const tabs = [
  { id: "b2b", label: "Payment" },
  { id: "balance", label: "Balance" },
  { id: "failures", label: "Failures" },
] as const;

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

export default function IntegrationPanel() {
  const base = `http://127.0.0.1:${useApiPort()}`;

  return (
    <IntegrateCard
      description="Pay a business or ask for your balances; both answer at your ResultURL."
      tabs={tabs}
      render={(tab) => (
        <>
          {tab === "b2b" && (
            <>
              <Endpoint url={`${base}/mpesa/b2b/v1/paymentrequest`} />
              <Prose>
                Use <C>&quot;BusinessBuyGoods&quot;</C> to pay a Till instead. Both identifier types must be{" "}
                <C>&quot;4&quot;</C>. Safaricom&apos;s samples spell <C>&quot;Command ID&quot;</C> with a space and
                misspell <C>RecieverIdentifierType</C>; every spelling works here. <C>AccountReference</C> is up to 13
                characters and <C>Requester</C> is optional.
              </Prose>
              <CodeSnippets request="b2b" />
            </>
          )}

          {tab === "balance" && (
            <>
              <Endpoint url={`${base}/mpesa/accountbalance/v1/query`} />
              <Prose>
                The result&apos;s <C>AccountBalance</C> parameter is one string: accounts joined by <C>&amp;</C>, each
                one <C>name|currency|available|current|reserved|uncleared</C>.
              </Prose>
              <CodeSnippets request="accountBalance" showEnvNote={false} />
              <CodeBlock
                code={parseSnippet}
                lang="javascript"
                lineNumbers={false}
                caption={<span className="px-2 text-[12px] font-medium text-foreground">Parsing AccountBalance</span>}
              />
            </>
          )}

          {tab === "failures" && (
            <>
              <Prose>
                Failures arrive at your ResultURL with a single <C>BOCompletedTime</C> parameter instead of a list.
                Account Balance sends <C>ResultCode</C> as a string and B2B as a number, so compare it as a string.
              </Prose>
              <dl className="overflow-hidden rounded-lg ring-1 ring-border">
                {failures.map(([code, desc]) => (
                  <div key={code} className="flex gap-4 border-b border-border px-3.5 py-2.5 text-[12.5px] last:border-0">
                    <dt className="w-12 shrink-0 font-mono text-foreground">{code}</dt>
                    <dd className="text-muted-foreground">{desc}</dd>
                  </div>
                ))}
              </dl>
              <Note>
                Safaricom documents no insufficient-balance code for B2B. Daraja Local reuses B2C&apos;s code 1, which
                is a guess.
              </Note>
            </>
          )}
        </>
      )}
    />
  );
}
