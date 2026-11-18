# B2B and Account Balance

B2B (Business to Business) is your business paying another business: a supplier's PayBill (`BusinessPayBill`) or a merchant's Till (`BusinessBuyGoods`). Account Balance asks what each of your M-Pesa accounts holds. Both work like B2C: they're signed with your initiator, accepted at once, and the actual result arrives later at your `ResultURL`.

The B2B page lets you send both from the dashboard, set your simulated balances, and see each result with what your server replied.

## Endpoints

All need the same Bearer token as STK Push.

| Endpoint                              | Purpose                                         |
| ------------------------------------- | ----------------------------------------------- |
| `POST /mpesa/b2b/v1/paymentrequest`   | Pay a PayBill or Till from your working account |
| `POST /mpesa/accountbalance/v1/query` | Report every account's balance                  |

## Your accounts

Each project has simulated accounts, shown and editable on the B2B page:

| Account      | Starts at     | Money in                       | Money out              |
| ------------ | ------------- | ------------------------------ | ---------------------- |
| Utility      | KES 1,000,000 | STK and C2B customer payments  | B2C payouts, reversals |
| Working      | KES 0         | Set by you on the B2B page     | B2B payments           |
| Charges paid | KES 0         | Nothing: no fees are simulated | Nothing                |

Safaricom documents that customer payments land in the utility account and that B2B moves money "from your MMF/Working account". On real M-Pesa you move funds between the two in the org portal; here you set the working balance directly. **Top up the working account before your first B2B payment**, or it fails with `ResultCode` `1`.

## B2B payment

```json
{
  "Initiator": "testapi",
  "SecurityCredential": "<base64>",
  "CommandID": "BusinessPayBill",
  "SenderIdentifierType": "4",
  "RecieverIdentifierType": "4",
  "Amount": "1500",
  "PartyA": "<your shortcode>",
  "PartyB": "000000",
  "AccountReference": "INV-001",
  "Requester": "254708374149",
  "Remarks": "OK",
  "QueueTimeOutURL": "https://your-app.com/api/b2b/timeout",
  "ResultURL": "https://your-app.com/api/b2b/result"
}
```

- Both identifier types must be `"4"` (a shortcode).
- `PartyB` is the other business's shortcode, not your own.
- `AccountReference` is up to 13 characters. `Requester`, the customer you're paying on behalf of, is optional.
- Safaricom's samples spell `"Command ID"` with a space and misspell `RecieverIdentifierType`. Every spelling works here.

The result:

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "29777-13073268-1",
    "ConversationID": "AG_20261119_e96617f6fb3d4913",
    "TransactionID": "ALG9I29UTO",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "DebitAccountBalance",
          "Value": "{Amount={CurrencyCode=KES, MinimumAmount=350000, BasicAmount=3500.00}}"
        },
        { "Key": "Amount", "Value": "61.00" },
        {
          "Key": "DebitPartyAffectedAccountBalance",
          "Value": "Working Account|KES|3500.00|3500.00|0.00|0.00"
        },
        { "Key": "TransCompletedTime", "Value": "20261119000946" },
        { "Key": "DebitPartyCharges", "Value": "" },
        { "Key": "ReceiverPartyPublicName", "Value": "000000 - Test Business" },
        { "Key": "Currency", "Value": "KES" },
        {
          "Key": "InitiatorAccountCurrentBalance",
          "Value": "{Amount={CurrencyCode=KES, MinimumAmount=350000, BasicAmount=3500.00}}"
        }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": [
        { "Key": "BillReferenceNumber", "Value": "353353" },
        {
          "Key": "QueueTimeoutURL",
          "Value": "https://your-app.com/api/b2b/timeout"
        }
      ]
    }
  }
}
```

`TransactionID` is the payment's receipt. The payment is recorded, so [Transaction Status](transactions.md) can find it. It can't be reversed through the API.

## Account Balance

```json
{
  "Initiator": "testapi",
  "SecurityCredential": "<base64>",
  "CommandID": "AccountBalance",
  "PartyA": "<your shortcode>",
  "IdentifierType": "4",
  "Remarks": "OK",
  "QueueTimeOutURL": "https://your-app.com/api/balance/timeout",
  "ResultURL": "https://your-app.com/api/balance/result"
}
```

The result reports every account in one string, under the `AccountBalance` parameter. Accounts are joined by `&`, and each one is `name|currency|available|current|reserved|uncleared`:

```json
{
  "Result": {
    "ResultType": "0",
    "ResultCode": "0",
    "ResultDesc": "The service request is processed successfully.",
    "TransactionID": "MW60000000",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "AccountBalance",
          "Value": "Working Account|KES|3561.00|3561.00|0.00|0.00&Float Account|KES|0.00|0.00|0.00|0.00&Utility Account|KES|1000000.00|1000000.00|0.00|0.00&Charges Paid Account|KES|0.00|0.00|0.00|0.00&Organization Settlement Account|KES|0.00|0.00|0.00|0.00"
        },
        { "Key": "BOCompletedTime", "Value": "20261119000946" }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": {
        "Key": "QueueTimeoutURL",
        "Value": "https://internalsandbox.safaricom.co.ke/mpesa/abresults/v1/submit"
      }
    }
  }
}
```

`ResultType` and `ResultCode` are strings here, as in Safaricom's sample, while B2B sends numbers. Compare `ResultCode` as a string and your code handles both.

## Failures

Failures arrive at your `ResultURL` with a single `BOCompletedTime` parameter instead of a list, as in Safaricom's failure sample.

| `ResultCode` | `ResultDesc`                                     | When                                                           |
| ------------ | ------------------------------------------------ | -------------------------------------------------------------- |
| `2001`       | The initiator information is invalid.            | The `SecurityCredential` or initiator name is wrong.           |
| `1`          | The balance is insufficient for the transaction. | B2B: the working account holds less than the amount (a guess). |

A request with a bad field is refused at once with HTTP 400 and `400.002.02` `Bad Request - Invalid <Field>`.
