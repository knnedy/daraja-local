"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useApiPort } from "@/hooks/use-api-port";
import { useCopy } from "@/hooks/use-copy";
import { useProject, useUpdateProjectName } from "@/hooks/use-projects";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/form";
import { ReadOnly, Section } from "./section";

function Copy({ value, label }: { value: string; label: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => void copy(value)}
      className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground">
      {copied ? <CheckIcon className="size-3.5 text-green" /> : <CopyIcon className="size-3.5" />}
    </button>
  );
}

/** The project's name, plus the addresses it lives at. */
export default function ProjectIdentityCard({ slug }: { slug: string }) {
  const { data: project } = useProject(slug);
  const port = useApiPort();
  const update = useUpdateProjectName(slug);
  const [name, setName] = useState<string | null>(null);

  const value = name ?? project?.name ?? "";
  const trimmed = value.trim();
  const dirty = project !== undefined && trimmed !== project.name;
  const tooShort = trimmed.length > 0 && trimmed.length < 2;
  const server = `http://127.0.0.1:${port}`;

  return (
    <Section
      title="General"
      description="How this project shows up in the dashboard, and where it lives."
      onSubmit={() => dirty && !tooShort && update.mutate({ name: trimmed }, { onSuccess: () => setName(null) })}
      footer={
        <>
          <p className="text-[12.5px] text-muted-foreground">
            {update.isError ? (
              <span className="text-red">Couldn&apos;t save. Is Daraja Local still running?</span>
            ) : update.isSuccess && !dirty ? (
              <span className="text-green">Saved.</span>
            ) : (
              "Shown in the sidebar and the project switcher."
            )}
          </p>
          <Button type="submit" disabled={!dirty || tooShort || update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name" error={tooShort ? "At least 2 characters" : null}>
          <TextInput name="projectName" mono={false} value={value} disabled={!project} onChange={(e) => setName(e.target.value)} />
        </Field>
        <ReadOnly label="Created">{project ? formatDate(project.createdAt) : "…"}</ReadOnly>
        <ReadOnly label="Daraja Local base URL" mono>
          <span className="truncate" translate="no">
            {server}
          </span>
          <Copy value={server} label="base URL" />
        </ReadOnly>
        <ReadOnly label="Callback base URL" mono>
          <span className="truncate" translate="no">
            {project?.callbackBaseUrl ?? "…"}
          </span>
          {project && <Copy value={project.callbackBaseUrl} label="callback base URL" />}
        </ReadOnly>
      </div>
    </Section>
  );
}
