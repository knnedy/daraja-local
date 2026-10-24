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
- C2B `MSISDN` is the lowercase hex SHA-256 of the number. The algorithm and input were checked against a real sandbox sample, and the hash matched exactly.
- C2B `ResponseType` is the default action when your `ValidationURL` can't answer: `Completed` accepts, `Cancelled` rejects.
- Quirks kept on purpose: Safaricom's `OriginatorCoversationID` typo, `ResultCode` as a string in C2B validation replies, and C2B URLs rejected for containing `mpesa`, `m-pesa` or `safaricom`.

## Known differences

| Area                    | Daraja Local                                                                             | Real Daraja                                                                                 | Confidence |
| ----------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------- |
| C2B validation trigger  | Your `ValidationURL` is called whenever one is registered.                               | Safaricom must enable external validation for the shortcode first. Otherwise it never runs. | High       |
| C2B callback retries    | Confirmation is retried up to 3 times.                                                   | Reported to be sent once, with no retry.                                                    | Low        |
| `registerurl` response  | Includes `ConversationID` and `ResponseCode`, so clients reading either field work.      | v2 samples omit `ConversationID`. v1 samples omit `ResponseCode`.                           | Medium     |
| `simulate` response     | Includes `ResponseCode`.                                                                 | Most sandbox samples omit it.                                                               | Medium     |
| `simulate` on `v2`      | Answered, as an alias.                                                                   | Safaricom's docs list `v1`. Whether a real `v2` exists is unverified.                       | Low        |
| `MSISDN` on `v1` paths  | Always the hash, whichever path you registered through.                                  | v1 behavior is unverified.                                                                  | Low        |
| Registering twice       | Replaces the previous URLs.                                                              | Reportedly allowed once, with changes made through Safaricom.                               | Medium     |
| Callback URLs           | `http://` and `localhost` accepted.                                                      | HTTPS required in production, and localhost refused.                                        | High       |
| Blocked-word error text | `URL has the word MPESA` was observed. The text for `m-pesa` and `safaricom` follows it. | Exact wording for those two is unverified.                                                  | Low        |
| `Msisdn` error text     | `Bad Request - Invalid Msisdn`.                                                          | Unverified.                                                                                 | Low        |
| `TransAmount` format    | Echoes your `Amount` string, e.g. `"500"`.                                               | Some samples show decimals, e.g. `"1.00"`.                                                  | Low        |
| STK callback metadata   | No `Balance` item.                                                                       | Some real callbacks include a `Balance` item with no value.                                 | Low        |
| `ResultDesc` wording    | Follows Daraja's wording for the main outcomes, but may differ.                          | Safaricom's own text.                                                                       | Medium     |

## Validation that is looser than Daraja

Daraja Local does not check these, and real Daraja may:

- STK `Timestamp` freshness. Only the format is checked.
- STK `TransactionType`, `PartyA`, `PartyB`, `CallBackURL` and `AccountReference`.
- STK and C2B amount upper limits. Any whole number above zero passes.
- C2B `BillRefNumber`, which is passed through as given.

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
