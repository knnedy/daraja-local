"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SegmentedControl, TextInput } from "@/components/form";
import { useSendPayout } from "@/hooks/use-b2c";
import { useProject } from "@/hooks/use-projects";
import { useProjectSettings } from "@/hooks/use-settings";
import type { B2CCommandId } from "@/lib/types/b2c";
import { formatKesWhole } from "@/lib/format";

const commands: { id: B2CCommandId; label: string }[] = [
  { id: "BusinessPayment", label: "Business" },
  { id: "SalaryPayment", label: "Salary" },
  { id: "PromotionPayment", label: "Promotion" },
];

/** Sends a payout with the project's own initiator, as the developer's app would. */
export default function PayoutCard({ slug }: { slug: string }) {
  const { data: project } = useProject(slug);
  const { data: settings } = useProjectSettings(slug);
  const send = useSendPayout(slug);

  const base = project?.callbackBaseUrl.replace(/\/+$/, "") ?? "";
  const [commandId, setCommandId] = useState<B2CCommandId>("BusinessPayment");
  const [amount, setAmount] = useState("2500");
  const [partyB, setPartyB] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("Refund");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [timeoutUrl, setTimeoutUrl] = useState<string | null>(null);

  const phone = partyB ?? settings?.defaultPhoneNumber ?? "";
  const result = resultUrl ?? (base ? `${base}/b2c/result` : "");
  const timeout = timeoutUrl ?? (base ? `${base}/b2c/timeout` : "");

  const amountValid = /^[1-9]\d*$/.test(amount);
  const phoneValid = /^254[17]\d{8}$/.test(phone);
  const remarksValid = remarks.trim().length >= 2 && remarks.length <= 100;
  const canSend =
    amountValid &&
    phoneValid &&
    remarksValid &&
    Boolean(result && timeout) &&
    !send.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSend) return;
        send.mutate({
          commandId,
          amount,
          partyB: phone,
          remarks: remarks.trim(),
          resultUrl: result,
          queueTimeOutUrl: timeout,
        });
      }}
      className="flex flex-col gap-3.5 rounded-xl border border-border-strong bg-surface-1 p-4 shadow-sm">
      <div>
        <p className="text-[13px] font-medium text-foreground">
          Send a test payout
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Signed with this project&apos;s initiator, like your app would
        </p>
      </div>

      <SegmentedControl
        label="Payout type"
        value={commandId}
        options={commands.map((c) => ({ value: c.id, label: c.label }))}
        onChange={setCommandId}
      />

      <div className="grid grid-cols-[96px_1fr] gap-2.5">
        <Field
          label="Amount"
          error={!amountValid && amount !== "" ? "Whole KES above 0" : null}>
          <TextInput
            name="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.trim())}
          />
        </Field>
        <Field
          label="To phone (PartyB)"
          error={
            !phoneValid && phone !== ""
              ? "Use 2547XXXXXXXX or 2541XXXXXXXX"
              : null
          }>
          <TextInput
            name="partyB"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPartyB(e.target.value.trim())}
            placeholder="254708374149…"
          />
        </Field>
      </div>

      <Field
        label="Remarks"
        error={remarksValid ? null : "Remarks must be 2 to 100 characters"}>
        <TextInput
          name="remarks"
          mono={false}
          value={remarks}
          maxLength={100}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </Field>
      <Field label="ResultURL">
        <TextInput
          name="resultUrl"
          type="url"
          value={result}
          onChange={(e) => setResultUrl(e.target.value.trim())}
          placeholder="https://your-app.com/api/b2c/result…"
        />
      </Field>
      <Field label="QueueTimeOutURL">
        <TextInput
          name="queueTimeOutUrl"
          type="url"
          value={timeout}
          onChange={(e) => setTimeoutUrl(e.target.value.trim())}
          placeholder="https://your-app.com/api/b2c/timeout…"
        />
      </Field>

      <Button type="submit" size="lg" disabled={!canSend}>
        <SendIcon className="size-3.5" />
        {send.isPending
          ? "Sending…"
          : `Pay out KES ${amountValid ? formatKesWhole(Number(amount)) : "—"}`}
      </Button>

      {send.isError && (
        <p className="text-[11px] text-destructive">{send.error.message}</p>
      )}
    </form>
  );
}
