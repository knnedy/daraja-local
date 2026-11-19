import { ArrowRightIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type FlowStep = {
  from: string;
  to: string;
  title: string;
  detail: string;
};

/** Collapsible numbered walkthrough of who talks to whom in a Daraja flow. */
export default function FlowSteps({
  title,
  steps,
}: {
  title: string;
  steps: FlowStep[];
}) {
  return (
    <Accordion className="panel">
      <AccordionItem value="how-it-works" className="px-4">
        <AccordionTrigger className="text-[13px] font-medium text-foreground">
          {title}
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
                  <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
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
