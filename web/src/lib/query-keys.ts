export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    list: () => [...queryKeys.projects.all, "list"] as const,
    detail: (slug: string) =>
      [...queryKeys.projects.all, "detail", slug] as const,
    settings: (slug: string) =>
      [...queryKeys.projects.all, "settings", slug] as const,
  },
} as const;
