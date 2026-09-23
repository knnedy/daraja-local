"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useActiveProjectStore } from "@/store/active-project";
import { usePaginatedRequestLog } from "@/hooks/use-request-log";
import { groupEntries } from "@/lib/request-log/group";
import { groupStatus } from "@/lib/request-log/status";
import FilterBar, {
  type KindFilter,
  type StatusFilter,
} from "./components/filter-bar";
import LogTable from "./components/log-table";
import StatsBar from "./components/stats-bar";

function TableSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-border-strong bg-surface-1 shadow-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border/60 px-3.5 py-3 last:border-b-0">
          <div className="size-3.5 rounded bg-surface-2" />
          <div className="h-3 w-12 rounded bg-surface-2" />
          <div className="h-3 w-10 rounded bg-surface-2" />
          <div className="h-3 flex-1 rounded bg-surface-2" />
          <div className="h-3 w-14 rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

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
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (slug && !initialized) load(null);
  }, [slug, initialized, load]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const allGroups = useMemo(() => groupEntries(entries), [entries]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allGroups.filter((g) => {
      if (kind !== "all" && g.kind !== kind) return false;
      if (status !== "all" && groupStatus(g).tone !== status) return false;
      if (!q) return true;
      return (
        g.id.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.entries.some((e) => e.payload.toLowerCase().includes(q))
      );
    });
  }, [allGroups, kind, status, search]);

  if (!slug) return null;

  function handleClear() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    clear.mutate();
    setConfirmingClear(false);
  }

  const showSkeleton = loading && !initialized;

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

      {!showSkeleton && <StatsBar groups={allGroups} />}

      <FilterBar
        ref={searchRef}
        kind={kind}
        onKindChange={setKind}
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
      />

      {showSkeleton ? <TableSkeleton /> : <LogTable groups={groups} />}

      {!showSkeleton && hasMore && (
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
