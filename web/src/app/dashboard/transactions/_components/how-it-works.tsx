import FlowSteps, { type FlowStep } from "../../_components/flow-steps";

const steps: FlowStep[] = [
  {
    from: "You",
    to: "Safaricom",
    title: "Ask about, or reverse, a transaction",
    detail:
      "Transaction Status takes an M-Pesa receipt (or the OriginatorConversationID of the request that made it). Reversal takes the receipt of a customer's payment and its exact amount. Both are signed with your initiator, like B2C.",
  },
  {
    from: "Safaricom",
    to: "You",
    title: "Accepted for processing",
    detail:
      "The synchronous reply only says the request was queued. It doesn't say whether the receipt exists.",
  },
  {
    from: "Safaricom",
    to: "M-Pesa",
    title: "M-Pesa looks the transaction up",
    detail:
      "In Daraja Local, every completed STK, C2B and B2C payment is kept, so any receipt you've seen in a callback can be looked up. A reversal refunds the customer from your utility account, where their payment landed.",
  },
  {
    from: "Safaricom",
    to: "You",
    title: "Result to your ResultURL",
    detail:
      "A status result lists the transaction's parties, amount, times and whether it was reversed. A reversal result carries the new reversal receipt. Failures arrive here too, so check ResultCode.",
  },
];

export default function HowItWorks() {
  return (
    <FlowSteps title="How status queries and reversals work" steps={steps} />
  );
}
