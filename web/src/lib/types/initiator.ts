/** A project's Initiator, used to build a SecurityCredential. */
export interface Initiator {
  name: string;
  password: string;
  /** PEM certificate standing in for Safaricom's SandboxCertificate.cer. */
  certificate: string;
}
