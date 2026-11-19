"use client";

import RequestBar from "./_components/request-bar";
import IntegrationPanel from "./_components/integration-panel";
import SimulatorCard from "./_components/simulator-card";
import PayloadConsole from "../_components/payload-console";
import SimulationGuide from "./_components/simulation-guide";
import HowItWorks from "./_components/how-it-works";
import CallbacksCard from "./_components/callbacks-card";
import { derivePayments } from "./lib/callbacks";
import { useLiveRequestLog } from "@/hooks/use-request-log";
import { useActiveProjectStore } from "@/store/active-project";
import { PageHeader } from "@/components/page-header";

export default function StkPushPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: entries = [] } = useLiveRequestLog(slug ?? "", "stk_push");

  if (!slug) return null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        page="stk"
        title="STK Push"
        description={<>Call this endpoint from your app, then watch and respond to what comes in.</>}
      />

      <HowItWorks />

      <RequestBar />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-5">
          <IntegrationPanel />
          <SimulationGuide />
        </div>
        <SimulatorCard slug={slug} />
      </div>

      <CallbacksCard slug={slug} payments={derivePayments(entries)} />

      <PayloadConsole
        entries={entries}
        title="live session"
        emptyState={[
          "waiting for a request…",
          "call the endpoint above to open a session",
        ]}
      />
    </div>
  );
}
