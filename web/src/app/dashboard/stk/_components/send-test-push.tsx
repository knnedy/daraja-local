"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FormError, TestPopover } from "../../_components/test-popover";
import { Field, TextInput } from "@/components/form";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useProject } from "@/hooks/use-projects";
import { useProjectSettings } from "@/hooks/use-settings";

function timestamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Sends a real STK Push through the emulator's own API, the same calls an app makes. */
export default function SendTestPush({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const { data: project } = useProject(slug);
  const { data: settings } = useProjectSettings(slug);
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("1");
  const [phoneDraft, setPhone] = useState<string | null>(null);
  const [reference, setReference] = useState("INV-1001");
  const phone = phoneDraft ?? settings?.defaultPhoneNumber ?? "254708374149";

  const amountOk = /^[1-9]\d{0,5}$/.test(amount);
  const phoneOk = /^254(7|1)\d{8}$/.test(phone);
  const refOk = reference.trim().length > 0 && reference.length <= 12;

  const send = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("Project not loaded yet");
      const { access_token } = await api.oauth.generate(
        project.consumerKey,
        project.consumerSecret,
      );
      const ts = timestamp();
      return api.mpesa.stkPush(access_token, {
        BusinessShortCode: project.shortCode,
        Password: btoa(project.shortCode + project.passkey + ts),
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: project.shortCode,
        PhoneNumber: phone,
        CallBackURL: `${project.callbackBaseUrl.replace(/\/+$/, "")}/stk/callback`,
        AccountReference: reference.trim(),
        TransactionDesc: "Test from the dashboard",
      });
    },
    onSuccess: () => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.stk.pending(slug) });
    },
  });

  return (
    <TestPopover
      label="Send test prompt"
      title="Send a test prompt"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) send.reset();
      }}
      description={
        <>
          Calls <span className="font-mono text-[11.5px] text-foreground">/oauth/v1/generate</span> then{" "}
          <span className="font-mono text-[11.5px] text-foreground">processrequest</span> with this project&apos;s
          credentials, exactly like your app.
        </>
      }>
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (amountOk && phoneOk && refOk) send.mutate();
        }}>
        <div className="grid grid-cols-[96px_1fr] gap-2.5">
          <Field label="Amount (KES)" error={amount && !amountOk ? "Whole KES" : null}>
            <TextInput
              name="amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.trim())}
            />
          </Field>
          <Field label="Phone" error={phone && !phoneOk ? "Use 2547… or 2541…" : null}>
            <TextInput
              name="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.trim())}
            />
          </Field>
        </div>
        <Field label="Account reference" error={refOk ? null : "1 to 12 characters"}>
          <TextInput
            name="accountReference"
            value={reference}
            maxLength={12}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>

        {send.isError && <FormError message={send.error.message} />}

        <Button
          type="submit"
          size="lg"
          className="mt-1"
          disabled={!amountOk || !phoneOk || !refOk || send.isPending || !project}>
          {send.isPending ? "Sending…" : "Send to the Virtual Phone"}
        </Button>
      </form>
    </TestPopover>
  );
}
