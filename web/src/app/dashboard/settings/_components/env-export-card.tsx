"use client";

import { DownloadIcon } from "lucide-react";
import { useApiPort } from "@/hooks/use-api-port";
import { useInitiator, useProject } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { Section } from "./section";

/** Every value an app needs, as a .env file. */
export default function EnvExportCard({ slug }: { slug: string }) {
  const { data: project } = useProject(slug);
  const { data: initiator } = useInitiator(slug);
  const port = useApiPort();

  const env =
    project && initiator
      ? `DARAJA_BASE_URL=http://127.0.0.1:${port}
DARAJA_SHORTCODE=${project.shortCode}
DARAJA_CONSUMER_KEY=${project.consumerKey}
DARAJA_CONSUMER_SECRET=${project.consumerSecret}
DARAJA_PASSKEY=${project.passkey}
DARAJA_CALLBACK_URL=${project.callbackBaseUrl}
DARAJA_INITIATOR_NAME=${initiator.name}
DARAJA_INITIATOR_PASSWORD=${initiator.password}
# The certificate from the Credentials page, saved next to your app
DARAJA_CERT_PATH=./daraja-local-${project.slug}.cer`
      : "";

  function download() {
    const url = URL.createObjectURL(new Blob([env + "\n"], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env.daraja-local";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Section
      title="Environment"
      description="Every value your app needs, ready to paste into its .env. Pointing it at real Daraja later means changing these, not your code."
      footer={
        <>
          <p className="text-[12.5px] text-muted-foreground">Contains secrets. Keep it out of version control.</p>
          <Button type="button" variant="outline" disabled={!env} onClick={download}>
            <DownloadIcon className="size-3.5" />
            Download .env
          </Button>
        </>
      }>
      {env ? (
        <CodeBlock code={env} lang="bash" lineNumbers={false} />
      ) : (
        <div className="h-48 animate-pulse rounded-xl bg-surface-2 motion-reduce:animate-none" />
      )}
    </Section>
  );
}
