"use client";

import ProjectIdentityCard from "./_components/project-identity-card";
import SimulationDefaultsCard from "./_components/simulation-defaults-card";
import EnvExportCard from "./_components/env-export-card";
import DangerZoneCard from "./_components/danger-zone-card";
import { useActiveProjectStore } from "@/store/active-project";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  if (!slug) return null;

  return (
    <div className="flex max-w-[880px] flex-col gap-6">
      <PageHeader eyebrow="Developer" title="Settings" description="This project's name, how the simulation behaves, and its .env." />
      <ProjectIdentityCard slug={slug} />
      <SimulationDefaultsCard slug={slug} />
      <EnvExportCard slug={slug} />
      <DangerZoneCard slug={slug} />
    </div>
  );
}
