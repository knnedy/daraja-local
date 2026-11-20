"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) send.reset();
      }}>
      <Popover.Trigger render={<Button size="lg" className="px-3.5" />}>
        <SendIcon className="size-3.5" />
        Send test prompt
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="w-[340px] origin-(--transform-origin) rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-[0_16px_40px_-12px_oklch(0_0_0/0.22),0_2px_6px_oklch(0_0_0/0.06)] transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0">
            <Popover.Title className="text-[14px] font-semibold text-foreground">
              Send a test prompt
            </Popover.Title>
            <Popover.Description className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Calls <span className="font-mono text-[11.5px] text-foreground">/oauth/v1/generate</span> then{" "}
              <span className="font-mono text-[11.5px] text-foreground">processrequest</span> with this
              project&apos;s credentials, exactly like your app.
            </Popover.Description>

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

              {send.isError && (
                <p className="rounded-lg bg-red-bg px-3 py-2 text-[12px] text-red" aria-live="polite">
                  {send.error.message}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="mt-1"
                disabled={!amountOk || !phoneOk || !refOk || send.isPending || !project}>
                {send.isPending ? "Sending…" : "Send to the Virtual Phone"}
              </Button>
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
