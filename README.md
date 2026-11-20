# Daraja Local

[![Release](https://img.shields.io/github/v/release/knnedy/daraja-local)](https://github.com/knnedy/daraja-local/releases)
[![License: MIT](https://img.shields.io/github/license/knnedy/daraja-local)](LICENSE)

An offline emulator of Safaricom's M-Pesa Daraja API. Build and test STK Push, C2B, B2C, B2B, Account Balance, Transaction Status and Reversal integrations without a public callback URL, a test phone or a sign-up. It ships as one binary, with nothing else to run.

Safaricom's sandbox needs a public callback URL, and it gives you no way to make a payment fail on demand. Daraja Local runs on your machine and speaks the same API, and you decide what happens. You can approve a payment, fail it with a wrong PIN, let it time out, run an account dry, or reject a C2B payment from your own validation endpoint.

---

## Quickstart

**1. Install and run**

```bash
curl -fsSL https://raw.githubusercontent.com/knnedy/daraja-local/main/install.sh | sh
daraja-local
```

Open the URL printed at startup (`http://127.0.0.1:7060` by default).

**2. Create a project.** Daraja Local generates a consumer key, consumer secret, shortcode, passkey and B2C initiator for it.

**3. Copy the environment values into your app.** Settings has a ready-made `.env` to download:

```
DARAJA_BASE_URL=http://127.0.0.1:7060
DARAJA_CONSUMER_KEY=...
DARAJA_CONSUMER_SECRET=...
DARAJA_SHORTCODE=...
DARAJA_PASSKEY=...
```

Point your M-Pesa client at `DARAJA_BASE_URL` instead of `https://sandbox.safaricom.co.ke`. If your code hardcodes Safaricom's URL, make the base URL configurable first.

**4. Send an STK Push** (with the variables above exported):

```bash
TOKEN=$(curl -s -u "$DARAJA_CONSUMER_KEY:$DARAJA_CONSUMER_SECRET" \
  "$DARAJA_BASE_URL/oauth/v1/generate?grant_type=client_credentials" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

TIMESTAMP=$(date +%Y%m%d%H%M%S)
PASSWORD=$(printf '%s%s%s' "$DARAJA_SHORTCODE" "$DARAJA_PASSKEY" "$TIMESTAMP" | base64 | tr -d '\n')

curl -X POST "$DARAJA_BASE_URL/mpesa/stkpush/v1/processrequest" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"BusinessShortCode\": \"$DARAJA_SHORTCODE\",
    \"Password\": \"$PASSWORD\",
    \"Timestamp\": \"$TIMESTAMP\",
    \"TransactionType\": \"CustomerPayBillOnline\",
    \"Amount\": \"100\",
    \"PartyA\": \"254712345678\",
    \"PartyB\": \"$DARAJA_SHORTCODE\",
    \"PhoneNumber\": \"254712345678\",
    \"CallBackURL\": \"http://localhost:4000/payments/callback\",
    \"AccountReference\": \"Order-1\",
    \"TransactionDesc\": \"Test payment\"
  }"
```

As in the real API, every request field is a JSON string. `CallBackURL` can be any URL your machine can reach, including `localhost`, so you don't need a tunnel.

**5. Resolve it.** The prompt appears on the phone on the STK Push page. Choose Approve, Wrong PIN, Insufficient balance or Cancel, or do nothing and it times out. Daraja Local then POSTs the callback to your `CallBackURL`, and every step is recorded in the Request log.

Every API page also shows the request as runnable code in cURL, Node, Python, PHP and Go.

---

## Features

- **Single binary, fully local.** Nothing to sign up for. It listens on `127.0.0.1` only, and your data stays in `~/.daraja-local`.
- **Projects.** Each project has its own consumer key, secret, shortcode, passkey and initiator, plus its own settings and history. Rotate keys from Credentials, and change the callback base URL from Settings.
- **STK Push on a phone.** Requests wait on a simulated handset showing the M-Pesa prompt, and you pick the outcome. Each outcome sends the real Daraja `ResultCode`. STK Push Query answers for pending, resolved and unknown requests, and any callback can be resent byte for byte.
- **C2B, end to end.** Register your URLs, send a payment from a customer's phone, validate it against your own `ValidationURL` with Daraja's `ResponseType` fallback, and deliver the confirmation. Each call to your server is inspectable and can be resent.
- **B2C payouts.** Pay out to a phone with a real `SecurityCredential` built from your project's initiator and certificate. Results come from a simulated balance, and you can force any failure for the next payout.
- **B2B and Account Balance.** Business Pay Bill and Buy Goods payments, and balance queries against accounts you can set.
- **Transaction Status and Reversal.** Every completed payment is recorded on a ledger, so you can look up any receipt or reverse a customer payment, from your app or from the Transactions page.
- **Real callbacks.** Delivered to your URLs over HTTP and retried on failure.
- **Daraja-shaped errors and IDs.** The password check, the phone and amount rules, error codes, HTTP statuses and ID formats follow what the sandbox returns, so a malformed request fails the way it would against Safaricom.
- **Request log.** A live two-pane inspector of every request, response and callback, grouped by transaction, with filtering, search and copyable payloads.
- **Live dashboard.** An Overview with a getting-started checklist, money totals and a live feed. Every page updates as requests arrive, in light or dark mode.

---

## What's new since 0.1.0

- **A redesigned dashboard.** Every page has been rebuilt around a live timeline, with the phone as the centrepiece, a new logo and colours taken from the Daraja developer portal.
- **New APIs.** STK Push Query, B2C, B2B, Account Balance, Transaction Status and Reversal.
- **Integration aids.** Request code in five languages, STK and C2B callback resend, a `.env` download, and callback URL editing.
- **Closer to the sandbox.** Error codes, texts, IDs and result bodies were checked against the live sandbox. [Fidelity](docs/fidelity.md) records what was checked, when, and how confident each claim is.
- **Installer commands.** `update` and `uninstall`, and `daraja-local --version`.

The full list is in the [release notes](https://github.com/knnedy/daraja-local/releases).

---

## What's emulated

| API                | Route                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| OAuth token        | `GET /oauth/v1/generate`                                                 |
| STK Push           | `POST /mpesa/stkpush/v1/processrequest`                                  |
| STK Push Query     | `POST /mpesa/stkpushquery/v1/query`                                      |
| C2B register URLs  | `POST /mpesa/c2b/v1/registerurl`, `POST /mpesa/c2b/v2/registerurl`       |
| C2B simulate       | `POST /mpesa/c2b/v1/simulate`, `POST /mpesa/c2b/v2/simulate`             |
| B2C payment        | `POST /mpesa/b2c/v1/paymentrequest`, `POST /mpesa/b2c/v3/paymentrequest` |
| B2B payment        | `POST /mpesa/b2b/v1/paymentrequest`                                      |
| Account Balance    | `POST /mpesa/accountbalance/v1/query`                                    |
| Transaction Status | `POST /mpesa/transactionstatus/v1/query`                                 |
| Reversal           | `POST /mpesa/reversal/v1/request`                                        |

Not implemented: B2C Account Top Up, Business to Pochi, Tax Remittance, Dynamic QR, Bill Manager and Ratiba.

---

## Documentation

| Guide                                                   | What's in it                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| [Getting started](docs/getting-started.md)              | Install, first run, creating a project, finding your credentials    |
| [Using it with your app](docs/using-with-your-app.md)   | Pointing your backend at Daraja Local, callback URLs, code examples |
| [STK Push](docs/stk-push.md)                            | Request shape, outcomes and ResultCodes, callbacks, timeouts        |
| [C2B](docs/c2b.md)                                      | Registering URLs, simulating payments, validation and confirmation  |
| [B2C](docs/b2c.md)                                      | Initiator and SecurityCredential, payouts, results and failures     |
| [B2B and Account Balance](docs/b2b.md)                  | Paying other businesses, your simulated accounts, balance results   |
| [Transaction Status and Reversal](docs/transactions.md) | Looking receipts up, reversing payments, result codes               |
| [Request log](docs/request-log.md)                      | Searching, filtering and reading the log                            |
| [Fidelity](docs/fidelity.md)                            | What mirrors Daraja, with sources and confidence, and what doesn't  |
| [Troubleshooting](docs/troubleshooting.md)              | The errors you'll actually hit and what they mean                   |

---

## Installation

### Script (Linux and macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/knnedy/daraja-local/main/install.sh | sh
```

It installs to `/usr/local/bin` and asks for `sudo` if it needs it. To install somewhere else, or to pin a version:

```bash
curl -fsSL https://raw.githubusercontent.com/knnedy/daraja-local/main/install.sh | INSTALL_DIR=~/.local/bin sh
curl -fsSL https://raw.githubusercontent.com/knnedy/daraja-local/main/install.sh | VERSION=v0.1.0 sh
```

### Updating

```bash
curl -fsSL https://raw.githubusercontent.com/knnedy/daraja-local/main/install.sh | sh -s -- update
```

It finds your existing install, does nothing if you're already on the latest release, and tells you to restart Daraja Local if it's running. Your projects and logs are kept. Check what you have with `daraja-local --version`.

### Uninstalling

```bash
curl -fsSL https://raw.githubusercontent.com/knnedy/daraja-local/main/install.sh | sh -s -- uninstall
```

This removes the binary. Your projects and logs stay in `~/.daraja-local`; delete that folder to wipe them.

### Manual

Archives are named `daraja-local_<version>_<os>_<arch>`:

```bash
VERSION=0.1.0   # replace with the latest release
curl -L https://github.com/knnedy/daraja-local/releases/download/v${VERSION}/daraja-local_${VERSION}_linux_amd64.tar.gz | tar -xz
sudo mv daraja-local /usr/local/bin/
```

Swap `linux_amd64` for `linux_arm64`, `darwin_amd64` or `darwin_arm64` as needed. To update, repeat with the new version.

### Windows

Download `daraja-local_<version>_windows_amd64.zip` from the [Releases page](https://github.com/knnedy/daraja-local/releases), extract `daraja-local.exe` and run it from a terminal. To update, replace the `.exe` with the one from a newer release. There is no Windows ARM build yet.

### Verifying downloads

The install script checks this for you. To check a manual download:

```bash
curl -fsSLO https://github.com/knnedy/daraja-local/releases/download/v${VERSION}/checksums.txt
grep "daraja-local_${VERSION}_linux_amd64.tar.gz" checksums.txt | sha256sum -c -
```

On macOS, use `shasum -a 256 -c -` instead of `sha256sum -c -`.

### Configuration

| Variable                | Default           | Effect                                                     |
| ----------------------- | ----------------- | ---------------------------------------------------------- |
| `DARAJA_LOCAL_PORT`     | `7060`            | Pins the port; without it, the next free port from 7060 is used |
| `DARAJA_LOCAL_DATA_DIR` | `~/.daraja-local` | Where projects, settings and the request log are stored    |

---

## Building from source

**Requirements:** Go 1.27.1+, Node.js 24, pnpm 12.

```bash
git clone https://github.com/knnedy/daraja-local.git
cd daraja-local
make build
./bin/daraja-local
```

`make build` exports the frontend as static files, embeds them in the Go binary, and compiles to `bin/daraja-local`. For hot reload during development, run `make dev`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

---

## Limits worth knowing

- Daraja Local is for developing and testing your integration. Test against Safaricom's own sandbox before going live. Behaviour follows Daraja's documentation and what the live sandbox returns; where the two disagree or nothing could be checked, [Fidelity](docs/fidelity.md) says so and gives a confidence level.
- Some details are emulator choices, such as callback retry timing and refusing `simulate` before `registerurl`.
- C2B payloads carry no customer details. Name fields arrive blank, and `MSISDN` hides the number: masked after a v2 registration, SHA-256 hashed after v1.

---

## Tech stack

| Layer        | Technology                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------- |
| Backend      | Go, `chi/v5`, SQLite via `modernc.org/sqlite` (pure Go, no cgo), goose, sqlc                        |
| Frontend     | Next.js (static export), React 19, TypeScript, Tailwind CSS v4, Base UI, TanStack Query, Zustand, Framer Motion, Shiki |
| Distribution | Single binary via `go:embed`, cross-compiled and released with GoReleaser                           |

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first, and open an issue before starting anything large.

## License

MIT © 2026 [knnedy](https://github.com/knnedy). See [LICENSE](LICENSE) for details.

Daraja Local is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by Safaricom. M-Pesa and Daraja are trademarks of their respective owners.
