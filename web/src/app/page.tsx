"use client";

import {
  PlusIcon,
  SmartphoneIcon,
  ClockIcon,
  RefreshCwIcon,
  ArrowUpRightIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/use-projects";
import { useSetActiveProject } from "@/hooks/use-set-active-project";
import type { Project } from "@/lib/types/project";
import { cn } from "@/lib/utils";
import EmptyState from "./components/empty-state";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never used";

  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="size-7 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-3.5 w-28 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="h-3 w-40 animate-pulse rounded bg-surface-2" />
      <div className="h-3 w-20 animate-pulse rounded bg-surface-2" />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 h-7 w-32 animate-pulse rounded bg-surface-2" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t reach daraja-local. Make sure the server is running.
      </p>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
        <RefreshCwIcon className="size-3.5" />
        Try again
      </Button>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const setActiveProject = useSetActiveProject();

  const handleOpen = () => {
    setActiveProject.mutate(project.slug, {
      onSuccess: () => router.push("/dashboard"),
    });
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={setActiveProject.isPending}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-border-strong bg-surface-1 p-4 text-left shadow-sm",
        "border-l-[3px] border-l-green-mid transition-colors hover:border-l-green hover:bg-surface-2/40",
        "disabled:opacity-60",
      )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-green-mid bg-green-light">
            <SmartphoneIcon className="size-3.5 text-green" />
          </div>
          <h3 className="truncate font-heading text-sm font-medium text-foreground">
            {project.name}
          </h3>
        </div>
        <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <p className="truncate font-mono text-xs text-muted-foreground">
        {project.callbackBaseUrl}
      </p>

      <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <ClockIcon className="size-3" />
        {formatRelativeTime(project.lastActiveAt)}
      </div>
    </button>
  );
}

export default function HomePage() {
  const { data: projects, isLoading, isError, refetch } = useProjects();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!projects || projects.length === 0) return <EmptyState />;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-lg font-medium text-foreground">
          Projects
        </h1>
        <Button
          size="sm"
          className="gap-1.5"
          nativeButton={false}
          render={<Link href="/new" />}>
          <PlusIcon className="size-3.5" />
          New project
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </div>
  );
}
