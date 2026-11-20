import type { RequestLogEntry } from "@/lib/types/request-log";
import {
  type DeliveryAttempt,
  type RawAttempt,
  parse,
  pretty,
  toAttempt,
} from "@/lib/request-log/delivery";

type Param = { Key: string; Value: unknown };

export type BalanceLine = { name: string; available: string };

/** What came back to the ResultURL (or QueueTimeOutURL). */
export type B2BResult = {
  step: "result" | "timeout";
  /** Account Balance sends it as a string, B2B as a number; kept as text. */
  resultCode: string;
  resultDesc: string;
  receipt: string;
  params: { key: string; value: string }[];
  accounts: BalanceLine[];
  delivered: boolean;
  at: string;
  url: string;
  sent: string;
  attempts: DeliveryAttempt[];
};

/** A B2B payment or an Account Balance query, from request to result. */
export type B2BSession = {
  id: string;
  kind: "payment" | "balance";
  createdAt: string;
  rejected: boolean;
  rejectionMessage: string | null;
  commandId: string;
  amount: string;
  partyB: string;
  accountReference: string;
  request: string;
  response: { at: string; body: string } | null;
  result: B2BResult | null;
};

/** "Working Account|KES|700000.00|700000.00|0.00|0.00&..." → name and available balance. */
export function splitAccounts(value: unknown): BalanceLine[] {
  if (typeof value !== "string") return [];
  return value
    .split("&")
    .map((line) => line.split("|"))
    .filter((parts) => parts.length >= 3)
    .map(([name, , available]) => ({ name, available }));
}

const OPERATIONS = new Set(["b2b_payment", "account_balance"]);

type Body = {
  CommandID?: string;
  "Command ID"?: string;
  Amount?: string | number;
  PartyB?: string | number;
  AccountReference?: string;
};

/** Payments and balance queries, newest first. */
export function deriveSessions(entries: RequestLogEntry[]): B2BSession[] {
  const ours = entries.filter((e) => OPERATIONS.has(e.operation)).sort((a, b) => a.id - b.id);
  const groups = new Map<string, RequestLogEntry[]>();
  for (const e of ours) {
    if (!e.correlationId) continue;
    groups.set(e.correlationId, [...(groups.get(e.correlationId) ?? []), e]);
  }

  const sessions: B2BSession[] = [];
  for (const req of ours) {
    if (req.step !== "request") continue;
    const body = parse<Body>(req.payload) ?? {};
    const s: B2BSession = {
      id: req.correlationId || `rejected-${req.id}`,
      kind: req.operation === "account_balance" ? "balance" : "payment",
      createdAt: req.createdAt,
      rejected: !req.correlationId || req.status === "rejected",
      rejectionMessage: null,
      commandId: body.CommandID ?? body["Command ID"] ?? "",
      amount: body.Amount === undefined ? "" : String(body.Amount),
      partyB: body.PartyB === undefined ? "" : String(body.PartyB),
      accountReference: body.AccountReference ?? "",
      request: pretty(body) || req.payload,
      response: null,
      result: null,
    };

    if (s.rejected) {
      // A rejected request has no ConversationID; its rejection is the next uncorrelated entry.
      const rej = ours.find((e) => e.id > req.id && !e.correlationId && e.step === "rejection" && e.operation === req.operation);
      if (rej) {
        s.response = { at: rej.createdAt, body: pretty(parse(rej.payload)) || rej.payload };
        s.rejectionMessage = parse<{ errorMessage?: string }>(rej.payload)?.errorMessage ?? null;
      }
      sessions.push(s);
      continue;
    }

    for (const row of groups.get(s.id) ?? []) {
      if (row.step === "acceptance") {
        s.response = { at: row.createdAt, body: pretty(parse(row.payload)) || row.payload };
      } else if (row.step === "result" || row.step === "timeout") {
        const d = parse<{
          payload?: {
            Result?: {
              ResultCode?: unknown;
              ResultDesc?: string;
              TransactionID?: string;
              ResultParameters?: { ResultParameter?: Param | Param[] };
            };
          };
          url?: string;
          attempts?: RawAttempt[];
        }>(row.payload);
        const r = d?.payload?.Result;
        const code = String(r?.ResultCode ?? "");
        const raw = r?.ResultParameters?.ResultParameter;
        const params = Array.isArray(raw) ? raw : raw ? [raw] : [];
        s.result = {
          step: row.step,
          resultCode: code,
          resultDesc: r?.ResultDesc ?? "",
          receipt: s.kind === "payment" && code === "0" ? (r?.TransactionID ?? "") : "",
          params: params.map((p) => ({ key: p.Key, value: String(p.Value ?? "") })),
          accounts: splitAccounts(params.find((p) => p.Key === "AccountBalance")?.Value),
          delivered: row.status === "delivered",
          at: row.createdAt,
          url: d?.url ?? "",
          sent: pretty(d?.payload),
          attempts: (d?.attempts ?? []).map(toAttempt),
        };
      }
    }
    sessions.push(s);
  }

  return sessions.reverse();
}
