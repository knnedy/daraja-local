import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useActiveProjectStore } from "@/store/active-project";

// Marks a project as active by touching its lastActiveAt timestamp
// server-side (POST /api/projects/{slug}/touch).
export function useSetActiveProject() {
  const queryClient = useQueryClient();
  const setActiveProjectSlug = useActiveProjectStore(
    (state) => state.setActiveProjectSlug,
  );

  return useMutation({
    mutationFn: (slug: string) => api.projects.touch(slug),
    onSuccess: (_data, slug) => {
      setActiveProjectSlug(slug);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
    },
  });
}
