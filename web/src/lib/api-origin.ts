export const DEFAULT_PORT = 7060;

// Port of the Daraja Local server the dashboard talks to. In dev,
// NEXT_PUBLIC_API_URL points at the Go server; in the embedded build the
// dashboard's own origin is the API.
export function getApiPort(): number {
  try {
    const configured = process.env.NEXT_PUBLIC_API_URL;
    const url = new URL(configured || window.location.href);
    return Number(url.port) || DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}
