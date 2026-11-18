import type { RequestLogEntry } from "@/lib/types/request-log";
import {
  type DeliveryAttempt,
  type RawAttempt,
  parse,
  pretty,
  toAttempt,
} from "@/lib/request-log/delivery";

/** One Result posted back for a B2B payment or an Account Balance query. */
export type B2BResult = {
  id: number;
  operation: "b2b_payment" | "account_balance";
  /** Account Balance sends it as a string, B2B as a number; kept as text. */
  resultCode: string;
  resultDesc: string;
  /** The payment's receipt, or "" for a balance query or a failure. */
  receipt: string;
  /** Account Balance's accounts, split from Daraja's pipe-and-ampersand string. */
  accounts: { name: string; available: string }[];
  at: string;
  url: string;
  sent: string;
  attempts: DeliveryAttempt[];
};

type Param = { Key: string; Value: unknown };

/** "Working Account|KES|700000.00|700000.00|0.00|0.00&..." → name and available balance. */
function splitAccounts(value: unknown) {
  if (typeof value !== "string") return [];
  return value
    .split("&")
    .map((line) => line.split("|"))
    .filter((parts) => parts.length >= 3)
    .map(([name, , available]) => ({ name, available }));
}

/** Results, newest first. */
export function deriveResults(entries: RequestLogEntry[]): B2BResult[] {
  return entries
    .filter(
      (e) =>
        e.step === "result" &&
        (e.operation === "b2b_payment" || e.operation === "account_balance"),
    )
    .sort((a, b) => b.id - a.id)
    .map((e) => {
      const delivery = parse<{
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
      }>(e.payload);
      const result = delivery?.payload?.Result;
      const code = String(result?.ResultCode ?? "");
      const raw = result?.ResultParameters?.ResultParameter;
      const params = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return {
        id: e.id,
        operation: e.operation as B2BResult["operation"],
        resultCode: code,
        resultDesc: result?.ResultDesc ?? "",
        receipt:
          e.operation === "b2b_payment" && code === "0"
            ? (result?.TransactionID ?? "")
            : "",
        accounts: splitAccounts(
          params.find((p) => p.Key === "AccountBalance")?.Value,
        ),
        at: e.createdAt,
        url: delivery?.url ?? "",
        sent: pretty(delivery?.payload),
        attempts: (delivery?.attempts ?? []).map(toAttempt),
      };
    });
}
