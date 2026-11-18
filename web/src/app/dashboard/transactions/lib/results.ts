import type { RequestLogEntry } from "@/lib/types/request-log";
import {
  type DeliveryAttempt,
  type RawAttempt,
  parse,
  pretty,
  toAttempt,
} from "@/lib/request-log/delivery";

/** One Result posted back for a Transaction Status query or a Reversal. */
export type InitiatorResult = {
  id: number;
  operation: "transaction_status" | "reversal";
  outcome: string;
  /** A number, or a string such as "R000002" for some Reversal failures. */
  resultCode: string;
  resultDesc: string;
  /** The receipt the request asked about. */
  receipt: string;
  delivered: boolean;
  at: string;
  url: string;
  sent: string;
  attempts: DeliveryAttempt[];
};

/** Results, newest first, with the receipt each request named. */
export function deriveResults(entries: RequestLogEntry[]): InitiatorResult[] {
  const receipts = new Map<string, string>();
  for (const e of entries) {
    if (e.step !== "request" || !e.correlationId) continue;
    const body = parse<Record<string, string>>(e.payload);
    receipts.set(
      e.correlationId,
      body?.TransactionID ||
        body?.["Transaction ID"] ||
        body?.OriginalConversationID ||
        "",
    );
  }

  return entries
    .filter(
      (e) =>
        e.step === "result" &&
        (e.operation === "transaction_status" || e.operation === "reversal"),
    )
    .sort((a, b) => b.id - a.id)
    .map((e) => {
      const delivery = parse<{
        payload?: { Result?: { ResultCode?: unknown; ResultDesc?: string } };
        url?: string;
        attempts?: RawAttempt[];
      }>(e.payload);
      return {
        id: e.id,
        operation: e.operation as InitiatorResult["operation"],
        outcome: e.outcome ?? "",
        resultCode: String(delivery?.payload?.Result?.ResultCode ?? ""),
        resultDesc: delivery?.payload?.Result?.ResultDesc ?? "",
        receipt: receipts.get(e.correlationId ?? "") ?? "",
        delivered: e.status === "delivered",
        at: e.createdAt,
        url: delivery?.url ?? "",
        sent: pretty(delivery?.payload),
        attempts: (delivery?.attempts ?? []).map(toAttempt),
      };
    });
}
