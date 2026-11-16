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
  },
  c2b: {
    registration: (slug: string) => ["c2b", "registration", slug] as const,
  },
  requestLog: {
    live: (slug: string, kind: string, limit: number) =>
      ["request-log", "live", slug, kind, limit] as const,
    page: (slug: string, beforeId: number | null, limit: number) =>
      ["request-log", slug, beforeId, limit] as const,
  },
} as const;
