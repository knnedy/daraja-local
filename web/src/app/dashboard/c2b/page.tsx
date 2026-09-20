"use client";

import RequestBar from "./components/request-bar";
import IntegrationPanel from "./components/integration-panel";
import RegistrationCard from "./components/registration-card";
import PaymentFlow from "./components/payment-flow";
import PayloadConsole from "./components/payload-console";
import HowItWorks from "./components/how-it-works";
import { deriveRegistration, derivePayments } from "./lib/sessions";
import { useC2BRequestLog } from "@/hooks/use-c2b";
import { useActiveProjectStore } from "@/store/active-project";

export default function C2BPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: entries = [] } = useC2BRequestLog(slug ?? "");

  if (!slug) return null;

  const registration = deriveRegistration(entries);
  const payments = derivePayments(entries);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          C2B
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Register your callback URLs, then call simulate from your app and
          watch every step land here.
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
        <RegistrationCard registration={registration} />
      </div>

      <PaymentFlow session={payments[0] ?? null} />

      <PayloadConsole entries={entries} />
    </div>
  );
}
