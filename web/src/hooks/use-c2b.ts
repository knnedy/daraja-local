import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useC2BRequestLog(slug: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.c2b.requestLog(slug, limit),
    queryFn: () => api.projects.c2b.listRequestLog(slug, limit),
    enabled: Boolean(slug),
    refetchInterval: 2000,
  });
}
