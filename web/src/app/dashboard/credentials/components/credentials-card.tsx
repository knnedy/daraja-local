"use client";

import { RefreshCwIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CredentialRow from "./credential-row";
import { useActiveProjectStore } from "@/store/active-project";
import { useProject } from "@/hooks/use-project";
import { useRegenerateCredentials } from "@/hooks/use-regenerate-credentials";

export default function CredentialsCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const regenerate = useRegenerateCredentials(slug);

  return (
    <div className="rounded-lg border border-border-strong bg-surface-1 shadow-sm">
      <div className="border-b border-border px-4 py-2.5">
        <span className="text-[13px] font-medium text-foreground">
          Credentials
        </span>
      </div>

      <div className="divide-y divide-border/60">
        <CredentialRow label="Shortcode" value={project?.shortCode ?? "…"} />
        <CredentialRow
          label="Consumer key"
          value={project?.consumerKey ?? "…"}
          secret
        />
        <CredentialRow
          label="Consumer secret"
          value={project?.consumerSecret ?? "…"}
          secret
        />
        <CredentialRow label="Passkey" value={project?.passkey ?? "…"} secret />
      </div>

      <div className="border-t border-border px-4 py-3">
        <AlertDialog>
          <AlertDialogTrigger
            disabled={regenerate.isPending}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface-2 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-2/70 disabled:opacity-60">
            <RefreshCwIcon className="size-3.5" />
            {regenerate.isPending ? "Regenerating…" : "Regenerate credentials"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate credentials?</AlertDialogTitle>
              <AlertDialogDescription>
                Consumer key, consumer secret, and passkey all rotate together.
                Anything using the current values — your backend&apos;s .env,
                other tools, in-flight STK requests — breaks until you update
                them there too.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => regenerate.mutate()}>
                Regenerate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
