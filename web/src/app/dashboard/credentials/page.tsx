"use client";

import CredentialsCard from "./_components/credentials-card";
import TokenGeneratorCard from "./_components/token-generator-card";
import TokenSnippetCard from "./_components/token-snippet-card";
import InitiatorCard from "./_components/initiator-card";
import HowItWorks from "./_components/how-it-works";
import { useActiveProjectStore } from "@/store/active-project";
import { PageHeader } from "@/components/page-header";

export default function CredentialsPage() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  if (!slug) return null;

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader
          eyebrow="Developer"
          title="Credentials"
          description="Everything your app needs to talk to Daraja Local: the app keys, an access token, and the initiator that signs payouts and queries."
          actions={<HowItWorks />}
        />
        <CredentialsCard slug={slug} />
        <TokenSnippetCard slug={slug} />
        <InitiatorCard slug={slug} />
      </div>
      <div className="xl:sticky xl:top-0">
        <TokenGeneratorCard slug={slug} />
      </div>
    </div>
  );
}
