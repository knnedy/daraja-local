import type { RequestLogEntry } from "@/lib/types/request-log";
import type { B2COutcome } from "@/lib/types/b2c";
import {
  type DeliveryAttempt,
  type RawAttempt,
  parse,
  pretty,
  toAttempt,
} from "@/lib/request-log/delivery";

/** What Daraja Local posted back once the payout was processed. */
export type PayoutResult = {
  /** "timeout" went to QueueTimeOutURL; "result" to ResultURL. */
  step: "result" | "timeout";
  outcome: B2COutcome;
  resultCode: number | null;
  resultDesc: string;
  transactionId: string;
  receiverName: string;
  utilityAfter: number | null;
  delivered: boolean;
  at: string;
  url: string;
  sent: string;
  attempts: DeliveryAttempt[];
};

export type PayoutSession = {
  id: string;
  createdAt: string;
  rejected: boolean;
  rejectionMessage: string | null;
  originatorId: string;
  commandId: string;
  amount: string;
  partyB: string;
  remarks: string;
  result: PayoutResult | null;
};

type RequestBody = {
  OriginatorConversationID?: string;
  CommandID?: string;
  Amount?: string | number;
  PartyB?: string | number;
  Remarks?: string;
};

type ResultBody = {
  Result?: {
    ResultCode?: number;
    ResultDesc?: string;
    TransactionID?: string;
    ResultParameters?: {
      ResultParameter?: { Key: string; Value: unknown }[];
    };
  };
};

function param(body: ResultBody | undefined, key: string): unknown {
  return body?.Result?.ResultParameters?.ResultParameter?.find(
    (p) => p.Key === key,
  )?.Value;
}

/** B2C payouts, newest first. */
export function derivePayouts(entries: RequestLogEntry[]): PayoutSession[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const rows = new Map<string, RequestLogEntry[]>();
  for (const entry of entries) {
    if (!entry.correlationId) continue;
    const list = rows.get(entry.correlationId) ?? [];
    list.push(entry);
    rows.set(entry.correlationId, list);
  }

  const sessions: PayoutSession[] = [];
  for (const entry of entries) {
    if (entry.operation !== "b2c_payment" || entry.step !== "request") continue;

    const body = parse<RequestBody>(entry.payload);
    const session: PayoutSession = {
      id: entry.correlationId ?? `row-${entry.id}`,
      createdAt: entry.createdAt,
      rejected: entry.status === "rejected",
      rejectionMessage: null,
      originatorId: body?.OriginatorConversationID ?? "",
      commandId: body?.CommandID ?? "",
      amount: String(body?.Amount ?? "0"),
      partyB: String(body?.PartyB ?? ""),
      remarks: body?.Remarks ?? "",
      result: null,
    };

    // A rejected request has no ConversationID; its error is the next Entry.
    if (session.rejected) {
      const rejection = byId.get(entry.id + 1);
      if (rejection?.step === "rejection") {
        session.rejectionMessage =
          parse<{ errorMessage?: string }>(rejection.payload)?.errorMessage ??
          null;
      }
    }

    for (const row of rows.get(session.id) ?? []) {
      if (row.step !== "result" && row.step !== "timeout") continue;
      const delivery = parse<{
        payload?: ResultBody;
        url?: string;
        attempts?: RawAttempt[];
      }>(row.payload);
      const utility = param(
        delivery?.payload,
        "B2CUtilityAccountAvailableFunds",
      );
      session.result = {
        step: row.step,
        outcome: (row.outcome ?? "completed") as B2COutcome,
        resultCode: delivery?.payload?.Result?.ResultCode ?? null,
        resultDesc: delivery?.payload?.Result?.ResultDesc ?? "",
        transactionId: delivery?.payload?.Result?.TransactionID ?? "",
        receiverName: String(
          param(delivery?.payload, "ReceiverPartyPublicName") ?? "",
        ),
        utilityAfter: typeof utility === "number" ? utility : null,
        delivered: row.status === "delivered",
        at: row.createdAt,
        url: delivery?.url ?? "",
        sent: pretty(delivery?.payload),
        attempts: (delivery?.attempts ?? []).map(toAttempt),
      };
    }

    sessions.push(session);
  }
  return sessions;
}
