import ProjectIdentityCard from "./_components/project-identity-card";
import SimulationDefaultsCard from "./_components/simulation-defaults-card";
import EnvExportCard from "./_components/env-export-card";
import DangerZoneCard from "./_components/danger-zone-card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          Settings
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Project identity and simulation defaults.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <ProjectIdentityCard />
        <SimulationDefaultsCard />
      </div>

      <EnvExportCard />

      <DangerZoneCard />
    </div>
  );
}
