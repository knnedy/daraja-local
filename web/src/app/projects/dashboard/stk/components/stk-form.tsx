"use client";

import { useState } from "react";
import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function StkForm({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (payload: {
    phone: string;
    amount: string;
    accountRef: string;
    description: string;
  }) => void;
}) {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [accountRef, setAccountRef] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSend({ phone, amount, accountRef, description });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">
          Request payload
        </span>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          POST /mpesa/stkpush/v1/processrequest
        </span>
      </div>

      <Field label="Phone number">
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="2547XXXXXXXX"
          disabled={disabled}
          className="font-mono text-[13px]"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount (KES)">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            inputMode="numeric"
            disabled={disabled}
            className="font-mono text-[13px]"
          />
        </Field>
        <Field label="Account reference">
          <Input
            value={accountRef}
            onChange={(e) => setAccountRef(e.target.value)}
            placeholder="Order #1032"
            disabled={disabled}
            className="font-mono text-[13px]"
          />
        </Field>
      </div>

      <Field label="Transaction description">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Payment for goods"
          disabled={disabled}
          className="text-[13px]"
        />
      </Field>

      <Button
        type="submit"
        disabled={disabled}
        className="mt-1 gap-1.5 self-end bg-green text-white hover:bg-green/90">
        <PlayIcon className="size-3.75" />
        {disabled ? "Awaiting response…" : "Send STK Push"}
      </Button>
    </form>
  );
}
