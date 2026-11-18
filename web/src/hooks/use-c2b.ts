import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SimulatePaymentInput } from "@/lib/types/c2b";

export function useC2BRegistration(slug: string) {
  return useQuery({
    queryKey: queryKeys.c2b.registration(slug),
    queryFn: () => api.projects.c2b.registration(slug),
    enabled: Boolean(slug),
    refetchInterval: 2000,
  });
}

export function useSimulatePayment(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SimulatePaymentInput) =>
      api.projects.c2b.simulate(slug, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-log"] });
    },
  });
}
