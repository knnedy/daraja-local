"use client";

import { GuideSheet, type GuideOutcome, type GuideStep } from "../../_components/guide-sheet";

const steps: GuideStep[] = [
  {
    who: "Your app → Daraja",
    title: "Ask about, or reverse, a transaction",
    detail:
      "Transaction Status takes an M-Pesa receipt (or the OriginatorConversationID of the request that made it). Reversal takes the receipt of a customer's payment and its exact amount. Both are signed with your initiator, like B2C.",
  },
  {
    who: "Daraja → your app",
    title: "Accepted for processing",
    detail:
      "The synchronous reply only says the request was queued. It doesn't say whether the receipt exists.",
  },
  {
    who: "Daraja → M-PESA",
    title: "M-Pesa looks the transaction up",
    detail:
      "In Daraja Local, every completed STK, C2B, B2C and B2B payment is kept, so any receipt you've seen in a callback can be looked up. A reversal refunds the customer from your utility account, where their payment landed.",
  },
  {
    who: "Daraja → your app",
    title: "Result to your ResultURL",
    detail:
      "A status result lists the transaction's parties, amount, times and whether it was reversed. A reversal result carries the new reversal receipt. Failures arrive here too, so check ResultCode.",
  },
];

const outcomes: GuideOutcome[] = [
  { code: "0", meaning: "Found, or reversed", how: "A receipt from the ledger", ok: true },
  { code: "R000002", meaning: "Invalid receipt", how: "Unknown receipt, wrong amount, or not STK/C2B" },
  { code: "R000001", meaning: "Already reversed", how: "Reverse the same payment twice" },
  { code: "1", meaning: "Insufficient balance", how: "Utility account below the refund" },
  { code: "2001", meaning: "Invalid initiator", how: "Wrong SecurityCredential" },
];

export default function HowItWorks() {
  return (
    <GuideSheet
      title="How Transaction Status and Reversal work"
      description="Look up any receipt, or refund a customer's payment. Both reply later, at your ResultURL."
      steps={steps}
      outcomes={outcomes}
    />
  );
}
