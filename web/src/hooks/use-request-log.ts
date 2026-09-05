import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

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

export function useRequestLog(slug: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.stk.requestLog(slug, limit),
    queryFn: () => api.projects.stk.listRequestLog(slug, limit),
    enabled: Boolean(slug),
    refetchInterval: 2000,
  });
}
