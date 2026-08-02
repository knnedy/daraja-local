export type StkOutcome =
  | "success"
  | "wrong_pin"
  | "insufficient_balance"
  | "cancelled"
  | "timeout";

export const RESULT_CODES: Record<StkOutcome, { code: number; desc: string }> = {
  success: {
    code: 0,
    desc: "The service request is processed successfully.",
  },
  insufficient_balance: {
    code: 1,
    desc: "The balance is insufficient for the transaction.",
  },
  wrong_pin: {
    code: 2001,
    desc: "The initiator entered the wrong PIN.",
  },
  cancelled: {
    code: 1032,
    desc: "Request cancelled by user.",
  },
  timeout: {
    code: 1037,
    desc: "DS timeout user cannot be reached.",
  },
};

// Magic PINs that trigger specific test outcomes, since there's no
// real PIN to validate against locally. Any other 4-digit PIN succeeds.
export function resolveOutcome(pin: string): StkOutcome {
  if (pin === "0000") return "wrong_pin";
  if (pin === "1111") return "insufficient_balance";
  return "success";
}