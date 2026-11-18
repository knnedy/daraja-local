"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import CodeSnippets from "../../_components/code-snippets";

const tabs = ["Request", "Callback", "Query"] as const;

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

const queryResponses = `200 once resolved
{
  "ResponseCode": "0",
  "ResponseDescription": "The service request has been accepted successfully",
  "MerchantRequestID": "29115-34620561-1",
  "CheckoutRequestID": "ws_CO_191220191020363925",
  "ResultCode": "1032",
  "ResultDesc": "Request cancelled by user"
}

500 while still pending
{
  "requestId": "…",
  "errorCode": "500.001.1001",
  "errorMessage": "The transaction is being processed"
}`;

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
            <p className="mb-3 text-xs text-muted-foreground">
              Send this shape to the endpoint above. Password is
              base64(shortcode + passkey + timestamp), matching real Daraja
              auth.
            </p>
            <CodeSnippets request="stkPush" />
            <p className="mt-2 text-[11px] text-amber">
              The sandbox accepts a decimal Amount such as 1.5. Daraja Local
              keeps whole shillings, so send whole numbers to be safe.
            </p>
          </>
        )}
        {tab === "Callback" && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Once you resolve the pending request in the Virtual Phone, this is
              POSTed to the CallBackURL you registered — retried up to 3x on
              delivery failure.
            </p>
            <pre className="overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg p-3.5 font-mono text-[12px] leading-relaxed text-terminal-green">
              {callbackBody}
            </pre>
          </>
        )}
        {tab === "Query" && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Ask how a request ended when the callback never reached you. Use
              the CheckoutRequestID from the acceptance.
            </p>
            <CodeSnippets request="stkQuery" />
            <p className="mt-4 mb-2 text-xs text-muted-foreground">
              What comes back:
            </p>
            <pre className="overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg p-3.5 font-mono text-[12px] leading-relaxed text-terminal-green">
              {queryResponses}
            </pre>
            <p className="mt-2 text-[11px] text-amber">
              ResultCode is a string here and a number in the callback. Treat
              500.001.1001 as &quot;ask again&quot;, not as a failed payment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
