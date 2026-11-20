import { formatPhone } from "@/components/phone";
import type { Transaction, TransactionKind } from "@/lib/types/transactions";

export const kindInfo: Record<TransactionKind, { short: string; label: string }> = {
  stk_push: { short: "STK", label: "STK Push" },
  c2b: { short: "C2B", label: "C2B payment" },
  b2c: { short: "B2C", label: "B2C payout" },
  b2b: { short: "B2B", label: "B2B payment" },
  reversal: { short: "REV", label: "Reversal" },
};

/** Only customer payments into the shortcode can be reversed through the API. */
export function reversible(t: Transaction) {
  return (t.kind === "stk_push" || t.kind === "c2b") && !t.reversedBy;
}

export function notReversibleReason(t: Transaction) {
  if (t.reversedBy) return `Already reversed by ${t.reversedBy}`;
  if (t.kind === "reversal") return "A reversal can't itself be reversed";
  return "Only STK and C2B payments can be reversed";
}

/** "You" for the project's own shortcode, a readable number for a phone. */
export function partyLabel(party: string, shortCode: string) {
  if (party === shortCode) return "You";
  if (/^254\d{9}$/.test(party)) return formatPhone(party);
  return party;
}

/** Money into the shortcode is +, money out is −. */
export function direction(t: Transaction, shortCode: string): "in" | "out" {
  return t.creditParty === shortCode ? "in" : "out";
}
