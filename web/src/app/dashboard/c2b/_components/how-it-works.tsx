"use client";

import { GuideSheet, type GuideOutcome, type GuideStep } from "../../_components/guide-sheet";

const steps: GuideStep[] = [
  {
    who: "Your app → Daraja",
    title: "Register your URLs, once",
    detail:
      "Call registerurl with your ConfirmationURL, and a ValidationURL if you want one. Daraja stores them against your shortcode; it isn't a per-payment call.",
  },
  {
    who: "Customer → Daraja",
    title: "The customer pays on their own",
    detail:
      "They open M-PESA, pick Pay Bill or Buy Goods, enter your shortcode, an account number and an amount, then their PIN. Your app doesn't start this and can't see it yet.",
  },
  {
    who: "Daraja → your app",
    title: "Validation, if you registered a ValidationURL",
    detail:
      "Daraja asks your ValidationURL whether to allow the payment, your one chance to decline it. If your server can't answer, ResponseType decides. On real Daraja, Safaricom has to enable validation for your shortcode.",
  },
  {
    who: "Daraja → customer",
    title: "The payment completes",
    detail: "The customer is charged and gets the M-PESA SMS. Nothing reaches you at this point.",
  },
  {
    who: "Daraja → your app",
    title: "Confirmation tells you it happened",
    detail:
      "The same body is POSTed to your ConfirmationURL. The money has already moved, so this can't be declined. Mark the invoice paid here.",
  },
];

const outcomes: GuideOutcome[] = [
  { code: "\"0\"", meaning: "Your ValidationURL accepts", how: "Payment completes, then Confirmation", ok: true },
  { code: "other", meaning: "Your ValidationURL declines", how: "Payment fails, no Confirmation" },
  { code: "Completed", meaning: "ValidationURL unreachable", how: "Accepted anyway" },
  { code: "Cancelled", meaning: "ValidationURL unreachable", how: "Declined" },
];

export default function HowItWorks() {
  return (
    <GuideSheet
      title="How C2B works"
      description="Unlike STK Push, the customer starts the payment. Your app only registers where to be told."
      steps={steps}
      outcomes={outcomes}
      outcomesTitle="How validation decides"
      codeLabel="Answer"
      howLabel="Result"
    />
  );
}
