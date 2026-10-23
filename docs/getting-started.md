# Getting started

This guide takes you from nothing to a running Daraja Local with a project and credentials. To send your first STK Push straight away, use the [Quickstart](../README.md#quickstart).

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/knnedy/daraja-local/main/install.sh | sh
```

This works on Linux and macOS and installs to `/usr/local/bin`. For manual downloads, Windows, or building from source, see [Installation](../README.md#installation).

## Run it

```bash
daraja-local
```

On startup it prints a banner that ends with:

```
  v0.1.0   local M-Pesa Daraja API emulator
  running at  http://127.0.0.1:7060
  database        /home/you/.daraja-local/daraja.db
```

Open the `running at` URL in your browser. That address serves the dashboard and is also the base URL your app talks to. Stop the server with `Ctrl+C`.

## Create a project

Everything in Daraja Local belongs to a project: its credentials, settings and request history are kept separate from every other project. Create one from the dashboard, usually one per app you're integrating.

Daraja Local generates a consumer key, consumer secret, shortcode and passkey for each project.

## Find your credentials

The Overview page has an Environment card with ready-to-paste values:

```
DARAJA_BASE_URL
DARAJA_CONSUMER_KEY
DARAJA_CONSUMER_SECRET
DARAJA_SHORTCODE
DARAJA_PASSKEY
```

The secret and the passkey are masked until you click the eye icon. To rotate credentials, use the Credentials page. Rotating issues a new consumer key, secret and passkey. The shortcode stays the same, and anything still using the old values will fail authentication.

## Configuration

Daraja Local has no command-line flags. It's configured with environment variables, all optional:

| Variable                | Default                   | What it does                                                                                                         |
| ----------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `DARAJA_LOCAL_PORT`     | `7060`, moving up if busy | Pins the port (1–65535). If the port is already in use, Daraja Local exits with an error instead of picking another. |
| `DARAJA_LOCAL_DATA_DIR` | `~/.daraja-local`         | Where `daraja.db` is stored.                                                                                         |
| `DARAJA_LOCAL_ENV`      | unset                     | Set to `development` only when working on the dashboard itself. Allows CORS from `http://localhost:3000`.            |

```bash
# pin the port
DARAJA_LOCAL_PORT=7060 daraja-local

# keep data somewhere else
DARAJA_LOCAL_DATA_DIR=./.daraja-data daraja-local
```

On Windows PowerShell:

```powershell
$env:DARAJA_LOCAL_PORT = "7060"; daraja-local
```

## The port

Daraja Local prefers port `7060`. If it's taken (by another instance or another program), it tries `7061`, `7062` and so on up to `7109`, and uses the first free one. The banner always shows the port it actually chose, so the address can change between runs.

If your app's configuration needs a fixed address, such as a `.env` file, pin the port with `DARAJA_LOCAL_PORT`.

To run two instances side by side, give each its own `DARAJA_LOCAL_DATA_DIR` so they don't share a database file.

Daraja Local listens on `127.0.0.1` only. Other machines can't reach it, and neither can an app inside a Docker container or VM on default networking. There is currently no setting to change this.

## Where your data lives

`daraja.db` is a SQLite file in the data directory. It holds your projects, settings and request log.

Pending STK Push requests are held in memory, not in the database. A request still waiting on the Virtual Phone when you stop the server is dropped, and no callback is ever sent for it. Its log entries remain. A callback that is still being retried when you stop the server is abandoned, and its log entry is never written.

To start fresh, stop the server and delete the data directory.

## Next steps

- [Using it with your app](using-with-your-app.md): point your backend at Daraja Local
- [STK Push](stk-push.md)
- [C2B](c2b.md)
- [Request Log](request-log.md): see what your app sent and what Daraja Local sent back
- [Troubleshooting](troubleshooting.md): common problems and their fixes
- [Fidelity](fidelity.md): how Daraja Local differs from Safaricom's Daraja
