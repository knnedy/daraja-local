"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/form";
import { createProjectSchema, type CreateProjectInput } from "@/lib/schemas/project";
import { useCreateProject, useProjects, useSetActiveProject } from "@/hooks/use-projects";
import { cn } from "@/lib/utils";
import FrontHeader from "../_components/front-header";
import { CredentialPreview } from "./_components/credential-preview";

const PRESETS = ["http://localhost:3000", "http://localhost:8000", "http://localhost:5000", "http://localhost:8080"];

export default function NewProjectPage() {
  const router = useRouter();
  const { data: projects } = useProjects();
  const create = useCreateProject();
  const open = useSetActiveProject();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", callbackBaseUrl: "" },
  });
  const name = useWatch({ control, name: "name" });
  const base = useWatch({ control, name: "callbackBaseUrl" });
  const busy = create.isPending || open.isPending;

  async function onSubmit(values: CreateProjectInput) {
    const project = await create.mutateAsync({ ...values, callbackBaseUrl: values.callbackBaseUrl.replace(/\/+$/, "") });
    await open.mutateAsync(project.slug);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-svh bg-background">
      <FrontHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {(projects?.length ?? 0) > 0 && (
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeftIcon className="size-3.5" />
            All projects
          </Link>
        )}

        <div className="grid overflow-hidden panel lg:grid-cols-[minmax(0,1fr)_400px]">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 p-6 sm:p-8">
            <div>
              <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.025em] text-foreground">New project</h1>
              <p className="mt-1.5 max-w-md text-[14px] text-pretty text-muted-foreground">
                Like creating an app on the Daraja portal: you get a shortcode, keys and a passkey, ready to drop into
                your .env.
              </p>
            </div>

            <Field label="Project name" error={errors.name?.message} hint="Usually the name of the app you're building.">
              <TextInput autoFocus mono={false} placeholder="Mama Mboga Shop" {...register("name")} />
            </Field>

            <div className="flex flex-col gap-2">
              <Field
                label="Callback base URL"
                error={errors.callbackBaseUrl?.message}
                hint="Where your app's server listens. Test requests from the dashboard send their callbacks under it.">
                <TextInput placeholder="http://localhost:8000" inputMode="url" {...register("callbackBaseUrl")} />
              </Field>
              <div className="flex flex-wrap gap-1.5" aria-label="Common local servers">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setValue("callbackBaseUrl", p, { shouldValidate: true })}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-mono text-[11.5px] ring-1 transition-colors",
                      base === p
                        ? "bg-green-light text-green ring-green-mid dark:bg-green/10"
                        : "bg-surface-2 text-muted-foreground ring-border hover:text-foreground hover:ring-border-strong",
                    )}>
                    {p.replace("http://", "")}
                  </button>
                ))}
              </div>
            </div>

            {(create.isError || open.isError) && (
              <p className="text-[12.5px] text-red">{(create.error ?? open.error)?.message ?? "Couldn't create the project."}</p>
            )}

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-5">
              <p className="text-[12.5px] text-muted-foreground">You can change both later in Settings.</p>
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? "Creating…" : "Create project"}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </form>

          <CredentialPreview name={name} base={base} />
        </div>
      </main>
    </div>
  );
}
