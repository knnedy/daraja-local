"use client";

import HowItWorks from "./_components/how-it-works";
import IntegrationPanel from "./_components/integration-panel";
import ActivityPanel from "./_components/activity-panel";
import RecipientCard from "./_components/recipient-card";
import SendTestPayout from "./_components/send-test-payout";
import { derivePayouts } from "./lib/payouts";
import { useLiveRequestLog } from "@/hooks/use-request-log";
import { useActiveProjectStore } from "@/store/active-project";
import { PageHeader } from "@/components/page-header";

export default function B2CPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: entries = [] } = useLiveRequestLog(slug ?? "", "b2c");

  if (!slug) return null;

  const payouts = derivePayouts(entries);

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader
          eyebrow="Business to Customer"
          title="B2C"
          description="Pay out from your shortcode to a customer's phone: refunds, salaries, promotions. Choose how the next payout ends, then follow the result to your ResultURL."
          actions={
            <>
              <HowItWorks />
              <SendTestPayout slug={slug} />
            </>
          }
        />
        <ActivityPanel payouts={payouts} />
        <IntegrationPanel />
      </div>

      <div className="xl:sticky xl:top-0">
        <RecipientCard slug={slug} payouts={payouts} />
      </div>
    </div>
  );
}
