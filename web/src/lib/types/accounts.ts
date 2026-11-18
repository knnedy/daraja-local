/** A project's simulated M-Pesa balances, in KES. */
export interface Accounts {
  utility: number;
  working: number;
  chargesPaid: number;
}

export interface UpdateAccountsInput {
  utility?: number;
  working?: number;
}

export type B2BCommandId = "BusinessPayBill" | "BusinessBuyGoods";

/** A B2B payment sent from the dashboard, as the developer's app would send it. */
export interface SendB2BInput {
  commandId: B2BCommandId;
  amount: number;
  partyB: string;
  accountReference: string;
  resultUrl: string;
  queueTimeOutUrl: string;
}

/** Where a request sent from the dashboard reports back. */
export interface ResultTargets {
  resultUrl: string;
  queueTimeOutUrl: string;
}
