"use client";

import { useState } from "react";
import HowItWorks from "./_components/how-it-works";
import IntegrationPanel from "./_components/integration-panel";
import Ledger from "./_components/ledger";
import ReceiptCard from "./_components/receipt-card";
import ActivityPanel from "./_components/activity-panel";
import { deriveSessions } from "./lib/sessions";
import { useLiveRequestLog } from "@/hooks/use-request-log";
import { useTransactions } from "@/hooks/use-transactions";
import { useProject } from "@/hooks/use-projects";
import { useActiveProjectStore } from "@/store/active-project";
import { PageHeader } from "@/components/page-header";

export default function TransactionsPage() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const { data: transactions = [] } = useTransactions(slug);
  const { data: statusLog = [] } = useLiveRequestLog(slug, "transaction_status");
  const { data: reversalLog = [] } = useLiveRequestLog(slug, "reversal");
  const [selected, setSelected] = useState<string | null>(null);

  if (!slug) return null;

  const sessions = deriveSessions([...statusLog, ...reversalLog]);
  const current = transactions.find((t) => t.receipt === selected) ?? transactions[0] ?? null;

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader
          eyebrow="Transaction Status & Reversal"
          title="Transactions"
          description="Every completed payment on your shortcode. Look one up with Transaction Status, or refund a customer with Reversal; both answer later, at your ResultURL."
          actions={<HowItWorks />}
        />
        <Ledger
          transactions={transactions}
          shortCode={project?.shortCode ?? ""}
          selected={current?.receipt ?? null}
          onSelect={setSelected}
        />
        <ActivityPanel sessions={sessions} />
        <IntegrationPanel />
      </div>

      <div className="xl:sticky xl:top-0">
        <ReceiptCard slug={slug} transaction={current} sessions={sessions} onSelect={setSelected} />
      </div>
    </div>
  );
}
