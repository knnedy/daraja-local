import FlowSteps, { type FlowStep } from "../../components/flow-steps";

const steps: FlowStep[] = [
  {
    from: "You",
    to: "Safaricom",
    title: "Pay a business, or ask for your balance",
    detail:
      "B2B pays another shortcode's PayBill (BusinessPayBill) or Till (BusinessBuyGoods). Account Balance asks what each of your accounts holds. Both are signed with your initiator, like B2C.",
  },
  {
    from: "Safaricom",
    to: "You",
    title: "Accepted for processing",
    detail:
      "The synchronous reply only says the request was queued. Nothing has moved yet.",
  },
  {
    from: "Safaricom",
    to: "M-Pesa",
    title: "M-Pesa processes it",
    detail:
      "A B2B payment moves money out of your working account, so top it up first. The payment is kept, so Transaction Status can find its receipt later.",
  },
  {
    from: "Safaricom",
    to: "You",
    title: "Result to your ResultURL",
    detail:
      "A B2B result carries the receipt and your new working balance. A balance result lists every account in one pipe-separated string. Failures arrive here too, so check ResultCode.",
  },
];

export default function HowItWorks() {
  return (
    <FlowSteps
      title="How B2B payments and balance queries work"
      steps={steps}
    />
  );
}
