"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { CheckIcon, ChevronsUpDownIcon, InboxIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useActiveProjectStore } from "@/store/active-project";
import { usePaginatedRequestLog } from "@/hooks/use-request-log";
import { useApiPort } from "@/hooks/use-api-port";
import { useNow } from "@/hooks/use-now";
import { groupEntries, type LogGroup } from "@/lib/request-log/group";
import { formatClock, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/form";
import { PageHeader } from "@/components/page-header";
import { StatusPill, type Tone } from "../_components/activity";
import SessionDetail from "./_components/session-detail";
import { KINDS, kindShort, sessionStatus, summaryOf } from "./lib/describe";

type KindFilter = LogGroup["kind"] | "all";
type StatusFilter = "all" | "success" | "danger" | "pending";

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "success", label: "OK" },
  { value: "danger", label: "Errors" },
  { value: "pending", label: "Pending" },
];

function matches(tone: Tone, filter: StatusFilter) {
  return filter === "all" || tone === filter || (filter === "danger" && tone === "warning");
}

export default function LogsPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const port = useApiPort();
  const now = useNow(5000);
  const { entries, loading, hasMore, initialized, load, loadMore, refresh, clear } = usePaginatedRequestLog(slug ?? "");

  const [live, setLive] = useState(true);
  const [kind, setKind] = useState<KindFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (slug && !initialized) load(null);
  }, [slug, initialized, load]);

  useEffect(() => {
    if (!live || !initialized) return;
    const id = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(id);
  }, [live, initialized, refresh]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const all = useMemo(() => groupEntries(entries), [entries]);
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((g) => {
      if (kind !== "all" && g.kind !== kind) return false;
      if (!matches(sessionStatus(g).tone, status)) return false;
      if (!q) return true;
      return (
        g.id.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.entries.some((e) => e.payload.toLowerCase().includes(q))
      );
    });
  }, [all, kind, status, search]);

  if (!slug) return null;

  const selected = groups.find((g) => g.id === selectedId) ?? groups[0];
  const errors = all.filter((g) => sessionStatus(g).tone === "danger").length;
  const kindOption = KINDS.find((k) => k.value === kind)!;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Developer"
        title="Request log"
        description="Every call your app made to Daraja Local, and every callback it sent back, grouped by ConversationID."
        actions={
          <>
            <Button variant="outline" size="lg" aria-pressed={live} onClick={() => setLive((l) => !l)}>
              <span className="relative flex size-2">
                {live && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-2 opacity-60 motion-reduce:hidden" />
                )}
                <span className={cn("relative inline-flex size-2 rounded-full", live ? "bg-green-2" : "bg-muted-foreground/50")} />
              </span>
              {live ? "Live" : "Paused"}
            </Button>
            <Button
              variant={confirmingClear ? "destructive" : "outline"}
              size="lg"
              disabled={entries.length === 0 || clear.isPending}
              onBlur={() => setConfirmingClear(false)}
              onClick={() => {
                if (!confirmingClear) return setConfirmingClear(true);
                clear.mutate();
                setConfirmingClear(false);
                setSelectedId(null);
              }}>
              <Trash2Icon className="size-3.5" />
              {confirmingClear ? "Clear everything?" : "Clear log"}
            </Button>
          </>
        }
      />

      <section className="panel overflow-hidden" aria-label="Sessions">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-4 py-3">
          <Menu.Root>
            <Menu.Trigger className="inline-flex h-8 items-center gap-2 rounded-lg bg-surface-2 px-2.5 text-[12.5px] font-medium text-foreground ring-1 ring-border transition-colors hover:ring-border-strong">
              {kindOption.label}
              <ChevronsUpDownIcon className="size-3.5 opacity-60" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={6} align="start" className="z-50">
                <Menu.Popup className="w-56 origin-(--transform-origin) rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[0_12px_32px_-8px_oklch(0_0_0/0.18),0_2px_6px_oklch(0_0_0/0.06)] transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0">
                  <Menu.RadioGroup value={kind} onValueChange={(v: KindFilter) => setKind(v)}>
                    {KINDS.map((k) => (
                      <Menu.RadioItem
                        key={k.value}
                        value={k.value}
                        closeOnClick
                        className="grid cursor-default grid-cols-[16px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] outline-none data-highlighted:bg-foreground/[0.05]">
                        <Menu.RadioItemIndicator className="text-green">
                          <CheckIcon className="size-3.5" />
                        </Menu.RadioItemIndicator>
                        <span className="col-start-2">{k.label}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {k.value === "all" ? all.length : all.filter((g) => g.kind === k.value).length}
                        </span>
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <SegmentedControl label="Filter by status" value={status} options={STATUSES} onChange={setStatus} className="w-max" />
          <label className="relative ml-auto w-full sm:w-64">
            <span className="sr-only">Search</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Phone, receipt, ID or any field"
              className="h-8 w-full rounded-lg bg-surface-2 pr-8 pl-8 text-[12.5px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-border bg-surface-1 px-1.5 font-mono text-[10.5px] text-muted-foreground">
              /
            </kbd>
          </label>
        </div>

        {initialized && all.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-border">
              <InboxIcon className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <p className="mt-4 text-[14px] font-medium text-foreground">No requests yet</p>
            <p className="mt-1 max-w-md text-[13px] text-pretty text-muted-foreground">
              Point your app at <span className="font-mono text-foreground">http://127.0.0.1:{port}</span>, or send a test
              from any payment page. Every call and callback shows up here.
            </p>
          </div>
        ) : (
          <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col border-b border-border lg:border-r lg:border-b-0">
              <p className="border-b border-border px-4 py-2 text-[12px] text-muted-foreground">
                {groups.length} of {all.length} sessions
                {errors > 0 && <span className="text-red"> · {errors} with errors</span>}
              </p>
              {!initialized ? (
                <ul aria-hidden className="animate-pulse p-2 motion-reduce:animate-none">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <li key={i} className="flex flex-col gap-2 px-3 py-3">
                      <span className="h-3 w-2/3 rounded bg-surface-2" />
                      <span className="h-2.5 w-1/3 rounded bg-surface-2" />
                    </li>
                  ))}
                </ul>
              ) : groups.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">Nothing matches these filters.</p>
              ) : (
                <ul className="flex max-h-[720px] flex-col gap-0.5 overflow-y-auto p-2 [scrollbar-width:thin]">
                  {groups.map((g) => {
                    const st = sessionStatus(g);
                    const active = g.id === selected?.id;
                    return (
                      <li key={g.id}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedId(g.id)}
                          className={cn(
                            "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-0.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                            active ? "bg-surface-2 ring-1 ring-border" : "hover:bg-surface-2/60",
                          )}>
                          <span className="row-span-2 rounded-md bg-surface-2 py-0.5 text-center font-mono text-[10.5px] font-medium text-muted-foreground ring-1 ring-border">
                            {kindShort(g.kind)}
                          </span>
                          <span className="truncate text-[13px] text-foreground">{summaryOf(g)}</span>
                          <StatusPill tone={st.tone} label={st.label} />
                          <span className="col-span-2 flex justify-between gap-2 text-[11.5px] text-muted-foreground">
                            <span className="truncate font-mono">
                              {formatClock(g.createdAt)} · {g.entries.length} {g.entries.length === 1 ? "entry" : "entries"}
                            </span>
                            <span className="shrink-0">{relativeTime(g.createdAt, now)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {hasMore && (
                    <li className="p-2">
                      <Button variant="ghost" className="w-full" disabled={loading} onClick={loadMore}>
                        {loading ? "Loading…" : "Load older"}
                      </Button>
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div className="min-w-0">
              {selected ? (
                <SessionDetail key={selected.id} group={selected} />
              ) : (
                <p className="px-6 py-16 text-center text-[13px] text-muted-foreground">Pick a session to see every entry.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
