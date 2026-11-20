import type { Tone } from "../../_components/activity";
import type { RequestLogEntry } from "@/lib/types/request-log";
import {
  type DeliveryAttempt,
  type RawAttempt,
  parse,
  pretty,
  toAttempt,
} from "@/lib/request-log/delivery";

type Param = { Key: string; Value: unknown };

/** What came back to the ResultURL for a status query or a reversal. */
export type InitiatorResult = {
  /** A number, or a string such as "R000002" for some failures; kept as text. */
  resultCode: string;
  resultDesc: string;
  /** The new reversal receipt, for a completed reversal. */
  receipt: string;
  params: { key: string; value: string }[];
  delivered: boolean;
  at: string;
  url: string;
  sent: string;
  attempts: DeliveryAttempt[];
};

/** A Transaction Status query or a Reversal, from request to result. */
export type InitiatorSession = {
  id: string;
  kind: "status" | "reversal";
  createdAt: string;
  rejected: boolean;
  rejectionMessage: string | null;
  /** The receipt (or OriginalConversationID) the request named. */
  target: string;
  amount: string;
  request: string;
  response: { at: string; body: string } | null;
  result: InitiatorResult | null;
};

const OPERATIONS = new Set(["transaction_status", "reversal"]);

type Body = Record<string, string | number | undefined>;

/** Status queries and reversals, newest first. */
export function deriveSessions(entries: RequestLogEntry[]): InitiatorSession[] {
  const ours = entries.filter((e) => OPERATIONS.has(e.operation)).sort((a, b) => a.id - b.id);
  const groups = new Map<string, RequestLogEntry[]>();
  for (const e of ours) {
    if (!e.correlationId) continue;
    groups.set(e.correlationId, [...(groups.get(e.correlationId) ?? []), e]);
  }

  const sessions: InitiatorSession[] = [];
  for (const req of ours) {
    if (req.step !== "request") continue;
    const body = parse<Body>(req.payload) ?? {};
    const target = body.TransactionID || body["Transaction ID"] || body.OriginalConversationID || "";
    const s: InitiatorSession = {
      id: req.correlationId || `rejected-${req.id}`,
      kind: req.operation === "reversal" ? "reversal" : "status",
      createdAt: req.createdAt,
      rejected: !req.correlationId || req.status === "rejected",
      rejectionMessage: null,
      target: String(target),
      amount: body.Amount === undefined ? "" : String(body.Amount),
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
      } else if (row.step === "result") {
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
          resultCode: code,
          resultDesc: r?.ResultDesc ?? "",
          receipt: s.kind === "reversal" && code === "0" ? (r?.TransactionID ?? "") : "",
          params: params.map((p) => ({ key: p.Key, value: p.Value == null ? "" : String(p.Value) })),
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

/** "20261120170322" → "20 Nov, 17:03:22". */
export function darajaTime(v: string) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return v;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${m[4]}:${m[5]}:${m[6]}`;
}

const FAILURES: Record<string, string> = {
  "2001": "Bad initiator",
  "2032": "Not found",
  R000001: "Already reversed",
  R000002: "Invalid receipt",
  "1": "No balance",
};

/** The one-word state of a status query or reversal. */
export function sessionStatus(s: InitiatorSession): { label: string; tone: Tone } {
  if (s.rejected) return { label: "Rejected", tone: "danger" };
  if (!s.result) return { label: "Processing", tone: "pending" };
  const code = s.result.resultCode;
  if (code === "0") return { label: s.kind === "reversal" ? "Reversed" : "Found", tone: "success" };
  if (code === "R000001") return { label: FAILURES[code], tone: "warning" };
  return { label: FAILURES[code] ?? `Failed · ${code}`, tone: "danger" };
}
