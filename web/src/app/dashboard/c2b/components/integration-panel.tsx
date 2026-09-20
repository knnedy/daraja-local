"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const tabs = ["Register", "Simulate", "Payloads"] as const;

const registerBody = `{
  "ShortCode": "<shortcode>",
  "ResponseType": "Completed",
  "ConfirmationURL": "https://your-app.com/api/callbacks/c2b-confirmation",
  "ValidationURL": "https://your-app.com/api/callbacks/c2b-validation"
}`;

const simulateBody = `{
  "ShortCode": "<shortcode>",
  "CommandID": "CustomerPayBillOnline",
  "Amount": "500",
  "Msisdn": "254712345678",
  "BillRefNumber": "INV1001"
}`;

const outboundPayload = `{
  "TransactionType": "Pay Bill",
  "TransID": "RKTQDM7W6S",
  "TransTime": "20260920101500",
  "TransAmount": "500",
  "BusinessShortCode": "<shortcode>",
  "BillRefNumber": "INV1001",
  "InvoiceNumber": "",
  "OrgAccountBalance": "",
  "ThirdPartyTransID": "",
  "MSISDN": "254712345678",
  "FirstName": "",
  "MiddleName": "",
  "LastName": ""
}`;

const validationResponse = `{
  "ResultCode": "0",
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
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Call this once per shortcode — the mapping is stored, not sent per
              payment. Set ResponseType to{" "}
              <span className="font-mono text-foreground">Cancelled</span> to
              turn external validation on,{" "}
              <span className="font-mono text-foreground">Completed</span> to
              skip it.
            </p>
            <pre className="overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg p-3.5 font-mono text-[12px] leading-relaxed text-terminal-green">
              {registerBody}
            </pre>
            <p className="mt-2 text-[11px] text-amber">
              Neither URL may contain the word &quot;mpesa&quot; — Daraja
              rejects those outright.
            </p>
          </>
        )}
        {tab === "Simulate" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Sandbox-only — stands in for a customer paying your Paybill from
              their own phone.
            </p>
            <pre className="overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg p-3.5 font-mono text-[12px] leading-relaxed text-terminal-green">
              {simulateBody}
            </pre>
            <p className="mt-2 text-[11px] text-amber">
              Fails immediately if you haven&apos;t registered a ConfirmationURL
              for this shortcode yet.
            </p>
          </>
        )}
        {tab === "Payloads" && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              The same body is POSTed to your ValidationURL and your
              ConfirmationURL. Customer name, invoice and balance fields arrive
              blank — there&apos;s no real subscriber data to draw on.
            </p>
            <pre className="overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg p-3.5 font-mono text-[12px] leading-relaxed text-terminal-green">
              {outboundPayload}
            </pre>
            <p className="mt-3 mb-2 text-xs leading-relaxed text-muted-foreground">
              What your ValidationURL must respond with. ResultCode is read as a
              string —{" "}
              <span className="font-mono text-foreground">&quot;0&quot;</span>{" "}
              accepts, anything else rejects:
            </p>
            <pre className="overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg p-3.5 font-mono text-[12px] leading-relaxed text-terminal-green">
              {validationResponse}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
