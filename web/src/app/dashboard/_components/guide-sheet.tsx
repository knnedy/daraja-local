"use client";

import { BookOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type GuideStep = { who: string; title: string; detail: string };
export type GuideOutcome = { code: string; meaning: string; how: string; ok?: boolean };

/** "How it works": the steps of a flow, and optionally every way it can end. */
export function GuideSheet({
  title,
  description,
  steps,
  outcomes,
  outcomesTitle = "Every way it can end",
  codeLabel = "ResultCode",
  howLabel = "Here",
}: {
  title: string;
  description: string;
  steps: GuideStep[];
  outcomes?: GuideOutcome[];
  outcomesTitle?: string;
  codeLabel?: string;
  howLabel?: string;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="lg" className="px-3.5" />}>
        <BookOpenIcon className="size-3.5" />
        How it works
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[440px]">
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle className="text-[17px] font-semibold tracking-[-0.01em]">{title}</SheetTitle>
          <SheetDescription className="text-[13px] leading-relaxed">{description}</SheetDescription>
        </SheetHeader>

        <ol className="px-6 pt-5">
          {steps.map((s, i) => (
            <li key={s.title} className="relative grid grid-cols-[28px_1fr] gap-x-3 pb-5">
              {i < steps.length - 1 && (
                <span aria-hidden className="absolute top-8 bottom-1 left-[13.5px] w-px bg-border" />
              )}
              <span className="flex size-7 items-center justify-center rounded-full bg-surface-2 font-mono text-[12px] font-medium text-foreground ring-1 ring-border">
                {i + 1}
              </span>
              <div className="pt-0.5">
                <p className="font-mono text-[11px] text-green">{s.who}</p>
                <p className="mt-0.5 text-[14px] font-medium text-foreground">{s.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        {outcomes && (
          <div className="border-t border-border px-6 py-5">
            <p className="text-[13px] font-semibold text-foreground">{outcomesTitle}</p>
            <table className="mt-3 w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-2 font-medium">{codeLabel}</th>
                  <th className="pb-2 font-medium">Meaning</th>
                  <th className="pb-2 font-medium">{howLabel}</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((c) => (
                  <tr key={c.code + c.meaning} className="border-t border-border">
                    <td className="py-2.5 pr-2 align-top">
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 font-mono text-[11.5px] whitespace-nowrap ring-1",
                          c.ok ? "bg-green-light text-green ring-green-mid/60" : "bg-surface-2 text-foreground ring-border",
                        )}>
                        {c.code}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 align-top text-foreground">{c.meaning}</td>
                    <td className="py-2.5 align-top text-muted-foreground">{c.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
