"use client";

import { formatKes } from "@/lib/format";
import {
  ActivityPanel as Shell,
  CopyId,
  DeliveryStep,
  DetailHeader,
  JsonDisclosure,
  Step,
  StepNote,
  at,
  elapsed,
} from "../../_components/activity";
import { darajaTime, sessionStatus, type InitiatorSession } from "../lib/sessions";

const STATUS_FACTS: [string, string][] = [
  ["TransactionStatus", "Status"],
  ["Amount", "Amount"],
  ["DebitPartyName", "From"],
  ["CreditPartyName", "To"],
  ["ReasonType", "ReasonType"],
  ["FinalisedTime", "Finalised"],
];

const REVERSAL_FACTS: [string, string][] = [
  ["Amount", "Refunded"],
  ["CreditPartyPublicName", "To"],
  ["DebitAccountBalance", "Utility balance after"],
  ["TransCompletedTime", "Completed"],
];

function facts(r: NonNullable<InitiatorSession["result"]>, keys: [string, string][]) {
  return keys
    .map(([key, label]) => {
      let value = r.params.find((p) => p.key === key)?.value ?? "";
      if (/Time$/.test(key)) value = darajaTime(value);
      if (key === "DebitAccountBalance") value = value.split("|")[2] ?? value;
      if (key === "Amount" || key === "DebitAccountBalance") value = value && `KES ${formatKes(Number(value))}`;
      return { label, value };
    })
    .filter((f) => f.value);
}

function Detail({ s }: { s: InitiatorSession }) {
  const st = sessionStatus(s);
  const r = s.result;
  const ok = r?.resultCode === "0";
  const isReversal = s.kind === "reversal";
  const rows = r && ok ? facts(r, isReversal ? REVERSAL_FACTS : STATUS_FACTS) : [];

  return (
    <div className="flex min-w-0 flex-col gap-5 p-5">
      <DetailHeader
        amount={s.amount}
        heading={isReversal ? undefined : "Status query"}
        tone={st.tone}
        status={st.label}
        facts={[
          <span key="t" className="font-mono">
            {isReversal ? "reverses" : "for"} {s.target || "—"}
          </span>,
          isReversal ? "TransactionReversal" : "TransactionStatusQuery",
        ]}
        id={r?.receipt ? <CopyId value={r.receipt} label="reversal receipt" /> : undefined}
      />

      <ol>
        <Step tone="success" title={isReversal ? "Reversal from your app" : "Status query from your app"} time={at(s.createdAt)}>
          <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
            POST {isReversal ? "/mpesa/reversal/v1/request" : "/mpesa/transactionstatus/v1/query"}
          </p>
          <JsonDisclosure label="Request body" code={s.request} />
        </Step>

        {s.rejected ? (
          <Step tone="danger" title="Rejected" time={s.response ? at(s.response.at) : undefined} last>
            <StepNote>{s.rejectionMessage ?? "The request was invalid."} Nothing was processed.</StepNote>
            <JsonDisclosure label="Error response" code={s.response?.body ?? ""} />
          </Step>
        ) : (
          <>
            <Step
              tone="success"
              title="Accepted for processing · ResponseCode 0"
              time={s.response ? at(s.response.at) : undefined}
              delta={s.response ? elapsed(s.createdAt, s.response.at) : undefined}>
              <StepNote>Only means queued. It doesn&apos;t say whether the receipt exists.</StepNote>
              <JsonDisclosure label="Response body" code={s.response?.body ?? ""} />
            </Step>

            {!r ? (
              <Step tone="pending" title="M-PESA is looking it up" last />
            ) : (
              <>
                <Step
                  tone={st.tone === "pending" ? "pending" : ok ? "success" : st.tone}
                  title={ok ? `${isReversal ? "Reversed" : "Found"} · ResultCode 0` : `${st.label} · ResultCode ${r.resultCode}`}
                  time={at(r.at)}
                  delta={elapsed(s.createdAt, r.at)}>
                  {rows.length > 0 && (
                    <dl className="mt-2 overflow-hidden rounded-lg ring-1 ring-border">
                      {rows.map((f) => (
                        <div
                          key={f.label}
                          className="flex justify-between gap-3 border-b border-border px-3 py-1.5 text-[12px] last:border-0">
                          <dt className="shrink-0 text-muted-foreground">{f.label}</dt>
                          <dd className="min-w-0 truncate text-right font-mono text-foreground tabular-nums" title={f.value}>
                            {f.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {!ok && (
                    <StepNote>
                      {r.resultDesc && <>{r.resultDesc} </>}
                      {isReversal ? "Nothing was refunded." : "No details came back."}
                    </StepNote>
                  )}
                </Step>
                <DeliveryStep
                  d={{ at: r.at, delivered: r.delivered, replay: false, url: r.url, sent: r.sent, attempts: r.attempts }}
                  from={s.createdAt}
                  noun="Result"
                  last
                />
              </>
            )}
          </>
        )}
      </ol>
    </div>
  );
}

/** Every status query and reversal, with the full story of the selected one. */
export default function ActivityPanel({ sessions, loading }: { sessions: InitiatorSession[]; loading?: boolean }) {
  const items = sessions.map((s) => {
    const st = sessionStatus(s);
    return {
      ...s,
      at: s.createdAt,
      title: s.kind === "status" ? "Status query" : undefined,
      who: s.target || "—",
      reference: s.kind === "reversal" ? "Reversal" : "",
      tone: st.tone,
      status: st.label,
    };
  });
  return (
    <Shell
      loading={loading}
      description="Every status query and reversal, step by step."
      items={items}
      empty={{
        title: "Nothing yet",
        body: (
          <>
            Pick a receipt in the ledger and use <span className="font-medium text-foreground">Check status</span> or{" "}
            <span className="font-medium text-foreground">Reverse</span>, or call the API from your app.
          </>
        ),
      }}
      renderDetail={(s) => <Detail s={s} />}
    />
  );
}
