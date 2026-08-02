"use client";

import { useEffect, useState } from "react";
import StkForm from "./components/stk-form";
import VirtualPhone from "./components/virtual-phone";
import PayloadConsole from "./components/payload-console";
import {
  RESULT_CODES,
  resolveOutcome,
  type StkOutcome,
} from "./lib/result-codes";

type Phase = "idle" | "prompt" | "processing" | "resolved";
type RequestPayload = {
  phone: string;
  amount: string;
  accountRef: string;
  description: string;
};

const PROMPT_SECONDS = 20;

export default function StkPushPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [request, setRequest] = useState<RequestPayload | null>(null);
  const [checkoutId, setCheckoutId] = useState("");
  const [pin, setPin] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(PROMPT_SECONDS);
  const [outcome, setOutcome] = useState<StkOutcome | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (phase !== "prompt") return;
    if (secondsLeft <= 0) {
      resolve("timeout");
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);

  function handleSend(payload: RequestPayload) {
    const id = `ws_CO_${Date.now()}`;
    setRequest(payload);
    setCheckoutId(id);
    setPin("");
    setOutcome(null);
    setSecondsLeft(PROMPT_SECONDS);
    setPhase("prompt");
    setLogs((prev) => [
      ...prev,
      `$ POST /mpesa/stkpush/v1/processrequest`,
      `> CheckoutRequestID ${id}`,
      `> prompt sent to ${payload.phone || "unknown number"}`,
    ]);
  }

  function resolve(o: StkOutcome) {
    setOutcome(o);
    setPhase("processing");
    setTimeout(() => {
      setPhase("resolved");
      const { code, desc } = RESULT_CODES[o];
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: `${Date.now()}-1`,
            CheckoutRequestID: checkoutId,
            ResultCode: code,
            ResultDesc: desc,
          },
        },
      };
      setLogs((prev) => [
        ...prev,
        `$ POST callbackUrl`,
        JSON.stringify(callback, null, 2),
      ]);
      setTimeout(() => {
        setPhase("idle");
        setRequest(null);
      }, 3500);
    }, 1200);
  }

  function handleDigit(digit: string) {
    if (phase !== "prompt" || pin.length >= 4) return;
    setPin((p) => p + digit);
  }

  function handleBackspace() {
    setPin((p) => p.slice(0, -1));
  }

  function handleSubmitPin() {
    if (pin.length !== 4) return;
    resolve(resolveOutcome(pin));
  }

  function handleCancel() {
    if (phase !== "prompt") return;
    resolve("cancelled");
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          STK Push
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Simulate the customer prompt for /mpesa/stkpush/v1/processrequest.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <StkForm disabled={phase !== "idle"} onSend={handleSend} />
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <VirtualPhone
            phase={phase}
            request={request}
            pin={pin}
            secondsLeft={secondsLeft}
            outcome={outcome}
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            onSubmitPin={handleSubmitPin}
            onCancel={handleCancel}
          />
          <PayloadConsole logs={logs} />
        </div>
      </div>
    </div>
  );
}
