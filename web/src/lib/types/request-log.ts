export type RequestLogOperation = "stk_push" | "c2b_register" | "c2b_simulate";

export type RequestLogStep =
  | "request"
  | "acceptance"
  | "rejection"
  | "validation"
  | "callback"
  | "confirmation";

export interface RequestLogEntry {
  id: number;
  correlationId: string | null;
  kind: "stk_push" | "c2b";
  /** The Daraja endpoint this entry belongs to. */
  operation: RequestLogOperation | "";
  /** The part this entry plays in its transaction. */
  step: RequestLogStep | "";
  direction: "inbound" | "outbound";
  status: string;
  outcome: string | null;
  attempts: number;
  payload: string;
  createdAt: string;
}
