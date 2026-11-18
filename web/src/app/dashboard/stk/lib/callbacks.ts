import type { RequestLogEntry } from "@/lib/types/request-log";
import {
  type DeliveryAttempt,
  type RawAttempt,
  groupByCorrelation,
  parse,
  pretty,
  toAttempt,
} from "@/lib/request-log/delivery";

/** One time the callback was POSTed to the developer's CallBackURL. */
export type CallbackDelivery = {
  replay: boolean;
  delivered: boolean;
  at: string;
  url: string;
  sent: string;
  attempts: DeliveryAttempt[];
};

/** An STK payment and every callback sent for it, oldest delivery first. */
export type StkPayment = {
  checkoutRequestId: string;
  amount: string;
  phone: string;
  reference: string;
  /** "" while the customer hasn't answered. */
  outcome: string;
  resultCode: string;
  at: string;
  deliveries: CallbackDelivery[];
};

/** Payments that opened a session, newest first. */
export function derivePayments(entries: RequestLogEntry[]): StkPayment[] {
  const payments: StkPayment[] = [];
  for (const [id, group] of groupByCorrelation(entries)) {
    const request = group.find(
      (e) => e.operation === "stk_push" && e.step === "request",
    );
    if (!request || !request.correlationId) continue;
    const body = parse<Record<string, unknown>>(request.payload) ?? {};

    const callbacks = group
      .filter((e) => e.step === "callback")
      .sort((a, b) => a.id - b.id);
    const deliveries = callbacks.map((e) => {
      const stored = parse<{
        callback?: unknown;
        url?: string;
        replay?: boolean;
        attempts?: RawAttempt[];
      }>(e.payload);
      return {
        replay: Boolean(stored?.replay),
        delivered: e.status === "delivered",
        at: e.createdAt,
        url: stored?.url ?? "",
        sent: pretty(stored?.callback),
        attempts: (stored?.attempts ?? []).map(toAttempt),
      };
    });
    const first = callbacks[0];
    const code = parse<{
      callback?: { Body?: { stkCallback?: { ResultCode?: unknown } } };
    }>(first?.payload ?? "")?.callback?.Body?.stkCallback?.ResultCode;

    payments.push({
      checkoutRequestId: id,
      amount: String(body.Amount ?? ""),
      phone: String(body.PhoneNumber ?? ""),
      reference: String(body.AccountReference ?? ""),
      outcome: first?.outcome ?? "",
      resultCode: code === undefined ? "" : String(code),
      at: request.createdAt,
      deliveries,
    });
  }
  return payments.sort((a, b) => b.at.localeCompare(a.at));
}
