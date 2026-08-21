import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { UpdateProjectInput } from "@/lib/schemas/project";
import { useActiveProjectStore } from "@/store/active-project";

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

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.projects.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
    },
  });
}

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

export function useRegenerateCredentials(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.projects.regenerateCredentials(slug),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(slug), project);
    },
  });
}
