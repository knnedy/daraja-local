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
    to: "daraja-local",
    title: "Send consumer key + secret, Basic Auth",
    detail:
      "Combine key:secret, base64-encode it, send as Authorization: Basic <encoded> to /oauth/v1/generate. This is the only Daraja call that uses Basic Auth instead of Bearer.",
  },
  {
    from: "daraja-local",
    to: "You",
    title: "Access token comes back",
    detail:
      "Real Daraja tokens last roughly 3600 seconds. Your app should refetch on an auth error, not just once at startup.",
  },
  {
    from: "You",
    to: "daraja-local",
    title: "Every other call uses it as Bearer auth",
    detail:
      "STK Push, C2B, and every other Daraja endpoint expect Authorization: Bearer <token> — not enforced here yet, since STK/C2B don't exist server-side yet, but worth exercising your app's token-fetch step ahead of that.",
  },
];

export default function HowItWorksAccordion() {
  return (
    <Accordion className="rounded-lg border border-border-strong bg-surface-1 shadow-sm">
      <AccordionItem value="how-it-works" className="px-4">
        <AccordionTrigger className="text-[13px] font-medium text-foreground">
          How token authentication works
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
