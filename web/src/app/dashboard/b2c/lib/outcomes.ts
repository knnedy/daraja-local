import type { B2COutcome } from "@/lib/types/b2c";

/** How each outcome reads in the dashboard, with its ResultCode. */
export const outcomeInfo: Record<B2COutcome, { label: string; code: number }> =
  {
    completed: { label: "Completed", code: 0 },
    insufficient_balance: { label: "Insufficient balance", code: 1 },
    over_transaction_limit: { label: "Over transaction limit", code: 3 },
    daily_limit: { label: "Daily limit reached", code: 4 },
    invalid_initiator: { label: "Invalid initiator", code: 2001 },
    unregistered_customer: { label: "Unregistered customer", code: 2040 },
    queue_timeout: { label: "Queue timeout", code: 1037 },
  };
