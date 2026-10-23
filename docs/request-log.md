# Request Log

The Request Log page records what your app sent to Daraja Local and what Daraja Local sent back or on to your server. Use it to answer "what did my app actually send?" and "did my callback arrive?"

## What gets logged

Each payment becomes a group of entries tied together by a transaction ID: the `CheckoutRequestID` for STK Push, the `ConversationID` for C2B.

| Flow     | Entries in the group                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| STK Push | the request your app sent; the acceptance or error returned; the callback delivery, including every attempt                                       |
| C2B      | the request; the acceptance or error returned; the call to your `ValidationURL` (only if validation ran); the confirmation delivery with attempts |

Registering C2B URLs is logged the same way, and shows its ID where a payment would show an amount.

A request rejected at validation has no transaction ID yet, so it appears as two separate entries: the request, and the error that came back.

## Reading the page

Each row shows when it happened (hover for the exact time), whether it's STK or C2B, a summary (amount and phone number, or the reference), a status badge, and how many entries the group holds. Click a row to open every entry with its full payload. Each payload has a copy button. Inside a group, requests are tagged `REQ`, and everything Daraja Local sent is tagged with its status: `accepted`, `rejected`, `delivered`, `failed` or `fallback`.

The status badge shows how the transaction ended:

| Badge                                                                   | Meaning                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pending`                                                               | Nothing has resolved it yet.                                                   |
| `approved`, `wrong_pin`, `insufficient_balance`, `cancelled`, `timeout` | The STK outcome. Only `approved` is green.                                     |
| `accepted`                                                              | A C2B payment passed validation and its confirmation hasn't landed yet.        |
| `confirmed`                                                             | A C2B confirmation was delivered.                                              |
| `rejected`                                                              | The request failed validation, or your `ValidationURL` rejected a C2B payment. |
| `delivery failed`                                                       | The callback or confirmation couldn't be delivered after three attempts.       |

For a failed delivery, open the group. The delivery entry lists every attempt with its status code or error, which usually shows the cause. `connection refused` means nothing is listening, and a non-200 code means your handler answered with something else.

## Finding things

- **Type and status filters** narrow the list to STK or C2B, and to success, error or pending.
- **Search** matches transaction IDs, the summary line, and anything inside a payload, so phone numbers, references and receipt numbers all work. Press `/` to jump to it.
- **Filters and search apply to what's already loaded.** The page loads 50 entries at a time. Use Load more to reach older ones.
- The counters at the top cover everything loaded, regardless of filters.

## Keeping it current

The page loads once and doesn't refresh itself, so use Refresh to pull in new entries. The live consoles on the STK Push and C2B pages and the Recent activity list on Overview update on their own.

## Clearing the log

Clear log deletes every entry for the project, STK and C2B, and can't be undone. Click once to arm it and again to confirm. Pending STK requests aren't affected, because they live in memory. Daraja Local never prunes the log by itself.
