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

const steps = [
  {
    who: "Your app → Daraja",
    title: "Send the request",
    detail:
      "Call processrequest with the amount, phone number and your CallBackURL, every time you charge a customer. There's no one-time setup.",
  },
  {
    who: "Daraja → your app",
    title: "Acceptance, not the result",
    detail:
      "ResponseCode 0 with a CheckoutRequestID comes straight back. It only means the prompt was sent; the customer hasn't answered yet.",
  },
  {
    who: "Daraja → customer",
    title: "The phone shows the prompt",
    detail:
      "The customer sees your amount and business name and is asked for their M-PESA PIN. Here that's the Virtual Phone.",
  },
  {
    who: "Customer → Daraja",
    title: "The customer answers",
    detail:
      "Right PIN, wrong PIN, cancel, too little money, or no answer at all. Each ends with a different ResultCode.",
  },
  {
    who: "Daraja → your app",
    title: "The callback tells you how it ended",
    detail:
      "The outcome is POSTed to your CallBackURL. Mark the order paid there, not in the handler that sent the request.",
  },
];

const codes: { code: string; meaning: string; how: string; ok?: boolean }[] = [
  { code: "0", meaning: "Paid", how: "Approve, or type PIN 1234", ok: true },
  { code: "2001", meaning: "Wrong PIN", how: "Any other PIN" },
  { code: "1", meaning: "Insufficient funds", how: "No funds" },
  { code: "1032", meaning: "Cancelled by the customer", how: "Cancel, or Esc" },
  { code: "1037", meaning: "No answer in time", how: "Time out, or wait (Settings)" },
];

export default function HowItWorks() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="lg" className="px-3.5" />}>
        <BookOpenIcon className="size-3.5" />
        How it works
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[440px]">
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle className="text-[17px] font-semibold tracking-[-0.01em]">How STK Push works</SheetTitle>
          <SheetDescription className="text-[13px] leading-relaxed">
            Five steps, two of them on the customer&apos;s phone. Daraja Local plays Safaricom and the customer.
          </SheetDescription>
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

        <div className="border-t border-border px-6 py-5">
          <p className="text-[13px] font-semibold text-foreground">Every way it can end</p>
          <table className="mt-3 w-full text-left text-[12.5px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-2 font-medium">ResultCode</th>
                <th className="pb-2 font-medium">Meaning</th>
                <th className="pb-2 font-medium">On the phone</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.code} className="border-t border-border">
                  <td className="py-2.5">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 font-mono text-[11.5px] ring-1",
                        c.ok ? "bg-green-light text-green ring-green-mid/60" : "bg-surface-2 text-foreground ring-border",
                      )}>
                      {c.code}
                    </span>
                  </td>
                  <td className="py-2.5 text-foreground">{c.meaning}</td>
                  <td className="py-2.5 text-muted-foreground">{c.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
