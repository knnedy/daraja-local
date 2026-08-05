// app/projects/dashboard/stk/components/how-it-works.tsx
import { ArrowRightIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const steps = [
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
      "They approve with the right PIN, enter a wrong one, cancel, or just don't respond and it times out. Each produces a different ResultCode — see the trigger guide below.",
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
  return (
    <Accordion className="rounded-lg border border-border-strong bg-surface-1 shadow-sm">
      <AccordionItem value="how-it-works" className="px-4">
        <AccordionTrigger className="text-[13px] font-medium text-foreground">
          How STK Push actually works
        </AccordionTrigger>
        <AccordionContent>
          <div className="-mx-4">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className={cn(
                  "flex gap-3 px-4 py-3",
                  i < steps.length - 1 && "border-b border-border/60",
                )}>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-[10px] text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-blue">
                      {step.from}
                    </span>
                    <ArrowRightIcon className="size-3 text-muted-foreground/50" />
                    <span className="font-mono text-[11px] text-green">
                      {step.to}
                    </span>
                    <span className="ml-1 text-[12.5px] font-medium text-foreground">
                      {step.title}
                    </span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
