import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SendPayoutInput, UpdateB2CStateInput } from "@/lib/types/b2c";

export function useB2CState(slug: string) {
  return useQuery({
    queryKey: queryKeys.b2c.state(slug),
    queryFn: () => api.projects.b2c.state(slug),
    enabled: Boolean(slug),
    refetchInterval: 2000,
  });
}

export function useUpdateB2CState(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateB2CStateInput) =>
      api.projects.b2c.updateState(slug, body),
    onSuccess: (state) => {
      queryClient.setQueryData(queryKeys.b2c.state(slug), state);
    },
  });
}

export function useSendPayout(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SendPayoutInput) =>
      api.projects.b2c.sendPayout(slug, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-log"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.b2c.state(slug) });
    },
  });
}
