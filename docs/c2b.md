# C2B

C2B (Customer to Business) covers customers paying your Paybill or Till number directly. Your app finds out through two callbacks that Daraja sends to URLs you register. In real Daraja the customer pays from their own phone. In Daraja Local you call a `simulate` endpoint, which stands in for that customer.

## The flow

1. **Register your URLs, once.** Your app calls `registerurl` with a `ConfirmationURL`, an optional `ValidationURL` and a `ResponseType`.
2. **A payment happens.** In Daraja Local you call `simulate`. It answers immediately, and the rest happens in the background.
3. **Validation, optional.** If validation is on, Daraja Local POSTs the payment to your `ValidationURL` and waits for your answer. This is your one chance to reject it.
4. **Confirmation.** Unless your validation rejected the payment, Daraja Local POSTs it to your `ConfirmationURL`. A confirmation can't be rejected, because the money has already moved.

The C2B page shows each step as it happens, and the [Request Log](request-log.md) keeps the history.

## Endpoints

All need the same Bearer token as STK Push.

| Endpoint                         | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `POST /mpesa/c2b/v1/registerurl` | Register your URLs                         |
| `POST /mpesa/c2b/v2/registerurl` | Same, v2 path                              |
| `POST /mpesa/c2b/v1/simulate`    | Simulate a customer payment (sandbox only) |
| `POST /mpesa/c2b/v2/simulate`    | Same, v2 path                              |

## Register your URLs

```json
{
  "ShortCode": "<shortcode>",
  "ResponseType": "Cancelled",
  "ConfirmationURL": "http://127.0.0.1:4000/c2b/confirmation",
  "ValidationURL": "http://127.0.0.1:4000/c2b/validation"
}
```

| Field             | Rule                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `ShortCode`       | Must equal your project's shortcode.                                  |
| `ResponseType`    | `Completed` or `Cancelled`. See below.                                |
| `ConfirmationURL` | Where payment confirmations go. You need one before you can simulate. |
| `ValidationURL`   | Optional. Where validation requests go.                               |

Neither URL may contain `mpesa`, `m-pesa` or `safaricom`, in any capitalization. Daraja rejects them. Daraja Local also accepts `http://` and `localhost` URLs, which real Daraja refuses. Registering again replaces the previous URLs.

The response:

```json
{
  "OriginatorCoversationID": "5118-111210482-1",
  "ConversationID": "AG_20261022_2010759fd5662ef6d054",
  "ResponseCode": "0",
  "ResponseDescription": "success"
}
```

`OriginatorCoversationID` is spelled that way on purpose. It's Safaricom's own typo, and Daraja Local copies it so your client sees the same field name.

### What `ResponseType` does here

- **`Completed`:** validation is off. Every payment goes straight to confirmation.
- **`Cancelled`:** validation is on. Daraja Local calls your `ValidationURL` for each payment, and if it can't get a usable answer it rejects the payment. With no `ValidationURL` set, `Cancelled` behaves like `Completed`.

This is a simplification. In real Daraja, validation is switched on per shortcode by Safaricom, and `ResponseType` only decides what happens when your `ValidationURL` can't be reached. See [Fidelity](fidelity.md).

## Simulate a payment

```json
{
  "ShortCode": "<shortcode>",
  "CommandID": "CustomerPayBillOnline",
  "Amount": "500",
  "Msisdn": "254708374149",
  "BillRefNumber": "INV1001"
}
```

| Field           | Rule                                                                  |
| --------------- | --------------------------------------------------------------------- |
| `ShortCode`     | Must equal your project's shortcode.                                  |
| `CommandID`     | `CustomerPayBillOnline` (Paybill) or `CustomerBuyGoodsOnline` (Till). |
| `Amount`        | A whole number greater than zero, as a string.                        |
| `Msisdn`        | The paying customer's number. Passed through as given.                |
| `BillRefNumber` | The account reference. Passed through as given.                       |

You must call `registerurl` first. Otherwise `simulate` fails, because there'd be nowhere to send the confirmation. That rule is Daraja Local's own: real Daraja would silently have nowhere to deliver.

The response comes back at once, before validation or confirmation run:

```json
{
  "OriginatorCoversationID": "16740-34861180-1",
  "ConversationID": "AG_20261022_00005797af5d7d75f652",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

## What your server receives

The same body goes to both the validation and the confirmation URL:

```json
{
  "TransactionType": "Pay Bill",
  "TransID": "RKTQDM7W6S",
  "TransTime": "20261022101500",
  "TransAmount": "500",
  "BusinessShortCode": "<shortcode>",
  "BillRefNumber": "INV1001",
  "InvoiceNumber": "",
  "OrgAccountBalance": "",
  "ThirdPartyTransID": "",
  "MSISDN": "254708374149",
  "FirstName": "",
  "MiddleName": "",
  "LastName": ""
}
```

`TransactionType` is `Buy Goods` for `CustomerBuyGoodsOnline`. `TransID` is the same in validation and confirmation, so use it to match them up and to deduplicate. The name, invoice and balance fields arrive blank, because Daraja Local has no subscriber data.

**Don't rely on `MSISDN`.** Real Daraja v2 sends a SHA-256 hash of the customer's number in this field, not the number itself. Daraja Local currently sends the plain number you passed to `simulate`. Code that reads it will work here and break against Safaricom.

## Validation

Validation only runs when `ResponseType` is `Cancelled` and a `ValidationURL` is registered. It's a single attempt with a 10 second timeout, and there are no retries.

Reply with HTTP 200 and a JSON body. `ResultCode` must be a string, and `"0"` accepts:

```json
{ "ResultCode": "0", "ResultDesc": "Accepted" }
```

Any other `ResultCode` rejects the payment. Daraja documents these codes for rejections:

| `ResultCode` | Meaning                |
| ------------ | ---------------------- |
| `C2B00011`   | Invalid MSISDN         |
| `C2B00012`   | Invalid account number |
| `C2B00013`   | Invalid amount         |
| `C2B00014`   | Invalid KYC details    |
| `C2B00015`   | Invalid shortcode      |
| `C2B00016`   | Other error            |

Daraja Local treats every non-`"0"` code the same way. A rejected payment never gets a confirmation. If your `ValidationURL` is unreachable, answers with a non-200 status, times out, or returns a body Daraja Local can't read, the payment is rejected too. The C2B page marks that case as a fallback.

## Confirmation

Confirmation is sent after validation passes, or straight away when validation is off. Your answer doesn't change anything. Daraja Local only records whether it got HTTP 200.

If delivery fails, Daraja Local makes up to three attempts, waiting 1 second after the first failure and 2 after the second, each with a 10 second timeout. Real Daraja is reported not to retry C2B notifications at all. Design your handler for one delivery, and reconcile payments some other way too.

## Handler examples

Each pair rejects payments that have no `BillRefNumber` and accepts the rest. Return exactly 200 from the confirmation handler.

### Go

```go
http.HandleFunc("/c2b/validation", func(w http.ResponseWriter, r *http.Request) {
	var p struct{ BillRefNumber string }
	json.NewDecoder(r.Body).Decode(&p)

	w.Header().Set("Content-Type", "application/json")
	if p.BillRefNumber == "" {
		fmt.Fprint(w, `{"ResultCode":"C2B00012","ResultDesc":"Rejected"}`)
		return
	}
	fmt.Fprint(w, `{"ResultCode":"0","ResultDesc":"Accepted"}`)
})

http.HandleFunc("/c2b/confirmation", func(w http.ResponseWriter, r *http.Request) {
	var p struct{ TransID, TransAmount, BillRefNumber string }
	json.NewDecoder(r.Body).Decode(&p)

	fmt.Println("paid:", p.TransID, p.TransAmount, p.BillRefNumber)
	w.WriteHeader(http.StatusOK)
})
```

### Node.js (Express)

```js
app.post("/c2b/validation", (req, res) => {
  if (!req.body.BillRefNumber) {
    return res.json({ ResultCode: "C2B00012", ResultDesc: "Rejected" });
  }
  res.json({ ResultCode: "0", ResultDesc: "Accepted" });
});

app.post("/c2b/confirmation", (req, res) => {
  const { TransID, TransAmount, BillRefNumber } = req.body;
  console.log("paid:", TransID, TransAmount, BillRefNumber);
  res.sendStatus(200);
});
```

### Python (Flask)

```python
@app.post("/c2b/validation")
def validation():
    if not request.get_json().get("BillRefNumber"):
        return jsonify(ResultCode="C2B00012", ResultDesc="Rejected")
    return jsonify(ResultCode="0", ResultDesc="Accepted")


@app.post("/c2b/confirmation")
def confirmation():
    p = request.get_json()
    print("paid:", p["TransID"], p["TransAmount"], p["BillRefNumber"])
    return "", 200
```

## Try it

With the handlers above running on port 4000, and your project's values exported as in [Using it with your app](using-with-your-app.md):

```bash
TOKEN=$(curl -s -u "$DARAJA_CONSUMER_KEY:$DARAJA_CONSUMER_SECRET" \
  "$DARAJA_BASE_URL/oauth/v1/generate?grant_type=client_credentials" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

curl -X POST "$DARAJA_BASE_URL/mpesa/c2b/v2/registerurl" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ShortCode\": \"$DARAJA_SHORTCODE\",
    \"ResponseType\": \"Cancelled\",
    \"ConfirmationURL\": \"http://127.0.0.1:4000/c2b/confirmation\",
    \"ValidationURL\": \"http://127.0.0.1:4000/c2b/validation\"
  }"

curl -X POST "$DARAJA_BASE_URL/mpesa/c2b/v2/simulate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ShortCode\": \"$DARAJA_SHORTCODE\",
    \"CommandID\": \"CustomerPayBillOnline\",
    \"Amount\": \"500\",
    \"Msisdn\": \"254708374149\",
    \"BillRefNumber\": \"INV1001\"
  }"
```

Open the C2B page. The payment flow lights up as validation and confirmation complete. Change `BillRefNumber` to `""` and simulate again to watch a rejection stop the flow before confirmation.
