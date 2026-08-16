import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { UpdateProjectInput } from "@/lib/schemas/project";

export function useUpdateProjectName(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateProjectInput) => api.projects.update(slug, body),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(slug), project);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
    },
  });
}
