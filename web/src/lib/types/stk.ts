export type { RequestLogEntry } from "./request-log";

export interface PendingSession {
  merchantRequestId: string;
  checkoutRequestId: string;
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  createdAt: string;
  timeoutAt: string;
}

export type PendingSessionsResponse = PendingSession[];

export interface ResolveResult {
  receipt?: string;
  resultCode: number;
  resultDesc: string;
}

export type StkOutcome =
  | "approved"
  | "wrong_pin"
  | "cancelled"
  | "insufficient_balance"
  | "timeout";
