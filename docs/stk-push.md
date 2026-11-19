# STK Push

STK Push (M-Pesa Express) asks a customer to approve a payment on their phone. In Daraja Local the phone is the Virtual Phone on the STK Push page, and you choose what the customer does.

## The flow

1. Your app calls `POST /mpesa/stkpush/v1/processrequest` with a Bearer token.
2. Daraja Local validates the request. If it's invalid you get an error straight away and nothing is queued.
3. If it's valid you get an acceptance back, and the request appears on the Virtual Phone as pending.
4. You pick an outcome on the Virtual Phone. If you do nothing, the request times out.
5. Daraja Local POSTs the result to your `CallBackURL`.

The acceptance in step 3 only means the request was received. Your app learns the real outcome from the callback.

## Request

```
POST /mpesa/stkpush/v1/processrequest
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "BusinessShortCode": "<shortcode>",
  "Password": "<base64(shortcode + passkey + timestamp)>",
  "Timestamp": "20261022101500",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": "100",
  "PartyA": "254712345678",
  "PartyB": "<shortcode>",
  "PhoneNumber": "254712345678",
  "CallBackURL": "http://127.0.0.1:4000/payments/callback",
  "AccountReference": "Order-1",
  "TransactionDesc": "Test payment"
}
```

Every field is a JSON string, as in the real API. Daraja Local checks these:

| Field               | Rule                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `BusinessShortCode` | Must equal your project's shortcode.                                                                  |
| `Password`          | `base64(shortcode + passkey + timestamp)`, using your project's passkey and the `Timestamp` you send. |
| `Timestamp`         | Format `yyyyMMddHHmmss`.                                                                              |
| `Amount`            | A whole number greater than zero, as a string. `"100.75"` is rejected.                                |
| `PhoneNumber`       | `254`, then `7` or `1`, then 8 more digits (12 digits in total).                                      |
| `TransactionDesc`   | At most 182 characters.                                                                               |

`TransactionType`, `PartyA`, `PartyB`, `CallBackURL` and `AccountReference` are accepted as sent. A bad `CallBackURL` shows up later as a failed delivery in the [Request Log](request-log.md). Failed validations return Daraja-shaped errors, which [Troubleshooting](troubleshooting.md) lists.

## Response

```json
{
  "MerchantRequestID": "29115-34620561-1",
  "CheckoutRequestID": "ws_CO_191220191020363925",
  "ResponseCode": "0",
  "ResponseDescription": "Success. Request accepted for processing",
  "CustomerMessage": "Success. Request accepted for processing"
}
```

Keep the `CheckoutRequestID`. It ties the callback and every log entry to this request.

## Outcomes

On the Virtual Phone you choose what the customer does. Each choice sends a callback with the matching `ResultCode`.

| Virtual Phone button | `ResultCode` | The callback carries                                                         |
| -------------------- | ------------ | ---------------------------------------------------------------------------- |
| Approve              | `0`          | `CallbackMetadata`: amount, receipt number, transaction date, phone number   |
| Wrong PIN            | `2001`       | `ResultCode` and `ResultDesc` only                                           |
| Insufficient         | `1`          | `ResultCode` and `ResultDesc` only                                           |
| Cancel               | `1032`       | `ResultCode` and `ResultDesc` only                                           |
| _(no button)_        | `1037`       | `ResultCode` and `ResultDesc` only, sent automatically when the timeout ends |

Approve generates a random receipt number. These are the result codes Daraja documents for these outcomes. See [Using it with your app](using-with-your-app.md#3-what-your-callback-handler-must-do) for the exact callback bodies and what your handler must do.

## Timeouts and pending requests

The timeout defaults to 20 seconds and is stored per project in its settings. The Virtual Phone shows it as a countdown ring. When it reaches zero, Daraja Local resolves the request as a timeout (`1037`) and sends the callback, exactly as if you had waited.

Several requests can be pending at once. A strip above the phone switches between them, showing each amount and the last four digits of the number. Each request can be resolved once.

Pending requests are held in memory. If you stop Daraja Local while one is pending, it is dropped and no callback is ever sent. Its log entries remain.

## Resolving from a script

For automated tests you can resolve a request without clicking. This is Daraja Local's own dashboard API, not part of Daraja, and it may change before 1.0.

```bash
curl -s http://127.0.0.1:7060/api/projects          # find your project's "slug"

curl -X POST "http://127.0.0.1:7060/api/projects/<slug>/stk/<CheckoutRequestID>/resolve" \
  -H "Content-Type: application/json" \
  -d '{"outcome": "approved"}'
```

Valid outcomes are `approved`, `wrong_pin`, `insufficient_balance`, `cancelled` and `timeout`. A successful call returns `resultCode` and `resultDesc`, plus the `receipt` the callback will carry when the payment is approved, e.g. `{"receipt": "TKL3H9QW2B", "resultCode": 0, "resultDesc": "The service request is processed successfully."}`. The callback is sent in the background. Resolving a request that is unknown or already resolved returns an error.

## Inspecting and resending callbacks

The **Callbacks** card on the STK page lists recent payments. For each one it shows the exact callback body sent to your `CallBackURL` and, for every attempt, the HTTP status or connection error, how long it took, and the first 2 KB of your reply.

**Resend callback** posts the same body again, byte for byte, to the `CallBackURL` it first went to. Use it after fixing a handler that failed, or to check that your handler ignores a `CheckoutRequestID` it has already processed. The resend appears under the same payment, marked as resent.

Real Daraja has no resend. This is Daraja Local's own tool, and so is its dashboard API, which may change before 1.0:

```bash
curl -X POST "http://127.0.0.1:7060/api/projects/<slug>/stk/<CheckoutRequestID>/resend"
```

It returns 204 and delivers in the background, or 404 while the customer hasn't answered yet.

## Querying a request

STK Push Query tells your app how a request ended without waiting for the callback. Use it when a callback never arrives.

```
POST /mpesa/stkpushquery/v1/query
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "BusinessShortCode": "<shortcode>",
  "Password": "<base64(shortcode + passkey + timestamp)>",
  "Timestamp": "20261022101500",
  "CheckoutRequestID": "ws_CO_191220191020363925"
}
```

Once the request has an outcome, you get 200 with its `ResultCode` and `ResultDesc`:

```json
{
  "ResponseCode": "0",
  "ResponseDescription": "The service request has been accepted successfully",
  "MerchantRequestID": "29115-34620561-1",
  "CheckoutRequestID": "ws_CO_191220191020363925",
  "ResultCode": "1032",
  "ResultDesc": "Request cancelled by user"
}
```

`ResultCode` is a string here and a number in the callback. A `ResponseCode` of `0` only means the query worked; read `ResultCode` for the payment.

While the request is still pending on the Virtual Phone, the query returns HTTP 500 with `errorCode` `500.001.1001` and `errorMessage` `The transaction is being processed`. Treat that as "ask again later", not as a failed payment.

A `CheckoutRequestID` that Daraja Local does not know, or that belongs to another project, returns HTTP 400 with `errorCode` `400.002.02`. Requests are held in memory, so every ID is unknown after a restart.

Queries are written to the request log alongside the request they ask about. See [Fidelity](fidelity.md) for how sure we are about each of these responses.
