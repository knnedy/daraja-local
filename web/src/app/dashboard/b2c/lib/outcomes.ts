import type { B2COutcome } from "@/lib/types/b2c";

/** How each outcome reads in the dashboard, with its ResultCode. */
export const outcomeInfo: Record<B2COutcome, { label: string; short: string; code: number }> = {
  completed: { label: "Completed", short: "Completed", code: 0 },
  insufficient_balance: { label: "Insufficient balance", short: "No balance", code: 1 },
  over_transaction_limit: { label: "Over transaction limit", short: "Over limit", code: 3 },
  daily_limit: { label: "Daily limit reached", short: "Daily limit", code: 4 },
  invalid_initiator: { label: "Invalid initiator", short: "Bad initiator", code: 2001 },
  unregistered_customer: { label: "Unregistered customer", short: "Unregistered", code: 2040 },
  queue_timeout: { label: "Queue timeout", short: "Queue timeout", code: 1037 },
};
