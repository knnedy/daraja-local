"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const tabs = ["Request", "Callback"] as const;

const requestBody = `{
  "BusinessShortCode": 174379,
  "Password": "<base64(shortcode+passkey+timestamp)>",
  "Timestamp": "20260802101500",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": 1000,
  "PartyA": 254712345678,
  "PartyB": 174379,
  "PhoneNumber": 254712345678,
  "CallBackURL": "https://your-app.com/api/mpesa/callback",
  "AccountReference": "Order #1032",
  "TransactionDesc": "Payment for goods"
}`;

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
          { "Name": "TransactionDate", "Value": 20260802101530 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
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
            )}>
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
            <pre className="overflow-x-auto rounded-md bg-[#0B120D] p-3.5 font-mono text-[12px] leading-relaxed text-green/80">
              {requestBody}
            </pre>
            <p className="mt-2 text-[11px] text-amber">
              Amount must be a whole integer — Daraja rejects decimals (example:
              100.75 fails; round to 100 or 101).
            </p>
          </>
        )}
        {tab === "Callback" && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Once the simulated customer responds, this is POSTed to the
              CallBackURL you registered.
            </p>
            <pre className="overflow-x-auto rounded-md bg-[#0B120D] p-3.5 font-mono text-[12px] leading-relaxed text-green/80">
              {callbackBody}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
