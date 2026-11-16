import FlowSteps, { type FlowStep } from "../../components/flow-steps";

const steps: FlowStep[] = [
  {
    from: "You",
    to: "Safaricom",
    title: "Send the request — per transaction",
    detail:
      "Call processrequest with amount, phone number, and your CallBackURL. Unlike C2B, there's no one-time setup — this happens every single time you want to charge a customer.",
  },
  {
    from: "Safaricom",
    to: "You",
    title: "Immediate response — not the result",
    detail:
      "You get MerchantRequestID, CheckoutRequestID, and ResponseCode 0 back right away. This only means 'request accepted for processing' — it says nothing about whether the customer will approve, reject, or ignore it.",
  },
  {
    from: "Safaricom",
    to: "Customer",
    title: "Customer's phone shows the prompt",
    detail:
      "Their phone displays your amount and business name, asking for their M-Pesa PIN. This is the phone mockup below — it's what the customer sees, not something your app controls.",
  },
  {
    from: "Customer",
    to: "Safaricom",
    title: "Customer responds",
    detail:
      "They approve with the right PIN, enter a wrong one, cancel, or just don't respond and it times out. Each produces a different ResultCode — pick the outcome yourself in the Virtual Phone below.",
  },
  {
    from: "Safaricom",
    to: "You",
    title: "Callback — this is how you actually find out",
    detail:
      "Safaricom POSTs the real outcome to your CallBackURL, sometime after step 2's response already returned. Mark the order paid (or not) here, not in your initial request handler.",
  },
];

export default function HowItWorks() {
  return <FlowSteps title="How STK Push actually works" steps={steps} />;
}
