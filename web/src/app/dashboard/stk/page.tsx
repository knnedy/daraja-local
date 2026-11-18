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

export default function StkPushPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: entries = [] } = useLiveRequestLog(slug ?? "", "stk_push");

  if (!slug) return null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          STK Push
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Call this endpoint from your app, then watch and respond to what comes
          in.
        </p>
      </div>

      <HowItWorks />

      <RequestBar />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
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
