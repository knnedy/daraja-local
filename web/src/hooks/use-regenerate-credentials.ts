import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useRegenerateCredentials(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.projects.regenerateCredentials(slug),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(slug), project);
    },
  });
}
