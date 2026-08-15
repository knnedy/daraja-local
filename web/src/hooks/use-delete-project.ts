import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => api.projects.remove(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
    },
  });
}
