import type { LogGroup } from "./group";

export type StatusTone = "success" | "error" | "pending" | "neutral";

const ERROR_OUTCOMES = new Set([
  "wrong_pin",
  "cancelled",
  "insufficient_balance",
  "timeout",
]);

export function groupStatus(group: LogGroup): {
  label: string;
  tone: StatusTone;
} {
  if (group.finalStatus === "rejected") {
    return { label: "rejected", tone: "error" };
  }
  if (!group.finalOutcome) {
    return { label: "pending", tone: "pending" };
  }
  return {
    label: group.finalOutcome,
    tone: ERROR_OUTCOMES.has(group.finalOutcome) ? "error" : "success",
  };
}
