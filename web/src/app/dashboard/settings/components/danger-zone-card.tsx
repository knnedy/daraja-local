"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useActiveProjectStore } from "@/store/active-project";
import { useProject } from "@/hooks/use-project";
import { useDeleteProject } from "@/hooks/use-delete-project";

export default function DangerZoneCard() {
  const router = useRouter();
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const deleteProject = useDeleteProject();

  const [confirmText, setConfirmText] = useState("");
  const projectName = project?.name ?? "";
  const matches = confirmText === projectName && projectName !== "";

  function handleDelete() {
    if (!matches) return;
    deleteProject.mutate(slug, {
      onSuccess: () => router.push("/"),
    });
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/3 p-4">
      <span className="text-[13px] font-medium text-destructive">
        Danger zone
      </span>
      <p className="mt-1 mb-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Deletes this project&apos;s credentials, callback config, and local
        request history. Cannot be undone.
      </p>

      <AlertDialog>
        <AlertDialogTrigger
          disabled={!project}
          onClick={() => setConfirmText("")}
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50">
          Delete project
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{projectName}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the project&apos;s credentials, callback
              configuration, and request log. Type the project name to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={projectName}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] text-foreground outline-none focus:border-destructive"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!matches || deleteProject.isPending}
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-40">
              {deleteProject.isPending ? "Deleting…" : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
