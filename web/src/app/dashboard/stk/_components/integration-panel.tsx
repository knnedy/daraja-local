"use client";

import CodeSnippets from "../../_components/code-snippets";
import { CodeBlock } from "@/components/code-block";
import { useApiPort } from "@/hooks/use-api-port";
import { useProject } from "@/hooks/use-projects";
import { useActiveProjectStore } from "@/store/active-project";
import { Endpoint, IntegrateCard, Note } from "../../_components/integrate";

const tabs = [
  { id: "request", label: "Request" },
  { id: "callback", label: "Callback" },
  { id: "query", label: "Query" },
] as const;

const callbackBody = `{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1000 },
          { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
          { "Name": "TransactionDate", "Value": 20260903101530 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}`;

const queryResolved = `{
  "ResponseCode": "0",
  "ResponseDescription": "The service request has been accepted successfully",
  "MerchantRequestID": "29115-34620561-1",
  "CheckoutRequestID": "ws_CO_191220191020363925",
  "ResultCode": "1032",
  "ResultDesc": "Request cancelled by user"
}`;

const queryPending = `{
  "requestId": "104b-4235-9328-5de584002ffd785653",
  "errorCode": "500.001.1001",
  "errorMessage": "The transaction is being processed"
}`;

export default function IntegrationPanel() {
  const port = useApiPort();
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const base = `http://127.0.0.1:${port}`;
  const callbackUrl = `${project?.callbackBaseUrl.replace(/\/+$/, "") ?? "https://your-app.com"}/stk/callback`;

  return (
    <IntegrateCard
      description="What your app sends, what it gets back, and how to check later."
      tabs={tabs}
      render={(tab) => (
        <>
          {tab === "request" && (
            <>
              <Endpoint method="POST" url={`${base}/mpesa/stkpush/v1/processrequest`} />
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Send with a Bearer token from <span className="font-mono text-[12px] text-foreground">/oauth/v1/generate</span>.{" "}
                <span className="font-mono text-[12px] text-foreground">Password</span> is base64 of shortcode +
                passkey + timestamp, as on real Daraja.
              </p>
              <CodeSnippets request="stkPush" />
              <Note>
                The sandbox accepts a decimal Amount such as 1.5. Daraja Local keeps whole shillings, so send
                whole numbers.
              </Note>
            </>
          )}

          {tab === "callback" && (
            <>
              <Endpoint method="POST" url={callbackUrl} />
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                When the customer answers, this lands on your CallBackURL. It&apos;s the only place you learn the
                outcome: mark the order paid here, not in the request handler. Failed deliveries are retried up
                to 3 times.
              </p>
              <CodeBlock code={callbackBody} lang="json" />
            </>
          )}

          {tab === "query" && (
            <>
              <Endpoint method="POST" url={`${base}/mpesa/stkpushquery/v1/query`} />
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Ask how a request ended when the callback never reached you, using the CheckoutRequestID from
                the acceptance.
              </p>
              <CodeSnippets request="stkQuery" showEnvNote={false} />
              <div className="grid gap-3 lg:grid-cols-2">
                <CodeBlock
                  code={queryResolved}
                  lang="json"
                  lineNumbers={false}
                  caption={<span className="px-2 text-[12px] font-medium text-foreground">200 · once answered</span>}
                />
                <CodeBlock
                  code={queryPending}
                  lang="json"
                  lineNumbers={false}
                  caption={<span className="px-2 text-[12px] font-medium text-foreground">500 · still waiting</span>}
                />
              </div>
              <Note>
                ResultCode is a string here and a number in the callback. Treat 500.001.1001 as &quot;ask
                again&quot;, not as a failed payment.
              </Note>
            </>
          )}
        </>
      )}
    />
  );
}
