export type RequestLogOperation =
  | "stk_push"
  | "stk_query"
  | "c2b_register"
  | "c2b_simulate"
  | "b2c_payment";

export type RequestLogKind = "stk_push" | "c2b" | "b2c";

export type RequestLogStep =
  | "request"
  | "acceptance"
  | "rejection"
  | "validation"
  | "callback"
  | "confirmation"
  | "result"
  | "timeout";

export interface RequestLogEntry {
  id: number;
  correlationId: string | null;
  kind: RequestLogKind;
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
