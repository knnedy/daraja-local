import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useProjectSettings(slug: string) {
  return useQuery({
    queryKey: queryKeys.projects.settings(slug),
    queryFn: () => api.projects.settings.get(slug),
    enabled: Boolean(slug),
  });
}
