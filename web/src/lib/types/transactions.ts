export type TransactionKind = "stk_push" | "c2b" | "b2c" | "b2b" | "reversal";

/** A completed M-Pesa transaction, as Transaction Status and Reversal see it. */
export interface Transaction {
  receipt: string;
  kind: TransactionKind;
  amount: number;
  /** A shortcode or a phone number. */
  debitParty: string;
  creditParty: string;
  reasonType: string;
  originatorConversationId: string;
  /** The reversal's receipt, or "" when not reversed. */
  reversedBy: string;
  finalisedAt: string;
}

/** Where a status query or reversal sent from the dashboard reports back. */
export interface InitiatorCallInput {
  receipt: string;
  amount: number;
  resultUrl: string;
  queueTimeOutUrl: string;
}
