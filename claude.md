# Daraja Local

Offline single-binary emulator of Safaricom's M-Pesa Daraja API. Go (Chi, SQLite/modernc, sqlc, goose) backend embeds a static Next.js export via //go:embed. Port 7060.

## Commands (adjust)

- Backend tests: `go test ./...`
- After editing sqlc query files: `sqlc generate`
- Frontend: `pnpm install && pnpm build` (static export)

## Rules

- Strict bottom-up dependency order; never reference a type/function/column not yet defined.
- Ask before big structural changes.
- Repository structs are never marshaled directly; handlers use hand-written camelCase DTOs.
- Daraja errorCode leading digits = HTTP status (404.001.03 -> 404).
- Comments max 2 lines, only when necessary. Minimal logging.
- Conventional commits, one per feature (feat(stk): ...).
- Never assert Safaricom API behaviour as fact without a source; state confidence (high/medium/low).

## UI

- Design tokens in globals.css (--green, --surface-1/2, terminal-\*) are the source of truth.
- Use emil-design-eng for motion/interaction polish only; never override tokens.
- Respect prefers-reduced-motion. Tailwind v4 canonical classes.
