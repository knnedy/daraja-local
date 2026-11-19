import CredentialsCard from "./_components/credentials-card";
import TokenGeneratorCard from "./_components/token-generator-card";
import TokenSnippetCard from "./_components/token-snippet-card";
import InitiatorCard from "./_components/initiator-card";
import HowItWorksAccordion from "./_components/how-it-works";
import { PageHeader } from "@/components/page-header";

export default function CredentialsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        page="credentials"
        title="Credentials"
        description={<>Auto-generated for this project — never typed in, matching how a real Daraja app works.</>}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
        <CredentialsCard />
        <TokenGeneratorCard />
      </div>

      <HowItWorksAccordion />
      <TokenSnippetCard />
      <InitiatorCard />
    </div>
  );
}
