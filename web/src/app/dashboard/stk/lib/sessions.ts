import type { RequestLogEntry } from "@/lib/types/request-log";
import { parse, pretty, groupByCorrelation } from "@/lib/request-log/delivery";
import { derivePayments, type CallbackDelivery } from "./callbacks";

/** One STK Push the project received: accepted with its callbacks, or rejected outright. */
export type StkAttempt = {
  id: string;
  rejected: boolean;
  amount: string;
  phone: string;
  reference: string;
  at: string;
  request: string;
  response: { at: string; body: string } | null;
  rejection: { code: string; message: string } | null;
  /** "" while the customer hasn't answered. */
  outcome: string;
  resultCode: string;
  deliveries: CallbackDelivery[];
};

export function deriveAttempts(entries: RequestLogEntry[]): StkAttempt[] {
  const groups = groupByCorrelation(entries);
  const attempts: StkAttempt[] = derivePayments(entries).map((p) => {
    const group = groups.get(p.checkoutRequestId) ?? [];
    const request = group.find((e) => e.step === "request");
    const acceptance = group.find((e) => e.step === "acceptance");
    return {
      id: p.checkoutRequestId,
      rejected: false,
      amount: p.amount,
      phone: p.phone,
      reference: p.reference,
      at: p.at,
      request: pretty(parse(request?.payload ?? "")) || (request?.payload ?? ""),
      response: acceptance
        ? { at: acceptance.createdAt, body: pretty(parse(acceptance.payload)) || acceptance.payload }
        : null,
      rejection: null,
      outcome: p.outcome,
      resultCode: p.resultCode,
      deliveries: p.deliveries,
    };
  });

  // A rejected request has no CheckoutRequestID; its rejection is the next uncorrelated entry.
  const loose = entries
    .filter((e) => !e.correlationId && e.operation === "stk_push")
    .sort((a, b) => a.id - b.id);
  for (const req of loose) {
    if (req.step !== "request") continue;
    const rej = loose.find((e) => e.step === "rejection" && e.id > req.id);
    const body = parse<Record<string, unknown>>(req.payload) ?? {};
    const err = parse<{ errorCode?: string; errorMessage?: string }>(rej?.payload ?? "") ?? {};
    attempts.push({
      id: `rejected-${req.id}`,
      rejected: true,
      amount: String(body.Amount ?? ""),
      phone: String(body.PhoneNumber ?? ""),
      reference: String(body.AccountReference ?? ""),
      at: req.createdAt,
      request: pretty(body) || req.payload,
      response: rej ? { at: rej.createdAt, body: pretty(parse(rej.payload)) || rej.payload } : null,
      rejection: { code: err.errorCode ?? "", message: err.errorMessage ?? "Rejected" },
      outcome: "",
      resultCode: "",
      deliveries: [],
    });
  }

  return attempts.sort((a, b) => b.at.localeCompare(a.at));
}
