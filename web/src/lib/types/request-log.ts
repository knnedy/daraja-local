export interface RequestLogEntry {
  id: number;
  correlationId: string | null;
  kind: "stk_push" | "c2b";
  direction: "inbound" | "outbound";
  status: string;
  outcome: string | null;
  attempts: number;
  payload: string;
  createdAt: string;
}
