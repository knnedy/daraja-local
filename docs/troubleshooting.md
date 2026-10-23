# Troubleshooting

Find your symptom, then check the cause. When in doubt, open the [Request Log](request-log.md). It shows exactly what Daraja Local received and sent.

Errors from Daraja Local have the same shape as Daraja's:

```json
{
  "requestId": "63336-37319-1",
  "errorCode": "400.002.02",
  "errorMessage": "Bad Request - Invalid request body"
}
```

## Authentication

| Symptom                                    | Cause                                                      | Fix                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `400.008.01` Invalid Authentication passed | The consumer key and secret don't match the project's.     | Copy both from the Credentials page. They're two different values. Re-copy them after rotating.                                 |
| `404.001.03` Invalid Access Token          | The token is missing, malformed or unknown.                | Fetch a token and send `Authorization: Bearer <token>`. Tokens are held in memory, so restarting Daraja Local invalidates them. |
| The token comes back empty in a script     | The OAuth call failed and your script swallowed the error. | Print the raw OAuth response before extracting the token.                                                                       |

## STK Push

| Symptom                                                     | Cause                                                     | Fix                                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `400.002.02` Bad Request - Invalid request body (HTTP 400)  | The body isn't valid JSON, or a field has the wrong type. | Send every field as a string. Check shell-built payloads for a stray newline (see below).                                       |
| `500.001.1001` [MerchantValidate] - Wrong credentials (500) | The password, base64 or timestamp is wrong.               | Password is `base64(shortcode + passkey + Timestamp)` with the same `Timestamp` as the body. Use the project's current passkey. |
| `500.001.1001` Merchant does not exist (500)                | `BusinessShortCode` isn't the project's shortcode.        | Use the shortcode from the Credentials page.                                                                                    |
| `400.002.02` Bad Request - Invalid PhoneNumber (400)        | Not `254`, then `7` or `1`, then 8 digits.                | Use the `2547XXXXXXXX` form. `+254…` and `07…` are rejected.                                                                    |
| `400.002.02` Bad Request - Invalid Amount (400)             | Not a whole number above zero.                            | Use `"100"`, not `"100.75"`, `"0"` or `100`.                                                                                    |
| `1025` … TransactionDesc exceeds 182 characters (500)       | `TransactionDesc` is too long.                            | Shorten it to 182 characters or fewer.                                                                                          |

A request that fails validation never reaches the Virtual Phone. It's logged as `rejected`.

## Callbacks

| Symptom                                  | Cause                                                                        | Fix                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| The callback never arrives               | Nothing is listening, the URL is wrong, or your handler isn't returning 200. | Open the group in the Request Log and read the delivery attempts. `connection refused` means nothing is listening. |
| The Request Log shows `delivery failed`  | All three attempts failed.                                                   | Same as above. Fix the handler, then send a new request. Failed callbacks aren't re-sent.                          |
| The same callback arrives more than once | Your handler did its work but returned something other than 200.             | Return exactly 200, and deduplicate by `CheckoutRequestID` (STK) or `TransID` (C2B).                               |
| A pending request disappeared            | Daraja Local was restarted. Pending requests live in memory.                 | Send it again.                                                                                                     |
| A request was never resolved             | It wasn't. It timed out (default 20 seconds) and sent a `1037` callback.     | Resolve it on the Virtual Phone before the countdown ends.                                                         |

## C2B

| Symptom                                                          | Cause                                                                                 | Fix                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Bad Request - Invalid ConfirmationURL - URL has the word MPESA` | A registered URL contains `mpesa`, `m-pesa` or `safaricom`. Daraja rejects those.     | Rename the route. Don't put those words in either URL.                                                  |
| `Bad Request - Invalid ResponseType`                             | `ResponseType` isn't `Completed` or `Cancelled`.                                      | Use one of those two values exactly.                                                                    |
| `Merchant does not exist` (500)                                  | `ShortCode` isn't the project's shortcode.                                            | Use the shortcode from the Credentials page.                                                            |
| `No ConfirmationURL registered for this shortcode`               | You called `simulate` before `registerurl`, or with a different project's token.      | Call `registerurl` first, using the same project's credentials. Registrations are per project.          |
| `Bad Request - Invalid CommandID`                                | Not `CustomerPayBillOnline` or `CustomerBuyGoodsOnline`.                              | Use one of those two values.                                                                            |
| Your `ValidationURL` is never called                             | Validation only runs when `ResponseType` is `Cancelled` and a `ValidationURL` is set. | Register with `Cancelled` and a `ValidationURL`.                                                        |
| The payment is rejected and the flow shows a fallback            | Your `ValidationURL` failed, returned non-200, timed out, or sent an unreadable body. | Return 200 with `{"ResultCode": "0", "ResultDesc": "Accepted"}`. `ResultCode` must be the string `"0"`. |
| The confirmation arrived more than once                          | Daraja Local retries a failed confirmation up to three times.                         | Return exactly 200, and deduplicate by `TransID`. Real Daraja is reported not to retry.                 |

## Nothing shows up in the Request Log

- **Your app still calls Safaricom.** A hardcoded base URL sends requests to Safaricom, so Daraja Local never sees them. Read the base URL from configuration.
- **Wrong port.** Daraja Local moves to the next free port if `7060` is busy. Check the address in the startup banner, or pin the port with `DARAJA_LOCAL_PORT`.
- **Your app runs in a container.** Daraja Local listens on `127.0.0.1` only, so a container on default networking can't reach it. Run your app on the host while testing.

## Starting the server

| Message                                                   | Cause and fix                                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `DARAJA_LOCAL_PORT 7060 is already in use`                | Another program has the port. Stop it, pick another port, or unset the variable to let Daraja Local choose. |
| `DARAJA_LOCAL_PORT "…" is not a valid port (use 1-65535)` | The value isn't a number between 1 and 65535.                                                               |
| `no available port found in range 7060-7109`              | All 50 ports from `7060` are taken. Free one, or pin another port.                                          |

## Shell gotchas

**A newline inside the password.** GNU `base64` on Linux wraps its output every 76 characters. That puts a newline inside the `Password` string, which makes your JSON invalid and fails with `Invalid request body`. Strip it:

```bash
PASSWORD=$(printf '%s%s%s' "$SHORTCODE" "$PASSKEY" "$TIMESTAMP" | base64 | tr -d '\n')
```
