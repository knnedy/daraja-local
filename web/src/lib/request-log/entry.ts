import type { RequestLogEntry } from "@/lib/types/request-log";

export type EntryTag = { label: string; className: string };

const GOOD = "text-terminal-green";
const BAD = "text-terminal-red";

/** The console tag for one entry, from the step the backend recorded. */
export function entryTag(entry: RequestLogEntry): EntryTag {
  switch (entry.step) {
    case "request":
      return {
        label: entry.operation === "stk_query" ? "QRY" : "REQ",
        className: "text-terminal-blue",
      };
    case "acceptance":
      return { label: "ACK", className: GOOD };
    case "rejection":
      return { label: "ERR", className: BAD };
    case "validation":
      return {
        label: "VAL",
        className: entry.outcome === "accepted" ? GOOD : BAD,
      };
    case "callback":
    case "confirmation":
      return {
        label: "CB",
        className: entry.status === "delivered" ? GOOD : BAD,
      };
    default:
      return {
        label: entry.status.toUpperCase(),
        className: "text-terminal-fg-muted",
      };
  }
}
