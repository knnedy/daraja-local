import ProjectIdentityCard from "./_components/project-identity-card";
import SimulationDefaultsCard from "./_components/simulation-defaults-card";
import EnvExportCard from "./_components/env-export-card";
import DangerZoneCard from "./_components/danger-zone-card";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        page="settings"
        title="Settings"
        description={<>Project identity and simulation defaults.</>}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <ProjectIdentityCard />
        <SimulationDefaultsCard />
      </div>

      <EnvExportCard />

      <DangerZoneCard />
    </div>
  );
}
