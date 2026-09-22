import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RequestLogEntry } from "@/lib/types/request-log";

const PAGE_SIZE = 50;

export function useRequestLogPage(slug: string) {
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["stk", "pending", slug] });
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
