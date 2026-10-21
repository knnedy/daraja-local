# Contributing to Daraja Local

Thanks for your interest in contributing! Daraja Local is an offline emulator of Safaricom's M-Pesa Daraja API. It is early (pre-1.0) and moving quickly, so please open an issue to discuss non-trivial changes before starting work.

---

## Getting Started

**Requirements**

- Go 1.27.1+ (see `go.mod`)
- Node.js 22 (what CI uses) and pnpm
- [`air`](https://github.com/air-verse/air) for hot reload: `go install github.com/air-verse/air@latest`
- [`sqlc`](https://sqlc.dev) if you change SQL queries

```bash
git clone https://github.com/knnedy/daraja-local.git
cd daraja-local
```

### Full build

```bash
make build
./bin/daraja-local
```

This builds the frontend as a static export, copies it into `cmd/daraja-local/out` (embedded with `go:embed`), then compiles the Go binary. On a fresh clone, run this once before `go vet` or `go build`: the embed won't compile until `out/` exists.

### Development (hot reload)

```bash
make dev
```

Runs the Go backend via `air` on `:7060` and the Next.js dev server on `:3000` together.

### Other targets

```bash
make run    # build then run ./bin/daraja-local
make clean  # remove build artifacts
```

---

## Project Structure

```
cmd/daraja-local/     entrypoint, startup banner, embeds the built frontend
internal/auth/        Bearer-token middleware
internal/config/      config loading
internal/network/     port selection
internal/daraja/      mechanics shared by every endpoint family (validation error, retrying delivery)
internal/stk/         STK Push domain: sessions, validation, callbacks
internal/c2b/         C2B domain: URL registration, simulate, validation/confirmation payloads
internal/service/     business logic
internal/handler/     HTTP handlers and response DTOs
internal/router/      route wiring
internal/repository/  sqlc-generated database code
internal/sql/         goose migrations and sqlc query files
internal/response/    JSON and Daraja-shaped error responses
internal/token/       in-memory access-token store
web/                  Next.js dashboard (static export)
```

Requests flow handler → service → repository. Protocol shapes and validation live in the domain packages (`stk`, `c2b`). If two endpoint families need the same mechanic, it belongs in `daraja`, not copied into both.

---

## Making Changes

1. Fork the repo and create a branch from `main`.
2. Keep changes focused: one feature or fix per PR.
3. Match existing conventions:
   - **Go:** handlers return hand-written camelCase DTOs and never marshal repository structs directly. Follow the patterns in `internal/handler/stk*.go` and `internal/service/stk*.go`.
   - **SQL:** after editing anything in `internal/sql/queries/`, run `sqlc generate` and commit the regenerated files in `internal/repository/`. For schema changes, add a new numbered goose migration rather than editing one that has already shipped.
   - **Frontend:** React Query for server state, Zustand for client state, Tailwind v4 canonical classes (`min-h-112`, not `min-h-[28rem]`), and the theme tokens instead of hardcoded colors.
4. Run `go vet ./...` and `pnpm lint` (in `web/`) before opening a PR.
5. Write a clear PR description: what changed and why, not just what.

---

## Daraja Fidelity

The point of this project is that your integration code behaves against it the same way it behaves against Safaricom. So:

- **Mirror real wire behavior, quirks included.** Field names, string-typed numeric fields, error codes and HTTP statuses should match Safaricom's. For example, C2B responses spell `OriginatorCoversationID` the way Safaricom does. Don't "fix" it.
- **Cite a source for behavior changes.** If you change a request or response shape, an error code or a validation rule, link Safaricom's documentation or a captured real response in the PR.
- **Label emulator-only behavior.** Anything that deliberately differs from real Daraja (for example, rejecting `/simulate` before `registerurl`) must say so in a code comment, so it isn't mistaken for verified behavior.

---

## Commit Messages

Use conventional commits (`feat(stk): ...`, `fix(c2b): ...`). Release notes are generated from them: `feat` and `fix` get their own sections, and `chore`, `docs` and `test` are left out.

---

## Reporting Bugs

Open an issue with:

- What you expected vs. what happened
- Steps to reproduce (a curl command is ideal)
- The relevant entries from the Request Log page
- Your Daraja Local version (shown in the startup banner) and your OS/architecture
- For Daraja-behavior bugs: what real Daraja does, with a link to the docs or a captured response

---

## Feature Requests

Open an issue describing the use case before submitting a PR. This avoids wasted work on features that don't fit the project's direction (offline-first, single-binary distribution, fidelity to real Daraja).

---

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
