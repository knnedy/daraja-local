"use client";

import { GuideSheet, type GuideOutcome, type GuideStep } from "../../_components/guide-sheet";

const steps: GuideStep[] = [
  {
    who: "Your app → Daraja",
    title: "Pay a business, or ask for your balance",
    detail:
      "B2B pays another shortcode's PayBill (BusinessPayBill) or Till (BusinessBuyGoods). Account Balance asks what each of your accounts holds. Both are signed with your initiator, like B2C.",
  },
  {
    who: "Daraja → your app",
    title: "Accepted for processing",
    detail:
      "The synchronous reply only says the request was queued. Nothing has moved yet.",
  },
  {
    who: "Daraja → M-PESA",
    title: "M-Pesa processes it",
    detail:
      "A B2B payment moves money out of your working account, so top it up first. The payment is kept, so Transaction Status can find its receipt later.",
  },
  {
    who: "Daraja → your app",
    title: "Result to your ResultURL",
    detail:
      "A B2B result carries the receipt and your new working balance. A balance result lists every account in one pipe-separated string. Failures arrive here too, so check ResultCode.",
  },
];

const outcomes: GuideOutcome[] = [
  { code: "0", meaning: "Paid, or balances reported", how: "A payment within your working balance", ok: true },
  { code: "1", meaning: "Insufficient balance", how: "Working account below the amount" },
  { code: "2001", meaning: "Invalid initiator", how: "Wrong SecurityCredential" },
];

export default function HowItWorks() {
  return (
    <GuideSheet
      title="How B2B and Account Balance work"
      description="Pay another business, or ask what your accounts hold. Both reply later, at your ResultURL."
      steps={steps}
      outcomes={outcomes}
    />
  );
}
