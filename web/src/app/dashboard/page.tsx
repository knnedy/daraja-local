"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveProjectStore } from "@/store/active-project";
import { useRecentRequestLog } from "@/hooks/use-request-log";
import RecentActivity from "./components/recent-activity";
import EndpointsCard from "./components/endpoints-card";
import EnvCard from "./components/env-card";
import ProjectDetailsCard from "./components/project-details";
import StatsCard from "./components/stats-card";

export default function OverviewPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: entries = [] } = useRecentRequestLog(slug ?? "");

  if (!slug) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
            Overview
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Environment values and activity for this project&apos;s local Daraja
            instance.
          </p>
        </div>
        <Button
          nativeButton={false}
          className="gap-1.5 bg-green text-white hover:bg-green/90"
          render={<Link href="/dashboard/stk" />}>
          Go to STK Push
          <ArrowRightIcon className="size-3.75" />
        </Button>
      </div>

      <StatsCard entries={entries} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="flex flex-col lg:col-span-3">
          <div className="mb-2.5 text-[13px] font-medium text-foreground">
            Mocked endpoints
          </div>
          <EndpointsCard entries={entries} />
        </div>
        <div className="flex flex-col lg:col-span-2">
          <div className="mb-2.5 text-[13px] font-medium text-foreground">
            Recent activity
          </div>
          <RecentActivity entries={entries} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2.5 text-[13px] font-medium text-foreground">
            Project details
          </div>
          <ProjectDetailsCard />
        </div>
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground">
              Environment
            </span>
            <span className="text-xs text-muted-foreground">
              Generated on init — rotate from Credentials
            </span>
          </div>
          <EnvCard />
        </div>
      </div>
    </div>
  );
}
