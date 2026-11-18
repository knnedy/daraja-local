import type { RequestLogEntry } from "@/lib/types/request-log";
import {
  type DeliveryAttempt,
  type RawAttempt,
  groupByCorrelation,
  parse,
  pretty,
  toAttempt,
} from "@/lib/request-log/delivery";

export type { DeliveryAttempt };

export type ValidationStep = {
  ran: true;
  accepted: boolean;
  fallback: boolean;
  resultCode: string;
  resultDesc: string;
  httpStatus: number;
  err: string;
  url: string;
  sent: string;
  attempt: DeliveryAttempt | null;
};

/** One Delivery of the Confirmation: the original, or a replay. */
export type ConfirmationDelivery = {
  at: string;
  delivered: boolean;
  replay: boolean;
  url: string;
  sent: string;
  attempts: DeliveryAttempt[];
};

export type ConfirmationStep = {
  /** Whether the most recent Delivery got through. */
  delivered: boolean;
  attempts: number;
  /** Every Delivery, oldest first. */
  deliveries: ConfirmationDelivery[];
};

export type PaymentSession = {
  id: string;
  createdAt: string;
  rejected: boolean;
  rejectionMessage: string | null;
  amount: string;
  msisdn: string;
  billRef: string;
  commandId: string;
  transId: string | null;
  validation: ValidationStep | null;
  confirmation: ConfirmationStep | null;
};

/** Simulated payments, newest first. */
export function derivePayments(entries: RequestLogEntry[]): PaymentSession[] {
  const sessions: PaymentSession[] = [];

  for (const [id, rows] of groupByCorrelation(entries)) {
    const inbound = rows.find(
      (r) => r.operation === "c2b_simulate" && r.step === "request",
    );
    if (!inbound) continue;

    const body = parse<{
      CommandID?: string;
      Amount?: string;
      Msisdn?: string;
      BillRefNumber?: string;
    }>(inbound.payload);

    const session: PaymentSession = {
      id,
      createdAt: inbound.createdAt,
      rejected: inbound.status === "rejected",
      rejectionMessage: null,
      amount: body?.Amount ?? "0",
      msisdn: body?.Msisdn ?? "",
      billRef: body?.BillRefNumber ?? "",
      commandId: body?.CommandID ?? "",
      transId: null,
      validation: null,
      confirmation: null,
    };

    for (const row of rows) {
      if (row.step === "rejection") {
        const err = parse<{ errorMessage?: string }>(row.payload);
        session.rejectionMessage = err?.errorMessage ?? null;
        continue;
      }

      if (row.step === "validation") {
        const result = parse<{
          Accepted?: boolean;
          Fallback?: boolean;
          ResultCode?: string;
          ResultDesc?: string;
          HTTPStatus?: number;
          Err?: string;
          URL?: string;
          DurationMs?: number;
          Reply?: string;
          Payload?: unknown;
        }>(row.payload);
        session.validation = {
          ran: true,
          accepted: result?.Accepted ?? false,
          fallback: result?.Fallback ?? false,
          resultCode: result?.ResultCode ?? "",
          resultDesc: result?.ResultDesc ?? "",
          httpStatus: result?.HTTPStatus ?? 0,
          err: result?.Err ?? "",
          url: result?.URL ?? "",
          sent: pretty(result?.Payload),
          // Older entries predate URL; with no URL there was no record of the call.
          attempt: result?.URL
            ? {
                at: row.createdAt,
                statusCode: result.HTTPStatus ?? 0,
                err: result.Err ?? "",
                durationMs: result.DurationMs ?? null,
                reply: result.Reply ?? "",
              }
            : null,
        };
        continue;
      }

      if (row.step === "confirmation") {
        const delivery = parse<{
          payload?: { TransID?: string };
          url?: string;
          replay?: boolean;
          attempts?: RawAttempt[];
        }>(row.payload);
        session.transId ??= delivery?.payload?.TransID ?? null;
        const entry: ConfirmationDelivery = {
          at: row.createdAt,
          delivered: row.status === "delivered",
          replay: delivery?.replay ?? false,
          url: delivery?.url ?? "",
          sent: pretty(delivery?.payload),
          attempts: (delivery?.attempts ?? []).map(toAttempt),
        };
        // Rows arrive newest first, so the first one seen is the latest.
        if (!session.confirmation) {
          session.confirmation = {
            delivered: entry.delivered,
            attempts: row.attempts,
            deliveries: [entry],
          };
        } else {
          session.confirmation.deliveries.unshift(entry);
        }
      }
    }

    sessions.push(session);
  }

  return sessions;
}
