// Every date, time and amount in the UI goes through here, so they read the
// same everywhere and times show in the viewer's local zone, never UTC.

type Instant = string | number | Date;

const toDate = (value: Instant) =>
  value instanceof Date ? value : new Date(value);

const clock = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const clockMs = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
  hourCycle: "h23",
});

const shortTime = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const date = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

const kes = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kesWhole = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

/** Local time of day, e.g. "14:03:27", or "14:03:27.481" with `ms`. */
export function formatClock(value: Instant, { ms = false } = {}) {
  return (ms ? clockMs : clock).format(toDate(value));
}

/** Local hours and minutes, e.g. "14:03". */
export function formatShortTime(value: Instant) {
  return shortTime.format(toDate(value));
}

/** e.g. "20 Nov 2026". */
export function formatDate(value: Instant) {
  return date.format(toDate(value));
}

/** Full local date and time, for tooltips. */
export function formatDateTime(value: Instant) {
  return dateTime.format(toDate(value));
}

/** "just now", "42s ago", "5m ago", "3h ago", "2d ago". */
export function relativeTime(value: Instant, now = Date.now()) {
  const diffSec = Math.max(
    0,
    Math.round((now - toDate(value).getTime()) / 1000),
  );
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

/** Shillings with cents, e.g. "1,250.00". */
export function formatKes(amount: number) {
  return kes.format(amount);
}

/** Whole shillings, e.g. "1,250". */
export function formatKesWhole(amount: number) {
  return kesWhole.format(amount);
}
