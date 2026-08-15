import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

// Marks a project as active by touching its lastActiveAt timestamp
// server-side (POST /api/projects/{slug}/touch).
export function useSetActiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => api.projects.touch(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
    },
  });
}
