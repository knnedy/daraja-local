import type { RequestLogEntry } from "@/lib/types/request-log";

export type ValidationStep = {
  ran: true;
  accepted: boolean;
  fallback: boolean;
  resultCode: string;
  resultDesc: string;
  httpStatus: number;
  err: string;
};

export type ConfirmationStep = {
  delivered: boolean;
  attempts: number;
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

export type Registration = {
  createdAt: string;
  shortCode: string;
  responseType: string;
  confirmationUrl: string;
  validationUrl: string;
};

function parse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function groupByCorrelation(entries: RequestLogEntry[]) {
  const groups = new Map<string, RequestLogEntry[]>();
  for (const entry of entries) {
    const key = entry.correlationId ?? `row-${entry.id}`;
    const existing = groups.get(key);
    if (existing) existing.push(entry);
    else groups.set(key, [entry]);
  }
  return groups;
}

/** Latest successful registerurl call, or null if never registered. */
export function deriveRegistration(
  entries: RequestLogEntry[],
): Registration | null {
  for (const entry of entries) {
    if (entry.direction !== "inbound" || entry.status !== "accepted") continue;
    const body = parse<{
      ShortCode?: string;
      ResponseType?: string;
      ConfirmationURL?: string;
      ValidationURL?: string;
    }>(entry.payload);
    if (!body?.ConfirmationURL) continue;
    return {
      createdAt: entry.createdAt,
      shortCode: body.ShortCode ?? "",
      responseType: body.ResponseType ?? "Completed",
      confirmationUrl: body.ConfirmationURL,
      validationUrl: body.ValidationURL ?? "",
    };
  }
  return null;
}

/** Simulated payments, newest first. */
export function derivePayments(entries: RequestLogEntry[]): PaymentSession[] {
  const sessions: PaymentSession[] = [];

  for (const [id, rows] of groupByCorrelation(entries)) {
    const inbound = rows.find((r) => r.direction === "inbound");
    if (!inbound) continue;

    const body = parse<{
      CommandID?: string;
      Amount?: string;
      Msisdn?: string;
      BillRefNumber?: string;
    }>(inbound.payload);
    if (!body?.CommandID) continue;

    const session: PaymentSession = {
      id,
      createdAt: inbound.createdAt,
      rejected: inbound.status === "rejected",
      rejectionMessage: null,
      amount: body.Amount ?? "0",
      msisdn: body.Msisdn ?? "",
      billRef: body.BillRefNumber ?? "",
      commandId: body.CommandID,
      transId: null,
      validation: null,
      confirmation: null,
    };

    for (const row of rows) {
      if (row.direction !== "outbound") continue;

      if (row.status === "rejected") {
        const err = parse<{ errorMessage?: string }>(row.payload);
        session.rejectionMessage = err?.errorMessage ?? null;
        continue;
      }

      if (row.outcome === "accepted" || row.outcome === "rejected") {
        const result = parse<{
          Accepted?: boolean;
          Fallback?: boolean;
          ResultCode?: string;
          ResultDesc?: string;
          HTTPStatus?: number;
          Err?: string;
        }>(row.payload);
        session.validation = {
          ran: true,
          accepted: result?.Accepted ?? false,
          fallback: result?.Fallback ?? false,
          resultCode: result?.ResultCode ?? "",
          resultDesc: result?.ResultDesc ?? "",
          httpStatus: result?.HTTPStatus ?? 0,
          err: result?.Err ?? "",
        };
        continue;
      }

      if (row.outcome === "confirmed") {
        const delivery = parse<{ payload?: { TransID?: string } }>(row.payload);
        session.transId = delivery?.payload?.TransID ?? null;
        session.confirmation = {
          delivered: row.status === "delivered",
          attempts: row.attempts,
        };
      }
    }

    sessions.push(session);
  }

  return sessions;
}
