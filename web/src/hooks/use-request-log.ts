import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import type { RequestLogEntry } from "@/lib/types/stk";

export type { RequestLogEntry };

export function useRequestLog(slug: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.stk.requestLog(slug, limit),
    queryFn: () => api.projects.stk.listRequestLog(slug, limit),
    enabled: Boolean(slug),
    refetchInterval: 2000,
  });
}
