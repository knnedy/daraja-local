# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

In order of importance:

1. **Developers integrating M-Pesa**, mostly in Kenya, often solo or in small teams. They wire STK Push, C2B, B2C, B2B, Transaction Status and Reversal into their own app, with the dashboard open beside their editor and terminal while they test.
2. **Teams, QA testers and people demoing payment flows** to clients or stakeholders. The dashboard is sometimes on a shared screen or projector.
3. **Learners** meeting Daraja for the first time. For them, explaining the flow (what is sent, what comes back, in what order) matters as much as testing it.

## Product Purpose

Daraja Local is an offline, single-binary emulator of Safaricom's M-Pesa Daraja API (port 7060). A developer points their app at it instead of `sandbox.safaricom.co.ke`. Their code talks to it exactly as it would to Daraja, and the dashboard shows and controls what happens.

Success means:
- A developer goes from install to a working, fully observed payment flow in minutes.
- Moving to the real Daraja sandbox or production needs only a base-URL and credential swap.

## Positioning

Two things carry equal weight:

- **Zero-friction setup.** No sign-up, no public callback URL, no test phone. Credentials, a shortcode, a passkey and ready-to-paste env values exist seconds after creating a Project.
- **See and control every step live.** Each request, callback and result lands in real time. The developer decides the outcome from the Virtual Phone or the dashboard: approve, wrong PIN, cancel, insufficient funds, timeout, or a C2B rejection by their own validation URL. Safaricom's sandbox can't fail a payment on demand.

## Operating Context

- The app runs locally at `http://127.0.0.1:7060`. The dashboard is a static Next.js export embedded in the Go binary.
- The developer's app runs on the same machine and receives callbacks there.
- Typical loop: create a Project → copy env values → call an endpoint from their code (or from the dashboard) → watch the request and callback → choose an outcome → inspect payloads → repeat with a different outcome.
- The pages that matter: Overview, STK Push (with the Virtual Phone), C2B, B2C, B2B, Transactions (status and reversal), Request Log, Credentials, Settings, the Projects list and New Project.
- Integration aids: request snippets in cURL, Node, Python, PHP and Go; callback inspect and resend; a doc on fidelity to real Daraja (`docs/fidelity.md`).

## Capabilities and Constraints

- **Terminology** comes from `GLOSSARY.md`: Project, Credentials, Shortcode, Access Token, Settings, Virtual Phone and so on. Use those words in the UI.
- **Fidelity.** Daraja error codes, field names and response shapes mirror the real API. UI copy must never claim Safaricom behaviour without a source.
- **Works fully offline.** No runtime CDNs, fonts or images fetched from the network.
- **Stack** (existing): Next.js static export, React 19, Tailwind v4, Base UI / shadcn components, TanStack Query, framer-motion. The design tokens in `web/src/app/globals.css` are the token source.
- **Data is local and disposable.** It's sandbox-style money, with no real customers.

## Brand Commitments

- **Green-led identity.** Green-based so it reads as payments and M-Pesa territory. It doesn't have to be Safaricom's exact brand colours.
- **Not Safaricom-branded.** It's an independent tool and must not look official: no Safaricom or M-Pesa logos, no impersonation of their portal.
- **Light and dark mode are both first-class.**
- **The Virtual Phone is the showpiece.** It keeps a realistic M-Pesa SIM-toolkit prompt style (the user's choice), shown on a believable phone.
- Name: "Daraja Local".

## Evidence on Hand

- README screenshot: `docs/assets/stk-push.png`.
- Real Daraja sandbox comparisons are recorded in `docs/fidelity.md`.
- No testimonials, user counts or benchmarks exist. Don't invent any.

## Product Principles

1. **Show the wire.** Every request, response and callback can be seen exactly as sent, in order, as it happens.
2. **The developer decides the outcome.** Failure paths are as easy to trigger as success.
3. **Copy-paste to production.** Everything shown (env values, snippets, payloads) is ready to drop into real code against real Daraja.
4. **Fast to scan beside an editor.** The dashboard often shares the screen with code, so it must be dense but calm and readable at a glance.
5. **Teach without slowing the expert.** Explanations sit one click away, never in the way.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Respect `prefers-reduced-motion`. Everything works by keyboard, including the Virtual Phone PIN entry.
