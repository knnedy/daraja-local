"use client";

import { useState } from "react";
import { useActiveProjectStore } from "@/store/active-project";
import { useApiPort } from "@/hooks/use-api-port";
import { useProject } from "@/hooks/use-projects";
import { useUpdateProjectName } from "@/hooks/use-projects";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/form";

export default function ProjectIdentityCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const port = useApiPort();
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="flex flex-col gap-4 rounded-xl border border-border-strong bg-surface-1 p-4 shadow-sm">
      <span className="text-[13px] font-medium text-foreground">Project</span>

      <Field
        label="Name"
        error={
          name.trim().length > 0 && name.trim().length < 2
            ? "Name must be at least 2 characters"
            : null
        }>
        <TextInput
          name="projectName"
          mono={false}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!project}
        />
      </Field>

      <dl className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <dt className="text-[11.5px] font-medium text-muted-foreground">
            Created
          </dt>
          <dd className="flex h-9 items-center rounded-lg border border-border bg-surface-2 px-3 text-[13px] text-muted-foreground">
            {project ? formatDate(project.createdAt) : "…"}
          </dd>
        </div>
        <div className="flex flex-col gap-1.5">
          <dt className="text-[11.5px] font-medium text-muted-foreground">
            Local server
          </dt>
          <dd
            translate="no"
            className="flex h-9 items-center rounded-lg border border-border bg-surface-2 px-3 font-mono text-[12.5px] text-muted-foreground">
            http://127.0.0.1:{port}
          </dd>
        </div>
      </dl>

      <div className="flex items-center gap-3" aria-live="polite">
        <Button type="submit" disabled={!canSave}>
          {updateName.isPending ? "Saving…" : "Save changes"}
        </Button>
        {updateName.isError && (
          <span className="text-xs text-destructive">
            Couldn&apos;t save. Check that Daraja Local is running, then try
            again.
          </span>
        )}
        {updateName.isSuccess && !isDirty && (
          <span className="text-xs text-green">Saved</span>
        )}
      </div>
    </form>
  );
}
