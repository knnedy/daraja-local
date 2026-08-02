export type ValidationOutcome =
  | "accepted"
  | "invalid_account"
  | "invalid_amount";

export const VALIDATION_CODES: Record<
  ValidationOutcome,
  { code: string; desc: string }
> = {
  accepted: { code: "0", desc: "Accepted" },
  invalid_account: { code: "C2B00012", desc: "Invalid Account Number" },
  invalid_amount: { code: "C2B00013", desc: "Invalid Amount" },
};

export function resolveValidation(
  billRefNumber: string,
  amount: number,
): ValidationOutcome {
  if (billRefNumber === "INVALID") return "invalid_account";
  if (amount <= 0) return "invalid_amount";
  return "accepted";
}
