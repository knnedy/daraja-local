import FlowSteps, { type FlowStep } from "../../components/flow-steps";

const steps: FlowStep[] = [
  {
    from: "You",
    to: "Safaricom",
    title: "Request the payout",
    detail:
      "POST paymentrequest with your initiator's name, a SecurityCredential (the initiator password encrypted with Safaricom's certificate), the amount, the customer's phone as PartyB, and the two URLs results should go to.",
  },
  {
    from: "Safaricom",
    to: "You",
    title: "Accepted for processing",
    detail:
      'The synchronous reply only says the request was queued: ResponseCode "0" with a ConversationID. No money has moved yet, and a wrong credential is not caught here.',
  },
  {
    from: "Safaricom",
    to: "M-Pesa",
    title: "M-Pesa processes it",
    detail:
      "The initiator is checked, then limits and your utility account's balance. In Daraja Local this takes about two seconds and draws down a simulated balance.",
  },
  {
    from: "Safaricom",
    to: "You",
    title: "Result to your ResultURL",
    detail:
      "Success or failure arrives as a Result with a numeric ResultCode. Only a success carries ResultParameters: the receipt, the recipient's name and your remaining balances. If the request expires in the queue, a timeout goes to QueueTimeOutURL instead.",
  },
];

export default function HowItWorks() {
  return <FlowSteps title="How a B2C payout works" steps={steps} />;
}
