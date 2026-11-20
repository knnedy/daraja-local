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
import { Trash2Icon } from "lucide-react";
import { useDeleteProject, useProject } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/form";
import { Section } from "./section";

export default function DangerZoneCard({ slug }: { slug: string }) {
  const router = useRouter();
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
    <Section
      tone="danger"
      title="Delete this project"
      description="Removes its keys, initiator, accounts, transactions and request log from this machine. There is no undo."
      footer={
        <>
          <p className="text-[12.5px] text-muted-foreground">Other projects aren&apos;t touched.</p>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" disabled={!project} />} onClick={() => setConfirmText("")}>
          <Trash2Icon className="size-3.5" />
          Delete project
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{projectName}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes its keys, initiator, accounts, transactions and request log. Type the project
              name to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <TextInput
            name="confirmProjectName"
            mono={false}
            aria-label="Type the project name to confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={projectName}
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
        </>
      }>
      {null}
    </Section>
  );
}
