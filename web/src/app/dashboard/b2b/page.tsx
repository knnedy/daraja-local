"use client";

import { useState } from "react";
import RequestBar from "../_components/request-bar";
import PayloadConsole from "../_components/payload-console";
import HowItWorks from "./_components/how-it-works";
import IntegrationPanel from "./_components/integration-panel";
import AccountsCard from "./_components/accounts-card";
import PaymentCard, { type B2BPaymentDraft } from "./_components/payment-card";
import LatestResult from "./_components/latest-result";
import { deriveResults } from "./lib/results";
import { useLiveRequestLog } from "@/hooks/use-request-log";
import { useBalanceQuery, useSendB2B } from "@/hooks/use-accounts";
import { useProject } from "@/hooks/use-projects";
import { useActiveProjectStore } from "@/store/active-project";
import { Field, TextInput } from "@/components/form";
import { PageHeader } from "@/components/page-header";

export default function B2BPage() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const { data: paymentLog = [] } = useLiveRequestLog(slug, "b2b");
  const { data: balanceLog = [] } = useLiveRequestLog(slug, "account_balance");
  const pay = useSendB2B(slug);
  const query = useBalanceQuery(slug);

  const base = project?.callbackBaseUrl.replace(/\/+$/, "") ?? "";
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [timeoutUrl, setTimeoutUrl] = useState<string | null>(null);
  // The newest log id when a request was sent here; newer results answer it.
  const [sentAt, setSentAt] = useState<number | null>(null);

  if (!slug) return null;

  const result = resultUrl ?? (base ? `${base}/b2b/result` : "");
  const timeout = timeoutUrl ?? (base ? `${base}/b2b/timeout` : "");
  const urlsValid = [result, timeout].every((u) => /^https?:\/\/\S+$/.test(u));
  const disabledReason = urlsValid
    ? null
    : "Set a ResultURL and QueueTimeOutURL first";

  const entries = [...paymentLog, ...balanceLog].sort((a, b) => b.id - a.id);
  const latest = deriveResults(entries)[0] ?? null;
  const waiting = sentAt !== null && (latest?.id ?? 0) <= sentAt;
  const targets = { resultUrl: result, queueTimeOutUrl: timeout };

  function markSent() {
    setSentAt(entries[0]?.id ?? 0);
  }

  function sendPayment(draft: B2BPaymentDraft) {
    markSent();
    pay.mutate({ ...draft, ...targets }, { onError: () => setSentAt(null) });
  }

  function sendQuery() {
    markSent();
    query.mutate(targets, { onError: () => setSentAt(null) });
  }

  const failed = pay.error ?? query.error;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        page="b2b"
        title="B2B"
        description={<>Pay another business&apos;s PayBill or Till, check your account balances, and watch each result arrive at your ResultURL.</>}
      />

      <HowItWorks />

      <div className="flex flex-col gap-2.5">
        <RequestBar path="/mpesa/b2b/v1/paymentrequest" label="B2B payment" />
        <RequestBar
          path="/mpesa/accountbalance/v1/query"
          label="balance query"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {failed && (
            <p className="text-[11px] text-destructive">{failed.message}</p>
          )}
          <LatestResult result={latest} waiting={waiting} />
          <IntegrationPanel />
        </div>

        <div className="flex flex-col gap-5">
          <PaymentCard
            shortCode={project?.shortCode ?? ""}
            onSend={sendPayment}
            disabledReason={disabledReason}
            sending={pay.isPending}
          />
          <AccountsCard
            slug={slug}
            onQuery={sendQuery}
            queryDisabledReason={disabledReason}
            querying={query.isPending}
          />
          <div className="flex flex-col gap-3 panel p-4">
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Send results to
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Used by payments and balance queries sent from here
              </p>
            </div>
            <Field label="ResultURL">
              <TextInput
                name="resultUrl"
                type="url"
                value={result}
                onChange={(e) => setResultUrl(e.target.value.trim())}
              />
            </Field>
            <Field label="QueueTimeOutURL">
              <TextInput
                name="queueTimeOutUrl"
                type="url"
                value={timeout}
                onChange={(e) => setTimeoutUrl(e.target.value.trim())}
              />
            </Field>
          </div>
        </div>
      </div>

      <PayloadConsole
        entries={entries}
        title="result log"
        emptyState={[
          "waiting for a B2B payment or balance query…",
          "use the cards on the right, or call the API from your app",
        ]}
      />
    </div>
  );
}
