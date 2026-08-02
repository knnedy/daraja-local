"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const tabs = ["Register", "Simulate", "Payloads"] as const;

const registerBody = `{
  "ShortCode": "600426",
  "ResponseType": "Completed",
  "ConfirmationURL": "https://your-app.com/api/mpesa/c2b/confirmation",
  "ValidationURL": "https://your-app.com/api/mpesa/c2b/validation"
}`;

const simulateBody = `{
  "ShortCode": "600426",
  "CommandID": "CustomerPayBillOnline",
  "Amount": 500,
  "Msisdn": "254712345678",
  "BillRefNumber": "INV1001"
}`;

const validationPayload = `{
  "TransactionType": "Pay Bill",
  "TransID": "RKTQDM7W6S",
  "TransTime": "20260803101500",
  "TransAmount": "500",
  "BusinessShortCode": "600426",
  "BillRefNumber": "INV1001",
  "MSISDN": "254712345678",
  "FirstName": "John",
  "LastName": "Doe"
}`;

const confirmationResponse = `{
  "ResultCode": 0,
  "ResultDesc": "Accepted"
}`;

export default function IntegrationPanel() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Register");

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
        {tab === "Register" && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Call this once per shortcode. Safaricom maps these URLs going
              forward — no need to send it with every payment.
            </p>
            <pre className="overflow-x-auto rounded-md bg-[#0B120D] p-3.5 font-mono text-[12px] leading-relaxed text-green/80">
              {registerBody}
            </pre>
          </>
        )}
        {tab === "Simulate" && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Sandbox-only — mimics a real customer paying your Paybill from
              their own phone.
            </p>
            <pre className="overflow-x-auto rounded-md bg-[#0B120D] p-3.5 font-mono text-[12px] leading-relaxed text-green/80">
              {simulateBody}
            </pre>
          </>
        )}
        {tab === "Payloads" && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              What Daraja Local sends to your ValidationURL, and what your app
              should respond with:
            </p>
            <pre className="overflow-x-auto rounded-md bg-[#0B120D] p-3.5 font-mono text-[12px] leading-relaxed text-green/80">
              {validationPayload}
            </pre>
            <p className="mt-3 mb-2 text-xs text-muted-foreground">
              Your response (accept shown, reject uses the same shape with a
              non-zero ResultCode):
            </p>
            <pre className="overflow-x-auto rounded-md bg-[#0B120D] p-3.5 font-mono text-[12px] leading-relaxed text-green/80">
              {confirmationResponse}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
