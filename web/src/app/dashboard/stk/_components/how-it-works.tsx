"use client";

import { GuideSheet, type GuideOutcome, type GuideStep } from "../../_components/guide-sheet";

const steps: GuideStep[] = [
  {
    who: "Your app → Daraja",
    title: "Send the request",
    detail:
      "Call processrequest with the amount, phone number and your CallBackURL, every time you charge a customer. There's no one-time setup.",
  },
  {
    who: "Daraja → your app",
    title: "Acceptance, not the result",
    detail:
      "ResponseCode 0 with a CheckoutRequestID comes straight back. It only means the prompt was sent; the customer hasn't answered yet.",
  },
  {
    who: "Daraja → customer",
    title: "The phone shows the prompt",
    detail:
      "The customer sees your amount and business name and is asked for their M-PESA PIN. Here that's the Virtual Phone.",
  },
  {
    who: "Customer → Daraja",
    title: "The customer answers",
    detail:
      "Right PIN, wrong PIN, cancel, too little money, or no answer at all. Each ends with a different ResultCode.",
  },
  {
    who: "Daraja → your app",
    title: "The callback tells you how it ended",
    detail:
      "The outcome is POSTed to your CallBackURL. Mark the order paid there, not in the handler that sent the request.",
  },
];

const codes: GuideOutcome[] = [
  { code: "0", meaning: "Paid", how: "Approve, or type PIN 1234", ok: true },
  { code: "2001", meaning: "Wrong PIN", how: "Any other PIN" },
  { code: "1", meaning: "Insufficient funds", how: "No funds" },
  { code: "1032", meaning: "Cancelled by the customer", how: "Cancel, or Esc" },
  { code: "1037", meaning: "No answer in time", how: "Time out, or wait (Settings)" },
];

export default function HowItWorks() {
  return (
    <GuideSheet
      title="How STK Push works"
      description="Five steps, two of them on the customer's phone. Daraja Local plays Safaricom and the customer."
      steps={steps}
      outcomes={codes}
      howLabel="On the phone"
    />
  );
}
