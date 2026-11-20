"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useApiPort } from "@/hooks/use-api-port";
import { useCopy } from "@/hooks/use-copy";
import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/form";
import { ReadOnly, Section } from "./section";
import { Skeleton } from "@/components/ui/skeleton";

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

/** The project's name and callback base URL, plus the address Daraja Local lives at. */
export default function ProjectIdentityCard({ slug }: { slug: string }) {
  const { data: project } = useProject(slug);
  const port = useApiPort();
  const update = useUpdateProject(slug);
  const [name, setName] = useState<string | null>(null);
  const [callback, setCallback] = useState<string | null>(null);

  const value = name ?? project?.name ?? "";
  const trimmed = value.trim();
  const callbackValue = callback ?? project?.callbackBaseUrl ?? "";
  const callbackTrimmed = callbackValue.trim().replace(/\/+$/, "");
  const nameDirty = project !== undefined && trimmed !== project.name;
  const callbackDirty = project !== undefined && callbackTrimmed !== project.callbackBaseUrl;
  const dirty = nameDirty || callbackDirty;
  const tooShort = trimmed.length < 2;
  const badUrl = !/^https?:\/\/[^\s/]+\S*$/.test(callbackTrimmed);
  const server = `http://127.0.0.1:${port}`;

  function save() {
    if (!dirty || tooShort || badUrl) return;
    update.mutate(
      { ...(nameDirty && { name: trimmed }), ...(callbackDirty && { callbackBaseUrl: callbackTrimmed }) },
      {
        onSuccess: () => {
          setName(null);
          setCallback(null);
        },
      },
    );
  }

  return (
    <Section
      title="General"
      description="How this project shows up in the dashboard, and where it lives."
      onSubmit={save}
      footer={
        <>
          <p className="text-[12.5px] text-muted-foreground">
            {update.isError ? (
              <span className="text-red">Couldn&apos;t save. Is Daraja Local still running?</span>
            ) : update.isSuccess && !dirty ? (
              <span className="text-green">Saved.</span>
            ) : (
              "Changes apply right away."
            )}
          </p>
          <Button type="submit" disabled={!dirty || tooShort || badUrl || update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name" error={value && tooShort ? "At least 2 characters" : null}>
          {project ? (
            <TextInput name="projectName" mono={false} value={value} onChange={(e) => setName(e.target.value)} />
          ) : (
            <Skeleton className="h-9 rounded-lg" />
          )}
        </Field>
        <ReadOnly label="Created">{project ? formatDate(project.createdAt) : <Skeleton className="h-3 w-24" />}</ReadOnly>
        <Field
          label="Callback base URL"
          error={callbackValue && badUrl ? "An http:// or https:// URL" : null}
          hint={
            callbackDirty
              ? "Dashboard tests will call back here. Registered C2B URLs keep theirs."
              : "Where your server listens, for the dashboard's test requests."
          }>
          {project ? (
            <TextInput name="callbackBaseUrl" inputMode="url" value={callbackValue} onChange={(e) => setCallback(e.target.value)} />
          ) : (
            <Skeleton className="h-9 rounded-lg" />
          )}
        </Field>
        <ReadOnly label="Daraja Local base URL" mono>
          <span className="truncate" translate="no">
            {server}
          </span>
          <Copy value={server} label="base URL" />
        </ReadOnly>
      </div>
    </Section>
  );
}
