# Fidelity

Daraja Local aims to behave like Daraja on the wire: the same routes, field names, error codes and callback shapes, quirks included, so code that works here works against Safaricom. This page says what matches, what doesn't, and how sure we are.

When Daraja Local and Safaricom disagree, Safaricom is right. If you find a difference, open an issue with a captured real response.

## How this was checked

Daraja Local has not been tested against Safaricom directly. Its behavior comes from Daraja documentation as reproduced in community SDKs, and from sandbox responses published in open-source repositories and tutorials. Confidence depends on the area:

- **OAuth and STK Push:** high. Many independent sources agree.
- **STK Push Query:** medium for a resolved request, lower for a pending or unknown one. Safaricom's documentation covers only the resolved case.
- **C2B response shapes and payloads:** medium. Samples differ between versions and sources.

Each known difference below says how sure we are.

## What matches

- Routes: `GET /oauth/v1/generate`, `POST /mpesa/stkpush/v1/processrequest`, `POST /mpesa/stkpushquery/v1/query`, and C2B `registerurl` and `simulate` on `v1` and `v2`.
- Authentication: Basic auth for the token, then Bearer. The STK password is `base64(shortcode + passkey + timestamp)`.
- Request fields are JSON strings, including amounts and phone numbers.
- Error bodies: `requestId`, `errorCode`, `errorMessage`. Codes include `400.002.02`, `400.008.01`, `404.001.03` and `500.001.1001`.
- STK `ResultCode` values `0`, `1`, `1032`, `1037` and `2001`, and a callback with no `CallbackMetadata` on failure.
- STK Push Query answers a resolved request with `ResponseCode`, `ResponseDescription`, `MerchantRequestID`, `CheckoutRequestID`, `ResultCode` and `ResultDesc`, with `ResultCode` as a string.
- STK callback metadata types: `Amount`, `TransactionDate` (`yyyyMMddHHmmss`) and `PhoneNumber` are numbers, and `MpesaReceiptNumber` is a string.
- C2B `MSISDN` hides the number by registration version: SHA-256 hex for v1, masked for v2. Safaricom's C2B documentation and an independent SDK agree on this split. The v1 hash was also checked against a real sandbox sample and matched exactly.
- C2B routes exist on both `v1` and `v2`. Safaricom's current documentation lists the `v2` paths for `registerurl` and `simulate`.
- Registering again replaces the previous URLs, as Safaricom's documentation says the sandbox allows.
- URLs containing `mpesa`, `m-pesa`, `safaricom`, `exe`, `exec`, `cmd`, `sql` or `query`, in any case, are refused, per Safaricom's documented list.
- C2B `ResponseType` is the default action when your `ValidationURL` can't answer: `Completed` accepts, `Cancelled` rejects.
- Quirks kept on purpose: Safaricom's `OriginatorCoversationID` typo and `ResultCode` as a string in C2B validation replies.

## Known differences

| Area                    | Daraja Local                                                                        | Real Daraja                                                                                                                                                                       | Confidence |
| ----------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| C2B validation trigger  | Your `ValidationURL` is called whenever one is registered.                          | Safaricom must enable external validation for the shortcode first. Otherwise it never runs.                                                                                       | High       |
| C2B callback retries    | Confirmation is retried up to 3 times within seconds.                               | Sources disagree. Safaricom's C2B page gives no retry policy and points to Pull Transaction for missed notifications; two integration guides report retries, one "over 24 hours". | Low        |
| `registerurl` response  | Includes `ConversationID` and `ResponseCode`, so clients reading either field work. | v2 samples omit `ConversationID`. v1 samples omit `ResponseCode`.                                                                                                                 | Medium     |
| `simulate` response     | Includes `ResponseCode`.                                                            | Most sandbox samples omit it.                                                                                                                                                     | Medium     |
| Registering twice       | Replaces the previous URLs, as the sandbox does.                                    | Production allows one registration per shortcode; another call fails with `500.003.1001` `Urls are already registered.` until the old URLs are deleted in the M-PESA portal.      | Medium     |
| Masked `MSISDN` format  | `2547 ***** 149`: first four and last three digits, spaces around five stars.       | Safaricom's sample is `2547 ***** 126`; an SDK shows `2547*****126` with no spaces. The star count may also vary.                                                                 | Low        |
| Callback URLs           | `http://` and `localhost` accepted.                                                 | HTTPS required in production, and localhost refused.                                                                                                                              | High       |
| Blocked-word error text | `URL has the word <WORD>`, for every blocked word.                                  | `URL has the word MPESA` was observed. The text for the other words is unverified.                                                                                                | Low        |
| `Msisdn` error text     | `Bad Request - Invalid Msisdn`.                                                     | Unverified.                                                                                                                                                                       | Low        |
| `TransAmount` format    | Echoes your `Amount` string, e.g. `"500"`.                                          | Some samples show decimals, e.g. `"1.00"`.                                                                                                                                        | Low        |
| STK callback metadata   | No `Balance` item.                                                                  | Some real callbacks include a `Balance` item with no value.                                                                                                                       | Low        |
| `ResultDesc` wording    | Follows Daraja's wording for the main outcomes, but may differ.                     | Safaricom's own text.                                                                                                                                                             | Medium     |

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
| STK Query while pending | HTTP 500, `errorCode` `500.001.1001`, `The transaction is being processed`. | Several integrators report this. One report shows HTTP 200 with `ResultCode` `1001` instead. | Medium |
| STK Query, unknown ID | HTTP 400, `errorCode` `400.002.02`, `Bad Request - Invalid CheckoutRequestID`. | Not documented, and no captured response was found. The code and text are our guess. | Low |
| STK Query `ResultCode` | Always a string. | The documented sample quotes it. The same page's field table calls it numeric. | Medium |
| STK Query after restart | Every `CheckoutRequestID` is unknown, because requests are held in memory. | Safaricom keeps them. How long is unverified. | Low |
