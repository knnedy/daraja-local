import CredentialsCard from "./components/credentials-card";
import TokenGeneratorCard from "./components/token-generator-card";
import TokenSnippetCard from "./components/token-snippet-card";
import HowItWorksAccordion from "./components/how-it-works";

export default function CredentialsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          Credentials
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Auto-generated for this project — never typed in, matching how a real
          Daraja app works.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
        <CredentialsCard />
        <div className="flex flex-col gap-5">
          <TokenGeneratorCard />
          <TokenSnippetCard />
        </div>
      </div>

      <HowItWorksAccordion />
    </div>
  );
}
