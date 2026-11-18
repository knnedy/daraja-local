# B2C

B2C (Business to Customer) is your business paying money out to a customer's phone: refunds, salaries, winnings. Your app sends a payment request, Daraja accepts it at once, and the actual result arrives later at a `ResultURL` you supply.

## The flow

1. **Request the payout.** Your app calls `paymentrequest` with your initiator's name, a `SecurityCredential`, the amount, the customer's phone as `PartyB`, and two URLs.
2. **Accepted.** The reply only says the request was queued: `ResponseCode` `"0"` and a `ConversationID`. Nothing has been paid yet, and a wrong password is not caught here.
3. **Processing.** About two seconds later, Daraja Local checks the credential, any outcome you forced, the per-transaction limit and your simulated balance.
4. **Result.** The outcome is POSTed to your `ResultURL`. If the request timed out in the queue, a timeout goes to `QueueTimeOutURL` instead.

The B2C page traces each payout through these steps, and the [Request Log](request-log.md) keeps the history.

## Endpoints

All need the same Bearer token as STK Push.

| Endpoint                            | Purpose                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `POST /mpesa/b2c/v3/paymentrequest` | Pay out to a phone. `OriginatorConversationID` is required.          |
| `POST /mpesa/b2c/v1/paymentrequest` | Same, older path. Generates an `OriginatorConversationID` if absent. |

## Your initiator and SecurityCredential

Each project has its own initiator. The Credentials page shows its name (`testapi`) and password, and offers its certificate to download. Your app encrypts the password with the certificate's public key (RSA, PKCS#1 v1.5) and base64-encodes the result. That is the `SecurityCredential`. The Credentials page has Node, Python and Go code that does this.

This is the same work you do against Safaricom, where you use their certificate and your portal initiator. Only the certificate file and the password change when you switch.

A credential made with the wrong password or certificate is still accepted at first. The payout then fails with `ResultCode` `2001`, as on Daraja.

## The request

```json
{
  "OriginatorConversationID": "payout-0001",
  "InitiatorName": "testapi",
  "SecurityCredential": "<base64>",
  "CommandID": "BusinessPayment",
  "Amount": 2500,
  "PartyA": 600000,
  "PartyB": 254708374149,
  "Remarks": "Refund for order 1001",
  "QueueTimeOutURL": "https://your-app.com/api/b2c/timeout",
  "ResultURL": "https://your-app.com/api/b2c/result",
  "Occassion": ""
}
```

- `CommandID` is `SalaryPayment`, `BusinessPayment` or `PromotionPayment`.
- `Amount`, `PartyA` and `PartyB` may be numbers or strings. `Amount` must be whole shillings.
- `PartyA` is your project's shortcode. `PartyB` is `2547XXXXXXXX` or `2541XXXXXXXX`.
- `Remarks` is 2 to 100 characters. `Occassion` (Safaricom's spelling; `Occasion` also works) is optional.
- Each `OriginatorConversationID` can be used once per project. Repeating one returns HTTP 500 `500.002.1001` `Duplicate OriginatorConversationID.`

A field that fails these checks returns HTTP 400 `400.002.02` `Bad Request - Invalid <Field>`.

The synchronous reply:

```json
{
  "ConversationID": "AG_20261118_2010759fd5662ef6d054",
  "OriginatorConversationID": "payout-0001",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

## The result

A completed payout:

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "payout-0001",
    "ConversationID": "AG_20261118_2010759fd5662ef6d054",
    "TransactionID": "NLJ41HAY6Q",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "TransactionAmount", "Value": 2500 },
        { "Key": "TransactionReceipt", "Value": "NLJ41HAY6Q" },
        { "Key": "B2CRecipientIsRegisteredCustomer", "Value": "Y" },
        { "Key": "B2CChargesPaidAccountAvailableFunds", "Value": 0.0 },
        {
          "Key": "ReceiverPartyPublicName",
          "Value": "254708374149 - John Doe"
        },
        {
          "Key": "TransactionCompletedDateTime",
          "Value": "18.11.2026 14:05:12"
        },
        { "Key": "B2CUtilityAccountAvailableFunds", "Value": 997500.0 },
        { "Key": "B2CWorkingAccountAvailableFunds", "Value": 0.0 }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": {
        "Key": "QueueTimeoutURL",
        "Value": "https://internalsandbox.safaricom.co.ke/mpesa/b2cresults/v1/submit"
      }
    }
  }
}
```

`ResultCode` is a number. A failed payout has the same shape without `ResultParameters`, so read the code before looking for a receipt.

| Outcome                | `ResultCode` | `ResultDesc`                                                                                        |
| ---------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| Completed              | `0`          | The service request is processed successfully.                                                      |
| Insufficient balance   | `1`          | The balance is insufficient for the transaction.                                                    |
| Over transaction limit | `3`          | Declined due to limit rule: greater than the maximum transaction amount.                            |
| Daily limit            | `4`          | Declined due to limit rule: would exceed daily transfer limit                                       |
| Invalid initiator      | `2001`       | The initiator information is invalid.                                                               |
| Unregistered customer  | `2040`       | Credit Party customer type (Unregistered or Registered Customer) can't be supported by the service. |
| Queue timeout          | `1037`       | The request timed out while awaiting processing. Sent to `QueueTimeOutURL`.                         |

Daraja Local tries a result up to 3 times until your server answers HTTP 200. Whether Safaricom retries B2C results is undocumented.

## Choosing the outcome

Left alone, a payout completes unless:

- the credential is wrong (`2001`),
- the amount is over KES 250,000 (`3`), or
- the amount is more than the utility account holds (`1`).

To test your failure handling, pick a result under **Next payout result** on the B2C page. It applies to the next payout only, then resets. A wrong credential still wins over a forced result, because Daraja checks the initiator first.

## The utility account

Each project starts with KES 1,000,000 in a simulated utility account. Customer STK and C2B payments add to it and completed payouts draw it down, and the remaining balance is reported in `B2CUtilityAccountAvailableFunds`. Use **Set balance** on the B2C page to top it up or drain it. No transaction charges are deducted.

## From the dashboard

**Send a test payout** on the B2C page makes the same request your app would, signed with the project's own initiator. `ResultURL` and `QueueTimeOutURL` default to `/b2c/result` and `/b2c/timeout` under your project's callback base URL. The payout flow shows exactly what was sent to your server and what it replied.
