"use client";

import { useEffect, useState } from "react";
import RequestBar from "./components/request-bar";
import IntegrationPanel from "./components/integration-panel";
import SimulatorCard from "./components/simulator-card";
import PayloadConsole, { type LogEntry } from "./components/payload-console";
import SimulationGuide from "./components/simulation-guide";
import {
  RESULT_CODES,
  resolveOutcome,
  type StkOutcome,
} from "./lib/result-codes";

type Phase = "idle" | "prompt" | "processing" | "resolved";
type RequestPayload = { phone: string; amount: string; accountRef: string };

const PROMPT_SECONDS = 20;
const BASE_URL = "http://localhost:8080";
const PATH = "/mpesa/stkpush/v1/processrequest";

const MOCK_REQUESTS: RequestPayload[] = [
  { phone: "254712345678", amount: "1000", accountRef: "Order #1032" },
  { phone: "254798765432", amount: "2500", accountRef: "Order #1090" },
  { phone: "254701122334", amount: "500", accountRef: "Order #1104" },
];

function timestamp() {
  return new Date().toISOString().slice(11, 23);
}

export default function StkPushPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [request, setRequest] = useState<RequestPayload | null>(null);
  const [checkoutId, setCheckoutId] = useState("");
  const [pin, setPin] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(PROMPT_SECONDS);
  const [outcome, setOutcome] = useState<StkOutcome | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [mockIndex, setMockIndex] = useState(0);

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

  function addLog(kind: LogEntry["kind"], content: string) {
    setLogs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), time: timestamp(), kind, content },
    ]);
  }

  function handleSimulate() {
    const payload = MOCK_REQUESTS[mockIndex % MOCK_REQUESTS.length];
    setMockIndex((i) => i + 1);
    const id = `ws_CO_${Date.now()}`;
    setRequest(payload);
    setCheckoutId(id);
    setPin("");
    setOutcome(null);
    setSecondsLeft(PROMPT_SECONDS);
    setPhase("prompt");
    addLog(
      "request",
      `POST ${PATH}\nCheckoutRequestID ${id}\nprompt sent to ${payload.phone}`,
    );
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
      addLog("callback", JSON.stringify(callback, null, 2));
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
          Call this endpoint from your app, then watch and respond to what comes
          in.
        </p>
      </div>

      <RequestBar baseUrl={BASE_URL} path={PATH} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-stretch">
        <div className="flex flex-col gap-5">
          <IntegrationPanel />
          <SimulationGuide />
        </div>
        <SimulatorCard
          phase={phase}
          request={request}
          pin={pin}
          secondsLeft={secondsLeft}
          outcome={outcome}
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          onSubmitPin={handleSubmitPin}
          onCancel={handleCancel}
          onSimulate={handleSimulate}
        />
      </div>

      <PayloadConsole logs={logs} />
    </div>
  );
}
