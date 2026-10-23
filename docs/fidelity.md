# Fidelity

Daraja Local aims to behave like Daraja on the wire: the same routes, field names, error codes and callback shapes, quirks included, so code that works here works against Safaricom. This page says what matches, what doesn't, and how sure we are.

When Daraja Local and Safaricom disagree, Safaricom is right. If you find a difference, open an issue with a captured real response.

## How this was checked

Daraja Local has not been tested against Safaricom directly. Its behavior comes from Daraja documentation as reproduced in community SDKs, and from sandbox responses published in open-source repositories and tutorials. Confidence depends on the area:

- **OAuth and STK Push:** high. Many independent sources agree.
- **C2B response shapes and payloads:** medium. Samples differ between versions and sources.

Each known difference below says how sure we are.

## What matches

- Routes: `GET /oauth/v1/generate`, `POST /mpesa/stkpush/v1/processrequest`, and C2B `registerurl` and `simulate` on `v1` and `v2`.
- Authentication: Basic auth for the token, then Bearer. The STK password is `base64(shortcode + passkey + timestamp)`.
- Request fields are JSON strings, including amounts and phone numbers.
- Error bodies: `requestId`, `errorCode`, `errorMessage`. Codes include `400.002.02`, `400.008.01`, `404.001.03` and `500.001.1001`.
- STK `ResultCode` values `0`, `1`, `1032`, `1037` and `2001`, and a callback with no `CallbackMetadata` on failure.
- STK callback metadata types: `Amount`, `TransactionDate` (`yyyyMMddHHmmss`) and `PhoneNumber` are numbers, and `MpesaReceiptNumber` is a string.
- Quirks kept on purpose: Safaricom's `OriginatorCoversationID` typo, `ResultCode` as a string in C2B validation replies, and C2B URLs rejected for containing `mpesa`, `m-pesa` or `safaricom`.

## Known differences

| Area                     | Daraja Local                                                                                          | Real Daraja                                                                                                                 | Confidence  |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| C2B `MSISDN` in payloads | The plain number you passed to `simulate`.                                                            | v2 sends a SHA-256 hash of the number.                                                                                      | Medium-high |
| C2B validation switch    | `ResponseType: Cancelled` turns validation on, `Completed` turns it off.                              | Safaricom enables validation per shortcode. `ResponseType` only sets what happens when your `ValidationURL` is unreachable. | Medium      |
| C2B callback retries     | Confirmation is retried up to 3 times.                                                                | Reported to be sent once, with no retry.                                                                                    | Medium      |
| `registerurl` response   | Includes a `ConversationID` and `ResponseCode`.                                                       | v2 samples show `OriginatorCoversationID`, `ResponseCode` and `ResponseDescription` without `ConversationID`.               | Medium      |
| `simulate` response      | Includes `ResponseCode`.                                                                              | Most sandbox samples omit it.                                                                                               | Medium      |
| `simulate` on `v2`       | Answered, as an alias.                                                                                | Safaricom's docs list `v1`. Whether a real `v2` exists is unverified.                                                       | Low         |
| Callback URLs            | `http://` and `localhost` accepted.                                                                   | HTTPS required in production, and localhost refused.                                                                        | High        |
| Blocked-word error text  | `URL has the word MPESA` is observed. The text for `m-pesa` and `safaricom` follows the same pattern. | Exact wording for those two is unverified.                                                                                  | Low         |
| `TransAmount` format     | Echoes your `Amount` string, e.g. `"500"`.                                                            | Some samples show decimals, e.g. `"1.00"`.                                                                                  | Low         |
| STK callback metadata    | No `Balance` item.                                                                                    | Real callbacks often include a `Balance` item.                                                                              | Medium      |
| `ResultDesc` wording     | Follows Daraja's wording for the main outcomes, but may differ.                                       | Safaricom's own text.                                                                                                       | Medium      |

## Validation that is looser than Daraja

Daraja Local does not check these, and real Daraja may:

- STK `Timestamp` freshness. Only the format is checked.
- STK `TransactionType`, `PartyA`, `PartyB`, `CallBackURL` and `AccountReference`.
- STK and C2B amount upper limits. Any whole number above zero passes.
- C2B `Msisdn` and `BillRefNumber`, which are passed through as given.

A `TransactionDesc` over 182 characters returns error code `1025` with a custom message. That code and text haven't been checked against Daraja.

## Emulator-only behavior

These exist because Daraja Local is a local tool, not because Daraja works this way:

- `simulate` fails until you've called `registerurl`. Real Daraja would silently have nowhere to deliver.
- Pending STK requests and access tokens live in memory, so a restart drops them.
- STK callbacks are retried up to 3 times, 1 second then 2 seconds apart, with a 10 second timeout per attempt. Real Safaricom's STK retry behavior is unverified.
- The dashboard's own API, including the endpoint that resolves an STK request, isn't part of Daraja and may change before 1.0.
- Daraja Local listens on `127.0.0.1` only, and never prunes the request log.

## Not implemented

STK Push Query, B2C, B2B, Reversal, Account Balance and Transaction Status.
