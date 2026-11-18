# Transaction Status and Reversal

Every payment that completes in Daraja Local is kept: approved STK Pushes, confirmed C2B payments and completed B2C payouts. Two Daraja APIs work on that record:

- **Transaction Status** looks a transaction up by its M-Pesa receipt, or by the `OriginatorConversationID` of the request that made it. Use it to reconcile when a callback never arrived.
- **Reversal** refunds a customer's STK or C2B payment into your shortcode.

Both are initiator APIs, like B2C: you sign them with your initiator's `SecurityCredential` (see [B2C](b2c.md#your-initiator-and-securitycredential)), the reply only says the request was accepted, and the result arrives about two seconds later at your `ResultURL`.

The Transactions page lists every recorded transaction, with **Status** and **Reverse** buttons that send the same requests your app would.

## Endpoints

| Endpoint                                 | Purpose                    |
| ---------------------------------------- | -------------------------- |
| `POST /mpesa/transactionstatus/v1/query` | Look a transaction up      |
| `POST /mpesa/reversal/v1/request`        | Reverse a customer payment |

Both need the same Bearer token as STK Push and reply with:

```json
{
  "OriginatorConversationID": "1236-7134259-1",
  "ConversationID": "AG_20261118_1234409f86436c583e3f",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

## Transaction Status

```json
{
  "Initiator": "testapi",
  "SecurityCredential": "<base64>",
  "CommandID": "TransactionStatusQuery",
  "TransactionID": "SKC82PACB8",
  "OriginalConversationID": "",
  "PartyA": "600000",
  "IdentifierType": "4",
  "ResultURL": "https://your-app.com/api/status/result",
  "QueueTimeOutURL": "https://your-app.com/api/status/timeout",
  "Remarks": "OK",
  "Occasion": ""
}
```

- Send `TransactionID`, the receipt, or leave it empty and send `OriginalConversationID`.
- `PartyA` is your shortcode and `IdentifierType` is `1`, `2` or `4`.
- Safaricom's own sample spells two keys `"Command ID"` and `"Transaction ID"`, with a space. Both spellings are accepted.
- A field that fails these checks returns HTTP 400 `400.002.02` `Bad Request - Invalid <Field>`. Safaricom's documentation says `400.003.02`, but the sandbox answered `400.002.02` on 2026-11-19.

The result for a transaction that exists:

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "1236-7134259-1",
    "ConversationID": "AG_20261118_1234409f86436c583e3f",
    "TransactionID": "MBN0000000",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "DebitPartyName", "Value": "254708374149 - John Doe" },
        { "Key": "CreditPartyName", "Value": "600000 - My Shop" },
        { "Key": "OriginatorConversationID", "Value": "29115-34620561-1" },
        { "Key": "InitiatedTime", "Value": "20261118140501" },
        { "Key": "DebitAccountType", "Value": "Customer Account" },
        { "Key": "DebitPartyCharges" },
        { "Key": "TransactionReason" },
        { "Key": "ReasonType", "Value": "Pay Bill Online" },
        { "Key": "TransactionStatus", "Value": "Completed" },
        { "Key": "FinalisedTime", "Value": "20261118140512" },
        { "Key": "Amount", "Value": "500" },
        { "Key": "ConversationID", "Value": "ws_CO_18112026140501" },
        { "Key": "ReceiptNo", "Value": "SKC82PACB8" }
      ]
    },
    "ReferenceData": { "ReferenceItem": { "Key": "Occasion" } }
  }
}
```

The details describe the transaction you asked about, not the query. `TransactionStatus` is `Reversed` once a payment has been reversed. `TransactionID` at the top is a placeholder, as in Safaricom's sample.

## Reversal

```json
{
  "Initiator": "testapi",
  "SecurityCredential": "<base64>",
  "CommandID": "TransactionReversal",
  "TransactionID": "SKC82PACB8",
  "Amount": "500",
  "ReceiverParty": "600000",
  "RecieverIdentifierType": "11",
  "ResultURL": "https://your-app.com/api/reversal/result",
  "QueueTimeOutURL": "https://your-app.com/api/reversal/timeout",
  "Remarks": "Payment reversal"
}
```

- `TransactionID` is the receipt of an STK or C2B payment into your shortcode. `Amount` must match it in whole shillings (`"500"`, `500` and `"500.00"` all work).
- `RecieverIdentifierType` keeps Safaricom's misspelling and must be `"11"`. The correct spelling `ReceiverIdentifierType` is read too.
- `Remarks` is 2 to 100 characters.
- A field that fails these checks returns HTTP 400 `400.002.02` `Bad Request - Invalid <Field>`.

A successful reversal posts:

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "1236-7134259-1",
    "ConversationID": "AG_20261118_1234409f86436c583e3f",
    "TransactionID": "SKE52PAWR9",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "DebitAccountBalance",
          "Value": "Utility Account|KES|999500.00|999500.00|0.00|0.00"
        },
        { "Key": "Amount", "Value": 500.0 },
        { "Key": "TransCompletedTime", "Value": "20261118140530" },
        { "Key": "OriginalTransactionID", "Value": "SKC82PACB8" },
        { "Key": "Charge", "Value": 0.0 },
        { "Key": "CreditPartyPublicName", "Value": "254708374149 - John Doe" },
        { "Key": "DebitPartyPublicName", "Value": "600000 - My Shop" }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": {
        "Key": "QueueTimeoutURL",
        "Value": "https://internalsandbox.safaricom.co.ke/mpesa/reversalresults/v1/submit"
      }
    }
  }
}
```

`TransactionID` is the new reversal's receipt. The reversal is recorded too, so Transaction Status can find it.

## Failures

Failures arrive at your `ResultURL` without `ResultParameters`. Note the types: Reversal's R codes are strings, every other code is a number, so compare `ResultCode` as a string.

| `ResultCode` | `ResultDesc`                                     | When                                                                                                                        |
| ------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `2001`       | The initiator information is invalid.            | The `SecurityCredential` or initiator name is wrong.                                                                        |
| `"R000002"`  | The OriginalTransactionID is invalid.            | Reversal: the receipt is unknown, is a B2C payout, or the amount differs. Status: the transaction can't be found (a guess). |
| `"R000001"`  | The transaction has already been reversed.       | Reversing the same payment twice.                                                                                           |
| `1`          | The balance is insufficient for the transaction. | Reversal: the utility account holds less than the refund.                                                                   |

## Where the money goes

STK and C2B payments are credited to the project's simulated utility account, as Safaricom documents for customer payments. A reversal draws the refund from there, and so do B2C payouts. B2B payments come from the separate working account. The B2B page shows and sets every balance; see [B2B and Account Balance](b2b.md).

Payments made before this version of Daraja Local are not in the record, so they can't be looked up or reversed.
