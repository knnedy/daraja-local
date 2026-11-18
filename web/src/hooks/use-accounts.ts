import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ResultTargets,
  SendB2BInput,
  UpdateAccountsInput,
} from "@/lib/types/accounts";

export function useAccounts(slug: string) {
  return useQuery({
    queryKey: queryKeys.accounts.get(slug),
    queryFn: () => api.projects.accounts.get(slug),
    enabled: Boolean(slug),
    refetchInterval: 2000,
  });
}

export function useUpdateAccounts(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAccountsInput) =>
      api.projects.accounts.update(slug, input),
    onSuccess: (accounts) => {
      queryClient.setQueryData(queryKeys.accounts.get(slug), accounts);
      queryClient.invalidateQueries({ queryKey: ["b2c"] });
    },
  });
}

/** Sends an Account Balance query from the dashboard. */
export function useBalanceQuery(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ResultTargets) =>
      api.projects.accounts.query(slug, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["request-log"] }),
  });
}

/** Sends a B2B payment from the dashboard. */
export function useSendB2B(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendB2BInput) => api.projects.b2b.send(slug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-log"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
