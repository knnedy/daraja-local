"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, InfoIcon } from "lucide-react";
import CodeSnippets from "../../_components/code-snippets";
import { CodeBlock } from "@/components/code-block";
import { useApiPort } from "@/hooks/use-api-port";
import { useCopy } from "@/hooks/use-copy";
import { useProject } from "@/hooks/use-projects";
import { useActiveProjectStore } from "@/store/active-project";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "request", label: "Request" },
  { id: "callback", label: "Callback" },
  { id: "query", label: "Query" },
] as const;
type Tab = (typeof tabs)[number]["id"];

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

function Endpoint({ method, url }: { method: string; url: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="flex h-10 items-center gap-2.5 rounded-lg border border-border bg-surface-2/70 pr-1 pl-1.5">
      <span className="rounded-md bg-green-light px-1.5 py-0.5 font-mono text-[11px] font-semibold text-green ring-1 ring-green-mid/70">
        {method}
      </span>
      <span translate="no" className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground">
        {url}
      </span>
      <button
        type="button"
        onClick={() => void copy(url)}
        aria-label={copied ? "Copied" : "Copy URL"}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground">
        {copied ? <CheckIcon className="size-3.5 text-green" /> : <CopyIcon className="size-3.5" />}
      </button>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
      <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-amber" />
      <span>{children}</span>
    </p>
  );
}

export default function IntegrationPanel() {
  const [tab, setTab] = useState<Tab>("request");
  const port = useApiPort();
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const base = `http://127.0.0.1:${port}`;
  const callbackUrl = `${project?.callbackBaseUrl.replace(/\/+$/, "") ?? "https://your-app.com"}/stk/callback`;

  return (
    <section className="panel overflow-hidden" aria-labelledby="integrate-title">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 pt-4">
        <div className="pb-3.5">
          <h2 id="integrate-title" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Integrate
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            What your app sends, what it gets back, and how to check later.
          </p>
        </div>
        <div role="tablist" aria-label="Integration step" className="-mb-px flex gap-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative pb-3 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground",
                tab === t.id &&
                  "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:bg-green-2",
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5" role="tabpanel">
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
      </div>
    </section>
  );
}
