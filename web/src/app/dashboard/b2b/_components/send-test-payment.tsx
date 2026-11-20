"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SegmentedControl, TextInput } from "@/components/form";
import { useSendB2B } from "@/hooks/use-accounts";
import { useProject } from "@/hooks/use-projects";
import type { B2BCommandId } from "@/lib/types/accounts";
import { formatKesWhole } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FormError, TestPopover } from "../../_components/test-popover";

const commands: { id: B2BCommandId; label: string; party: string }[] = [
  { id: "BusinessPayBill", label: "Pay Bill", party: "PayBill no." },
  { id: "BusinessBuyGoods", label: "Buy Goods", party: "Till no." },
];

/** Pays another business from the working account, signed like the developer's app would. */
export default function SendTestPayment({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [showUrls, setShowUrls] = useState(false);
  const { data: project } = useProject(slug);
  const send = useSendB2B(slug);

  const base = project?.callbackBaseUrl.replace(/\/+$/, "") ?? "";
  const shortCode = project?.shortCode ?? "";
  const [commandId, setCommandId] = useState<B2BCommandId>("BusinessPayBill");
  const [amount, setAmount] = useState("1500");
  const [partyB, setPartyB] = useState("600000");
  const [reference, setReference] = useState("INV-001");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [timeoutUrl, setTimeoutUrl] = useState<string | null>(null);

  const result = resultUrl ?? (base ? `${base}/b2b/result` : "");
  const timeout = timeoutUrl ?? (base ? `${base}/b2b/timeout` : "");
  const amountOk = /^[1-9]\d*$/.test(amount);
  const partyOk = /^\d{5,9}$/.test(partyB) && partyB !== shortCode;
  const refOk = reference.length <= 13;
  const urlsOk = [result, timeout].every((u) => /^https?:\/\/\S+$/.test(u));
  const canSend = amountOk && partyOk && refOk && urlsOk && !send.isPending;
  const command = commands.find((c) => c.id === commandId)!;

  return (
    <TestPopover
      label="Pay a business"
      title="Pay another business"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) send.reset();
      }}
      description="Calls B2B paymentrequest signed with this project's initiator. The money comes out of your working account.">
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSend) return;
          send.mutate(
            {
              commandId,
              amount: Number(amount),
              partyB,
              accountReference: reference,
              resultUrl: result,
              queueTimeOutUrl: timeout,
            },
            { onSuccess: () => setOpen(false) },
          );
        }}>
        <SegmentedControl
          label="Payment type"
          value={commandId}
          options={commands.map((c) => ({ value: c.id, label: c.label }))}
          onChange={setCommandId}
        />
        <div className="grid grid-cols-[96px_1fr] gap-2.5">
          <Field label="Amount (KES)" error={amount && !amountOk ? "Whole KES" : null}>
            <TextInput name="amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.trim())} />
          </Field>
          <Field
            label={`${command.party} (PartyB)`}
            error={
              partyB && !partyOk ? (partyB === shortCode ? "That's your own shortcode" : "5 to 9 digits") : null
            }>
            <TextInput name="partyB" inputMode="numeric" value={partyB} onChange={(e) => setPartyB(e.target.value.trim())} />
          </Field>
        </div>
        <Field label="AccountReference" hint={`${reference.length}/13`}>
          <TextInput name="accountReference" value={reference} maxLength={13} onChange={(e) => setReference(e.target.value)} />
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
          {send.isPending ? "Sending…" : `Pay KES ${amountOk ? formatKesWhole(Number(amount)) : "—"}`}
        </Button>
      </form>
    </TestPopover>
  );
}
