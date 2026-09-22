import type { RequestLogEntry } from "@/lib/types/request-log";

export type LogGroup = {
  id: string;
  kind: "stk_push" | "c2b" | "mixed";
  createdAt: string;
  entries: RequestLogEntry[];
  finalStatus: string;
  finalOutcome: string | null;
  summary: string;
};

function peek(payload: string, keys: string[]): string | null {
  try {
    const body = JSON.parse(payload) as Record<string, unknown>;
    for (const key of keys) {
      const value = body[key];
      if (typeof value === "string" && value) return value;
      if (typeof value === "number") return String(value);
    }
  } catch {
    // not JSON, or shape didn't match — fine, summary just stays blank
  }
  return null;
}

export function groupEntries(entries: RequestLogEntry[]): LogGroup[] {
  const groups = new Map<string, RequestLogEntry[]>();
  const order: string[] = [];

  for (const entry of entries) {
    const key = entry.correlationId ?? `row-${entry.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(entry);
  }

  return order.map((key) => {
    const rows = groups.get(key)!;
    const newest = rows[0];
    const oldest = rows[rows.length - 1];
    const kinds = new Set(rows.map((r) => r.kind));

    const resolved = rows.find((r) => r.outcome);
    const rejected = rows.find((r) => r.status === "rejected");

    const summary =
      peek(oldest.payload, ["Amount", "amount", "TransAmount"]) &&
      peek(oldest.payload, ["PhoneNumber", "Msisdn"])
        ? `KES ${peek(oldest.payload, ["Amount", "amount", "TransAmount"])} · ${peek(oldest.payload, ["PhoneNumber", "Msisdn"])}`
        : (peek(oldest.payload, ["BillRefNumber", "AccountReference"]) ?? "");

    return {
      id: key,
      kind: kinds.size > 1 ? "mixed" : ([...kinds][0] as LogGroup["kind"]),
      createdAt: oldest.createdAt,
      entries: rows,
      finalStatus: rejected
        ? "rejected"
        : resolved
          ? resolved.status
          : "pending",
      finalOutcome: resolved?.outcome ?? null,
      summary,
    };
  });
}
