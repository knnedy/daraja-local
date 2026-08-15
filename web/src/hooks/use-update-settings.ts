import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { UpdateSettingsInput } from "@/lib/schemas/settings";

export function useUpdateSettings(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateSettingsInput) =>
      api.projects.settings.update(slug, body),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.projects.settings(slug), settings);
    },
  });
}
