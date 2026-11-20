"use client";

import HowItWorks from "./_components/how-it-works";
import IntegrationPanel from "./_components/integration-panel";
import AccountsCard from "./_components/accounts-card";
import ActivityPanel from "./_components/activity-panel";
import SendTestPayment from "./_components/send-test-payment";
import { deriveSessions } from "./lib/sessions";
import { useLiveRequestLog } from "@/hooks/use-request-log";
import { useActiveProjectStore } from "@/store/active-project";
import { PageHeader } from "@/components/page-header";

export default function B2BPage() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: payments = [] } = useLiveRequestLog(slug, "b2b");
  const { data: balances = [] } = useLiveRequestLog(slug, "account_balance");

  if (!slug) return null;

  const sessions = deriveSessions([...payments, ...balances]);

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader
          eyebrow="Business to Business"
          title="B2B"
          description="Pay another business's PayBill or Till from your working account, or ask Daraja what your accounts hold. Both answer later, at your ResultURL."
          actions={
            <>
              <HowItWorks />
              <SendTestPayment slug={slug} />
            </>
          }
        />
        <ActivityPanel sessions={sessions} />
        <IntegrationPanel />
      </div>

      <div className="xl:sticky xl:top-0">
        <AccountsCard slug={slug} sessions={sessions} />
      </div>
    </div>
  );
}
