"use client";

import IntegrationPanel from "./_components/integration-panel";
import SimulatorCard from "./_components/simulator-card";
import HowItWorks from "./_components/how-it-works";
import SendTestPush from "./_components/send-test-push";
import ActivityPanel from "./_components/activity-panel";
import { deriveAttempts } from "./lib/sessions";
import { useLiveRequestLog } from "@/hooks/use-request-log";
import { useActiveProjectStore } from "@/store/active-project";
import { PageHeader } from "@/components/page-header";

export default function StkPushPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: entries = [], isPending } = useLiveRequestLog(slug ?? "", "stk_push");

  if (!slug) return null;

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader
          eyebrow="Lipa na M-Pesa Online"
          title="STK Push"
          description="Your app asks a customer's phone for their M-Pesa PIN. Answer on the Virtual Phone to choose how it ends, then follow the callback to your server."
          actions={
            <>
              <HowItWorks />
              <SendTestPush slug={slug} />
            </>
          }
        />
        <ActivityPanel slug={slug} attempts={deriveAttempts(entries)} loading={isPending} />
        <IntegrationPanel />
      </div>

      <div className="xl:sticky xl:top-0">
        <SimulatorCard slug={slug} />
      </div>
    </div>
  );
}
