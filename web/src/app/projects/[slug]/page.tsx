export default function ProjectOverviewPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-xl font-medium text-foreground">
        Overview
      </h1>
      <p className="text-sm text-muted-foreground">
        Live stats, active sessions, and recent requests will render here.
      </p>
    </div>
  );
}
