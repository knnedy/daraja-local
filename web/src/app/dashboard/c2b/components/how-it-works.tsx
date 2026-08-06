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
      "Only fires if you enabled it. Safaricom asks your ValidationURL 'should I allow this?' — your one chance to reject before the money moves. Most real integrations skip this and reconcile mismatches afterward instead.",
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
  return (
    <div className="flex flex-col gap-2.5">
      <Accordion className="rounded-lg border border-border-strong bg-surface-1 shadow-sm">
        <AccordionItem value="how-it-works" className="px-4">
          <AccordionTrigger className="text-[13px] font-medium text-foreground">
            How C2B actually works
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
    </div>
  );
}
