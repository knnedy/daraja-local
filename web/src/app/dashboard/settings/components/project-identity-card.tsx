"use client";

import { useState } from "react";
import { useActiveProjectStore } from "@/store/active-project";
import { useAppConfigStore } from "@/store/app-config";
import { useProject } from "@/hooks/use-projects";
import { useUpdateProjectName } from "@/hooks/use-projects";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProjectIdentityCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const port = useAppConfigStore((s) => s.port);
  const updateName = useUpdateProjectName(slug);

  const [name, setName] = useState("");
  const [lastSyncedName, setLastSyncedName] = useState<string | null>(null);

  if (project && project.name !== lastSyncedName) {
    setLastSyncedName(project.name);
    setName(project.name);
  }

  const isDirty = project !== undefined && name.trim() !== project.name;
  const canSave = isDirty && name.trim().length >= 2 && !updateName.isPending;

  function handleSave() {
    if (!canSave) return;
    updateName.mutate({ name: name.trim() });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <span className="text-[13px] font-medium text-foreground">Project</span>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!project}
          className="rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] text-foreground outline-none focus:border-ring disabled:opacity-60"
        />
        {name.trim().length > 0 && name.trim().length < 2 && (
          <p className="text-xs text-destructive">
            Name must be at least 2 characters
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Created
          </label>
          <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] text-muted-foreground">
            {project ? formatDate(project.createdAt) : "…"}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Local server
          </label>
          <p className="rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[12.5px] text-muted-foreground">
            http://127.0.0.1:{port}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="self-start rounded-lg bg-green px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green/90 disabled:cursor-not-allowed disabled:opacity-50">
          {updateName.isPending ? "Saving…" : "Save changes"}
        </button>
        {updateName.isError && (
          <span className="text-xs text-destructive">
            Failed to save — try again.
          </span>
        )}
        {updateName.isSuccess && !isDirty && (
          <span className="text-xs text-green">Saved</span>
        )}
      </div>
    </div>
  );
}
