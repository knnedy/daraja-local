"use client";

import { GuideSheet, type GuideOutcome, type GuideStep } from "../../_components/guide-sheet";

const steps: GuideStep[] = [
  {
    who: "Your app → Daraja",
    title: "Request the payout",
    detail:
      "POST paymentrequest with your initiator's name, a SecurityCredential (the initiator password encrypted with Safaricom's certificate), the amount, the customer's phone as PartyB, and the two URLs results should go to.",
  },
  {
    who: "Daraja → your app",
    title: "Accepted for processing",
    detail:
      'The synchronous reply only says the request was queued: ResponseCode "0" with a ConversationID. No money has moved yet, and a wrong credential is not caught here.',
  },
  {
    who: "Daraja → M-PESA",
    title: "M-Pesa processes it",
    detail:
      "The initiator is checked, then limits and your utility account's balance. In Daraja Local this takes about two seconds and draws down a simulated balance.",
  },
  {
    who: "Daraja → your app",
    title: "Result to your ResultURL",
    detail:
      "Success or failure arrives as a Result with a numeric ResultCode. Only a success carries ResultParameters: the receipt, the recipient's name and your remaining balances. If the request expires in the queue, a timeout goes to QueueTimeOutURL instead.",
  },
];

const outcomes: GuideOutcome[] = [
  { code: "0", meaning: "Paid out", how: "Natural, with enough balance", ok: true },
  { code: "1", meaning: "Insufficient balance", how: "Balance below the amount, or force it" },
  { code: "3", meaning: "Over the transaction limit", how: "Any payout over KES 250,000" },
  { code: "4", meaning: "Daily limit reached", how: "Force it" },
  { code: "2001", meaning: "Invalid initiator", how: "Wrong SecurityCredential, or force it" },
  { code: "2040", meaning: "Unregistered customer", how: "Force it" },
  { code: "1037", meaning: "Timed out in the queue", how: "Force it; goes to QueueTimeOutURL" },
];

export default function HowItWorks() {
  return (
    <GuideSheet
      title="How a B2C payout works"
      description="Your business pays a customer. The reply only says the payout was queued; the result comes later."
      steps={steps}
      outcomes={outcomes}
      howLabel="Here"
    />
  );
}
