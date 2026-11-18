"use client";

import RequestBar from "../components/request-bar";
import IntegrationPanel from "./components/integration-panel";
import RegistrationCard from "./components/registration-card";
import PayCard from "./components/pay-card";
import PaymentFlow from "./components/payment-flow";
import PayloadConsole from "../components/payload-console";
import HowItWorks from "./components/how-it-works";
import { derivePayments } from "./lib/sessions";
import { useC2BRegistration } from "@/hooks/use-c2b";
import { useLiveRequestLog } from "@/hooks/use-request-log";
import { useActiveProjectStore } from "@/store/active-project";

export default function C2BPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: entries = [] } = useLiveRequestLog(slug ?? "", "c2b");
  const { data: registration } = useC2BRegistration(slug ?? "");

  if (!slug) return null;

  const payments = derivePayments(entries);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          C2B
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Register your callback URLs, then call simulate from your app or send
          a test payment here, and watch every step land.
        </p>
      </div>

      <HowItWorks />

      <div className="flex flex-col gap-2.5">
        <RequestBar
          path="/mpesa/c2b/v2/registerurl"
          label="step 1 · register"
        />
        <RequestBar path="/mpesa/c2b/v2/simulate" label="step 2 · pay" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <IntegrationPanel />
        <div className="flex flex-col gap-5">
          <RegistrationCard registration={registration ?? null} />
          <PayCard slug={slug} registered={registration?.registered ?? false} />
        </div>
      </div>

      <PaymentFlow
        slug={slug}
        payments={payments}
        registered={registration?.registered ?? false}
      />

      <PayloadConsole
        entries={entries}
        title="callback log"
        emptyState={[
          "waiting for a payment…",
          "register your URLs, then send a payment",
        ]}
      />
    </div>
  );
}
