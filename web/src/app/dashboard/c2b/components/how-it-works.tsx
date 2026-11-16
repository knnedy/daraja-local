import FlowSteps, { type FlowStep } from "../../components/flow-steps";

const steps: FlowStep[] = [
  {
    from: "You",
    to: "Safaricom",
    title: "Register your URLs — once",
    detail:
      "Call registerurl with your ConfirmationURL (and ValidationURL if you want one). This isn't per-transaction — Safaricom just stores the mapping against your shortcode. Re-running it later can fail if nothing's changed.",
  },
  {
    from: "Customer",
    to: "Safaricom",
    title: "Customer pays independently",
    detail:
      "They open their own M-Pesa menu, enter your Paybill/Till, an account number, and an amount, then confirm with their PIN. Your app has zero visibility into this — you don't know it's happening yet.",
  },
  {
    from: "Safaricom",
    to: "You",
    title: "Validation — optional, off by default",
    detail:
      "Optional, and off unless Safaricom enables it for your shortcode (in Daraja Local, registering a ValidationURL turns it on). Safaricom asks your ValidationURL 'should I allow this?' — your one chance to reject before the money moves. Most real integrations skip this and reconcile mismatches afterward instead.",
  },
  {
    from: "Safaricom",
    to: "M-Pesa",
    title: "Payment settles",
    detail:
      "The customer is debited. Invisible to you — no callback yet, nothing to catch here.",
  },
  {
    from: "Safaricom",
    to: "You",
    title: "Confirmation — cannot be rejected",
    detail:
      "Safaricom hits your ConfirmationURL to tell you it already happened. This is how you actually find out — mark an order paid, issue a receipt, update your ledger.",
  },
];

export default function HowItWorks() {
  return <FlowSteps title="How C2B actually works" steps={steps} />;
}
