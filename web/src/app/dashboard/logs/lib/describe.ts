import type { LogGroup } from "@/lib/request-log/group";
import { ERROR_OUTCOMES, groupStatus } from "@/lib/request-log/status";
import { formatPhone } from "@/components/phone";
import type { RequestLogEntry } from "@/lib/types/request-log";
import type { Tone } from "../../_components/activity";
import { formatKesWhole } from "@/lib/format";

export const KINDS: { value: LogGroup["kind"] | "all"; label: string; short: string }[] = [
  { value: "all", label: "All requests", short: "All" },
  { value: "stk_push", label: "STK Push", short: "STK" },
  { value: "c2b", label: "C2B", short: "C2B" },
  { value: "b2c", label: "B2C", short: "B2C" },
  { value: "b2b", label: "B2B", short: "B2B" },
  { value: "account_balance", label: "Account Balance", short: "BAL" },
  { value: "transaction_status", label: "Transaction Status", short: "STS" },
  { value: "reversal", label: "Reversal", short: "REV" },
];

export function kindShort(kind: LogGroup["kind"]) {
  return KINDS.find((k) => k.value === kind)?.short ?? "—";
}

export function kindLabel(kind: LogGroup["kind"]) {
  return KINDS.find((k) => k.value === kind)?.label ?? "Mixed";
}

export const PATHS: Record<string, string> = {
  stk_push: "/mpesa/stkpush/v1/processrequest",
  stk_query: "/mpesa/stkpushquery/v1/query",
  c2b_register: "/mpesa/c2b/v2/registerurl",
  c2b_simulate: "/mpesa/c2b/v2/simulate",
  b2c_payment: "/mpesa/b2c/v3/paymentrequest",
  b2b_payment: "/mpesa/b2b/v1/paymentrequest",
  account_balance: "/mpesa/accountbalance/v1/query",
  transaction_status: "/mpesa/transactionstatus/v1/query",
  reversal: "/mpesa/reversal/v1/request",
};

const LABELS: Record<string, string> = {
  wrong_pin: "Wrong PIN",
  insufficient_balance: "No balance",
  over_transaction_limit: "Over limit",
  invalid_initiator: "Bad initiator",
  invalid_transaction: "Invalid receipt",
  unregistered_customer: "Unregistered",
  timeout: "Timed out",
  queue_timeout: "Queue timeout",
};

function humanize(value: string) {
  const s = LABELS[value] ?? value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A session's one-word state and its colour. */
export function sessionStatus(group: LogGroup): { label: string; tone: Tone } {
  const { label, tone } = groupStatus(group);
  const mapped: Tone = tone === "error" ? "danger" : tone === "neutral" ? "idle" : tone;
  if (group.finalStatus === "failed") return { label: "Delivery failed", tone: "danger" };
  return { label: humanize(label), tone: mapped };
}

const STEP_TITLES: Record<string, string> = {
  acceptance: "Accepted · response to your app",
  rejection: "Rejected · error response to your app",
  validation: "Validation request to your server",
  confirmation: "Confirmation to your server",
  callback: "Callback to your server",
  result: "Result to your server",
  timeout: "Timeout notice to your server",
};

export function stepTitle(e: RequestLogEntry) {
  if (e.step === "request") return e.operation === "stk_query" ? "Status query from your app" : "Request from your app";
  return STEP_TITLES[e.step] ?? (e.direction === "inbound" ? "Inbound" : "Outbound");
}

export function stepTone(e: RequestLogEntry): Tone {
  if (e.status === "rejected" || e.status === "failed") return "danger";
  if (e.status === "pending") return "pending";
  if (e.outcome && ERROR_OUTCOMES.has(e.outcome)) return "danger";
  return "success";
}

/** A one-line description of what the session was about. */
export function summaryOf(group: LogGroup) {
  const s = group.summary.replace(/\b254\d{9}\b/g, formatPhone).replace(/^KES (\d+(?:\.\d+)?)/, (_, n) => `KES ${formatKesWhole(Number(n))}`);
  return s || kindLabel(group.kind);
}
