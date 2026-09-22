"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useActiveProjectStore } from "@/store/active-project";
import { usePaginatedRequestLog } from "@/hooks/use-request-log";
import { groupEntries } from "./lib/group";
import FilterBar, { type KindFilter } from "./components/filter-bar";
import LogTable from "./components/log-table";

export default function LogsPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const {
    entries,
    loading,
    hasMore,
    initialized,
    load,
    loadMore,
    refresh,
    clear,
  } = usePaginatedRequestLog(slug ?? "");

  const [kind, setKind] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => {
    if (slug && !initialized) load(null);
  }, [slug, initialized, load]);

  const groups = useMemo(() => {
    const all = groupEntries(entries);
    const q = search.trim().toLowerCase();
    return all.filter((g) => {
      if (kind !== "all" && g.kind !== kind) return false;
      if (!q) return true;
      return (
        g.id.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.entries.some((e) => e.payload.toLowerCase().includes(q))
      );
    });
  }, [entries, kind, search]);

  if (!slug) return null;

  function handleClear() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    clear.mutate();
    setConfirmingClear(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
            Request Log
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Every STK and C2B request this project has seen, grouped by session.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-1 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-2">
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleClear}
            onBlur={() => setConfirmingClear(false)}
            className={
              confirmingClear
                ? "flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-destructive/90"
                : "flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-1 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-destructive"
            }>
            <Trash2Icon className="size-3.5" />
            {confirmingClear ? "Confirm clear?" : "Clear log"}
          </button>
        </div>
      </div>

      <FilterBar
        kind={kind}
        onKindChange={setKind}
        search={search}
        onSearchChange={setSearch}
      />

      <LogTable groups={groups} />

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="self-center rounded-lg border border-border-strong bg-surface-1 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-40">
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
