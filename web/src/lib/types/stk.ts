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

export type PendingSessionResponse = PendingSession[];

export type StkOutcome =
  | "approved"
  | "wrong_pin"
  | "cancelled"
  | "insufficient_balance"
  | "timeout";
