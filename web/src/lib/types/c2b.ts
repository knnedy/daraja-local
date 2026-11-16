/** A project's C2B registration, as last set through registerurl. */
export interface C2BRegistration {
  registered: boolean;
  confirmationUrl: string;
  validationUrl: string;
  responseType: "Completed" | "Cancelled";
}
