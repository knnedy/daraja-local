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
import { Button } from "@/components/ui/button";
import { useProject, useRegenerateCredentials } from "@/hooks/use-projects";
import KeyField from "./key-field";

/** The app keys a Daraja app is issued: what each is for, and rotating them. */
export default function CredentialsCard({ slug }: { slug: string }) {
  const { data: project } = useProject(slug);
  const regenerate = useRegenerateCredentials(slug);

  return (
    <section className="panel overflow-hidden" aria-labelledby="keys-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="keys-title" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            App keys
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Generated for this project, the way the Daraja portal issues them for an app.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" disabled={regenerate.isPending} />}>
            <RefreshCwIcon className="size-3.5" />
            {regenerate.isPending ? "Rotating…" : "Rotate keys"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rotate the app keys?</AlertDialogTitle>
              <AlertDialogDescription>
                The consumer key, consumer secret and passkey all change together. Tokens issued with the old keys keep
                working until they expire, but your app&apos;s .env needs the new values to get another one.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => regenerate.mutate()}>Rotate keys</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="divide-y divide-border">
        <KeyField label="Shortcode" hint="Your PayBill or Till; BusinessShortCode and PartyA." value={project?.shortCode} />
        <KeyField label="Consumer key" hint="With the secret, gets an access token." value={project?.consumerKey} secret />
        <KeyField label="Consumer secret" hint="Never ship it to a browser or app." value={project?.consumerSecret} secret />
        <KeyField
          label="Passkey"
          hint={
            <>
              Builds the STK Push <span className="font-mono">Password</span>.
            </>
          }
          value={project?.passkey}
          secret
        />
      </div>
      {regenerate.isError && <p className="px-5 pb-4 text-[12px] text-red">{regenerate.error.message}</p>}
    </section>
  );
}
