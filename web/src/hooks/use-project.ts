import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => api.projects.list(),
  });
}

export function useProject(slug: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(slug),
    queryFn: () => api.projects.get(slug),
    enabled: Boolean(slug),
  });
}
