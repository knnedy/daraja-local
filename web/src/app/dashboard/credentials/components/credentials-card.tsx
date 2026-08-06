"use client";

import { useState } from "react";
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

function randomHex(length: number) {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}

export default function CredentialsCard() {
  const [consumerKey, setConsumerKey] = useState(`dl_ck_${randomHex(16)}`);
  const [consumerSecret, setConsumerSecret] = useState(
    `dl_cs_${randomHex(20)}`,
  );
  const [passkey, setPasskey] = useState(randomHex(64));

  function regenerateAppCredentials() {
    setConsumerKey(`dl_ck_${randomHex(16)}`);
    setConsumerSecret(`dl_cs_${randomHex(20)}`);
  }

  function regeneratePasskey() {
    setPasskey(randomHex(64));
  }

  return (
    <div className="rounded-lg border border-border-strong bg-surface-1 shadow-sm">
      <div className="border-b border-border px-4 py-2.5">
        <span className="text-[13px] font-medium text-foreground">
          Credentials
        </span>
      </div>

      <div className="divide-y divide-border/60">
        <CredentialRow label="Shortcode" value="174379" />
        <CredentialRow label="Consumer key" value={consumerKey} secret />
        <CredentialRow label="Consumer secret" value={consumerSecret} secret />
        <CredentialRow label="Passkey" value={passkey} secret />
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row">
        <AlertDialog>
          <AlertDialogTrigger className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface-2 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-2/70">
            <RefreshCwIcon className="size-3.5" />
            Regenerate key & secret
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Regenerate Consumer Key & Secret?
              </AlertDialogTitle>
              <AlertDialogDescription>
                The current key and secret stop working immediately. Anything
                hardcoded to them elsewhere — your backend&apos;s .env, other
                tools — breaks until you update it there too.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={regenerateAppCredentials}>
                Regenerate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface-2 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-2/70">
            <RefreshCwIcon className="size-3.5" />
            Regenerate passkey
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate Passkey?</AlertDialogTitle>
              <AlertDialogDescription>
                STK Push requests built with the old passkey will fail their
                Password field check immediately after this.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={regeneratePasskey}>
                Regenerate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
