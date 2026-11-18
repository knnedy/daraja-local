"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import CodeSnippets from "../../_components/code-snippets";

const tabs = ["Request", "Result", "Failure"] as const;

const resultBody = `{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "payout-0001",
    "ConversationID": "AG_20261118_2010759fd5662ef6d054",
    "TransactionID": "NLJ41HAY6Q",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "TransactionAmount", "Value": 2500 },
        { "Key": "TransactionReceipt", "Value": "NLJ41HAY6Q" },
        { "Key": "B2CRecipientIsRegisteredCustomer", "Value": "Y" },
        { "Key": "B2CChargesPaidAccountAvailableFunds", "Value": 0.00 },
        { "Key": "ReceiverPartyPublicName", "Value": "254708374149 - John Doe" },
        { "Key": "TransactionCompletedDateTime", "Value": "18.11.2026 14:05:12" },
        { "Key": "B2CUtilityAccountAvailableFunds", "Value": 997500.00 },
        { "Key": "B2CWorkingAccountAvailableFunds", "Value": 0.00 }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": { "Key": "QueueTimeoutURL", "Value": "https://..." }
    }
  }
}`;

const failureBody = `{
  "Result": {
    "ResultType": 0,
    "ResultCode": 2001,
    "ResultDesc": "The initiator information is invalid.",
    "OriginatorConversationID": "payout-0001",
    "ConversationID": "AG_20261118_2010759fd5662ef6d054",
    "TransactionID": "NLJ0000000",
    "ReferenceData": {
      "ReferenceItem": { "Key": "QueueTimeoutURL", "Value": "https://..." }
    }
  }
}`;

const code =
  "overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg p-3.5 font-mono text-[12px] leading-relaxed text-terminal-green";

export default function IntegrationPanel() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Request");

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
        {tab === "Request" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Use v3 and send your own unique{" "}
              <span className="font-mono text-foreground">
                OriginatorConversationID
              </span>
              ; sending the same one twice is rejected as a duplicate. Your
              initiator name, password and certificate are on the{" "}
              <Link
                href="/dashboard/credentials"
                className="text-green underline-offset-2 hover:underline"
              >
                Credentials
              </Link>{" "}
              page, with code that builds the SecurityCredential.
            </p>
            <CodeSnippets request="b2c" />
            <p className="mt-2 text-[11px] text-amber">
              CommandID is SalaryPayment, BusinessPayment or PromotionPayment.
              Remarks must be 2 to 100 characters.
            </p>
          </>
        )}
        {tab === "Result" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              POSTed to your ResultURL once the payout completes. ResultCode is
              a number, and amounts and balances arrive as numbers too.
            </p>
            <pre className={code}>{resultBody}</pre>
          </>
        )}
        {tab === "Failure" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              A failure also goes to your ResultURL, with no ResultParameters.
              Check ResultCode: 1 is an insufficient balance, 2001 a wrong
              initiator password, 2040 a recipient who can&apos;t receive.
            </p>
            <pre className={code}>{failureBody}</pre>
            <p className="mt-2 text-[11px] text-amber">
              Safaricom does not document the QueueTimeOutURL body. Daraja Local
              sends the same Result shape with ResultCode 1037, which is a
              guess.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
