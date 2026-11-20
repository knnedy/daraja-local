"use client";

import CodeSnippets from "../../_components/code-snippets";
import { CodeBlock } from "@/components/code-block";
import { useApiPort } from "@/hooks/use-api-port";
import { C, Endpoint, IntegrateCard, Note, Prose } from "../../_components/integrate";

const tabs = [
  { id: "register", label: "Register" },
  { id: "simulate", label: "Simulate" },
  { id: "payloads", label: "Payloads" },
] as const;

const outboundPayload = `{
  "TransactionType": "Pay Bill",
  "TransID": "RKTQDM7W6S",
  "TransTime": "20261022101500",
  "TransAmount": "500",
  "BusinessShortCode": "<shortcode>",
  "BillRefNumber": "INV1001",
  "InvoiceNumber": "",
  "OrgAccountBalance": "",
  "ThirdPartyTransID": "",
  "MSISDN": "2547*****149",
  "FirstName": "",
  "MiddleName": "",
  "LastName": ""
}`;

const validationResponse = `{
  "ResultCode": "0",
  "ResultDesc": "Accepted"
}`;

export default function IntegrationPanel() {
  const base = `http://127.0.0.1:${useApiPort()}`;

  return (
    <IntegrateCard
      description="Register once, then every payment to your shortcode comes to you."
      tabs={tabs}
      render={(tab) => (
        <>
          {tab === "register" && (
            <>
              <Endpoint url={`${base}/mpesa/c2b/v2/registerurl`} />
              <Prose>
                Call this once per shortcode, not per payment. Add a <C>ValidationURL</C> to have every payment
                checked first. <C>ResponseType</C> decides what happens when that URL can&apos;t answer:{" "}
                <C>Completed</C> accepts the payment, <C>Cancelled</C> declines it.
              </Prose>
              <CodeSnippets request="c2bRegister" />
              <Note>
                Neither URL may contain mpesa, m-pesa, safaricom, exe, exec, cmd, sql or query, in any case. Daraja
                rejects those outright.
              </Note>
            </>
          )}

          {tab === "simulate" && (
            <>
              <Endpoint url={`${base}/mpesa/c2b/v2/simulate`} />
              <Prose>
                Sandbox only. It stands in for a customer paying your Paybill or Till from their own phone, which is
                what the Customer&apos;s phone on this page does. <C>Msisdn</C> must look like 2547XXXXXXXX.
              </Prose>
              <CodeSnippets request="c2bSimulate" showEnvNote={false} />
              <Note>Fails straight away if this shortcode has no registered ConfirmationURL yet.</Note>
            </>
          )}

          {tab === "payloads" && (
            <>
              <Prose>
                The same body is POSTed to your ValidationURL and then your ConfirmationURL. Name, invoice and balance
                fields arrive blank. <C>MSISDN</C> hides the customer&apos;s number: masked when you registered through
                v2, as below, and a SHA-256 hash through v1.
              </Prose>
              <CodeBlock
                code={outboundPayload}
                lang="json"
                caption={<span className="px-2 text-[12px] font-medium text-foreground">Validation and Confirmation body</span>}
              />
              <Prose>
                Your ValidationURL must answer with this. <C>ResultCode</C> is read as a string: <C>&quot;0&quot;</C>{" "}
                accepts, anything else declines.
              </Prose>
              <CodeBlock
                code={validationResponse}
                lang="json"
                lineNumbers={false}
                caption={<span className="px-2 text-[12px] font-medium text-foreground">Your ValidationURL replies</span>}
              />
            </>
          )}
        </>
      )}
    />
  );
}
