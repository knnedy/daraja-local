import { useCallback, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { RequestLogEntry } from "@/lib/types/request-log";

export type { RequestLogEntry };

const PAGE_SIZE = 50;

/** Live feed of one flow's entries, for each API's page. */
export function useLiveRequestLog(
  slug: string,
  kind: RequestLogEntry["kind"],
  limit = 50,
) {
  return useQuery({
    queryKey: queryKeys.requestLog.live(slug, kind, limit),
    queryFn: () => api.projects.requestLog.live(slug, kind, limit),
    enabled: Boolean(slug),
    refetchInterval: 2000,
  });
}

export function useRecentRequestLog(slug: string, limit = 100) {
  return useQuery({
    queryKey: queryKeys.requestLog.page(slug, null, limit),
    queryFn: () => api.projects.requestLog.list(slug, null, limit),
    enabled: Boolean(slug),
    refetchInterval: 4000,
  });
}

// Generic, kind-agnostic, keyset-paginated browsing across STK and C2B
// both — backs the /logs page.
export function usePaginatedRequestLog(slug: string) {
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(
    async (beforeId: number | null) => {
      if (!slug) return;
      setLoading(true);
      try {
        const page = await api.projects.requestLog.list(
          slug,
          beforeId,
          PAGE_SIZE,
        );
        setEntries((prev) => (beforeId === null ? page : [...prev, ...page]));
        setHasMore(page.length === PAGE_SIZE);
        setInitialized(true);
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );

  const loadMore = useCallback(() => {
    const lastId = entries[entries.length - 1]?.id ?? null;
    if (lastId !== null) load(lastId);
  }, [entries, load]);

  const refresh = useCallback(() => load(null), [load]);

  const clear = useMutation({
    mutationFn: () => api.projects.requestLog.clear(slug),
    onSuccess: () => {
      setEntries([]);
      setHasMore(false);
    },
  });

  return {
    entries,
    loading,
    hasMore,
    initialized,
    load,
    loadMore,
    refresh,
    clear,
  };
}
