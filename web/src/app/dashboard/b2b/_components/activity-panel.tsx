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
  type Tone,
} from "../../_components/activity";
import { splitAccounts, type B2BSession } from "../lib/sessions";

const COMMANDS: Record<string, string> = {
  BusinessPayBill: "Pay Bill",
  BusinessBuyGoods: "Buy Goods",
  AccountBalance: "Account Balance",
};

// "20261120170322" → "20 Nov, 17:03:22".
function completedAt(v: string) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return v;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${m[4]}:${m[5]}:${m[6]}`;
}

function paymentFacts(params: { key: string; value: string }[]) {
  const get = (k: string) => params.find((p) => p.key === k)?.value ?? "";
  const after = splitAccounts(get("DebitPartyAffectedAccountBalance"))[0];
  return [
    { label: "Receiver", value: get("ReceiverPartyPublicName") },
    { label: "Amount", value: get("Amount") && `KES ${formatKes(Number(get("Amount")))}` },
    { label: "Working balance after", value: after ? `KES ${formatKes(Number(after.available))}` : "" },
    { label: "Completed", value: get("TransCompletedTime") && completedAt(get("TransCompletedTime")) },
  ].filter((f) => f.value);
}

function Facts({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="mt-2 overflow-hidden rounded-lg ring-1 ring-border">
      {rows.map((f) => (
        <div key={f.label} className="flex justify-between gap-3 border-b border-border px-3 py-1.5 text-[12px] last:border-0">
          <dt className="shrink-0 text-muted-foreground">{f.label}</dt>
          <dd className="min-w-0 truncate text-right font-mono text-foreground tabular-nums" title={f.value}>
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function statusOf(s: B2BSession): { label: string; tone: Tone } {
  if (s.rejected) return { label: "Rejected", tone: "danger" };
  if (!s.result) return { label: "Processing", tone: "pending" };
  if (s.result.resultCode === "0") return { label: s.kind === "balance" ? "Reported" : "Paid", tone: "success" };
  if (s.result.step === "timeout") return { label: "Timed out", tone: "warning" };
  return { label: `Failed · ${s.result.resultCode}`, tone: "danger" };
}

function Detail({ s }: { s: B2BSession }) {
  const status = statusOf(s);
  const r = s.result;
  const ok = r?.resultCode === "0";
  const isPayment = s.kind === "payment";

  return (
    <div className="flex min-w-0 flex-col gap-5 p-5">
      <DetailHeader
        amount={s.amount}
        heading={isPayment ? undefined : "Balance query"}
        tone={status.tone}
        status={status.label}
        facts={
          isPayment
            ? [
                <span key="to" className="font-mono">
                  to {s.partyB || "—"}
                </span>,
                COMMANDS[s.commandId] ?? s.commandId,
                s.accountReference && `Ref ${s.accountReference}`,
              ]
            : ["Every account on your shortcode"]
        }
        id={r?.receipt ? <CopyId value={r.receipt} label="TransactionID" /> : undefined}
      />

      <ol>
        <Step tone="success" title={isPayment ? "Payment request from your app" : "Balance query from your app"} time={at(s.createdAt)}>
          <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
            POST {isPayment ? "/mpesa/b2b/v1/paymentrequest" : "/mpesa/accountbalance/v1/query"}
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
              <StepNote>Only means queued. The answer arrives at your ResultURL.</StepNote>
              <JsonDisclosure label="Response body" code={s.response?.body ?? ""} />
            </Step>

            {!r ? (
              <Step tone="pending" title="M-PESA is processing it" last />
            ) : (
              <>
                <Step
                  tone={ok ? "success" : r.step === "timeout" ? "warning" : "danger"}
                  title={
                    ok
                      ? isPayment
                        ? "Paid · ResultCode 0"
                        : "Balances reported · ResultCode 0"
                      : `${r.step === "timeout" ? "Timed out" : "Failed"} · ResultCode ${r.resultCode}`
                  }
                  time={at(r.at)}
                  delta={elapsed(s.createdAt, r.at)}>
                  {ok && isPayment && <Facts rows={paymentFacts(r.params)} />}
                  {ok && !isPayment && (
                    <Facts rows={r.accounts.map((x) => ({ label: x.name, value: `KES ${formatKes(Number(x.available))}` }))} />
                  )}
                  {!ok && (
                    <StepNote>
                      {r.resultDesc && <>{r.resultDesc} </>}
                      {isPayment ? "No money moved." : "No balances were reported."}
                    </StepNote>
                  )}
                </Step>
                <DeliveryStep
                  d={{ at: r.at, delivered: r.delivered, replay: false, url: r.url, sent: r.sent, attempts: r.attempts }}
                  from={s.createdAt}
                  noun={r.step === "timeout" ? "Timeout notice" : "Result"}
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

/** Every B2B payment and balance query, with the full story of the selected one. */
export default function ActivityPanel({ sessions, loading }: { sessions: B2BSession[]; loading?: boolean }) {
  const items = sessions.map((s) => {
    const st = statusOf(s);
    return {
      ...s,
      at: s.createdAt,
      title: s.kind === "balance" ? "Balance query" : undefined,
      who: s.kind === "payment" ? `to ${s.partyB}` : "Account Balance",
      reference: s.kind === "payment" ? (COMMANDS[s.commandId] ?? "") : "",
      tone: st.tone,
      status: st.label,
    };
  });
  return (
    <Shell
      loading={loading}
      description="Every B2B payment and balance query, step by step."
      items={items}
      empty={{
        title: "Nothing yet",
        body: (
          <>
            Use <span className="font-medium text-foreground">Pay a business</span> or{" "}
            <span className="font-medium text-foreground">Query</span> on your accounts, or call the API from your app.
          </>
        ),
      }}
      renderDetail={(s) => <Detail s={s} />}
    />
  );
}
