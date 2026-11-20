"use client";

import CodeSnippets from "../../_components/code-snippets";
import { useApiPort } from "@/hooks/use-api-port";
import { C, Endpoint, IntegrateCard, Note, Prose } from "../../_components/integrate";

const tabs = [
  { id: "status", label: "Status" },
  { id: "reversal", label: "Reversal" },
  { id: "failures", label: "Failures" },
] as const;

const failures = [
  ["0", "Success"],
  ["2001", "The initiator information is invalid."],
  ['"R000001"', "The transaction has already been reversed."],
  ["2032", "The transaction receipt number does not exist. (status)"],
  ['"R000002"', "The OriginalTransactionID is invalid. (reversal)"],
  ["1", "The balance is insufficient for the transaction."],
] as const;

export default function IntegrationPanel() {
  const base = `http://127.0.0.1:${useApiPort()}`;

  return (
    <IntegrateCard
      description="Look up a receipt or undo a customer's payment; both answer at your ResultURL."
      tabs={tabs}
      render={(tab) => (
        <>
          {tab === "status" && (
            <>
              <Endpoint url={`${base}/mpesa/transactionstatus/v1/query`} />
              <Prose>
                Send the receipt as <C>TransactionID</C>, or leave it empty and send the <C>OriginatorConversationID</C>{" "}
                of the request that made the payment as <C>OriginalConversationID</C>. Safaricom&apos;s own sample spells
                two keys <C>&quot;Command ID&quot;</C> and <C>&quot;Transaction ID&quot;</C>; both spellings work here.
              </Prose>
              <CodeSnippets request="transactionStatus" />
            </>
          )}

          {tab === "reversal" && (
            <>
              <Endpoint url={`${base}/mpesa/reversal/v1/request`} />
              <Prose>
                Reverses a customer&apos;s STK or C2B payment into your shortcode. <C>Amount</C> must match the original.
                Keep Safaricom&apos;s spelling <C>RecieverIdentifierType</C>, set to <C>&quot;11&quot;</C>.
              </Prose>
              <CodeSnippets request="reversal" />
              <Note>B2C payouts can&apos;t be reversed through the API; Safaricom handles those in the M-PESA org portal.</Note>
            </>
          )}

          {tab === "failures" && (
            <>
              <Prose>
                Failures arrive at your ResultURL without ResultParameters. ResultCode is a number, except Reversal&apos;s
                R codes, which are strings, so compare it as a string.
              </Prose>
              <dl className="overflow-hidden rounded-lg ring-1 ring-border">
                {failures.map(([code, desc]) => (
                  <div key={code} className="flex gap-4 border-b border-border px-3.5 py-2.5 text-[12.5px] last:border-0">
                    <dt className="w-20 shrink-0 font-mono text-foreground">{code}</dt>
                    <dd className="text-muted-foreground">{desc}</dd>
                  </div>
                ))}
              </dl>
              <Note>
                An unknown receipt is reported before the initiator is checked, so it fails with 2032 or R000002 even
                when the SecurityCredential is wrong. Both were captured from the sandbox.
              </Note>
            </>
          )}
        </>
      )}
    />
  );
}
