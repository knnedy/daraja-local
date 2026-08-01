"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  PlugZapIcon,
  ArrowRightIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CredentialPreview } from "./components/credential-preview";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/lib/schemas/project";

export default function NewProjectPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
  });

  // TODO: replace with a mutation against the Go API once the
  // project creation endpoint exists
  async function onSubmit(values: CreateProjectInput) {
    console.log(values);
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-3xl overflow-hidden rounded-xl border border-border md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col justify-center gap-6 bg-surface-2 px-10 py-10">
          <div>
            <div className="mb-3.5 flex items-center gap-2">
              <div className="flex size-6.5 items-center justify-center rounded-[7px] bg-green">
                <PlugZapIcon className="size-3.5 text-white" />
              </div>
              <span className="font-mono text-xs tracking-wide text-muted-foreground">
                daraja-local
              </span>
            </div>
            <h1 className="mb-1 font-heading text-xl font-medium text-foreground">
              Create a project
            </h1>
            <div className="mb-3 h-0.75 w-8 rounded-full bg-green" />
            <p className="text-sm leading-relaxed text-sub">
              Daraja Local generates a shortcode, consumer key, secret, and
              passkey for you — just like a real Daraja sandbox app.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name"
                className="text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                id="name"
                placeholder="My ticketing app"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="callbackBaseUrl"
                className="text-sm font-medium text-foreground">
                Callback base URL
              </label>
              <Input
                id="callbackBaseUrl"
                placeholder="http://localhost:8000"
                className="font-mono text-[13px]"
                {...register("callbackBaseUrl")}
              />
              {errors.callbackBaseUrl ? (
                <p className="text-xs text-destructive">
                  {errors.callbackBaseUrl.message}
                </p>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Daraja Local appends paths like /api/mpesa/callback
                  automatically.
                </span>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full gap-1.5">
              {isSubmitting ? "Creating…" : "Create project"}
              <ArrowRightIcon className="size-4" />
            </Button>

            <div className="-mt-1 flex items-center gap-1.5">
              <SlidersHorizontalIcon className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Network conditions are set later, per request, in the STK
                screen.
              </span>
            </div>
          </form>
        </motion.div>

        <CredentialPreview />
      </div>
    </div>
  );
}
