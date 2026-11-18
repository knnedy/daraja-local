import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InitiatorCallInput } from "@/lib/types/transactions";

export function useTransactions(slug: string) {
  return useQuery({
    queryKey: queryKeys.transactions.list(slug),
    queryFn: () => api.projects.transactions.list(slug),
    enabled: Boolean(slug),
    refetchInterval: 2000,
  });
}

/** Sends a Transaction Status query or a Reversal from the dashboard. */
export function useInitiatorCall(slug: string, action: "status" | "reverse") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InitiatorCallInput) =>
      api.projects.transactions.send(slug, action, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-log"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.list(slug),
      });
    },
  });
}
