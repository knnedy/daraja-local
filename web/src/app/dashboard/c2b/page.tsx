"use client";

import { useState } from "react";
import RequestBar from "./components/request-bar";
import IntegrationPanel from "./components/integration-panel";
import CallbackConfigCard from "./components/callback-config-card";
import FlowSimulator from "./components/flow-simulator";
import CallbackLog, { type LogEntry } from "./components/callback-log";
import SimulationGuide from "./components/simulation-guide";
import {
  VALIDATION_CODES,
  resolveValidation,
  type ValidationOutcome,
} from "./lib/c2b-codes";
import HowItWorks from "./components/how-it-works";

type Phase = "idle" | "validating" | "validated" | "confirming" | "done";

const BASE_URL = "http://localhost:8080";

const MOCK_PAYMENTS = [
  { msisdn: "254712345678", amount: 500, billRefNumber: "INV1001" },
  { msisdn: "254798765432", amount: 1200, billRefNumber: "INVALID" },
  { msisdn: "254701122334", amount: 0, billRefNumber: "INV1004" },
];

function timestamp() {
  return new Date().toISOString().slice(11, 23);
}

export default function C2BPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcome, setOutcome] = useState<ValidationOutcome | null>(null);
  const [externalValidation, setExternalValidation] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [mockIndex, setMockIndex] = useState(0);

  function addLog(label: string, tone: LogEntry["tone"], content: string) {
    setLogs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), time: timestamp(), label, tone, content },
    ]);
  }

  function handleSimulate() {
    const payment = MOCK_PAYMENTS[mockIndex % MOCK_PAYMENTS.length];
    setMockIndex((i) => i + 1);

    addLog(
      "PAYMENT",
      "neutral",
      `Customer paid KES ${payment.amount} from ${payment.msisdn}\nBillRefNumber: ${payment.billRefNumber}`,
    );

    if (!externalValidation) {
      setPhase("confirming");
      setTimeout(() => runConfirmation(payment, "accepted"), 900);
      return;
    }

    setPhase("validating");
    setTimeout(() => {
      const result = resolveValidation(payment.billRefNumber, payment.amount);
      setOutcome(result);
      setPhase("validated");
      const { code, desc } = VALIDATION_CODES[result];
      addLog(
        "VALIDATION",
        result === "accepted" ? "success" : "error",
        `POST ValidationURL\nResultCode: ${code}\nResultDesc: ${desc}`,
      );

      if (result !== "accepted") {
        setTimeout(() => setPhase("idle"), 2500);
        return;
      }

      setPhase("confirming");
      setTimeout(() => runConfirmation(payment, "accepted"), 900);
    }, 1000);
  }

  function runConfirmation(
    payment: (typeof MOCK_PAYMENTS)[number],
    result: ValidationOutcome,
  ) {
    setOutcome(result);
    addLog(
      "CONFIRMATION",
      "success",
      `POST ConfirmationURL\nTransID: RKTQDM7W6S\nTransAmount: ${payment.amount}\nMSISDN: ${payment.msisdn}`,
    );
    setPhase("done");
    setTimeout(() => setPhase("idle"), 2500);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          C2B
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Register your callback URLs, then simulate a customer paying your
          Paybill directly.
        </p>
      </div>

      <HowItWorks />

      <div className="flex flex-col gap-2.5">
        <RequestBar baseUrl={BASE_URL} path="/mpesa/c2b/v2/registerurl" />
        <RequestBar baseUrl={BASE_URL} path="/mpesa/c2b/v2/simulate" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-stretch">
        <IntegrationPanel />
        <CallbackConfigCard
          externalValidation={externalValidation}
          onToggleValidation={setExternalValidation}
        />
      </div>

      <FlowSimulator
        phase={phase}
        outcome={outcome}
        externalValidation={externalValidation}
        onSimulate={handleSimulate}
      />

      <SimulationGuide />
      <CallbackLog logs={logs} />
    </div>
  );
}
