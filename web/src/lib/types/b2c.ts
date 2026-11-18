export type B2CCommandId =
  "BusinessPayment" | "SalaryPayment" | "PromotionPayment";

export type B2COutcome =
  | "completed"
  | "insufficient_balance"
  | "over_transaction_limit"
  | "daily_limit"
  | "invalid_initiator"
  | "unregistered_customer"
  | "queue_timeout";

/** A project's simulated M-Pesa accounts and the forced next outcome. */
export interface B2CState {
  utilityBalance: number;
  workingBalance: number;
  chargesPaidBalance: number;
  /** "" when the next payout takes its natural course. */
  nextOutcome: B2COutcome | "";
  forcibleOutcomes: B2COutcome[];
}

export interface UpdateB2CStateInput {
  utilityBalance?: number;
  nextOutcome?: B2COutcome | "";
}

/** A payout sent from the dashboard, as the developer's app would send it. */
export interface SendPayoutInput {
  commandId: B2CCommandId;
  amount: string;
  partyB: string;
  remarks: string;
  resultUrl: string;
  queueTimeOutUrl: string;
}

export interface SendPayoutResponse {
  conversationId: string;
  originatorConversationId: string;
}
