import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useActiveProjectStore } from "@/store/active-project";

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const activeSlug = useActiveProjectStore((state) => state.slug);
  const clearActiveProject = useActiveProjectStore(
    (state) => state.clearActiveProject,
  );

  return useMutation({
    mutationFn: (slug: string) => api.projects.remove(slug),
    onSuccess: (_data, deletedSlug) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });

      if (deletedSlug === activeSlug) {
        clearActiveProject();
      }
    },
  });
}
