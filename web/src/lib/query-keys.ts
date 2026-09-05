export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    list: () => [...queryKeys.projects.all, "list"] as const,
    detail: (slug: string) =>
      [...queryKeys.projects.all, "detail", slug] as const,
    settings: (slug: string) =>
      [...queryKeys.projects.all, "settings", slug] as const,
  },
  stk: {
    pending: (slug: string) => ["stk", "pending", slug] as const,
    requestLog: (slug: string, limit: number) =>
      ["stk", "request-log", slug, limit] as const,
  },
} as const;
