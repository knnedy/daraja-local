"use client";

import Link from "next/link";
import CodeSnippets from "../../_components/code-snippets";
import { CodeBlock } from "@/components/code-block";
import { useApiPort } from "@/hooks/use-api-port";
import { C, Endpoint, IntegrateCard, Note, Prose } from "../../_components/integrate";

const tabs = [
  { id: "request", label: "Request" },
  { id: "result", label: "Result" },
  { id: "failure", label: "Failure" },
] as const;

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

export default function IntegrationPanel() {
  const base = `http://127.0.0.1:${useApiPort()}`;

  return (
    <IntegrateCard
      description="Send a payout, then handle the result at your ResultURL."
      tabs={tabs}
      render={(tab) => (
        <>
          {tab === "request" && (
            <>
              <Endpoint url={`${base}/mpesa/b2c/v3/paymentrequest`} />
              <Prose>
                Use v3 and send your own unique <C>OriginatorConversationID</C>; the same one twice is rejected as a
                duplicate. Your initiator name, password and certificate are on{" "}
                <Link href="/dashboard/credentials" className="font-medium text-green underline-offset-2 hover:underline">
                  Credentials
                </Link>
                , with code that builds the <C>SecurityCredential</C>.
              </Prose>
              <CodeSnippets request="b2c" />
              <Note>CommandID is SalaryPayment, BusinessPayment or PromotionPayment. Remarks must be 2 to 100 characters.</Note>
            </>
          )}

          {tab === "result" && (
            <>
              <Prose>
                POSTed to your ResultURL once the payout completes. <C>ResultCode</C> is a number, and amounts and
                balances arrive as numbers too.
              </Prose>
              <CodeBlock code={resultBody} lang="json" />
            </>
          )}

          {tab === "failure" && (
            <>
              <Prose>
                A failure also goes to your ResultURL, with no <C>ResultParameters</C>. Check <C>ResultCode</C>: 1 is an
                insufficient balance, 2001 a wrong initiator password, 2040 a recipient who can&apos;t receive.
              </Prose>
              <CodeBlock code={failureBody} lang="json" />
              <Note>
                Safaricom doesn&apos;t document the QueueTimeOutURL body. Daraja Local sends the same Result shape with
                ResultCode 1037, which is a guess.
              </Note>
            </>
          )}
        </>
      )}
    />
  );
}
