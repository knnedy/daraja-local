"use client";

import { GuideSheet, type GuideOutcome, type GuideStep } from "../../_components/guide-sheet";

const steps: GuideStep[] = [
  {
    who: "Your app → Daraja",
    title: "Ask for a token with Basic auth",
    detail:
      "Base64-encode consumer_key:consumer_secret and send it as Authorization: Basic to GET /oauth/v1/generate?grant_type=client_credentials.",
  },
  {
    who: "Daraja → your app",
    title: "A token, valid for 3599 seconds",
    detail: "expires_in comes back as a string. Cache the token and reuse it instead of fetching one per request.",
  },
  {
    who: "Your app → Daraja",
    title: "Bearer auth on everything else",
    detail:
      "STK Push, C2B, B2C, B2B and the rest need Authorization: Bearer <token>. A missing or expired token is refused before the request is even read.",
  },
  {
    who: "Your app",
    title: "Sign initiator requests",
    detail:
      "B2C, B2B, Account Balance, Transaction Status and Reversal also carry an InitiatorName and a SecurityCredential: the initiator password encrypted with the certificate.",
  },
];

const outcomes: GuideOutcome[] = [
  { code: "200", meaning: "Token issued", how: "Right key and secret", ok: true },
  { code: "400.008.01", meaning: "Invalid authentication", how: "Wrong key or secret" },
  { code: "404.001.03", meaning: "Invalid access token", how: "Expired or made-up Bearer token" },
];

export default function HowItWorks() {
  return (
    <GuideSheet
      title="How Daraja authentication works"
      description="One call gets a token; every other call carries it. Initiator requests are signed on top."
      steps={steps}
      outcomes={outcomes}
      outcomesTitle="What auth can answer"
      codeLabel="Code"
    />
  );
}
