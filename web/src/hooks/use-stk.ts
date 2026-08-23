import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StkOutcome } from "@/lib/types/stk";

export function usePendingSessions(slug: string) {
  return useQuery({
    queryKey: queryKeys.stk.pending(slug),
    queryFn: () => api.projects.stk.listPending(slug),
    enabled: Boolean(slug),
    refetchInterval: 2000,
  });
}

export function useResolveSession(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      checkoutRequestId,
      outcome,
    }: {
      checkoutRequestId: string;
      outcome: StkOutcome;
    }) => api.projects.stk.resolve(slug, checkoutRequestId, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stk.pending(slug) });
    },
  });
}
