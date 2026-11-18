"use client";

import RequestBar from "../_components/request-bar";
import PayloadConsole from "../_components/payload-console";
import HowItWorks from "./_components/how-it-works";
import IntegrationPanel from "./_components/integration-panel";
import AccountCard from "./_components/account-card";
import PayoutCard from "./_components/payout-card";
import PayoutFlow from "./_components/payout-flow";
import { derivePayouts } from "./lib/payouts";
import { useLiveRequestLog } from "@/hooks/use-request-log";
import { useActiveProjectStore } from "@/store/active-project";

export default function B2CPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: entries = [] } = useLiveRequestLog(slug ?? "", "b2c");

  if (!slug) return null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          B2C
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Pay out from your shortcode to a customer&apos;s phone, then watch the
          result arrive at your ResultURL.
        </p>
      </div>

      <HowItWorks />

      <RequestBar path="/mpesa/b2c/v3/paymentrequest" label="payout" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <IntegrationPanel />
          <PayoutFlow payouts={derivePayouts(entries)} />
        </div>
        <div className="flex flex-col gap-5">
          <PayoutCard slug={slug} />
          <AccountCard slug={slug} />
        </div>
      </div>

      <PayloadConsole
        entries={entries}
        title="result log"
        emptyState={[
          "waiting for a payout…",
          "call paymentrequest, or send a test payout",
        ]}
      />
    </div>
  );
}
