"use client";

import { useActiveProjectStore } from "@/store/active-project";
import { useRecentRequestLog } from "@/hooks/use-request-log";
import { useApiPort } from "@/hooks/use-api-port";
import { useProject } from "@/hooks/use-projects";
import { PageHeader } from "@/components/page-header";
import GettingStarted from "./_components/getting-started";
import MoneyStats from "./_components/money-stats";
import ApiGrid from "./_components/api-grid";
import LiveFeed from "./_components/live-feed";

export default function OverviewPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: project } = useProject(slug ?? "");
  const { data: entries = [] } = useRecentRequestLog(slug ?? "");
  const port = useApiPort();

  if (!slug) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Overview"
        title={project?.name ?? "Overview"}
        description={
          <>
            Shortcode <span className="font-mono text-foreground">{project?.shortCode ?? "—"}</span>, served at{" "}
            <span className="font-mono text-foreground">http://127.0.0.1:{port}</span>. Everything below is live.
          </>
        }
      />
      <GettingStarted entries={entries} />
      <MoneyStats slug={slug} entries={entries} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ApiGrid entries={entries} />
        <div className="xl:sticky xl:top-0">
          <LiveFeed entries={entries} />
        </div>
      </div>
    </div>
  );
}
