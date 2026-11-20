"use client";

import IntegrationPanel from "./_components/integration-panel";
import RegistrationCard from "./_components/registration-card";
import ActivityPanel from "./_components/activity-panel";
import PhoneCard from "./_components/phone-card";
import HowItWorks from "./_components/how-it-works";
import { derivePayments } from "./lib/sessions";
import { useC2BRegistration } from "@/hooks/use-c2b";
import { useLiveRequestLog } from "@/hooks/use-request-log";
import { useActiveProjectStore } from "@/store/active-project";
import { PageHeader } from "@/components/page-header";

export default function C2BPage() {
  const slug = useActiveProjectStore((s) => s.slug);
  const { data: entries = [], isPending } = useLiveRequestLog(slug ?? "", "c2b");
  const { data: registration, isPending: registrationPending } = useC2BRegistration(slug ?? "");

  if (!slug) return null;

  const payments = derivePayments(entries);
  const registered = registration?.registered ?? false;

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader
          eyebrow="Customer to Business"
          title="C2B"
          description="Customers pay your Paybill or Till from their own phone. Register where to be told, pay from the Customer's phone, and watch validation and confirmation reach your server."
          actions={<HowItWorks />}
        />
        <RegistrationCard registration={registration ?? null} loading={registrationPending} />
        <ActivityPanel slug={slug} payments={payments} registered={registered} loading={isPending} />
        <IntegrationPanel />
      </div>

      <div className="xl:sticky xl:top-0">
        <PhoneCard slug={slug} payments={payments} registered={registered} loading={isPending || registrationPending} />
      </div>
    </div>
  );
}
