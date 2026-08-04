import ProjectIdentityCard from "./components/project-identity-card";
import CallbackUrlCard from "./components/callback-url-card";
import SimulationDefaultsCard from "./components/simulation-defaults-card";
import EnvExportCard from "./components/env-export-card";
import DangerZoneCard from "./components/danger-zone-card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          Settings
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Project identity, callback config, and simulation defaults.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <ProjectIdentityCard />
        <CallbackUrlCard />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <SimulationDefaultsCard />
        <EnvExportCard />
      </div>

      <DangerZoneCard />
    </div>
  );
}
