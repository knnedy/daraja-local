"use client";

import { useState } from "react";
import RequestBar from "../_components/request-bar";
import PayloadConsole from "../_components/payload-console";
import HowItWorks from "./_components/how-it-works";
import IntegrationPanel from "./_components/integration-panel";
import TransactionsTable from "./_components/transactions-table";
import LatestResult from "./_components/latest-result";
import { deriveResults } from "./lib/results";
import { useLiveRequestLog } from "@/hooks/use-request-log";
import { useInitiatorCall, useTransactions } from "@/hooks/use-transactions";
import { useProject } from "@/hooks/use-projects";
import { useActiveProjectStore } from "@/store/active-project";
import type { Transaction } from "@/lib/types/transactions";
import { Field, TextInput } from "@/components/form";
import { PageHeader } from "@/components/page-header";

export default function TransactionsPage() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const { data: transactions = [] } = useTransactions(slug);
  const { data: statusLog = [] } = useLiveRequestLog(
    slug,
    "transaction_status",
  );
  const { data: reversalLog = [] } = useLiveRequestLog(slug, "reversal");
  const status = useInitiatorCall(slug, "status");
  const reverse = useInitiatorCall(slug, "reverse");

  const base = project?.callbackBaseUrl.replace(/\/+$/, "") ?? "";
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [timeoutUrl, setTimeoutUrl] = useState<string | null>(null);
  // The newest log id when a request was sent here; newer results answer it.
  const [sentAt, setSentAt] = useState<number | null>(null);

  if (!slug) return null;

  const result = resultUrl ?? (base ? `${base}/transactions/result` : "");
  const timeout = timeoutUrl ?? (base ? `${base}/transactions/timeout` : "");
  const urlsValid = [result, timeout].every((u) => /^https?:\/\/\S+$/.test(u));

  const entries = [...statusLog, ...reversalLog].sort((a, b) => b.id - a.id);
  const results = deriveResults(entries);
  const latest = results[0] ?? null;
  const waiting = sentAt !== null && (latest?.id ?? 0) <= sentAt;

  function send(action: typeof status, t: Transaction) {
    setSentAt(entries[0]?.id ?? 0);
    action.mutate(
      {
        receipt: t.receipt,
        amount: t.amount,
        resultUrl: result,
        queueTimeOutUrl: timeout,
      },
      { onError: () => setSentAt(null) },
    );
  }

  const failed = status.error ?? reverse.error;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        page="transactions"
        title="Transactions"
        description={<>Every completed payment, ready to check with Transaction Status or undo with Reversal.</>}
      />

      <HowItWorks />

      <div className="flex flex-col gap-2.5">
        <RequestBar
          path="/mpesa/transactionstatus/v1/query"
          label="transaction status"
        />
        <RequestBar path="/mpesa/reversal/v1/request" label="reversal" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <TransactionsTable
            transactions={transactions}
            busy={status.isPending || reverse.isPending}
            disabledReason={
              urlsValid ? null : "Set a ResultURL and QueueTimeOutURL first"
            }
            onStatus={(t) => send(status, t)}
            onReverse={(t) => send(reverse, t)}
          />
          {failed && (
            <p className="text-[11px] text-destructive">{failed.message}</p>
          )}
          <LatestResult result={latest} waiting={waiting} />
          <IntegrationPanel />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 panel p-4">
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Send results to
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Used by the Status and Reverse buttons
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
          "waiting for a status query or reversal…",
          "use the buttons above, or call the API from your app",
        ]}
      />
    </div>
  );
}
