"use client";

import RequestBar from "./components/request-bar";
import IntegrationPanel from "./components/integration-panel";
import SimulatorCard from "./components/simulator-card";
import PayloadConsole from "./components/payload-console";
import SimulationGuide from "./components/simulation-guide";
import HowItWorks from "./components/how-it-works";
import { useActiveProjectStore } from "@/store/active-project";

export default function StkPushPage() {
  const slug = useActiveProjectStore((s) => s.slug);

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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-stretch">
        <div className="flex flex-col gap-5">
          <IntegrationPanel />
          <SimulationGuide />
        </div>
        <SimulatorCard slug={slug} />
      </div>

      <PayloadConsole slug={slug} />
    </div>
  );
}
