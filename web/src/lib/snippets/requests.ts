import type { RequestSpec } from "./generate";

const shortcode = { env: "DARAJA_SHORTCODE" } as const;
const initiator = { env: "DARAJA_INITIATOR_NAME" } as const;
const credential = { computed: "securityCredential" } as const;
const callback = (suffix: string) =>
  ({ env: "DARAJA_CALLBACK_URL", suffix }) as const;

/** Every Daraja request the dashboard shows code for, in Safaricom's documented shape. */
export const requests = {
  stkPush: {
    path: "/mpesa/stkpush/v1/processrequest",
    body: {
      BusinessShortCode: shortcode,
      Password: { computed: "password" },
      Timestamp: { computed: "timestamp" },
      TransactionType: "CustomerPayBillOnline",
      Amount: "1",
      PartyA: "254708374149",
      PartyB: shortcode,
      PhoneNumber: "254708374149",
      CallBackURL: callback("/stk/callback"),
      AccountReference: "Order1032",
      TransactionDesc: "Payment for goods",
    },
  },
  stkQuery: {
    path: "/mpesa/stkpushquery/v1/query",
    body: {
      BusinessShortCode: shortcode,
      Password: { computed: "password" },
      Timestamp: { computed: "timestamp" },
      CheckoutRequestID: "ws_CO_191220191020363925",
    },
  },
  c2bRegister: {
    path: "/mpesa/c2b/v2/registerurl",
    body: {
      ShortCode: shortcode,
      ResponseType: "Completed",
      ConfirmationURL: callback("/c2b/confirmation"),
      ValidationURL: callback("/c2b/validation"),
    },
  },
  c2bSimulate: {
    path: "/mpesa/c2b/v2/simulate",
    body: {
      ShortCode: shortcode,
      CommandID: "CustomerPayBillOnline",
      Amount: "500",
      Msisdn: "254708374149",
      BillRefNumber: "INV1001",
    },
  },
  b2c: {
    path: "/mpesa/b2c/v3/paymentrequest",
    body: {
      OriginatorConversationID: { computed: "uniqueId" },
      InitiatorName: initiator,
      SecurityCredential: credential,
      CommandID: "BusinessPayment",
      Amount: 2500,
      PartyA: shortcode,
      PartyB: "254708374149",
      Remarks: "Refund for order 1001",
      QueueTimeOutURL: callback("/b2c/timeout"),
      ResultURL: callback("/b2c/result"),
      Occassion: "",
    },
  },
  transactionStatus: {
    path: "/mpesa/transactionstatus/v1/query",
    body: {
      Initiator: initiator,
      SecurityCredential: credential,
      CommandID: "TransactionStatusQuery",
      TransactionID: "SKC82PACB8",
      PartyA: shortcode,
      IdentifierType: "4",
      ResultURL: callback("/transactions/result"),
      QueueTimeOutURL: callback("/transactions/timeout"),
      Remarks: "OK",
      Occasion: "",
    },
  },
  reversal: {
    path: "/mpesa/reversal/v1/request",
    body: {
      Initiator: initiator,
      SecurityCredential: credential,
      CommandID: "TransactionReversal",
      TransactionID: "SKC82PACB8",
      Amount: "500",
      ReceiverParty: shortcode,
      RecieverIdentifierType: "11",
      ResultURL: callback("/transactions/result"),
      QueueTimeOutURL: callback("/transactions/timeout"),
      Remarks: "Payment reversal",
    },
  },
  b2b: {
    path: "/mpesa/b2b/v1/paymentrequest",
    body: {
      Initiator: initiator,
      SecurityCredential: credential,
      CommandID: "BusinessPayBill",
      SenderIdentifierType: "4",
      RecieverIdentifierType: "4",
      Amount: "1500",
      PartyA: shortcode,
      PartyB: "000000",
      AccountReference: "INV-001",
      Requester: "254708374149",
      Remarks: "OK",
      QueueTimeOutURL: callback("/b2b/timeout"),
      ResultURL: callback("/b2b/result"),
    },
  },
  accountBalance: {
    path: "/mpesa/accountbalance/v1/query",
    body: {
      Initiator: initiator,
      SecurityCredential: credential,
      CommandID: "AccountBalance",
      PartyA: shortcode,
      IdentifierType: "4",
      Remarks: "OK",
      QueueTimeOutURL: callback("/balance/timeout"),
      ResultURL: callback("/balance/result"),
    },
  },
} satisfies Record<string, RequestSpec>;

export type RequestName = keyof typeof requests;
