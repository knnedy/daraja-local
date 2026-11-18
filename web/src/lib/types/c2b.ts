export type C2BCommandId = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";

/** A Simulated Payment sent from the dashboard. */
export interface SimulatePaymentInput {
  commandId: C2BCommandId;
  amount: string;
  msisdn: string;
  billRefNumber: string;
}

/** A project's C2B registration, as last set through registerurl. */
export interface C2BRegistration {
  registered: boolean;
  confirmationUrl: string;
  validationUrl: string;
  responseType: "Completed" | "Cancelled";
  /** The path version registerurl was called on; it decides how MSISDN looks. */
  apiVersion: "v1" | "v2";
}
