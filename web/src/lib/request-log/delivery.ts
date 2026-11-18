import type { RequestLogEntry } from "@/lib/types/request-log";

/** One try at reaching the developer's server, as the backend logged it. */
export type DeliveryAttempt = {
  at: string;
  statusCode: number;
  err: string;
  durationMs: number | null;
  reply: string;
};

export function parse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function pretty(value: unknown): string {
  return value === undefined ? "" : JSON.stringify(value, null, 2);
}

export type RawAttempt = {
  At?: string;
  StatusCode?: number;
  Err?: string;
  DurationMs?: number;
  Reply?: string;
};

// Attempt times carry the server's offset; the dashboard shows UTC everywhere.
function utc(at: string | undefined): string {
  const date = at ? new Date(at) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
}

export function toAttempt(raw: RawAttempt): DeliveryAttempt {
  return {
    at: utc(raw.At),
    statusCode: raw.StatusCode ?? 0,
    err: raw.Err ?? "",
    durationMs: raw.DurationMs ?? null,
    reply: raw.Reply ?? "",
  };
}

export function groupByCorrelation(entries: RequestLogEntry[]) {
  const groups = new Map<string, RequestLogEntry[]>();
  for (const entry of entries) {
    const key = entry.correlationId ?? `row-${entry.id}`;
    const existing = groups.get(key);
    if (existing) existing.push(entry);
    else groups.set(key, [entry]);
  }
  return groups;
}
