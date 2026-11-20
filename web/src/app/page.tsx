"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRightIcon, LinkIcon, PlusIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectMark } from "@/components/project-mark";
import { useProjects, useSetActiveProject } from "@/hooks/use-projects";
import { useNow } from "@/hooks/use-now";
import { useActiveProjectStore } from "@/store/active-project";
import type { Project } from "@/lib/types/project";
import { formatDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LoadingMark } from "@/components/loading-mark";
import FrontHeader from "./_components/front-header";
import EmptyState from "./_components/empty-state";

function ProjectCard({ project, current, now }: { project: Project; current: boolean; now: number }) {
  const router = useRouter();
  const open = useSetActiveProject();

  return (
    <button
      type="button"
      disabled={open.isPending}
      onClick={() => open.mutate(project.slug, { onSuccess: () => router.push("/dashboard") })}
      className={cn(
        "group flex flex-col gap-4 panel p-5 text-left transition-[box-shadow,background-color,transform] duration-150 hover:bg-surface-2/40 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-70 motion-reduce:active:scale-100",
        current && "ring-1 ring-green-2/60",
      )}>
      <div className="flex items-start justify-between gap-3">
        <ProjectMark name={project.name} className="size-10 rounded-xl text-[13px]" />
        {current ? (
          <span className="rounded-full bg-green-light px-2 py-0.5 text-[11.5px] font-medium text-green ring-1 ring-green-mid/70 dark:bg-green/10">
            Active
          </span>
        ) : (
          <ArrowUpRightIcon className="size-4 text-muted-foreground transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground motion-reduce:transform-none" />
        )}
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">{project.name}</h2>
        <p className="mt-0.5 font-mono text-[12.5px] text-muted-foreground">Shortcode {project.shortCode}</p>
      </div>
      <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted-foreground">
        <LinkIcon className="size-3.5 shrink-0" />
        <span className="truncate font-mono">{project.callbackBaseUrl}</span>
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-[12px] text-muted-foreground">
        <span>Created {formatDate(project.createdAt)}</span>
        <span>{project.lastActiveAt ? `Opened ${relativeTime(project.lastActiveAt, now)}` : "Never opened"}</span>
      </div>
    </button>
  );
}

export default function ProjectsPage() {
  const { data: projects, isLoading, isError, refetch } = useProjects();
  const activeSlug = useActiveProjectStore((s) => s.slug);
  const now = useNow(30000);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const sorted = [...(projects ?? [])].sort((a, b) =>
    (b.lastActiveAt ?? b.createdAt).localeCompare(a.lastActiveAt ?? a.createdAt),
  );
  const shown = sorted.filter((p) => !q || p.name.toLowerCase().includes(q) || p.shortCode.includes(q));

  return (
    <div className="min-h-svh bg-background">
      <FrontHeader />
      {isLoading ? (
        <LoadingMark label="Loading projects…" className="min-h-[calc(100svh-3.5rem)] pb-14" />
      ) : projects && projects.length === 0 ? (
        <EmptyState />
      ) : (
        <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.025em] text-foreground">Projects</h1>
              <p className="mt-1.5 max-w-xl text-[14px] text-pretty text-muted-foreground">
                Each project is its own Daraja app on this machine, with its own shortcode, keys, accounts and request
                history.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(projects?.length ?? 0) > 6 && (
                <label className="relative">
                  <span className="sr-only">Search projects</span>
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Name or shortcode"
                    className="h-9 w-52 rounded-lg bg-surface-1 pr-3 pl-8 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
              )}
              <Button size="lg" nativeButton={false} render={<Link href="/new" />}>
                <PlusIcon className="size-4" />
                New project
              </Button>
            </div>
          </div>

          {isError ? (
            <div className="flex flex-col items-center gap-3 panel px-6 py-14 text-center">
              <p className="text-[14px] font-medium text-foreground">Couldn&apos;t load your projects</p>
              <p className="max-w-sm text-[13px] text-muted-foreground">
                Daraja Local didn&apos;t answer. Check that it&apos;s still running in your terminal.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCwIcon className="size-3.5" />
                Try again
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((p) => (
                <ProjectCard key={p.slug} project={p} current={p.slug === activeSlug} now={now} />
              ))}
              {!q && (
                <Link
                  href="/new"
                  className="group flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong p-5 text-center transition-colors hover:border-green-2/60 hover:bg-surface-1/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-border transition-colors group-hover:bg-green-light group-hover:ring-green-mid dark:group-hover:bg-green/10">
                    <PlusIcon className="size-4.5 text-muted-foreground group-hover:text-green" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-medium text-foreground">New project</span>
                    <span className="mt-0.5 block text-[12.5px] text-muted-foreground">Fresh keys and an empty ledger</span>
                  </span>
                </Link>
              )}
              {q && shown.length === 0 && (
                <p className="col-span-full py-10 text-center text-[13px] text-muted-foreground">No project matches.</p>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
