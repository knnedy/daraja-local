"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SegmentedControl, TextInput } from "@/components/form";
import { useSendPayout } from "@/hooks/use-b2c";
import { useProject } from "@/hooks/use-projects";
import { useProjectSettings } from "@/hooks/use-settings";
import type { B2CCommandId } from "@/lib/types/b2c";
import { formatKesWhole } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FormError, TestPopover } from "../../_components/test-popover";

const commands: { id: B2CCommandId; label: string }[] = [
  { id: "BusinessPayment", label: "Business" },
  { id: "SalaryPayment", label: "Salary" },
  { id: "PromotionPayment", label: "Promotion" },
];

/** Sends a payout signed with the project's own initiator, as the developer's app would. */
export default function SendTestPayout({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [showUrls, setShowUrls] = useState(false);
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

  const amountOk = /^[1-9]\d*$/.test(amount);
  const phoneOk = /^254[17]\d{8}$/.test(phone);
  const remarksOk = remarks.trim().length >= 2 && remarks.length <= 100;
  const canSend = amountOk && phoneOk && remarksOk && Boolean(result && timeout) && !send.isPending;

  return (
    <TestPopover
      label="Send test payout"
      title="Send a test payout"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) send.reset();
      }}
      description="Calls paymentrequest signed with this project's initiator, exactly like your app. The result goes to your ResultURL.">
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSend) return;
          send.mutate(
            { commandId, amount, partyB: phone, remarks: remarks.trim(), resultUrl: result, queueTimeOutUrl: timeout },
            { onSuccess: () => setOpen(false) },
          );
        }}>
        <SegmentedControl
          label="Payout type"
          value={commandId}
          options={commands.map((c) => ({ value: c.id, label: c.label }))}
          onChange={setCommandId}
        />
        <div className="grid grid-cols-[96px_1fr] gap-2.5">
          <Field label="Amount (KES)" error={amount && !amountOk ? "Whole KES" : null}>
            <TextInput name="amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.trim())} />
          </Field>
          <Field label="To phone (PartyB)" error={phone && !phoneOk ? "Use 2547… or 2541…" : null}>
            <TextInput
              name="partyB"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPartyB(e.target.value.trim())}
            />
          </Field>
        </div>
        <Field label="Remarks" error={remarksOk ? null : "2 to 100 characters"}>
          <TextInput
            name="remarks"
            mono={false}
            value={remarks}
            maxLength={100}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </Field>

        <button
          type="button"
          aria-expanded={showUrls}
          onClick={() => setShowUrls((s) => !s)}
          className="inline-flex items-center gap-1 self-start rounded text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronDownIcon className={cn("size-3.5 transition-transform duration-150", !showUrls && "-rotate-90")} />
          ResultURL and QueueTimeOutURL
        </button>
        {showUrls && (
          <>
            <Field label="ResultURL">
              <TextInput name="resultUrl" type="url" value={result} onChange={(e) => setResultUrl(e.target.value.trim())} />
            </Field>
            <Field label="QueueTimeOutURL">
              <TextInput
                name="queueTimeOutUrl"
                type="url"
                value={timeout}
                onChange={(e) => setTimeoutUrl(e.target.value.trim())}
              />
            </Field>
          </>
        )}

        {send.isError && <FormError message={send.error.message} />}

        <Button type="submit" size="lg" className="mt-1" disabled={!canSend}>
          {send.isPending ? "Sending…" : `Pay out KES ${amountOk ? formatKesWhole(Number(amount)) : "—"}`}
        </Button>
      </form>
    </TestPopover>
  );
}
